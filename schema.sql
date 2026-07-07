-- ══════════════════════════════════════════════════
-- SCHEMA COMPLETO — Matrimonio S&F
-- Esegui questo nel SQL Editor di Supabase
-- ══════════════════════════════════════════════════

-- ── 1. TABELLA RSVP ──
create table public.rsvp (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz default now(),
  nome_contatto text not null,
  presenza      boolean not null,
  guests        jsonb not null default '[]',
  allergie      text
);

alter table public.rsvp enable row level security;

-- Chiunque (anon) può inserire dal sito pubblico
create policy "rsvp insert anon" on public.rsvp
  for insert to anon with check (true);

-- Chiunque può leggere (la dashboard usa anon key, non Supabase Auth)
create policy "rsvp select anon" on public.rsvp
  for select to anon using (true);


-- ── 2. TABELLA TAVOLI ──
create table public.tavoli (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  capienza   int  not null check (capienza > 0),
  forma      text not null default 'tondo'
               check (forma in ('tondo', 'quadrato', 'ellisse', 'imperiale')),
  pos_x      int  not null default 100,
  pos_y      int  not null default 100,
  created_at timestamptz default now()
);

alter table public.tavoli enable row level security;

-- Chiunque può leggere e modificare i tavoli (dashboard usa anon key)
create policy "tavoli all anon" on public.tavoli
  for all to anon using (true) with check (true);


-- ── 3. TABELLA POSTI ──
create table public.posti (
  id                uuid primary key default gen_random_uuid(),
  tavolo_id         uuid not null references public.tavoli(id) on delete cascade,
  nome              text not null,
  cognome           text not null,
  tipo              text not null default 'adulto',
  allergie          text,
  fonte             text not null default 'manuale',
  rsvp_id           uuid references public.rsvp(id) on delete set null,
  rsvp_guest_index  int,
  sedia_index       int,   -- sedia effettivamente scelta al tavolo (0..capienza-1)
  created_at        timestamptz default now(),
  unique (rsvp_id, rsvp_guest_index)
);

alter table public.posti enable row level security;

-- Chiunque può leggere e modificare i posti (dashboard usa anon key)
create policy "posti all anon" on public.posti
  for all to anon using (true) with check (true);


-- ══════════════════════════════════════════════════
-- SE HAI GIÀ ESEGUITO LO SCRIPT SENZA LA COLONNA "forma":
-- Esegui solo queste righe per aggiungere la colonna e aggiornare le policy
-- ══════════════════════════════════════════════════

/*
-- Aggiunge la colonna forma (i tavoli esistenti ricevono 'tondo')
alter table public.tavoli
  add column if not exists forma text not null default 'tondo'
    check (forma in ('tondo', 'quadrato', 'ellisse', 'imperiale'));

-- Rimuove le vecchie policy "authenticated" e aggiunge quelle "anon"
drop policy if exists "tavoli solo autenticati" on public.tavoli;
drop policy if exists "posti solo autenticati" on public.posti;
drop policy if exists "rsvp tutto autenticati" on public.rsvp;

create policy "rsvp select anon" on public.rsvp
  for select to anon using (true);

create policy "tavoli all anon" on public.tavoli
  for all to anon using (true) with check (true);

create policy "posti all anon" on public.posti
  for all to anon using (true) with check (true);
*/


-- ══════════════════════════════════════════════════
-- SE HAI GIÀ ESEGUITO LO SCRIPT SENZA LA COLONNA "sedia_index":
-- (serve per far sì che la sedia su cui clicchi sia davvero quella occupata,
--  e per gli avvisi "tavolo diverso" / "non accanto" nella gestione tavoli)
-- Esegui queste righe nel SQL Editor di Supabase.
-- ══════════════════════════════════════════════════

/*
-- Aggiunge la colonna (i posti già assegnati restano validi grazie al fallback lato app)
alter table public.posti
  add column if not exists sedia_index int;

-- Opzionale ma consigliato: impedisce due persone sulla stessa sedia dello stesso tavolo
create unique index if not exists posti_tavolo_sedia_uniq
  on public.posti (tavolo_id, sedia_index);
*/
