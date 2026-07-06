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
import "./dashboard.css";

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
    try {
      await assegnaPosto(
        tavoloId,
        ospiteSelezionato.nome,
        ospiteSelezionato.cognome,
        ospiteSelezionato.tipo,
        ospiteSelezionato.allergie || null,
        ospiteSelezionato.fonte,
        ospiteSelezionato.rsvp_id || null,
        ospiteSelezionato.rsvp_guest_index !== undefined ? ospiteSelezionato.rsvp_guest_index : null
      );
      setOspiteSelezionato(null);
      await onAggiorna();
    } catch (e: any) {
      setErrore(e.message);
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
      await assegnaPosto(tavoloId, nome, cognome, tipo, allergie, "manuale", null, sediaIndex);
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
