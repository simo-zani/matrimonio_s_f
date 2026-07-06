import type { DBRsvp } from "./lib/queries";
import "./dashboard.css";

interface ListaInvitatiProps {
  rsvps: DBRsvp[];
}

export function ListaInvitati({ rsvps }: ListaInvitatiProps) {
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
      <div className="rsvp-tabella-container">
        <table className="rsvp-table">
          <thead>
            <tr>
              <th>Data Risposta</th>
              <th>Chi risponde</th>
              <th>Presenza</th>
              <th>Accompagnatori</th>
              <th>Allergie / Intolleranze</th>
            </tr>
          </thead>
          <tbody>
            {rsvps.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", color: "var(--c-oro-scuro)" }}>
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
                          <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "0.95rem" }}>
                            {r.guests.map((g, idx) => (
                              <li key={idx}>
                                {g.nome} {g.cognome}{" "}
                                <span style={{ fontSize: "0.75rem", color: "var(--c-oro-scuro)" }}>
                                  ({g.tipo})
                                </span>
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
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
