import { useState, useCallback } from "react";
import type { DBTable, DBSeat, DBRsvp } from "./lib/queries";
import {
  creaTavolo,
  cancellaTavolo,
  aggiornaPosizioneTavolo,
  assegnaPosto,
  rimuoviPosto,
} from "./lib/queries";
import { TavoloCerchio } from "./components/TavoloCerchio";
import { ListaOspitiDisponibili } from "./components/ListaOspitiDisponibili";
import { ModaleNuovoTavolo } from "./components/ModaleNuovoTavolo";
import { ModaleOspiteManuale } from "./components/ModaleOspiteManuale";
import { ModaleAvviso } from "./components/ModaleAvviso";
import "./dashboard.css";

/**
 * Due sedie sono "vicine" se hanno indici consecutivi lungo la disposizione.
 * Per tondo/ellisse/quadrato le sedie corrono lungo un perimetro chiuso, quindi
 * c'è anche l'adiacenza tra la prima e l'ultima (wrap-around). Per l'imperiale
 * ci sono due file distinte: sono vicine solo se consecutive nella stessa fila.
 */
function sedieVicine(
  forma: DBTable["forma"],
  capienza: number,
  i: number,
  j: number
): boolean {
  if (i === j) return true;
  const diff = Math.abs(i - j);

  if (forma === "imperiale") {
    const nSopra = Math.ceil(capienza / 2);
    const iSopra = i < nSopra;
    const jSopra = j < nSopra;
    if (iSopra !== jSopra) return false; // file diverse → non adiacenti
    return diff === 1;
  }

  // Perimetro chiuso: adiacenti se consecutive o agli estremi opposti dell'anello.
  return diff === 1 || diff === capienza - 1;
}

/** Sedia effettivamente occupata da un posto (nuovo modello, con fallback). */
function indiceSedia(p: DBSeat): number | null {
  if (p.sedia_index !== null && p.sedia_index !== undefined) return p.sedia_index;
  if (p.rsvp_guest_index !== null && p.rsvp_guest_index !== undefined)
    return p.rsvp_guest_index;
  return null;
}

interface GestioneTavoliProps {
  rsvps: DBRsvp[];
  tavoli: DBTable[];
  posti: DBSeat[];
  onAggiorna: () => Promise<void>;
}

