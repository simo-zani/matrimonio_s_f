import "../dashboard.css";

interface ModaleConfermaProps {
  titolo: string;
  messaggio: string;
  onConferma: () => void;
  onAnnulla: () => void;
  testoConferma?: string;
  testoAnnulla?: string;
}

export function ModaleConferma({
  titolo,
  messaggio,
  onConferma,
  onAnnulla,
  testoConferma = "Conferma",
  testoAnnulla = "Annulla",
}: ModaleConfermaProps) {
  return (
    <div className="modale-overlay" onClick={onAnnulla}>
      <div className="modale-content" onClick={(e) => e.stopPropagation()}>
        <div className="modale-header" style={{ borderBottom: "1.5px solid var(--c-rosso-elimina)" }}>
          <h3 style={{ color: "var(--c-rosso-elimina)" }}>{titolo}</h3>
        </div>
        <div className="modale-body">
          <p style={{ lineHeight: 1.5, color: "var(--c-testo)" }}>{messaggio}</p>
        </div>
        <div className="modale-footer">
          <button type="button" className="btn-annulla" onClick={onAnnulla}>
            {testoAnnulla}
          </button>
          <button
            type="button"
            className="btn-salva"
            style={{ background: "var(--c-rosso-elimina)", borderColor: "var(--c-rosso-elimina)" }}
            onClick={onConferma}
          >
            {testoConferma}
          </button>
        </div>
      </div>
    </div>
  );
}
