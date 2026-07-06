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
  rsvp_guest_index: number | null = null
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
