import { useState } from "react";
import { supabase, supabaseConfigurato } from "../../lib/supabase";
import { scadenzaRsvp } from "../../lib/dati-evento";
import "./Rsvp.css";

type Guest = { nome: string; cognome: string; tipo: "adulto" | "bambino" };
type Stato = "idle" | "sending" | "success" | "error";

export function Rsvp() {
  const [nomeContatto, setNomeContatto] = useState("");
  const [presenza, setPresenza] = useState<boolean | null>(null);
  const [guests, setGuests] = useState<Guest[]>([
    { nome: "", cognome: "", tipo: "adulto" },
  ]);
  const [allergie, setAllergie] = useState("");
  const [stato, setStato] = useState<Stato>("idle");
  const [erroreMsg, setErroreMsg] = useState("");

  const aggiungi = (tipo: Guest["tipo"]) =>
    setGuests((g) => [...g, { nome: "", cognome: "", tipo }]);
  const rimuovi = (i: number) =>
    setGuests((g) => g.filter((_, idx) => idx !== i));
  const aggiorna = (i: number, campo: keyof Guest, valore: string) =>
    setGuests((g) =>
      g.map((ospite, idx) => (idx === i ? { ...ospite, [campo]: valore } : ospite))
    );

  async function invia() {
    if (!nomeContatto.trim()) {
      setErroreMsg("Manca il nome di chi risponde.");
      setStato("error");
      return;
    }
    if (presenza === null) {
      setErroreMsg("Dicci se ci sarete o no.");
      setStato("error");
      return;
    }
    if (presenza && !guests.some((g) => g.nome.trim() && g.cognome.trim())) {
      setErroreMsg("Aggiungi almeno un ospite con nome e cognome.");
      setStato("error");
      return;
    }

    setStato("sending");

    if (!supabaseConfigurato) {
      // PLACEHOLDER: nessun progetto Supabase collegato ancora.
      // Simula l'invio per poter provare l'interfaccia; il salvataggio
      // vero parte da solo appena .env viene compilato (vedi lib/supabase.ts).
      await new Promise((r) => setTimeout(r, 500));
      console.info("[RSVP - anteprima, non salvato]", {
        nomeContatto,
        presenza,
        guests: presenza ? guests : [],
        allergie: allergie || null,
      });
      setStato("success");
      return;
    }

    const { error } = await supabase.from("rsvp").insert({
      nome_contatto: nomeContatto,
      presenza,
      guests: presenza ? guests : [],
      allergie: allergie || null,
    });

    if (error) {
      setErroreMsg("Qualcosa non ha funzionato, riprova tra poco.");
      setStato("error");
    } else {
      setStato("success");
    }
  }

  if (stato === "success") {
    return (
      <section className="sezione rsvp">
        <div className="rsvp-successo">
          <p className="rsvp-successo-sigillo">S F</p>
          <h2>Grazie!</h2>
          <p>La tua risposta è stata registrata.</p>
          {!supabaseConfigurato && (
            <p className="rsvp-nota-dev">
              (Modalità anteprima: non è stato salvato davvero da nessuna
              parte — collega Supabase per renderlo reale, vedi
              05-form-supabase.md)
            </p>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="sezione rsvp">
      <h2>Conferma la tua presenza</h2>
      {scadenzaRsvp !== "DA CONFERMARE" && (
        <p className="rsvp-scadenza">Rispondi entro il {scadenzaRsvp}</p>
      )}

      <label className="campo">
        <span>Il tuo nome</span>
        <input
          value={nomeContatto}
          onChange={(e) => setNomeContatto(e.target.value)}
          placeholder="Nome e cognome"
        />
      </label>

      <div className="campo">
        <span>Ci sarai?</span>
        <div className="scelta-presenza">
          <button
            type="button"
            className={presenza === true ? "attivo" : ""}
            onClick={() => setPresenza(true)}
          >
            Sì, ci sarò
          </button>
          <button
            type="button"
            className={presenza === false ? "attivo" : ""}
            onClick={() => setPresenza(false)}
          >
            Non potrò esserci
          </button>
        </div>
      </div>

      {presenza && (
        <div className="campo">
          <span>Chi viene con te?</span>
          {guests.map((g, i) => (
            <div className="riga-ospite" key={i}>
              <input
                placeholder="Nome"
                value={g.nome}
                onChange={(e) => aggiorna(i, "nome", e.target.value)}
              />
              <input
                placeholder="Cognome"
                value={g.cognome}
                onChange={(e) => aggiorna(i, "cognome", e.target.value)}
              />
              <span className="tipo-badge">
                {g.tipo === "adulto" ? "adulto" : "bambino"}
              </span>
              {guests.length > 1 && (
                <button
                  type="button"
                  className="rimuovi-ospite"
                  onClick={() => rimuovi(i)}
                  aria-label="Rimuovi"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <div className="aggiungi-riga">
            <button type="button" onClick={() => aggiungi("adulto")}>
              + adulto
            </button>
            <button type="button" onClick={() => aggiungi("bambino")}>
              + bambino
            </button>
          </div>
        </div>
      )}

      <label className="campo">
        <span>Allergie o intolleranze (opzionale)</span>
        <textarea
          value={allergie}
          onChange={(e) => setAllergie(e.target.value)}
          rows={3}
          placeholder="Segnala qui eventuali allergie o intolleranze del gruppo"
        />
      </label>

      {stato === "error" && <p className="rsvp-errore">{erroreMsg}</p>}

      <button
        type="button"
        className="rsvp-invia"
        disabled={stato === "sending"}
        onClick={invia}
      >
        {stato === "sending" ? "Invio…" : "Invia risposta"}
      </button>

      {!supabaseConfigurato && (
        <p className="rsvp-nota-dev">
          Supabase non ancora collegato: questa è solo l'interfaccia, l'invio
          non si salva da nessuna parte finché non compili .env.
        </p>
      )}
    </section>
  );
}
