import { useState, useEffect } from "react";
import { logoutDashboard } from "./lib/dashboardAuth";
import { fetchGuestsAndTables, type DBRsvp, type DBTable, type DBSeat } from "./lib/queries";
import { ListaInvitati } from "./ListaInvitati";
import { GestioneTavoli } from "./GestioneTavoli";
import "./dashboard.css";

type TabAttiva = "invitati" | "tavoli";

export function DashboardMain() {
  const [tab, setTab] = useState<TabAttiva>("invitati");
  const [rsvps, setRsvps] = useState<DBRsvp[]>([]);
  const [tavoli, setTavoli] = useState<DBTable[]>([]);
  const [posti, setPosti] = useState<DBSeat[]>([]);
  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);

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
            👥 Invitati
          </button>
          <button
            className={`tab-btn ${tab === "tavoli" ? "attiva" : ""}`}
            onClick={() => setTab("tavoli")}
          >
            🪑 Piano Tavoli
          </button>
        </nav>

        <button className="logout-btn" onClick={logoutDashboard}>
          Esci
        </button>
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
            {tab === "invitati" && <ListaInvitati rsvps={rsvps} />}
            {tab === "tavoli" && (
              <GestioneTavoli
                rsvps={rsvps}
                tavoli={tavoli}
                posti={posti}
                onAggiorna={caricaDati}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
