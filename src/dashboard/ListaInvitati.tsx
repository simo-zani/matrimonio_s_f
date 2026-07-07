import { useState } from "react";
import { cancellaRsvp, rimuoviAccompagnatore, type DBRsvp } from "./lib/queries";
import { ModaleConferma } from "./components/ModaleConferma";
import "./dashboard.css";

interface ListaInvitatiProps {
  rsvps: DBRsvp[];
  onAggiorna: () => Promise<void>;
}

export function ListaInvitati({ rsvps, onAggiorna }: ListaInvitatiProps) {
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [invitatoDaEliminare, setInvitatoDaEliminare] = useState<DBRsvp | null>(null);
  const [accompagnatoreElimina, setAccompagnatoreElimina] = useState<{
    rsvp: DBRsvp;
    idx: number;
  } | null>(null);

  async function eseguiEliminaInvitato(r: DBRsvp) {
    setInCorso(true);
    setErrore(null);
    try {
      await cancellaRsvp(r.id);
      await onAggiorna();
    } catch (e: any) {
      setErrore(e.message || "Errore durante l'eliminazione.");
    } finally {
      setInCorso(false);
    }
  }

  function eliminaInvitato(r: DBRsvp) {
    setInvitatoDaEliminare(r);
  }

  async function eseguiEliminaAccompagnatore(r: DBRsvp, idx: number) {
    setInCorso(true);
    setErrore(null);
    try {
      await rimuoviAccompagnatore(r, idx);
      await onAggiorna();
    } catch (e: any) {
      setErrore(e.message || "Errore durante l'eliminazione.");
    } finally {
      setInCorso(false);
    }
  }

  function eliminaAccompagnatore(r: DBRsvp, idx: number) {
    setAccompagnatoreElimina({ rsvp: r, idx });
  }

  // Calcolo statistiche
  const nucleoSi = rsvps.filter((r) => r.presenza);
  const nucleoNo = rsvps.filter((r) => !r.presenza);

  let totaleAdulti = 0;
  let totaleBambini = 0;
  let totaleAllergieSegnalate = 0;

  nucleoSi.forEach((r) => {
    // Il compilatore del form conta come 1 adulto
    totaleAdulti += 1;

    // Accompagnatori aggiuntivi
    if (r.guests && Array.isArray(r.guests)) {
      r.guests.forEach((g) => {
        if (g.tipo === "bambino") {
          totaleBambini += 1;
        } else {
          totaleAdulti += 1;
        }
      });
    }

    if (r.allergie && r.allergie.trim()) {
      totaleAllergieSegnalate += 1;
    }
  });

  const totaleOspitiPresenti = totaleAdulti + totaleBambini;

  return (
    <>
      <div className="invitati-sezione">
      {/* ── Statistiche in evidenza ── */}
      <div className="stat-grid">
        <div className="stat-card">
          <h3>Ospiti Presenti</h3>
          <div className="stat-valore">{totaleOspitiPresenti}</div>
          <p style={{ fontSize: "0.85rem", color: "var(--c-oro-scuro)", margin: "4px 0 0 0" }}>
            ({totaleAdulti} adulti, {totaleBambini} bambini)
          </p>
        </div>

        <div className="stat-card">
          <h3>Famiglie Presenti</h3>
          <div className="stat-valore">{nucleoSi.length}</div>
          <p style={{ fontSize: "0.85rem", color: "var(--c-oro-scuro)", margin: "4px 0 0 0" }}>
            gruppi che hanno risposto Sì
          </p>
        </div>

        <div className="stat-card">
          <h3>Gruppi Assenti</h3>
          <div className="stat-valore">{nucleoNo.length}</div>
          <p style={{ fontSize: "0.85rem", color: "var(--c-oro-scuro)", margin: "4px 0 0 0" }}>
            gruppi che hanno risposto No
          </p>
        </div>

        <div className="stat-card">
          <h3>Allergie / Intolleranze</h3>
          <div className="stat-valore">{totaleAllergieSegnalate}</div>
          <p style={{ fontSize: "0.85rem", color: "var(--c-oro-scuro)", margin: "4px 0 0 0" }}>
            famiglie con segnalazioni
          </p>
        </div>
      </div>

      {/* ── Tabella dettagliata risposte ── */}
      <h3 style={{ fontFamily: "var(--f-titolo)", color: "var(--c-oro-scuro)", fontSize: "1.4rem", marginBottom: "var(--sp-3)" }}>
        Dettaglio delle Conferme
      </h3>
      {errore && (
        <p style={{ color: "var(--c-rosso-elimina)", marginBottom: "var(--sp-2)" }}>{errore}</p>
      )}
      <div className="rsvp-tabella-container">
        <table className="rsvp-table">
          <thead>
            <tr>
              <th>Data Risposta</th>
              <th>Chi risponde</th>
              <th>Presenza</th>
              <th>Accompagnatori</th>
              <th>Allergie / Intolleranze</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {rsvps.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", color: "var(--c-oro-scuro)" }}>
                  Nessuna risposta di conferma registrata finora.
                </td>
              </tr>
            ) : (
              rsvps.map((r) => {
                const dataFormat = new Date(r.created_at).toLocaleDateString("it-IT", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <tr key={r.id}>
                    <td>{dataFormat}</td>
                    <td style={{ fontWeight: 600 }}>{r.nome_contatto}</td>
                    <td>
                      <span className={`badge-presenza ${r.presenza ? "si" : "no"}`}>
                        {r.presenza ? "Ci sarà" : "Non ci sarà"}
                      </span>
                    </td>
                    <td>
                      {r.presenza ? (
                        r.guests && r.guests.length > 0 ? (
                          <ul className="lista-accompagnatori">
                            {r.guests.map((g, idx) => (
                              <li key={idx}>
                                <span>
                                  {g.nome} {g.cognome}{" "}
                                  <span style={{ fontSize: "0.75rem", color: "var(--c-oro-scuro)" }}>
                                    ({g.tipo})
                                  </span>
                                </span>
                                <button
                                  type="button"
                                  className="elimina-accompagnatore"
                                  title="Elimina accompagnatore"
                                  disabled={inCorso}
                                  onClick={() => eliminaAccompagnatore(r, idx)}
                                >
                                  ✕
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span style={{ fontSize: "0.9rem", color: "var(--c-oro-scuro)", fontStyle: "italic" }}>
                            Nessun accompagnatore
                          </span>
                        )
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>
                      {r.allergie && r.allergie.trim() ? (
                        <span className="badge-allergia" style={{ display: "block", whiteSpace: "pre-wrap" }}>
                          {r.allergie}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="elimina-invitato-btn"
                        disabled={inCorso}
                        onClick={() => eliminaInvitato(r)}
                      >
                        Elimina
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      </div>

      {invitatoDaEliminare && (
        <ModaleConferma
          titolo="Elimina Invitato"
          messaggio={`Eliminare definitivamente "${invitatoDaEliminare.nome_contatto}" e tutti i suoi accompagnatori? I posti assegnati verranno liberati.`}
          testoConferma="Elimina"
          onAnnulla={() => setInvitatoDaEliminare(null)}
          onConferma={() => {
            const r = invitatoDaEliminare;
            setInvitatoDaEliminare(null);
            eseguiEliminaInvitato(r);
          }}
        />
      )}

      {accompagnatoreElimina && (
        <ModaleConferma
          titolo="Elimina Accompagnatore"
          messaggio={`Eliminare "${accompagnatoreElimina.rsvp.guests[accompagnatoreElimina.idx]?.nome} ${accompagnatoreElimina.rsvp.guests[accompagnatoreElimina.idx]?.cognome}" dalla lista degli accompagnatori?`}
          testoConferma="Elimina"
          onAnnulla={() => setAccompagnatoreElimina(null)}
          onConferma={() => {
            const { rsvp, idx } = accompagnatoreElimina;
            setAccompagnatoreElimina(null);
            eseguiEliminaAccompagnatore(rsvp, idx);
          }}
        />
      )}
    </>
  );
}
