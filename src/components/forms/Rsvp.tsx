import { useState } from "react";
import { supabase, supabaseConfigurato } from "../../lib/supabase";
import { scadenzaRsvp } from "../../lib/dati-evento";
import "./Rsvp.css";

type Guest = { nome: string; cognome: string; tipo: "adulto" | "bambino" };
type Stato = "idle" | "sending" | "success" | "error";

export function Rsvp() {
  const [nomeContatto, setNomeContatto] = useState("");
  const [cognomeContatto, setCognomeContatto] = useState("");
  const [presenza, setPresenza] = useState<boolean | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [allergie, setAllergie] = useState("");
  const [stato, setStato] = useState<Stato>("idle");
  const [erroreMsg, setErroreMsg] = useState("");

  const aggiorna = (i: number, campo: keyof Guest, valore: string) =>
    setGuests((g) =>
      g.map((ospite, idx) => (idx === i ? { ...ospite, [campo]: valore } : ospite))
    );

  // Il numero di accompagnatori pilota quante righe nome/cognome compaiono.
  // Minimo 0 (si può venire da soli); le righe già compilate vengono conservate.
  const impostaNumero = (n: number) => {
    const target = Math.max(0, Math.floor(Number.isNaN(n) ? 0 : n));
    setGuests((g) => {
      if (target === g.length) return g;
      if (target < g.length) return g.slice(0, target);
      return [
        ...g,
        ...Array.from({ length: target - g.length }, () => ({
          nome: "",
          cognome: "",
          tipo: "adulto" as const,
        })),
      ];
    });
  };

  const toggleBambino = (i: number) =>
    aggiorna(i, "tipo", guests[i].tipo === "bambino" ? "adulto" : "bambino");

  async function invia() {
    if (!nomeContatto.trim() || !cognomeContatto.trim()) {
      setErroreMsg("Inserisci il tuo nome e cognome.");
      setStato("error");
      return;
    }
    if (presenza === null) {
      setErroreMsg("Dicci se ci sarete o no.");
      setStato("error");
      return;
    }
    if (presenza && guests.some((g) => !g.nome.trim() || !g.cognome.trim())) {
      setErroreMsg("Compila nome e cognome di tutti gli accompagnatori.");
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
        nome_contatto: `${nomeContatto.trim()} ${cognomeContatto.trim()}`,
        presenza,
        guests: presenza ? guests : [],
        allergie: allergie || null,
      });
      setStato("success");
      return;
    }

    const { error } = await supabase.from("rsvp").insert({
      nome_contatto: `${nomeContatto.trim()} ${cognomeContatto.trim()}`,
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

      <div className="campo">
        <span>Il tuo nome</span>
        <div className="riga-nome-cognome">
          <input
            value={nomeContatto}
            onChange={(e) => setNomeContatto(e.target.value)}
            placeholder="Nome"
            aria-label="Il tuo nome"
          />
          <input
            value={cognomeContatto}
            onChange={(e) => setCognomeContatto(e.target.value)}
            placeholder="Cognome"
            aria-label="Il tuo cognome"
          />
        </div>
      </div>

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
          <span>Numero accompagnatori</span>
          <div className="stepper">
            <button
              type="button"
              onClick={() => impostaNumero(guests.length - 1)}
              disabled={guests.length <= 0}
              aria-label="Diminuisci"
            >
              −
            </button>
            <input
              type="number"
              min={0}
              step={1}
              value={guests.length}
              onChange={(e) => impostaNumero(parseInt(e.target.value, 10))}
              aria-label="Numero accompagnatori"
            />
            <button
              type="button"
              onClick={() => impostaNumero(guests.length + 1)}
              aria-label="Aumenta"
            >
              +
            </button>
          </div>

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
              <button
                type="button"
                className={
                  g.tipo === "bambino" ? "toggle-bambino attivo" : "toggle-bambino"
                }
                onClick={() => toggleBambino(i)}
                aria-pressed={g.tipo === "bambino"}
              >
                bambino
              </button>
            </div>
          ))}
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
