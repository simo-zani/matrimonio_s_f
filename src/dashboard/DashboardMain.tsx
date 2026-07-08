import { useState, useEffect } from "react";
import { fetchGuestsAndTables, type DBRsvp, type DBTable, type DBSeat } from "./lib/queries";
import { ListaInvitati } from "./ListaInvitati";
import { GestioneTavoli } from "./GestioneTavoli";
import "./dashboard.css";

function CountdownMessa() {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const targetDate = new Date("2026-09-05T10:30:00+02:00").getTime();

    function update() {
      const now = new Date().getTime();
      const diff = targetDate - now;

      if (diff <= 0) {
        setTimeLeft("Oggi Sposi!");
        return;
      }

      const giorni = Math.floor(diff / (1000 * 60 * 60 * 24));
      const ore = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minuti = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secondi = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(`Mancano: ${giorni}g ${ore}o ${minuti}m ${secondi}s`);
    }

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="countdown-header" style={{
      fontFamily: "var(--f-testo)",
      fontSize: "0.82rem",
      color: "var(--c-oro-scuro)",
      background: "#fffdf9",
      border: "1px solid var(--c-oro)",
      padding: "4px 10px",
      borderRadius: "20px",
      fontWeight: 600,
      whiteSpace: "nowrap",
      boxShadow: "inset 0 1px 3px rgba(0,0,0,0.02)",
      display: "flex",
      alignItems: "center",
      gap: "4px"
    }}>
      {timeLeft}
    </div>
  );
}

type TabAttiva = "invitati" | "tavoli";

export function DashboardMain() {
  const [tab, setTab] = useState<TabAttiva>("invitati");
  const [rsvps, setRsvps] = useState<DBRsvp[]>([]);
  const [tavoli, setTavoli] = useState<DBTable[]>([]);
  const [posti, setPosti] = useState<DBSeat[]>([]);
  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);
  // Zoom/pan della mappa tavoli: tenuti qui così sopravvivono al cambio di tab
  const [zoomTavoli, setZoomTavoli] = useState(1);
  const [panTavoli, setPanTavoli] = useState({ x: 0, y: 0 });

  async function caricaDati() {
    try {
      const dati = await fetchGuestsAndTables();
      setRsvps(dati.rsvps);
      setTavoli(dati.tavoli);
      setPosti(dati.posti);
      setErrore(null);
    } catch (e: any) {
      setErrore(e.message || "Errore nel caricamento dei dati.");
    } finally {
      setCaricamento(false);
    }
  }

  useEffect(() => {
    caricaDati();
  }, []);

  return (
    <div className="dashboard-root">
      {/* ── Header con navigazione ── */}
      <header className="dashboard-header">
        <h1 className="dashboard-titolo">
          <span className="titolo-nomi">Stefano</span>
          <span className="titolo-amp">&amp;</span>
          <span className="titolo-nomi">Francesca</span>
        </h1>

        <nav className="dashboard-tabs">
          <button
            className={`tab-btn ${tab === "invitati" ? "attiva" : ""}`}
            onClick={() => setTab("invitati")}
          >
            Invitati
          </button>
          <button
            className={`tab-btn ${tab === "tavoli" ? "attiva" : ""}`}
            onClick={() => setTab("tavoli")}
          >
            Tavoli
          </button>
        </nav>

        <CountdownMessa />
      </header>

      {/* ── Contenuto principale ── */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {caricamento ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <p style={{ color: "var(--c-oro-scuro)", fontFamily: "var(--f-titolo)", fontSize: "1.2rem" }}>
              Caricamento dati in corso…
            </p>
          </div>
        ) : errore ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "var(--sp-3)" }}>
            <p style={{ color: "#e74c3c", fontFamily: "var(--f-titolo)", fontSize: "1.1rem" }}>
              {errore}
            </p>
            <button
              onClick={caricaDati}
              style={{
                padding: "8px 20px", background: "var(--c-oro)", border: "none",
                color: "white", borderRadius: "6px", cursor: "pointer", fontFamily: "var(--f-testo)"
              }}
            >
              Riprova
            </button>
          </div>
        ) : (
          <>
            {tab === "invitati" && <ListaInvitati rsvps={rsvps} onAggiorna={caricaDati} />}
            {tab === "tavoli" && (
              <GestioneTavoli
                rsvps={rsvps}
                tavoli={tavoli}
                posti={posti}
                onAggiorna={caricaDati}
                zoom={zoomTavoli}
                setZoom={setZoomTavoli}
                pan={panTavoli}
                setPan={setPanTavoli}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
