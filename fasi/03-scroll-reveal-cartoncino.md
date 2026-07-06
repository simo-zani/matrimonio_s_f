# Fase 3 — Il cartoncino esce con lo scroll

**Obiettivo:** dopo che il sigillo è aperto, lo scroll (dito o mouse) fa uscire
il cartoncino dalla busta come un biglietto che si estrae. Quando è
completamente fuori, la landing scorre normalmente.

**Prerequisito:** Fase 2 conclusa (stato `'aperta'` raggiungibile).

---

## Il pattern giusto (e quello da evitare)

❌ **Da evitare:** intercettare lo scroll con `preventDefault` / `wheel` hijack.
Su touch fa jank e sensazione di "bloccato". Fonte di frustrazione su mobile.

✅ **Da usare:** una **sezione intro pinnata**. Un contenitore alto (es. 200vh);
dentro, busta+cartoncino in `position: sticky; top: 0` (quindi restano fermi in
viewport mentre scrolli); si legge il progresso di scroll di quel contenitore e
lo si mappa sul `translateY` del cartoncino. Quando il progresso arriva a 1 e la
sezione finisce, il contenuto vero scorre sotto in modo **nativo**.

Risultato: nessun blocco dello scroll → fluidità "burro", identica su desktop e
mobile.

## Implementazione

```tsx
import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";

function IntroReveal({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  // progresso 0→1 mentre la sezione attraversa il viewport
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  // il cartoncino esce verso l'alto man mano che scrolli
  const cardY = useTransform(scrollYProgress, [0, 1], ["0%", "-120%"]);
  // la busta può sfumare/scendere leggermente sul finale
  const bustaOpacity = useTransform(scrollYProgress, [0.6, 1], [1, 0]);

  return (
    <section ref={ref} style={{ height: "200vh", position: "relative" }}>
      <div style={{
        position: "sticky", top: 0, height: "100vh",
        display: "grid", placeItems: "center", overflow: "hidden",
      }}>
        <motion.div style={{ opacity: bustaOpacity }}>
          {/* busta (dalla Fase 2) */}
        </motion.div>
        <motion.div style={{ y: cardY, position: "absolute" }}>
          {/* il cartoncino con la landing dentro */}
          {children}
        </motion.div>
      </div>
    </section>
  );
}
```

## Collegamento con la Fase 2

Finché lo stato è `'chiusa'`/`'sbloccata'`, **disabilita lo scroll** della
sezione intro (es. `overflow: hidden` sul body, o la sezione non ancora
"attiva"). Solo al passaggio a `'aperta'` riabiliti lo scroll: così l'utente non
può estrarre il cartoncino prima di aver aperto il sigillo. Un micro-hint ("↓
scorri") che compare dopo l'apertura aiuta a capire cosa fare.

## Note di fluidità

- Solo `transform`/`opacity` animati (già impostato: `y` e `opacity`).
- Le `useTransform` sono lineari e legate allo scroll → sensazione diretta.
- Se vuoi un filo di "peso"/inerzia, avvolgi con `useSpring` il valore di scroll
  (con parsimonia, troppo spring = sensazione di ritardo).
- Testa su un telefono vero, non solo emulatore.

---

## Definition of done

- [ ] Prima dell'apertura del sigillo lo scroll non estrae il cartoncino
- [ ] Dopo l'apertura, scroll = il cartoncino esce in modo continuo e diretto
- [ ] A fine estrazione la landing scorre normale (nativo)
- [ ] Nessun jank su mobile (testato su device reale)
- [ ] Un hint di scroll compare al momento giusto
