import "../dashboard.css";

interface ModaleAvvisoProps {
  messaggi: string[];
  onConferma: () => void;
  onAnnulla: () => void;
}

/**
 * Popup di avviso in stile sito (niente console/alert nativo).
 * Segnala situazioni possibili ma insolite (es. membro del nucleo a un tavolo
 * diverso, o non accanto agli altri) lasciando comunque procedere.
 */
export function ModaleAvviso({ messaggi, onConferma, onAnnulla }: ModaleAvvisoProps) {
  return (
    <div className="modale-overlay" onClick={onAnnulla}>
      <div className="modale-content" onClick={(e) => e.stopPropagation()}>
        <div className="modale-header modale-header-avviso">
          <h3>Attenzione</h3>
        </div>
        <div className="modale-body">
          {messaggi.map((m, i) => (
            <p key={i} className="avviso-messaggio">
              {m}
            </p>
          ))}
          <p className="avviso-nota">Puoi assegnarlo comunque, se è quello che vuoi.</p>
        </div>
        <div className="modale-footer">
          <button type="button" className="btn-annulla" onClick={onAnnulla}>
            Annulla
          </button>
          <button type="button" className="btn-salva" onClick={onConferma}>
            Assegna comunque
          </button>
        </div>
      </div>
    </div>
  );
}
