# Fase 5 — Form RSVP + allergie → Supabase

**Obiettivo:** raccogliere le adesioni (presenza + accompagnatori + bambini con
nome e cognome) e, opzionalmente, allergie/intolleranze. Salvataggio su
Supabase, con la tabella protetta.

**Prerequisito:** Fase 4. Progetto Supabase (anche gratis).

---

## Perché Supabase e non Google Forms

La lista ospiti è di **lunghezza variabile** (N accompagnatori + N bambini,
ciascuno con nome e cognome). Forms ha campi fissi: dovresti creare "Ospite 1,
Ospite 2, …" e limitare arbitrariamente il numero. Con Supabase la modelli in un
array `jsonb`. Setup reale ~15 minuti.

## 1. Schema tabella

Nella dashboard Supabase → SQL editor:

```sql
create table public.rsvp (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz default now(),
  nome_contatto text not null,          -- chi compila
  presenza      boolean not null,       -- ci sarà / non ci sarà
  guests        jsonb not null default '[]',  -- [{nome,cognome,tipo}]
  allergie      text                    -- form opzionale, può essere null
);
```

`guests` esempio:
```json
[
  { "nome": "Marco",  "cognome": "Rossi",  "tipo": "adulto" },
  { "nome": "Sofia",  "cognome": "Rossi",  "tipo": "bambino" }
]
```

## 2. RLS — proteggi la tabella (importante)

Questa è la sicurezza vera del progetto (la password della busta non lo è).
**Insert-only per il pubblico, nessuna lettura pubblica.**

```sql
alter table public.rsvp enable row level security;

-- chiunque (anon) può INSERIRE la propria risposta
create policy "insert pubblico" on public.rsvp
  for insert to anon
  with check (true);

-- NESSUNA policy di select per anon → nessuno legge le risposte altrui dal client
```

Tu leggi/esporti le risposte dalla **dashboard Supabase** (Table editor →
Export CSV), dove sei autenticato come owner.

## 3. Client Supabase

```bash
npm install @supabase/supabase-js
```

`.env` (Vite richiede il prefisso `VITE_`):
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

`src/lib/supabase.ts`
```ts
import { createClient } from "@supabase/supabase-js";
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

> L'anon key è pubblica by design: è progettata per stare nel client. La
> protezione è la RLS, non la segretezza della chiave.

## 4. Form RSVP (lista dinamica)

Punto chiave: gli ospiti sono un array di stato, con "aggiungi/rimuovi riga".

```tsx
type Guest = { nome: string; cognome: string; tipo: "adulto" | "bambino" };
const [guests, setGuests] = useState<Guest[]>([
  { nome: "", cognome: "", tipo: "adulto" },
]);

const aggiungi = (tipo: Guest["tipo"]) =>
  setGuests(g => [...g, { nome: "", cognome: "", tipo }]);
const rimuovi = (i: number) =>
  setGuests(g => g.filter((_, idx) => idx !== i));
```

> **Niente `<form>` HTML dentro artifact React** se lo prototipi in Claude —
> usa `onClick`/`onChange`. Nel progetto Vite reale il `<form>` va benissimo.

Invio:
```ts
async function invia() {
  const { error } = await supabase.from("rsvp").insert({
    nome_contatto: nomeContatto,
    presenza,
    guests,
    allergie: allergie || null,
  });
  if (error) { /* mostra messaggio d'errore gentile */ }
  else { /* stato "grazie, risposta registrata" */ }
}
```

## 5. Form allergie (opzionale)

Un semplice `textarea` collegato al campo `allergie`. Può essere nella stessa
submit del RSVP (una sola scrittura) o separato. Consiglio: **stessa submit**,
un solo `insert`, campo che può restare vuoto.

## 6. Stati UX del form

- **Idle** → compilazione
- **Sending** → bottone disabilitato + spinner (evita doppi invii)
- **Success** → messaggio di conferma elegante (magari un piccolo sigillo/decoro)
- **Error** → messaggio gentile + possibilità di riprovare

## 7. Validazione minima

- Nome contatto obbligatorio
- Almeno un ospite con nome+cognome se `presenza = true`
- Se `presenza = false`, si può inviare senza lista (giusto per sapere che non
  vengono)

---

## Definition of done

- [ ] Tabella `rsvp` creata con RLS attiva (insert-only anon)
- [ ] Aggiunta/rimozione dinamica di adulti e bambini funziona
- [ ] Submit scrive correttamente su Supabase (verificato in dashboard)
- [ ] Allergie salvate (o null se vuoto)
- [ ] Stati sending/success/error gestiti, niente doppio invio
- [ ] Provato che un utente anon **non** riesce a leggere la tabella
