# Fase 6 — Polish: mobile, reduced-motion, edge case

**Obiettivo:** rendere l'esperienza solida ovunque. Un matrimonio si apre per
lo più **da telefono**, spesso su device non recenti. Qui si vince o si perde la
sensazione di "eleganza fluida".

**Prerequisito:** Fasi 1-5 funzionanti.

---

## 1. Mobile (priorità alta)

- Testa su **device reali**, non solo emulatore. iOS Safari e Android Chrome si
  comportano diversamente, specie su animazioni e `sticky`.
- La sequenza busta→sigillo→scroll-reveal (Fasi 2-3) va provata col **dito**.
  Il pattern pinnato (Fase 3) è scelto apposta per non fare jank su touch.
- Tap target del sigillo ≥ 44px.
- Font script leggibile anche piccolo; se no, ingrandisci solo lì.
- Le due card "Dove & Quando" si impilano su schermo stretto.

## 2. `prefers-reduced-motion`

Chi ha attivo il "riduci movimento" (o device deboli) deve avere una versione
**semplificata**, non l'assenza di contenuto.

```tsx
import { useReducedMotion } from "motion/react";
const riduci = useReducedMotion();
```

Comportamento ridotto suggerito:
- La sequenza 3D di apertura busta → diventa un **fade** busta→cartoncino.
- Lo scroll-reveal pinnato → il cartoncino è **già fuori**, si scrolla e basta.
- Gli ingressi sezione → fade senza slide, durate più corte.

```css
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```
(più la logica JS sopra per saltare le sequenze complesse)

## 3. Edge case della password

- Accenti, maiuscole, spazi doppi, `&` invece di "e" → già gestiti dalla
  normalizzazione (Fase 2). Rileggi quella logica con i **nomi reali**.
- Cosa succede se uno **non trova** la password? Metti un piccolo hint (es. "il
  nome di entrambi gli sposi") sotto l'input dopo 2-3 tentativi errati.
- Copia-incolla con spazi strani → il `trim`/collapse li gestisce.

## 4. Performance

- Immagini: usa **WebP**, dimensiona giuste (niente foto 4000px in un thumb).
- Il sigillo e le texture pesano: comprimili.
- `font-display: swap` già impostato (Fase 1).
- Lazy-load delle immagini sotto la piega (`loading="lazy"`).
- Anima **solo** `transform`/`opacity` (regola di tutte le fasi).

## 5. Accessibilità di base

- `alt` su tutte le immagini significative.
- Contrasto testo/sfondo: oro su bianco può essere basso — verifica il testo di
  lettura (non i decori) sia leggibile.
- L'input password raggiungibile da tastiera; il sigillo è un `button` reale.
- Focus visibile sui campi del form.

## 6. Contenuti & errori umani

- Rileggi **tutti** i testi (nomi, date, indirizzi) con qualcuno: gli errori su
  data/luogo sono i più costosi.
- Verifica che i **link Maps** puntino ai posti giusti.
- Prova un invio RSVP completo e controlla che arrivi in Supabase corretto.

---

## Definition of done

- [ ] Testato su almeno 1 iPhone e 1 Android reali
- [ ] Versione reduced-motion funzionante e sensata
- [ ] Password tollerante verificata coi nomi reali
- [ ] Immagini ottimizzate, caricamento veloce
- [ ] Testi e link riletti e confermati
- [ ] Un RSVP di prova arriva corretto in dashboard
