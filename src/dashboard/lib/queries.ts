import { supabase } from "../../lib/supabase";

export interface DBTable {
  id: string;
  nome: string;
  capienza: number;
  forma: "tondo" | "quadrato" | "ellisse" | "imperiale";
  pos_x: number;
  pos_y: number;
}

export interface DBSeat {
  id: string;
  tavolo_id: string;
  nome: string;
  cognome: string;
  tipo: "adulto" | "bambino";
  allergie?: string | null;
  fonte: "rsvp" | "manuale";
  rsvp_id?: string | null;
  rsvp_guest_index?: number | null;
  /** Indice della sedia effettivamente scelta al tavolo (0..capienza-1). */
  sedia_index?: number | null;
}

export interface DBRsvp {
  id: string;
  created_at: string;
  nome_contatto: string;
  presenza: boolean;
  guests: { nome: string; cognome: string; tipo: "adulto" | "bambino" }[];
  allergie?: string | null;
}

/**
 * Carica tutti i dati necessari per la dashboard: RSVP, Tavoli e Assegnazioni Posti.
 */
export async function fetchGuestsAndTables() {
  const [rsvpRes, tavoliRes, postiRes] = await Promise.all([
    supabase.from("rsvp").select("*").order("created_at", { ascending: true }),
    supabase.from("tavoli").select("*").order("created_at", { ascending: true }),
    supabase.from("posti").select("*").order("created_at", { ascending: true }),
  ]);

  if (rsvpRes.error) throw new Error("Errore nel caricamento RSVP: " + rsvpRes.error.message);
  if (tavoliRes.error) throw new Error("Errore nel caricamento Tavoli: " + tavoliRes.error.message);
  if (postiRes.error) throw new Error("Errore nel caricamento Posti: " + postiRes.error.message);

  return {
    rsvps: rsvpRes.data as DBRsvp[],
    tavoli: tavoliRes.data as DBTable[],
    posti: postiRes.data as DBSeat[],
  };
}

/**
 * Crea un nuovo tavolo nel database.
 */
export async function creaTavolo(
  nome: string,
  capienza: number,
  forma: DBTable["forma"]
): Promise<DBTable> {
  const { data, error } = await supabase
    .from("tavoli")
    .insert({ nome, capienza, forma, pos_x: 120, pos_y: 120 })
    .select()
    .single();

  if (error) throw new Error("Impossibile creare il tavolo: " + error.message);
  return data as DBTable;
}

/**
 * Aggiorna la posizione X/Y di un tavolo sul piano.
 */
export async function aggiornaPosizioneTavolo(id: string, x: number, y: number) {
  const { error } = await supabase
    .from("tavoli")
    .update({ pos_x: Math.round(x), pos_y: Math.round(y) })
    .eq("id", id);

  if (error) console.error("[Supabase] Errore salvataggio posizione tavolo:", error.message);
}

/**
 * Cancella un tavolo.
 */
export async function cancellaTavolo(id: string) {
  const { error } = await supabase.from("tavoli").delete().eq("id", id);
  if (error) throw new Error("Impossibile cancellare il tavolo: " + error.message);
}

/**
 * Assegna una sedia ad un ospite (sia da RSVP che manuale).
 */
export async function assegnaPosto(
  tavolo_id: string,
  nome: string,
  cognome: string,
  tipo: "adulto" | "bambino",
  allergie: string | null,
  fonte: "rsvp" | "manuale",
  rsvp_id: string | null = null,
  rsvp_guest_index: number | null = null,
  sedia_index: number | null = null
): Promise<DBSeat> {
  const { data, error } = await supabase
    .from("posti")
    .insert({
      tavolo_id,
      nome,
      cognome,
      tipo,
      allergie,
      fonte,
      rsvp_id,
      rsvp_guest_index,
      sedia_index,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Questo ospite è già stato assegnato a un tavolo.");
    }
    throw new Error("Errore nell'assegnazione del posto: " + error.message);
  }
  return data as DBSeat;
}

/**
 * Rimuove un ospite dal suo posto (sedia torna vuota).
 */
export async function rimuoviPosto(posto_id: string) {
  const { error } = await supabase.from("posti").delete().eq("id", posto_id);
  if (error) throw new Error("Impossibile rimuovere l'ospite dal posto: " + error.message);
}

/**
 * Elimina un intero invitato (il nucleo RSVP: compilatore + accompagnatori) e
 * libera tutti i posti che erano stati assegnati a quel nucleo.
 */
export async function cancellaRsvp(id: string) {
  // Prima libera gli eventuali posti collegati, poi elimina la risposta.
  await supabase.from("posti").delete().eq("rsvp_id", id);
  const { error } = await supabase.from("rsvp").delete().eq("id", id);
  if (error) throw new Error("Impossibile eliminare l'invitato: " + error.message);
}

/**
 * Elimina un singolo accompagnatore da un nucleo RSVP.
 * Aggiorna l'array `guests`, libera l'eventuale posto assegnato a quel
 * accompagnatore e riallinea gli indici dei posti degli accompagnatori
 * successivi (che scalano di una posizione nell'array).
 */
export async function rimuoviAccompagnatore(rsvp: DBRsvp, guestIndex: number) {
  const nuoviGuests = rsvp.guests.filter((_, i) => i !== guestIndex);

  // 1. Salva il nuovo array senza l'accompagnatore rimosso.
  const { error } = await supabase
    .from("rsvp")
    .update({ guests: nuoviGuests })
    .eq("id", rsvp.id);
  if (error) throw new Error("Impossibile eliminare l'accompagnatore: " + error.message);

  // 2. Libera l'eventuale posto di quell'accompagnatore.
  await supabase
    .from("posti")
    .delete()
    .eq("rsvp_id", rsvp.id)
    .eq("rsvp_guest_index", guestIndex);

  // 3. Riallinea gli indici dei posti degli accompagnatori con indice maggiore.
  const { data: postiSuccessivi } = await supabase
    .from("posti")
    .select("id, rsvp_guest_index")
    .eq("rsvp_id", rsvp.id)
    .gt("rsvp_guest_index", guestIndex);

  if (postiSuccessivi) {
    for (const p of postiSuccessivi) {
      await supabase
        .from("posti")
        .update({ rsvp_guest_index: (p.rsvp_guest_index as number) - 1 })
        .eq("id", p.id);
    }
  }
}
