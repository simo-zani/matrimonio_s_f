import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { passwordCorretta } from "../../lib/password";
import { sposi } from "../../lib/dati-evento";
import "./Envelope.css";

type EnvelopeState = "chiusa" | "sbloccata" | "aperta";

export function Envelope({ onAperta }: { onAperta: () => void }) {
  const [state, setState] = useState<EnvelopeState>("chiusa");
  const [testo, setTesto] = useState("");
  const [tentativi, setTentativi] = useState(0);
  const riduci = useReducedMotion();

  function handleChange(v: string) {
    setTesto(v);
    if (state === "chiusa" && v.length > 0) {
      if (passwordCorretta(v)) {
        setState("sbloccata");
      }
    }
  }

  function handleBlurCheck() {
    if (state === "chiusa" && testo.length > 0) setTentativi((t) => t + 1);
  }

  function apri() {
    if (state !== "sbloccata") return;
    setState("aperta");
    // Il cartoncino vero e proprio esce con lo scroll (Fase 3):
    // qui segnaliamo solo che la busta è aperta.
    window.setTimeout(onAperta, riduci ? 200 : 900);
  }

  return (
    <div className="envelope-scene">
      <div
        className="envelope"
        style={{ perspective: riduci ? undefined : 1200 }}
      >
        {/* PLACEHOLDER: nessuna texture busta fornita (Fase 0) — sfondo a
            gradiente panna/oro invece di una foto reale della carta. */}
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
          {/* PLACEHOLDER: nessun PNG sigillo fornito — iniziali reali degli
              sposi al posto della ceralacca. */}
          <span className="sigillo-testo">{sposi.iniziali}</span>
        </motion.button>
      </div>
    </div>
  );
}
