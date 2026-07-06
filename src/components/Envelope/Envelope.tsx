import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { passwordCorretta } from "../../lib/password";
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
  const [state, setState] = useState<EnvelopeState>("chiusa");
  const [testo, setTesto] = useState("");
  const [tentativi, setTentativi] = useState(0);
  const [particles, setParticles] = useState<Particle[]>([]);
  const riduci = useReducedMotion();

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
      <div
        className="envelope"
        style={{ perspective: riduci ? undefined : 1200 }}
      >
        <div className="envelope-corpo" />

        <motion.div
          className="envelope-lembo"
          animate={
            riduci
              ? { opacity: state === "aperta" ? 0 : 1 }
              : { rotateX: state === "aperta" ? -155 : 0 }
          }
          transition={{ duration: riduci ? 0.3 : 0.9, ease: [0.22, 1, 0.36, 1] }}
        />

        <div className="envelope-input-riga">
          <input
            className="envelope-input"
            value={testo}
            disabled={state !== "chiusa"}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={handleBlurCheck}
            placeholder="i nostri nomi…"
            aria-label="Password d'ingresso"
          />
        </div>

        {tentativi >= 2 && state === "chiusa" && (
          <p className="envelope-hint">
            Suggerimento: il nome di entrambi gli sposi.
          </p>
        )}

        <motion.button
          type="button"
          className="sigillo"
          disabled={state === "chiusa"}
          onClick={apri}
          aria-label="Apri la busta"
          animate={
            state === "sbloccata"
              ? { scale: [1, 1.06, 1] }
              : { scale: 1, opacity: state === "chiusa" ? 0.45 : 1 }
          }
          transition={{ duration: 0.6 }}
        >
          {/* Sigillo senza spazio tra S e F */}
          <span className="sigillo-testo">
            {sposi.iniziali.replace(/\s+/g, "")}
          </span>
        </motion.button>

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
      </div>
    </div>
  );
}