export function GestioneTavoli({ rsvps, tavoli, posti, onAggiorna }: GestioneTavoliProps) {
  const [ospiteSelezionato, setOspiteSelezionato] = useState<any | null>(null);
  const [tavoloEvidenziato, setTavoloEvidenziato] = useState<string | null>(null);
  const [mostraNuovoTavolo, setMostraNuovoTavolo] = useState(false);
  const [mostraManuale, setMostraManuale] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [avviso, setAvviso] = useState<{
    messaggi: string[];
    onConferma: () => void;
  } | null>(null);

  // ── Crea un nuovo tavolo ──
  async function handleCreaTavolo(nome: string, capienza: number, forma: DBTable["forma"]) {
    try {
      await creaTavolo(nome, capienza, forma);
      await onAggiorna();
      setMostraNuovoTavolo(false);
    } catch (e: any) {
      setErrore(e.message);
    }
  }

  // ── Cancella tavolo ──
  async function handleCancellaTavolo(id: string) {
    const tavolo = tavoli.find((t) => t.id === id);
    if (!tavolo) return;
    if (!confirm(`Cancellare il tavolo "${tavolo.nome}"? Tutti i posti assegnati verranno liberati.`)) return;
    try {
      await cancellaTavolo(id);
      if (tavoloEvidenziato === id) setTavoloEvidenziato(null);
      await onAggiorna();
    } catch (e: any) {
      setErrore(e.message);
    }
  }

  // ── Aggiorna posizione tavolo dopo il drag ──
  const handleDragEnd = useCallback(
    async (id: string, x: number, y: number) => {
      // Aggiornamento ottimistico — salva sul DB senza aspettare il refresh completo
      await aggiornaPosizioneTavolo(id, Math.max(0, x), Math.max(0, y));
      await onAggiorna();
    },
    [onAggiorna]
  );

  // ── Assegna ospite selezionato a una sedia ──
  async function handleAssegna(tavoloId: string, sediaIndex: number) {
    if (!ospiteSelezionato) return;

    // L'assegnazione vera e propria (eseguita subito o dopo conferma dell'avviso)
    const esegui = async () => {
      setAvviso(null);
      try {
        await assegnaPosto(
          tavoloId,
          ospiteSelezionato.nome,
          ospiteSelezionato.cognome,
          ospiteSelezionato.tipo,
          ospiteSelezionato.allergie || null,
          ospiteSelezionato.fonte,
          ospiteSelezionato.rsvp_id || null,
          ospiteSelezionato.rsvp_guest_index !== undefined ? ospiteSelezionato.rsvp_guest_index : null,
          sediaIndex
        );
        setOspiteSelezionato(null);
        await onAggiorna();
      } catch (e: any) {
        setErrore(e.message);
      }
    };

    // ── Controlli sul nucleo (solo ospiti da RSVP: i manuali non hanno nucleo) ──
    // Un solo avviso alla volta, mutuamente esclusivi:
    //  · se al tavolo scelto NON ci sono membri del nucleo ma ce ne sono altrove
    //    → avviso "tavolo diverso" (inutile parlare di vicinanza, è ovvio che sia lontano);
    //  · se al tavolo scelto ci sono già membri del nucleo ma la sedia non è
    //    accanto a nessuno di loro → avviso "non accanto";
    //  · se è accanto ad almeno uno (o è il primo del nucleo) → nessun avviso.
    let messaggio: string | null = null;
    const rsvpId = ospiteSelezionato.rsvp_id;
    if (rsvpId) {
      const membriNucleo = posti.filter((p) => p.rsvp_id === rsvpId);
      const membriStessoTavolo = membriNucleo.filter((p) => p.tavolo_id === tavoloId);

      if (membriStessoTavolo.length === 0) {
        // Nessun membro qui: avvisa solo se il nucleo è già seduto altrove
        if (membriNucleo.length > 0) {
          messaggio = "Altri membri di questo nucleo sono già seduti a un tavolo diverso.";
        }
      } else {
        // Ci sono membri qui: avvisa solo se la sedia non è accanto a nessuno
        const tavolo = tavoli.find((t) => t.id === tavoloId);
        const almenoUnoVicino =
          !!tavolo &&
          membriStessoTavolo.some((p) => {
            const s = indiceSedia(p);
            return s !== null && sedieVicine(tavolo.forma, tavolo.capienza, s, sediaIndex);
          });
        if (!almenoUnoVicino) {
          messaggio =
            "Questo posto non è accanto agli altri membri del nucleo già seduti a questo tavolo.";
        }
      }
    }

    if (messaggio) {
      setAvviso({ messaggi: [messaggio], onConferma: esegui });
    } else {
      await esegui();
    }
  }

  // ── Rimuovi ospite da sedia ──
  async function handleRimuovi(postoId: string) {
    try {
      await rimuoviPosto(postoId);
      await onAggiorna();
    } catch (e: any) {
      setErrore(e.message);
    }
  }

  // ── Aggiunge ospite manuale dal modale ──
  async function handleAggiungiManuale(
    nome: string,
    cognome: string,
    tipo: "adulto" | "bambino",
    allergie: string | null,
    tavoloId: string,
    sediaIndex: number
  ) {
    try {
      await assegnaPosto(tavoloId, nome, cognome, tipo, allergie, "manuale", null, null, sediaIndex);
      await onAggiorna();
      setMostraManuale(false);
    } catch (e: any) {
      setErrore(e.message);
    }
  }

  return (
    <div className="workspace-tavoli">
      {/* ── Sidebar Sinistra: Ospiti disponibili ── */}
      <ListaOspitiDisponibili
        rsvps={rsvps}
        posti={posti}
        ospiteSelezionato={ospiteSelezionato}
        onSelezionaOspite={setOspiteSelezionato}
        onApriModaleManuale={() => setMostraManuale(true)}
      />

      {/* ── Canvas Centrale: Piano dei Tavoli ── */}
      <div className="canvas-container" onClick={() => setOspiteSelezionato(null)}>
        {/* Istruzioni quando nessun tavolo presente */}
        {tavoli.length === 0 && (
          <div style={{
            position: "absolute", inset: 0, display: "flex", alignItems: "center",
            justifyContent: "center", flexDirection: "column", gap: "var(--sp-3)",
            color: "var(--c-oro-scuro)", pointerEvents: "none"
          }}>
            <p style={{ fontSize: "1.2rem", fontFamily: "var(--f-titolo)" }}>Nessun tavolo creato</p>
            <p style={{ fontSize: "0.9rem" }}>Usa il pulsante "＋ Nuovo Tavolo" in basso a destra →</p>
          </div>
        )}

        {tavoli.map((tavolo) => {
          const ospitiTavolo = posti.filter((p) => p.tavolo_id === tavolo.id);
          return (
            <TavoloCerchio
              key={tavolo.id}
              tavolo={tavolo}
              ospiti={ospitiTavolo}
              evidenziato={tavoloEvidenziato === tavolo.id}
              ospiteSelezionato={ospiteSelezionato}
              onAssegna={handleAssegna}
              onRimuovi={handleRimuovi}
              onDragEnd={handleDragEnd}
              onEvidenzia={() => setTavoloEvidenziato(tavolo.id)}
            />
          );
        })}

        {/* Pulsante nuovo tavolo (basso destra del canvas) */}
        <button
          className="nuovo-tavolo-btn"
          style={{
            position: "absolute", bottom: "var(--sp-4)", right: "var(--sp-4)",
            width: "auto", padding: "var(--sp-2) var(--sp-4)"
          }}
          onClick={(e) => { e.stopPropagation(); setMostraNuovoTavolo(true); }}
        >
          ＋ Nuovo Tavolo
        </button>
      </div>

      {/* ── Sidebar Destra: Elenco Tavoli ── */}
      <div className="sidebar-tavoli-lista">
        <div className="sidebar-header">
          <h3>Tavoli ({tavoli.length})</h3>
        </div>

        <div className="tavoli-elenco">
          {tavoli.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--c-oro-scuro)", fontSize: "0.9rem", marginTop: "var(--sp-4)" }}>
              Nessun tavolo ancora.
            </p>
          ) : (
            tavoli.map((t) => {
              const occupati = posti.filter((p) => p.tavolo_id === t.id).length;
              return (
                <div
                  key={t.id}
                  className={`riga-tavolo-sidebar ${tavoloEvidenziato === t.id ? "evidenziato" : ""}`}
                  onClick={() => setTavoloEvidenziato(t.id === tavoloEvidenziato ? null : t.id)}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{t.nome}</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--c-oro-scuro)" }}>
                      {occupati}/{t.capienza} posti · {t.forma}
                    </div>
                  </div>
                  <button
                    className="sidebar-cancella-tavolo-btn"
                    title="Cancella tavolo"
                    onClick={(e) => { e.stopPropagation(); handleCancellaTavolo(t.id); }}
                  >
                    ✕
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Modale Nuovo Tavolo ── */}
      {mostraNuovoTavolo && (
        <ModaleNuovoTavolo
          onChiudi={() => setMostraNuovoTavolo(false)}
          onSalva={handleCreaTavolo}
        />
      )}

      {/* ── Modale Ospite Manuale ── */}
      {mostraManuale && (
        <ModaleOspiteManuale
          tavoli={tavoli}
          posti={posti}
          onChiudi={() => setMostraManuale(false)}
          onSalva={handleAggiungiManuale}
        />
      )}

      {/* ── Popup di avviso (tavolo diverso / non accanto) ── */}
      {avviso && (
        <ModaleAvviso
          messaggi={avviso.messaggi}
          onConferma={avviso.onConferma}
          onAnnulla={() => setAvviso(null)}
        />
      )}

      {/* ── Toast errori ── */}
      {errore && (
        <div
          style={{
            position: "fixed", bottom: "var(--sp-4)", left: "50%",
            transform: "translateX(-50%)", background: "#e74c3c", color: "white",
            padding: "var(--sp-2) var(--sp-4)", borderRadius: "8px", zIndex: 20000,
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)", display: "flex", gap: "var(--sp-3)"
          }}
        >
          <span>{errore}</span>
          <button onClick={() => setErrore(null)} style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontWeight: 700 }}>✕</button>
        </div>
      )}
    </div>
  );
}
