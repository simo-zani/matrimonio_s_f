import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import "./Cartoncino.css";

/**
 * Fase 3 — versione SEMPLIFICATA.
 *
 * La spec (03-scroll-reveal-cartoncino.md) descrive un pattern pinnato più
 * elaborato (il cartoncino "esce" progressivamente legato allo scroll).
 * Questa è una base funzionante più semplice: appena la busta si apre, il
 * cartoncino entra con un fade + slide-up una tantum, poi il contenuto
 * scorre normalmente. Buona base per iterare quando si vuole affinare il
 * "feel" — vedi il file di fase per il pattern pinnato completo.
 */
export function Cartoncino({ children }: { children: ReactNode }) {
  const riduci = useReducedMotion();

  return (
    <motion.div
      className="cartoncino"
      initial={{ opacity: 0, y: riduci ? 0 : 60 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: riduci ? 0.2 : 0.9, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
