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

  const rsvps = rsvpRes.data as DBRsvp[];
  const tavoli = tavoliRes.data as DBTable[];
  const posti = postiRes.data as DBSeat[];

  // Controlla se esiste già un tavolo chiamato "Sposi" (case-insensitive)
  const haSposi = tavoli.some((t) => t.nome.toLowerCase() === "sposi");

  // Esegui il seeding solo se le variabili d'ambiente Supabase sono configurate
  const urlValido = import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes("placeholder");
  
  if (!haSposi && urlValido) {
    try {
      // 1. Crea il tavolo Sposi
      const { data: nuovoTavolo, error: errorTavolo } = await supabase
        .from("tavoli")
        .insert({
          nome: "Sposi",
          capienza: 2,
          forma: "tondo",
          pos_x: 400,
          pos_y: 200,
        })
        .select()
        .single();

      if (errorTavolo) {
        console.error("Errore creazione tavolo Sposi:", errorTavolo.message);
      } else if (nuovoTavolo) {
        const t = nuovoTavolo as DBTable;
        tavoli.push(t);

        // 2. Crea i posti per Stefano (sedia 0) e Francesca (sedia 1)
        const { data: postoS, error: errorS } = await supabase
          .from("posti")
          .insert({
            tavolo_id: t.id,
            nome: "Stefano",
            cognome: "",
            tipo: "adulto",
            fonte: "manuale",
            sedia_index: 0,
          })
          .select()
          .single();

        const { data: postoF, error: errorF } = await supabase
          .from("posti")
          .insert({
            tavolo_id: t.id,
            nome: "Francesca",
            cognome: "",
            tipo: "adulto",
            fonte: "manuale",
            sedia_index: 1,
          })
          .select()
          .single();

        if (errorS) console.error("Errore inserimento posto Stefano:", errorS.message);
        else if (postoS) posti.push(postoS as DBSeat);

        if (errorF) console.error("Errore inserimento posto Francesca:", errorF.message);
        else if (postoF) posti.push(postoF as DBSeat);
      }
    } catch (err) {
      console.error("Errore durante l'auto-seeding del tavolo Sposi:", err);
    }
  }

  return { rsvps, tavoli, posti };
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
 * Aggiorna il numero di posti (capienza) di un tavolo.
 */
export async function aggiornaCapienzaTavolo(id: string, capienza: number) {
  const { error } = await supabase
    .from("tavoli")
    .update({ capienza })
    .eq("id", id);
  if (error) throw new Error("Impossibile aggiornare i posti del tavolo: " + error.message);
}

/**
 * Sposta un posto su un'altra sedia (aggiorna sedia_index).
 */
export async function spostaPosto(posto_id: string, sedia_index: number) {
  const { error } = await supabase
    .from("posti")
    .update({ sedia_index })
    .eq("id", posto_id);
  if (error) throw new Error("Impossibile spostare l'invitato: " + error.message);
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
  const { error: errPosti } = await supabase.from("posti").delete().eq("rsvp_id", id);
  if (errPosti) console.error("[cancellaRsvp] Errore eliminazione posti:", errPosti);

  const { error } = await supabase.from("rsvp").delete().eq("id", id);
  if (error) {
    console.error("[cancellaRsvp] Errore eliminazione rsvp:", error);
    throw new Error("Impossibile eliminare l'invitato: " + error.message);
  }
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

/**
 * Crea un nuovo invitato manuale nel database.
 * Il campo `guests` contiene solo i veri accompagnatori (niente is_compiler).
 */
export async function creaInvitatoManuale(
  nome: string,
  cognome: string,
  allergie: string | null,
  accompagnatori: { nome: string; cognome: string; tipo: "adulto" | "bambino" }[] = []
): Promise<DBRsvp> {
  const { data, error } = await supabase
    .from("rsvp")
    .insert({
      nome_contatto: `${nome.trim()} ${cognome.trim()}`,
      presenza: true,
      guests: accompagnatori,
      allergie: allergie ? allergie.trim() : null,
    })
    .select()
    .single();

  if (error) throw new Error("Impossibile creare l'invitato: " + error.message);
  return data as DBRsvp;
}
