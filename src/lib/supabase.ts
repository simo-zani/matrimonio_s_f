// Fase 5 — client Supabase.
//
// PLACEHOLDER: senza un progetto Supabase reale, VITE_SUPABASE_URL e
// VITE_SUPABASE_ANON_KEY non sono ancora impostate (vedi .env.example).
// Il form RSVP (src/components/forms/Rsvp.tsx) funziona comunque a livello
// di interfaccia; il salvataggio vero si attiva da solo appena compili .env
// con i valori del tuo progetto Supabase (vedi 05-form-supabase.md).

import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigurato = Boolean(url && anonKey);

if (!supabaseConfigurato) {
  console.warn(
    "[Supabase] VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY non impostate — " +
      "il form RSVP resta in modalità solo-anteprima. Vedi .env.example."
  );
}

// Se le env mancano creiamo comunque un client "finto" verso valori
// placeholder: non verrà mai chiamato perché i componenti controllano
// `supabaseConfigurato` prima di inviare, ma evita che l'app crashi al load.
export const supabase = createClient(
  url || "https://placeholder.supabase.co",
  anonKey || "placeholder-anon-key"
);
