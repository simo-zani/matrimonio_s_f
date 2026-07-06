import { useState } from "react";
import type { DBTable, DBSeat } from "../lib/queries";
import "../dashboard.css";

interface ModaleOspiteManualeProps {
  tavoli: DBTable[];
  posti: DBSeat[];
  onChiudi: () => void;
  onSalva: (
    nome: string,
    cognome: string,
    tipo: "adulto" | "bambino",
    allergie: string | null,
    tavoloId: string,
    sediaIndex: number
  ) => void;
}

export function ModaleOspiteManuale({
  tavoli,
  posti,
  onChiudi,
  onSalva,
}: ModaleOspiteManualeProps) {
  const [nome, setNome] = useState("");
  const [cognome, setCognome] = useState("");
  const [tipo, setTipo] = useState<"adulto" | "bambino">("adulto");
  const [allergie, setAllergie] = useState("");
  const [tavoloId, setTavoloId] = useState(tavoli[0]?.id || "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim() || !cognome.trim() || !tavoloId) return;

    // Trova il tavolo selezionato
    const tavolo = tavoli.find((t) => t.id === tavoloId);
    if (!tavolo) return;

    // Trova le sedie occupate in questo tavolo
    const occupati = posti.filter((p) => p.tavolo_id === tavoloId);

    // Cerca il primo sedia_index disponibile (da 0 a capienza - 1)
    let sediaIndex = -1;
    for (let i = 0; i < tavolo.capienza; i++) {
      const isOccupata = occupati.some(
        (o) =>
          o.rsvp_guest_index === i ||
          (o.fonte === "manuale" && occupati.indexOf(o) === i)
      );
      if (!isOccupata) {
        sediaIndex = i;
        break;
      }
    }

    if (sediaIndex === -1) {
      alert(`Il tavolo "${tavolo.nome}" è pieno! Scegli un altro tavolo o aumenta la capienza.`);
      return;
    }

    onSalva(
      nome.trim(),
      cognome.trim(),
      tipo,
      allergie.trim() || null,
      tavoloId,
      sediaIndex
    );
  }

  return (
    <div className="modale-overlay" onClick={onChiudi}>
      <div className="modale-content" onClick={(e) => e.stopPropagation()}>
        <div className="modale-header">
          <h3>Aggiungi Ospite Manuale</h3>
        </div>
        {tavoli.length === 0 ? (
          <div className="modale-body">
            <p style={{ color: "var(--c-rosso-elimina)", textAlign: "center" }}>
              Devi creare almeno un tavolo prima di poter aggiungere ospiti manualmente.
            </p>
            <div className="modale-footer">
              <button type="button" className="btn-annulla" onClick={onChiudi}>
                Chiudi
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="modale-body">
              <div className="modale-riga-scelta">
                <label className="modale-campo" style={{ flex: 1 }}>
                  <span>Nome</span>
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="es: Mario"
                    required
                    autoFocus
                  />
                </label>
                <label className="modale-campo" style={{ flex: 1 }}>
                  <span>Cognome</span>
                  <input
                    type="text"
                    value={cognome}
                    onChange={(e) => setCognome(e.target.value)}
                    placeholder="es: Rossi"
                    required
                  />
                </label>
              </div>

              <div className="modale-campo">
                <span>Tipo Ospite</span>
                <div className="modale-riga-scelta" style={{ marginTop: "6px" }}>
                  <label>
                    <input
                      type="radio"
                      name="tipo"
                      checked={tipo === "adulto"}
                      onChange={() => setTipo("adulto")}
                    />
                    Adulto
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="tipo"
                      checked={tipo === "bambino"}
                      onChange={() => setTipo("bambino")}
                    />
                    Bambino
                  </label>
                </div>
              </div>

              <label className="modale-campo">
                <span>Assegna al Tavolo</span>
                <select value={tavoloId} onChange={(e) => setTavoloId(e.target.value)} required>
                  {tavoli.map((t) => {
                    const occCount = posti.filter((p) => p.tavolo_id === t.id).length;
                    return (
                      <option key={t.id} value={t.id}>
                        {t.nome} ({occCount}/{t.capienza} occupati)
                      </option>
                    );
                  })}
                </select>
              </label>

              <label className="modale-campo">
                <span>Allergie / Intolleranze (Opzionale)</span>
                <input
                  type="text"
                  value={allergie}
                  onChange={(e) => setAllergie(e.target.value)}
                  placeholder="es: Celiaco, Intollerante lattosio..."
                />
              </label>
            </div>
            <div className="modale-footer">
              <button type="button" className="btn-annulla" onClick={onChiudi}>
                Annulla
              </button>
              <button type="submit" className="btn-salva">
                Aggiungi e Siedi
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
