import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
// import { passwordCorretta } from "../../lib/password"; // usato dal blocco password, commentato temporaneamente
import { sposi } from "../../lib/dati-evento";
import "./Envelope.css";

type EnvelopeState = "chiusa" | "sbloccata" | "aperta";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
  color: string;
  isStar: boolean;
}

export function Envelope({ onAperta }: { onAperta: () => void }) {
  const [state, setState] = useState<EnvelopeState>("sbloccata"); // era "chiusa", input rimosso temporaneamente
  // const [testo, setTesto] = useState("");
  // const [tentativi, setTentativi] = useState(0);
  const [particles, setParticles] = useState<Particle[]>([]);
  const riduci = useReducedMotion();

  /* TEMPORANEAMENTE DISABILITATO — formattaTesto usato solo con l'input password
  function formattaTesto(str: string): string {
    return str
      .split(/(\s+|&|\+)/)
      .map((word) => {
        if (word.trim().length === 0) return word;
        const lower = word.toLowerCase();
        if (
          lower === "e" ||
          lower === "d'" ||
          lower === "de" ||
          lower === "di" ||
          lower === "&" ||
          lower === "+"
        ) {
          return lower;
        }
        if (/^[a-zA-Z\u00C0-\u00FF]/.test(word)) {
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        }
        return word;
      })
      .join("");
  }
  */

  /* TEMPORANEAMENTE DISABILITATO — input nome/password rimosso
  function handleChange(v: string) {
    const formattato = formattaTesto(v);
    setTesto(formattato);
    if (state === "chiusa" && formattato.length > 0) {
      if (passwordCorretta(formattato)) {
        setState("sbloccata");
      }
    }
  }

  function handleBlurCheck() {
    if (state === "chiusa" && testo.length > 0) setTentativi((t) => t + 1);
  }
  */

  function generateSparkles() {
    const newParticles: Particle[] = Array.from({ length: 45 }).map((_, i) => {
      const angle = Math.random() * Math.PI * 2;
      const distance = 60 + Math.random() * 160;
      const size = 8 + Math.random() * 18;
      const delay = Math.random() * 0.15;
      const duration = 0.6 + Math.random() * 0.6;
      const color = ["#ffd984", "#dab866", "#fff1d0", "#ffffff"][Math.floor(Math.random() * 4)];
      const isStar = Math.random() > 0.45;
      return {
        id: i,
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        size,
        delay,
        duration,
        color,
        isStar,
      };
    });
    setParticles(newParticles);
  }

  function apri() {
    if (state !== "sbloccata") return;
    generateSparkles();
    setState("aperta");
    // Il cartoncino vero e proprio esce con lo scroll (Fase 3):
    // qui segnaliamo solo che la busta è aperta.
    window.setTimeout(onAperta, riduci ? 200 : 1200);
  }

  return (
    <div className="envelope-scene">
      <motion.button
        type="button"
        className="envelope"
        onClick={apri}
        aria-label="Apri la busta"
        whileTap={riduci ? undefined : { scale: 0.97 }}
      >
        <span className="envelope-stack">
          {/* Busta senza sigillo (base): resta sempre visibile sotto */}
          <img
            className="envelope-img"
            src="/immagini/busta.png"
            alt={`Invito di ${sposi.iniziali} — tocca per aprire`}
            draggable={false}
          />
          {/* Busta col sigillo (overlay): si dissolve al click rivelando la busta aperta */}
          <motion.img
            className="envelope-img envelope-img-overlay"
            src="/immagini/busta_sigillo.png"
            alt=""
            aria-hidden
            draggable={false}
            animate={{ opacity: state === "aperta" ? 0 : 1 }}
            transition={{ duration: riduci ? 0.2 : 0.7, ease: "easeInOut" }}
          />
        </span>

        {/* Effetto scintillante */}
        {particles.map((p) => (
          <motion.div
            key={p.id}
            style={{
              position: "absolute",
              left: "50%",
              top: "55%",
              width: p.size,
              height: p.size,
              x: 0,
              y: 0,
              marginLeft: -p.size / 2,
              marginTop: -p.size / 2,
              pointerEvents: "none",
              zIndex: 100,
            }}
            animate={{
              x: p.x,
              y: p.y,
              scale: [0, 1.2, 0.8, 0],
              rotate: [0, Math.random() > 0.5 ? 270 : -270],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              ease: "easeOut",
            }}
          >
            {p.isStar ? (
              <svg viewBox="0 0 24 24" fill={p.color} style={{ width: "100%", height: "100%" }}>
                <path d="M12,2 L14.5,9.5 L22,12 L14.5,14.5 L12,22 L9.5,14.5 L2,12 L9.5,9.5 Z" />
              </svg>
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "50%",
                  backgroundColor: p.color,
                  boxShadow: `0 0 6px ${p.color}`,
                }}
              />
            )}
          </motion.div>
        ))}
      </motion.button>
    </div>
  );
}
