# Fase 7 — Deploy su Vercel

**Obiettivo:** sito online, veloce, con le variabili d'ambiente configurate e
(opzionale) dominio custom.

**Prerequisito:** Fasi 1-6. Repo su GitHub. Account Vercel (gratis).

---

## 1. Prepara il repo

- Assicurati che `.env` sia in `.gitignore` (**non** committare le chiavi).
- `npm run build` deve completare senza errori in locale.
- Push su GitHub.

## 2. Importa su Vercel

- Vercel → New Project → importa il repo GitHub.
- Framework preset: **Vite** (autorilevato).
- Build command: `npm run build` — Output dir: `dist` (default Vite).

## 3. Variabili d'ambiente

In Vercel → Project → Settings → Environment Variables, aggiungi:
```
VITE_SUPABASE_URL      = https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY = eyJ...
```
Poi **redeploy** (le env si applicano al build successivo).

> L'anon key è pubblica by design (sta nel bundle client). La protezione resta
> la RLS di Supabase (Fase 5), non la segretezza della chiave.

## 4. Dominio

- **Gratis:** usi il sottodominio `*.vercel.app`.
- **Custom:** Vercel → Settings → Domains → aggiungi `marco-e-giulia.it` e segui
  le istruzioni DNS (record presso il tuo registrar). Il certificato HTTPS è
  automatico.

## 5. Verifiche post-deploy

- [ ] Apertura busta → sigillo → scroll-reveal funziona **in produzione** (a
      volte le animazioni si comportano diversamente dal dev).
- [ ] Font caricati (niente fallback di sistema visibile).
- [ ] Immagini/texture visibili e ottimizzate.
- [ ] Un **RSVP di prova reale** arriva corretto in Supabase.
- [ ] Testato dal telefono, sulla rete mobile (non solo Wi-Fi di casa).
- [ ] Link Maps corretti.

## 6. Prima di condividerlo

- Rileggi ancora nomi/data/luoghi (ultimo giro).
- Manda il link a 2-3 persone "cavia" prima dell'invio di massa: scoprono subito
  se la password non è chiara o se qualcosa non va sul loro telefono.
- Ricorda la **scadenza RSVP** (Fase 0) nel testo del form.

---

## Definition of done

- [ ] Sito online e raggiungibile
- [ ] Env configurate, RSVP scrive in produzione
- [ ] Testato su mobile in rete mobile
- [ ] Cavia-test superato
- [ ] (Opzionale) dominio custom attivo con HTTPS
