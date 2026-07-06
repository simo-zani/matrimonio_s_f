# Fase 1 — Scaffold + design token

**Obiettivo:** progetto Vite in piedi, font e colori centralizzati come token,
così tutto il resto eredita lo stile senza numeri magici sparsi nel codice.

**Prerequisiti:** Fase 0 completata (almeno colori e font).

---

## 1. Crea il progetto

```bash
npm create vite@latest matrimonio-landing -- --template react-ts
cd matrimonio-landing
npm install
npm install motion
```

> `motion` è il pacchetto ex-Framer-Motion. L'import è `import { motion } from "motion/react"`.
> Verifica il nome/versione corrente al momento dell'installazione, il
> packaging è cambiato di recente.

## 2. Design token

Centralizza colori, font e spacing in un unico punto. Usa i **valori esatti
della Fase 0**, questi sono placeholder.

`src/styles/tokens.css`
```css
:root {
  /* Colori — SOSTITUISCI con i tuoi esatti (Fase 0) */
  --c-bianco:        #ffffff;
  --c-panna:         #f7f2e9;
  --c-oro:           #c9a24b;
  --c-oro-scuro:     #9c7a2e;
  --c-testo:         #4a4038;
  --c-ceralacca:     #8c2d24;

  /* Font — SOSTITUISCI con i tuoi (Fase 0) */
  --f-script: "IlTuoScript", cursive;
  --f-titolo: "IlTuoSerif", serif;
  --f-testo:  "IlTuoSans", sans-serif;

  /* Spacing scale */
  --sp-1: 0.5rem;  --sp-2: 1rem;   --sp-3: 1.5rem;
  --sp-4: 2rem;    --sp-6: 3rem;   --sp-8: 4rem;

  /* Curve/durate condivise per coerenza delle animazioni */
  --ease-morbido: cubic-bezier(0.22, 1, 0.36, 1);
}
```

## 3. Carica i font

Se sono file locali (in `assets/font/` → copiali in `public/fonts/`):
```css
@font-face {
  font-family: "IlTuoScript";
  src: url("/fonts/tuo-script.woff2") format("woff2");
  font-display: swap;
}
/* ...ripeti per titolo e testo */
```
Se Google Fonts: metti il `<link>` in `index.html`.

## 4. Reset + base

`src/styles/base.css`
```css
* { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body {
  background: var(--c-panna);
  color: var(--c-testo);
  font-family: var(--f-testo);
  -webkit-font-smoothing: antialiased;
}
```

Importa i CSS in `src/main.tsx`.

## 5. Struttura cartelle consigliata

```
src/
  components/
    Envelope/        # Fase 2 — busta, input, sigillo
    Reveal/          # Fase 3 — scroll reveal
    sections/        # Fase 4 — Hero, Storia, DoveQuando, ComeArrivare
    forms/           # Fase 5 — Rsvp, Allergie
  lib/
    supabase.ts      # Fase 5
    password.ts      # Fase 2 — normalizzazione match
  styles/
    tokens.css
    base.css
  App.tsx
```

---

## Definition of done

- [ ] `npm run dev` parte senza errori
- [ ] I font si vedono applicati a un testo di prova
- [ ] I colori token si vedono (metti un box di prova per ciascuno)
- [ ] La struttura cartelle è creata (anche vuota)
