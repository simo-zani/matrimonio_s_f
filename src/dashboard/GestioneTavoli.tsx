import { useState, useCallback, useRef, useEffect } from "react";
import type { DBTable, DBSeat, DBRsvp } from "./lib/queries";
import {
  creaTavolo,
  cancellaTavolo,
  aggiornaPosizioneTavolo,
  aggiornaCapienzaTavolo,
  spostaPosto,
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
  zoom: number;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  pan: { x: number; y: number };
  setPan: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
}

export function GestioneTavoli({
  rsvps,
  tavoli,
  posti,
  onAggiorna,
  zoom,
  setZoom,
  pan,
  setPan,
}: GestioneTavoliProps) {
  const [ospiteSelezionato, setOspiteSelezionato] = useState<any | null>(null);
  const [tavoloEvidenziato, setTavoloEvidenziato] = useState<string | null>(null);
  // Posto "armato": sedia vuota cliccata in attesa che si scelga un invitato dalla lista
  const [postoTarget, setPostoTarget] = useState<{ tavoloId: string; sediaIndex: number } | null>(null);
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

  // Stati per Zoom e Pan del foglio (zoom/pan arrivano da props: sopravvivono al cambio tab)
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  // Transizione fluida solo per zoom da pulsanti/ricentra, non per rotellina/pinch/pan
  const [transizione, setTransizione] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  // Traccia se c'è stato un vero trascinamento del foglio, per non deselezionare
  // erroneamente al rilascio (il pan termina con un click sullo sfondo).
  const panMosso = useRef(false);
  // Ref sempre aggiornati con zoom/pan correnti, per i listener nativi (wheel/touch)
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const panRef = useRef(pan);
  panRef.current = pan;
  const pinchAttivo = useRef(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    // Il pan parte cliccando sullo sfondo: sia il container sia il foglio dei tavoli
    // (il foglio copre tutta l'area, quindi i click "vuoti" arrivano su di esso).
    if (pinchAttivo.current) return; // durante il pinch non trascinare il foglio
    const target = e.target as HTMLElement;
    if (
      target.classList.contains("canvas-container") ||
      target.classList.contains("canvas-sheet")
    ) {
      setIsPanning(true);
      setTransizione(false);
      panMosso.current = false;
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      target.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (pinchAttivo.current) return;
    if (isPanning) {
      panMosso.current = true;
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

  const zoomIn = () => { setTransizione(true); setZoom((z) => Math.min(2, z + 0.1)); };
  const zoomOut = () => { setTransizione(true); setZoom((z) => Math.max(0.5, z - 0.1)); };

  // ── Zoom con rotellina del mouse / pinch su trackpad e smartphone ──
  // Listener nativi (non passivi) per poter chiamare preventDefault ed evitare lo scroll pagina.
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const clamp = (z: number) => Math.min(2, Math.max(0.5, z));

    // Applica un nuovo zoom mantenendo fermo il punto (px, py) relativo al container
    const zoomVerso = (nuovoZoom: number, px: number, py: number) => {
      const z0 = zoomRef.current;
      const z1 = clamp(nuovoZoom);
      if (z1 === z0) return;
      const ratio = z1 / z0;
      const p = panRef.current;
      setTransizione(false);
      setZoom(z1);
      setPan({ x: px - (px - p.x) * ratio, y: py - (py - p.y) * ratio });
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      // Fattore proporzionale allo scroll, ma poco sensibile: ~10% per tacca di mouse,
      // piccoli passi fluidi sul trackpad.
      const fattore = Math.exp(-e.deltaY * 0.001);
      zoomVerso(zoomRef.current * fattore, px, py);
    };

    const distanza = (t0: Touch, t1: Touch) =>
      Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);

    let pinchStart: {
      dist: number;
      zoom: number;
      panX: number;
      panY: number;
      cx: number;
      cy: number;
    } | null = null;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const rect = el.getBoundingClientRect();
        const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
        const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
        pinchStart = {
          dist: distanza(e.touches[0], e.touches[1]),
          zoom: zoomRef.current,
          panX: panRef.current.x,
          panY: panRef.current.y,
          cx,
          cy,
        };
        pinchAttivo.current = true;
        setIsPanning(false);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchStart) {
        e.preventDefault();
        const d = distanza(e.touches[0], e.touches[1]);
        const z1 = clamp((pinchStart.zoom * d) / pinchStart.dist);
        const ratio = z1 / pinchStart.zoom;
        setTransizione(false);
        setZoom(z1);
        setPan({
          x: pinchStart.cx - (pinchStart.cx - pinchStart.panX) * ratio,
          y: pinchStart.cy - (pinchStart.cy - pinchStart.panY) * ratio,
        });
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        pinchStart = null;
        // piccolo ritardo per non far ripartire subito il pan da un dito residuo
        pinchAttivo.current = false;
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);

    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [setZoom, setPan]);

  // Dimensioni del corpo del tavolo in base alla forma (per calcolarne il centro).
  function dimTavolo(forma: DBTable["forma"]) {
    switch (forma) {
      case "ellisse":
        return { w: 160, h: 100 };
      case "imperiale":
        return { w: 220, h: 80 };
      default:
        return { w: 140, h: 140 }; // tondo, quadrato
    }
  }

  // Riporta la mappa al 100% con il tavolo degli Sposi centrato in alto, sotto la navbar.
  const ricentra = () => {
    const container = canvasRef.current;
    const sposi = tavoli.find((t) => t.nome.toLowerCase() === "sposi");
    if (!container || !sposi) {
      setTransizione(true);
      setZoom(1);
      setPan({ x: 0, y: 0 });
      return;
    }
    const rect = container.getBoundingClientRect();
    const { w } = dimTavolo(sposi.forma);
    const centerX = sposi.pos_x + w / 2;
    const topMargin = 90; // spazio sotto la navbar, lascia visibili le sedie sopra il tavolo
    setTransizione(true);
    setZoom(1);
    setPan({
      x: rect.width / 2 - centerX,
      y: topMargin - sposi.pos_y,
    });
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
    if (!targetOspite) {
      // Nessun invitato pronto: "arma" la sedia e aspetta una scelta dalla lista
      setPostoTarget({ tavoloId, sediaIndex });
      return;
    }

    // L'assegnazione vera e propria (eseguita subito o dopo conferma dell'avviso)
    const esegui = async () => {
      setAvviso(null);
      setPostoTarget(null);
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

  // ── Selezione invitato dalla lista ──
  // Se c'è una sedia "armata" (+ verde cliccato prima), assegna subito lì.
  function handleSelezionaOspite(ospite: any | null) {
    if (ospite && postoTarget) {
      const { tavoloId, sediaIndex } = postoTarget;
      setPostoTarget(null);
      handleAssegna(tavoloId, sediaIndex, ospite);
      return;
    }
    setOspiteSelezionato(ospite);
  }

  // ── Aggiungi/rimuovi una sedia al tavolo ──
  async function handleModificaCapienza(t: DBTable, delta: number) {
    const nuova = t.capienza + delta;
    if (nuova < 1) return;
    if (delta < 0) {
      // Non rimuovere una sedia occupata: nessun invitato deve stare su un indice >= nuova capienza
      const occupaUltime = posti
        .filter((p) => p.tavolo_id === t.id)
        .some((p) => {
          const s = indiceSedia(p);
          return s !== null && s >= nuova;
        });
      if (occupaUltime) {
        setErrore("Libera o sposta prima gli invitati dalle ultime sedie.");
        return;
      }
    }
    try {
      await aggiornaCapienzaTavolo(t.id, nuova);
      await onAggiorna();
    } catch (e: any) {
      setErrore(e.message);
    }
  }

  // ── Sposta un invitato sulla sedia precedente/successiva (scambio se occupata) ──
  async function handleSpostaOspite(t: DBTable, ospite: DBSeat, direzione: -1 | 1) {
    const corrente = indiceSedia(ospite);
    if (corrente === null) return;
    const target = corrente + direzione;
    if (target < 0 || target >= t.capienza) return;

    const occupante = posti.find(
      (p) => p.tavolo_id === t.id && p.id !== ospite.id && indiceSedia(p) === target
    );

    try {
      if (occupante) {
        // Scambio con indice temporaneo per evitare conflitti di unicità
        await spostaPosto(occupante.id, -1);
        await spostaPosto(ospite.id, target);
        await spostaPosto(occupante.id, corrente);
      } else {
        await spostaPosto(ospite.id, target);
      }
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

  // ── Aggiunge invitato manuale dal modale ──
  async function handleAggiungiManuale(
    nome: string,
    cognome: string,
    allergie: string | null,
    accompagnatori: { nome: string; cognome: string; tipo: "adulto" | "bambino" }[]
  ) {
    try {
      await creaInvitatoManuale(nome, cognome, allergie, accompagnatori);
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
        onSelezionaOspite={handleSelezionaOspite}
        onInizioDrag={(o) => {
          setPostoTarget(null);
          setOspiteSelezionato(o);
        }}
        onApriModaleManuale={() => setMostraManuale(true)}
      />

      {/* ── Canvas Centrale: Piano dei Tavoli ── */}
      <div
        ref={canvasRef}
        className="canvas-container"
        onClick={() => {
          // Se veniamo da un trascinamento del foglio, non deselezionare nulla.
          if (panMosso.current) {
            panMosso.current = false;
            return;
          }
          setOspiteSelezionato(null);
          setTavoloEvidenziato(null);
          setPostoTarget(null);
        }}
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
            // Transizione fluida solo per zoom da pulsanti/ricentra; immediata per pan/rotellina/pinch
            transition: transizione ? "transform 0.3s ease" : "none",
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
                onEvidenzia={() =>
                  setTavoloEvidenziato((prev) => (prev === tavolo.id ? null : tavolo.id))
                }
                postoTarget={postoTarget}
                zoom={zoom}
              />
            );
          })}
        </div>

        {/* Controlli in basso a sinistra: zoom + ricentra (separati) */}
        <div className="canvas-toolbar" onClick={(e) => e.stopPropagation()}>
          <div className="zoom-controls">
            <button type="button" onClick={zoomIn} title="Ingrandisci">＋</button>
            <span className="zoom-percentage">{Math.round(zoom * 100)}%</span>
            <button type="button" onClick={zoomOut} title="Rimpicciolisci">－</button>
          </div>
          <button
            type="button"
            onClick={ricentra}
            className="ricentra-btn"
            title="Ricentra sul tavolo Sposi (100%)"
            aria-label="Ricentra la mappa"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <line x1="12" y1="2" x2="12" y2="5" />
              <line x1="12" y1="19" x2="12" y2="22" />
              <line x1="2" y1="12" x2="5" y2="12" />
              <line x1="19" y1="12" x2="22" y2="12" />
            </svg>
          </button>
        </div>

        {/* Pulsante nuovo tavolo (basso destra del canvas) */}
        <button
          className="nuovo-tavolo-btn nuovo-tavolo-canvas"
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

        <div
          className="tavoli-elenco"
          onClick={(e) => {
            // Click sullo sfondo dell'elenco (non su un tavolo) → deseleziona
            if (e.target === e.currentTarget) setTavoloEvidenziato(null);
          }}
        >
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
                        <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>{t.nome.toUpperCase()}</div>
                        <div style={{ fontSize: "0.78rem", color: "var(--c-oro-scuro)" }}>
                          {occupati}/{t.capienza} posti · {t.forma}
                        </div>
                      </div>
                    </div>
                    {t.nome.toLowerCase() !== "sposi" && (
                      <button
                        className="sidebar-cancella-tavolo-btn"
                        title="Cancella tavolo"
                        onClick={(e) => { e.stopPropagation(); handleCancellaTavolo(t.id); }}
                      >
                        ✕
                      </button>
                    )}
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
                      {/* Stepper capienza: aggiungi/rimuovi una sedia */}
                      {t.nome.toLowerCase() !== "sposi" && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            fontSize: "0.8rem",
                            color: "var(--c-oro-scuro)",
                            paddingBottom: "4px",
                            marginBottom: "2px",
                            borderBottom: "1px dashed #ece4d6",
                          }}
                        >
                          <span>Posti (sedie)</span>
                          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <button
                              type="button"
                              className="mini-arrow-btn"
                              title="Rimuovi una sedia"
                              disabled={t.capienza <= 1}
                              onClick={(e) => { e.stopPropagation(); handleModificaCapienza(t, -1); }}
                            >
                              −
                            </button>
                            <span style={{ minWidth: "20px", textAlign: "center", fontWeight: 600, color: "var(--c-testo)" }}>
                              {t.capienza}
                            </span>
                            <button
                              type="button"
                              className="mini-arrow-btn"
                              title="Aggiungi una sedia"
                              onClick={(e) => { e.stopPropagation(); handleModificaCapienza(t, 1); }}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      )}

                      {ospitiTavolo.length === 0 ? (
                        <div style={{ fontSize: "0.8rem", color: "var(--c-oro-scuro)", fontStyle: "italic" }}>
                          Nessun invitato seduto
                        </div>
                      ) : (
                        [...ospitiTavolo]
                          .sort((a, b) => (indiceSedia(a) ?? 0) - (indiceSedia(b) ?? 0))
                          .map((ospite) => {
                            const sIndex = indiceSedia(ospite);
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
                                {/* Frecce per spostare l'invitato di sedia */}
                                <button
                                  type="button"
                                  className="mini-arrow-btn"
                                  title="Sposta alla sedia precedente"
                                  disabled={sIndex === null || sIndex <= 0}
                                  onClick={(e) => { e.stopPropagation(); handleSpostaOspite(t, ospite, -1); }}
                                >
                                  ▲
                                </button>
                                <button
                                  type="button"
                                  className="mini-arrow-btn"
                                  title="Sposta alla sedia successiva"
                                  disabled={sIndex === null || sIndex >= t.capienza - 1}
                                  onClick={(e) => { e.stopPropagation(); handleSpostaOspite(t, ospite, 1); }}
                                >
                                  ▼
                                </button>
                                <span style={{ fontSize: "0.72rem", color: "var(--c-oro-scuro)", background: "#eee", padding: "1px 4px", borderRadius: "3px" }}>
                                  Sedia {sIndex !== null ? sIndex + 1 : "?"}
                                </span>
                                {t.nome.toLowerCase() !== "sposi" && (
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
                                )}
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
