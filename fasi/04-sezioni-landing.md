# Fase 4 — Sezioni della landing

**Obiettivo:** costruire il contenuto del cartoncino, nell'ordine richiesto, con
i testi reali della Fase 0.

**Prerequisito:** Fasi 1-3 (il cartoncino esce). Testi/luoghi dalla Fase 0.

---

## Ordine delle sezioni (dall'alto)

1. **Hero** — nomi degli sposi (font script) + data. È la prima cosa che si vede
   quando il cartoncino esce.
2. **La nostra storia** — la storiella dell'evento. **Testo tuo, non inventato.**
   Da `assets/testi/storia.md`.
3. **Dove & Quando** — chiesa e ricevimento a colpo d'occhio (nomi, orari).
4. → *(Fase 5)* Form RSVP
5. → *(Fase 5)* Form allergie/intolleranze (opzionale)
6. **Come arrivare** — indicazioni per chiesa e location, in fondo.

## Animazioni d'ingresso delle sezioni

Ogni sezione entra con un fade + leggero slide quando arriva in viewport. Sobrio,
coerente con l'eleganza del resto.

```tsx
import { motion } from "motion/react";

function Sezione({ children }: { children: React.ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.section>
  );
}
```

## Hero

- Nomi in `--f-script`, grandi, centrati.
- Data in `--f-titolo`, più piccola.
- Eventuale monogramma/decoro (Fase 0) sopra o tra i nomi.
- Palette: fondo panna/bianco, dettagli oro.

## La nostra storia

- Titolo in `--f-titolo`.
- Corpo in `--f-testo`, larghezza di lettura contenuta (~60-70 caratteri per
  riga) per leggibilità.
- Eventuale foto (Fase 0) affiancata o sopra.
- **Incolla il testo esatto**, senza rimaneggiarlo.

## Dove & Quando (riepilogo)

Due "card" affiancate (o impilate su mobile): Cerimonia e Ricevimento, con nome,
orario e un accenno di indirizzo. Il dettaglio + mappa stanno in "Come arrivare".

## Come arrivare (in fondo)

Per ciascun luogo:
- Nome + indirizzo completo (Fase 0)
- Orario
- **Mappa**: consigliata l'opzione immagine statica + bottone "Apri in Maps"
  (più leggera ed elegante dell'embed). Il bottone è un link:
  ```tsx
  <a href={LINK_MAPS_CHIESA} target="_blank" rel="noopener">Apri in Maps</a>
  ```
- Se preferisci l'embed interattivo, si usa un `<iframe>` di Google Maps.

---

## Definition of done

- [ ] Tutte le sezioni presenti nell'ordine giusto
- [ ] Testi reali inseriti (niente placeholder, niente inventato)
- [ ] Ingresso animato coerente e sobrio
- [ ] Leggibile e ordinato su mobile (verifica larghezza righe)
- [ ] Link/mappe funzionanti verso i luoghi reali
