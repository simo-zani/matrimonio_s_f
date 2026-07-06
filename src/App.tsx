import { useState } from "react";
import { motion } from "motion/react";
import { Envelope } from "./components/Envelope/Envelope";
import { Cartoncino } from "./components/Reveal/Cartoncino";
import { Hero } from "./components/sections/Hero";
import { Storia } from "./components/sections/Storia";
import { DoveQuando } from "./components/sections/DoveQuando";
import { Rsvp } from "./components/forms/Rsvp";
import { Login } from "./dashboard/Login";
import { DashboardMain } from "./dashboard/DashboardMain";
import { useSessioneAttiva } from "./dashboard/lib/dashboardAuth";
// Import Cartoncino.css for styling the frame and glow overlay
import "./components/Reveal/Cartoncino.css";

type AppFase = "busta" | "bagliore_espande" | "bagliore_dirada" | "aperta";

// ── Slug segreto della dashboard — non compare in nessun link pubblico del sito ──
const DASHBOARD_PATH = "/dashboard-mg2027";

function DashboardRouter() {
  const sessione = useSessioneAttiva();
  if (sessione === null) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--c-oro-scuro)", fontFamily: "var(--f-titolo)" }}>Caricamento…</p>
      </div>
    );
  }
  return sessione ? <DashboardMain /> : <Login />;
}

function App() {
  const [fase, setFase] = useState<AppFase>("busta");

  // ── Routing manuale senza react-router ──
  if (window.location.pathname === DASHBOARD_PATH) {
    return <DashboardRouter />;
  }

  const contenuto = (
    <Cartoncino>
      <Hero />
      <Storia />
      <DoveQuando />
      <Rsvp />
    </Cartoncino>
  );

  return (
    <>
      {/* 1. Vista Busta: rimane montata durante "busta" e "bagliore_espande" per mantenere lo stato aperto */}
      {(fase === "busta" || fase === "bagliore_espande") && (
        <Envelope onAperta={() => setFase("bagliore_espande")} />
      )}

      {/* 2. Landing Page: viene montata solo quando il bagliore ha coperto al 100% lo schermo */}
      {(fase === "bagliore_dirada" || fase === "aperta") && (
        <>
          <div className="schermo-cornice-oro" />
          {contenuto}
        </>
      )}

      {/* 3. Bagliore in ESPANSIONE (sopra la busta) */}
      {fase === "bagliore_espande" && (
        <motion.div
          className="transizione-bagliore"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1.2, 3.5], opacity: [0, 1, 1] }}
          transition={{
            duration: 1.6,
            times: [0, 0.45, 1],
            ease: "easeInOut",
          }}
          onAnimationComplete={() => {
            setFase("bagliore_dirada");
          }}
        />
      )}

      {/* 4. Bagliore in DISSOLVENZA (sopra la landing page) */}
      {fase === "bagliore_dirada" && (
        <motion.div
          className="transizione-bagliore"
          initial={{ scale: 3.5, opacity: 1 }}
          animate={{ scale: 3.5, opacity: 0 }}
          transition={{ duration: 2.0, ease: "easeOut" }}
          style={{ pointerEvents: "none" }}
          onAnimationComplete={() => {
            setFase("aperta");
          }}
        />
      )}
    </>
  );
}

export default App;
