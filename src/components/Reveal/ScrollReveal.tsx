import { useState, useEffect, type ReactNode } from "react";
import { motion } from "motion/react";
import "./ScrollReveal.css";

/**
 * Zoom-from-envelope reveal.
 *
 * Il cartoncino parte piccolo (scala 0.12, centrato nello schermo esattamente
 * dove stava la busta) e si espande a tutto schermo con una curva rapida
 * all'inizio e morbida alla fine — ispirata all'animazione finestre di macOS.
 * Una volta completata, l'elemento diventa posizionamento normale e il
 * contenuto è scrollabile liberamente.
 */
export function ScrollReveal({ children }: { children: ReactNode }) {
  const [animDone, setAnimDone] = useState(false);

  // Blocca lo scroll durante l'animazione di zoom
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  function handleAnimComplete() {
    document.body.style.overflow = "";
    setAnimDone(true);
  }

  return (
    <motion.div
      /* Durante l'animazione: fixed a tutto schermo (trasformato via scale).
         Dopo: torna nel flusso normale per permettere lo scroll.          */
      className={`sr-page${animDone ? "" : " sr-page--animating"}`}
      initial={{ scale: 0.12, opacity: 0, borderRadius: "14px" }}
      animate={{ scale: 1,    opacity: 1, borderRadius:  "0px" }}
      transition={{
        duration:     0.72,
        ease:         [0.14, 1, 0.34, 1],   // fast-in / soft-settle (mac-like)
        opacity:      { duration: 0.28, ease: "easeOut" },
        borderRadius: { duration: 0.55, ease: "easeOut" },
      }}
      onAnimationComplete={handleAnimComplete}
    >
      {children}
    </motion.div>
  );
}
