import { useState, useCallback } from "react";
import type { DBTable, DBSeat, DBRsvp } from "./lib/queries";
import {
  creaTavolo,
  cancellaTavolo,
  aggiornaPosizioneTavolo,
  assegnaPosto,
  rimuoviPosto,
  creaInvitatoManuale,
} from "./lib/queries";
import { TavoloCerchio } from "./components/TavoloCerchio";
import { ListaOspitiDisponibili } from "./components/ListaOspitiDisponibili";
import { ModaleNuovoTavolo } from "./components/ModaleNuovoTavolo";
import { ModaleOspiteManuale } from "./components/ModaleOspiteManuale";
import { ModaleAvviso } from "./components/ModaleAvviso";
import { ModaleConferma } from "./components/ModaleConferma";
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
  const [tavoloDaEliminare, setTavoloDaEliminare] = useState<string | null>(null);
  const [tavoliEspansi, setTavoliEspansi] = useState<Record<string, boolean>>({});

  const toggleTavoloEspanso = (tavoloId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTavoliEspansi((prev) => ({
      ...prev,
      [tavoloId]: !prev[tavoloId],
    }));
  };

  // Stati per Zoom e Pan del foglio
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    // Permetti il trascinamento del foglio solo se clicchi direttamente sullo sfondo
    if ((e.target as HTMLElement).classList.contains("canvas-container")) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isPanning) {
      setIsPanning(false);
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    }
  };

  const zoomIn = () => setZoom((z) => Math.min(2, z + 0.1));
  const zoomOut = () => setZoom((z) => Math.max(0.5, z - 0.1));
  const resetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

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
  async function eseguiCancellaTavolo(id: string) {
    try {
      await cancellaTavolo(id);
      if (tavoloEvidenziato === id) setTavoloEvidenziato(null);
      await onAggiorna();
    } catch (e: any) {
      setErrore(e.message);
    }
  }

  function handleCancellaTavolo(id: string) {
    setTavoloDaEliminare(id);
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
  async function handleAssegna(tavoloId: string, sediaIndex: number, ospiteDaAssegnare?: any) {
    const targetOspite = ospiteDaAssegnare || ospiteSelezionato;
    if (!targetOspite) return;

    // L'assegnazione vera e propria (eseguita subito o dopo conferma dell'avviso)
    const esegui = async () => {
      setAvviso(null);
      try {
        await assegnaPosto(
          tavoloId,
          targetOspite.nome,
          targetOspite.cognome,
          targetOspite.tipo,
          targetOspite.allergie || null,
          targetOspite.fonte,
          targetOspite.rsvp_id || null,
          targetOspite.rsvp_guest_index !== undefined ? targetOspite.rsvp_guest_index : null,
          sediaIndex
        );
        if (ospiteSelezionato && ospiteSelezionato.rsvp_id === targetOspite.rsvp_id && ospiteSelezionato.rsvp_guest_index === targetOspite.rsvp_guest_index) {
          setOspiteSelezionato(null);
        }
        await onAggiorna();
      } catch (e: any) {
        setErrore(e.message);
      }
    };

    // ── Controlli sul nucleo (solo ospiti da RSVP: i manuali non hanno nucleo) ──
    // Un solo avviso alla volta, mutuamente esclusivi:
    let messaggio: string | null = null;
    const rsvpId = targetOspite.rsvp_id;
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

  // ── Aggiunge invitato manuale dal modale ──
  async function handleAggiungiManuale(
    nome: string,
    cognome: string,
    tipo: "adulto" | "bambino",
    allergie: string | null
  ) {
    try {
      await creaInvitatoManuale(nome, cognome, tipo, allergie);
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
      <div
        className="canvas-container"
        onClick={() => setOspiteSelezionato(null)}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          cursor: isPanning ? "grabbing" : "grab",
        }}
      >
        {/* Foglio dei tavoli (scollabile e zoommabile) */}
        <div
          className="canvas-sheet"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "top left",
          }}
        >
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
                zoom={zoom}
              />
            );
          })}
        </div>

        {/* Controlli di Zoom in basso a sinistra */}
        <div className="zoom-controls" onClick={(e) => e.stopPropagation()}>
          <button type="button" onClick={zoomIn} title="Ingrandisci">＋</button>
          <span className="zoom-percentage">{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={zoomOut} title="Rimpicciolisci">－</button>
          <button type="button" onClick={resetZoom} className="zoom-reset-btn">Reset</button>
        </div>

        {/* Pulsante nuovo tavolo (basso destra del canvas) */}
        <button
          className="nuovo-tavolo-btn"
          style={{
            position: "absolute", bottom: "var(--sp-4)", right: "var(--sp-4)",
            width: "auto", padding: "var(--sp-2) var(--sp-4)",
            zIndex: 10
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
              const ospitiTavolo = posti.filter((p) => p.tavolo_id === t.id);
              const occupati = ospitiTavolo.length;
              const espanso = !!tavoliEspansi[t.id];

              return (
                <div
                  key={t.id}
                  className={`riga-tavolo-sidebar-container ${tavoloEvidenziato === t.id ? "evidenziato" : ""}`}
                  style={{
                    marginBottom: "8px",
                    borderRadius: "6px",
                    border: "1px solid #f2ece1",
                    overflow: "hidden",
                    background: tavoloEvidenziato === t.id ? "#e1f5fe" : "white",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 12px",
                      cursor: "pointer",
                    }}
                    onClick={() => setTavoloEvidenziato(t.id === tavoloEvidenziato ? null : t.id)}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <button
                        type="button"
                        onClick={(e) => toggleTavoloEspanso(t.id, e)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: 0,
                          fontSize: "0.8rem",
                          color: "var(--c-oro-scuro)",
                          display: "flex",
                          alignItems: "center",
                          transform: espanso ? "rotate(90deg)" : "rotate(0deg)",
                          transition: "transform 0.2s ease",
                          width: "16px",
                          height: "16px",
                          justifyContent: "center"
                        }}
                        aria-label="Espandi tavolo"
                      >
                        ▶
                      </button>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>{t.nome}</div>
                        <div style={{ fontSize: "0.78rem", color: "var(--c-oro-scuro)" }}>
                          {occupati}/{t.capienza} posti · {t.forma}
                        </div>
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

                  {espanso && (
                    <div
                      className="tavolo-lista-seduti"
                      style={{
                        padding: "4px 12px 10px 32px",
                        borderTop: "1px solid #fdfbf7",
                        background: tavoloEvidenziato === t.id ? "#f3faff" : "#faf8f5",
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                      }}
                    >
                      {ospitiTavolo.length === 0 ? (
                        <div style={{ fontSize: "0.8rem", color: "var(--c-oro-scuro)", fontStyle: "italic" }}>
                          Nessun invitato seduto
                        </div>
                      ) : (
                        ospitiTavolo.map((ospite) => {
                          const sIndex = ospite.sedia_index !== null && ospite.sedia_index !== undefined ? ospite.sedia_index : ospite.rsvp_guest_index;
                          return (
                            <div
                              key={ospite.id}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                fontSize: "0.85rem",
                                padding: "2px 0",
                              }}
                            >
                              <span style={{ fontWeight: 500 }}>
                                {ospite.nome} {ospite.cognome}
                                {ospite.tipo === "bambino" && (
                                  <span style={{ fontSize: "0.75rem", color: "var(--c-oro-scuro)", marginLeft: "4px" }}>
                                    (bambino)
                                  </span>
                                )}
                              </span>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span style={{ fontSize: "0.72rem", color: "var(--c-oro-scuro)", background: "#eee", padding: "1px 4px", borderRadius: "3px" }}>
                                  Sedia {sIndex !== null && sIndex !== undefined ? sIndex + 1 : "?"}
                                </span>
                                <button
                                  type="button"
                                  title="Rimuovi dal tavolo"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRimuovi(ospite.id);
                                  }}
                                  style={{
                                    border: "none",
                                    background: "none",
                                    color: "var(--c-rosso-elimina)",
                                    cursor: "pointer",
                                    fontSize: "0.9rem",
                                    padding: "0 2px",
                                    lineHeight: 1,
                                  }}
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
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

      {/* ── Modale Invitato Manuale ── */}
      {mostraManuale && (
        <ModaleOspiteManuale
          onChiudi={() => setMostraManuale(false)}
          onSalva={handleAggiungiManuale}
        />
      )}

      {/* ── Modale Conferma Cancellazione Tavolo ── */}
      {tavoloDaEliminare && (
        <ModaleConferma
          titolo="Elimina Tavolo"
          messaggio={`Cancellare il tavolo "${tavoli.find((t) => t.id === tavoloDaEliminare)?.nome}"? Tutti i posti assegnati verranno liberati.`}
          testoConferma="Elimina"
          onAnnulla={() => setTavoloDaEliminare(null)}
          onConferma={() => {
            const id = tavoloDaEliminare;
            setTavoloDaEliminare(null);
            eseguiCancellaTavolo(id);
          }}
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
