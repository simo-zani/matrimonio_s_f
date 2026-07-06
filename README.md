# Landing – Annuncio matrimonio

Sito a invito con animazione **busta → sigillo di ceralacca → cartoncino** che esce
allo scroll, e sotto la landing vera (storia, RSVP, allergie, come arrivare).

## Come è organizzato questo pacchetto

Ogni fase è una cartella/file numerato. Vanno affrontate **in ordine**, perché
sono ordinate per rischio: la parte difficile (l'apertura della busta) viene
validata subito, prima di costruirci sopra i contenuti.

| Fase | File | Cosa produce |
|------|------|--------------|
| 0 | `00-asset-da-fornire.md` | **Roba che devi dare tu** prima di iniziare |
| 1 | `01-scaffold-e-design-token.md` | Progetto Vite + design token |
| 2 | `02-busta-sigillo-password.md` | Busta, input password, sigillo cliccabile |
| 3 | `03-scroll-reveal-cartoncino.md` | Il cartoncino esce con lo scroll |
| 4 | `04-sezioni-landing.md` | Hero, storia, dove & quando |
| 5 | `05-form-supabase.md` | RSVP + allergie → Supabase |
| 6 | `06-polish-mobile-reduced-motion.md` | Mobile, reduced-motion, edge case |
| 7 | `07-deploy-vercel.md` | Online su Vercel |
| 8 | `08-dashboard-invitati-tavoli.md` | Dashboard privata: invitati + gestione tavoli |

## Stack

- React + Vite + TypeScript
- **Motion** (ex Framer Motion, pacchetto `motion`, import `motion/react`)
- Supabase (backend RSVP + Auth per la dashboard privata)
- Deploy su Vercel

## Decisione backend (già presa)

**Supabase, non Google Forms.** Motivo: la lista ospiti (accompagnatori +
bambini con nome e cognome) è di lunghezza variabile, e Forms ha campi fissi.
Con Supabase la modelli in modo naturale (una colonna `jsonb` con l'array
ospiti). Setup reale ~15 minuti. Dettagli in Fase 5.

## Nota importante sulla "password"

La password = nomi degli sposi è un **cancello estetico**, non sicurezza vera:
il controllo è lato client, chi apre il codice sorgente la vede. Per un
matrimonio va benissimo. La cosa da proteggere sul serio è la **tabella RSVP**,
e quella la blocchi con la RLS di Supabase (Fase 5): insert-only, nessuna
lettura pubblica.

## Prima di partire

Compila **prima** la Fase 0. Senza asset (font, colori esatti, storia, luoghi)
il resto esce incoerente e poi va rifatto.

## Stato del progetto

Fasi 1-4 hanno una prima implementazione funzionante in `src/` (vedi sotto),
con placeholder chiaramente marcati dove mancano asset veri. Fase 5 (RSVP) ha
solo l'interfaccia: il salvataggio su Supabase si attiva compilando `.env`
(copia `.env.example`). Fasi 6, 7 e 8 sono ancora solo pianificazione.

Per avviare in locale:
```bash
npm install
npm run dev
```
