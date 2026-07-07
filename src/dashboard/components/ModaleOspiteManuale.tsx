import { useState } from "react";
import "../dashboard.css";

interface ModaleOspiteManualeProps {
  onChiudi: () => void;
  onSalva: (
    nome: string,
    cognome: string,
    tipo: "adulto" | "bambino",
    allergie: string | null
  ) => void;
}

export function ModaleOspiteManuale({
  onChiudi,
  onSalva,
}: ModaleOspiteManualeProps) {
  const [nome, setNome] = useState("");
  const [cognome, setCognome] = useState("");
  const [tipo, setTipo] = useState<"adulto" | "bambino">("adulto");
  const [allergie, setAllergie] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim() || !cognome.trim()) return;

    onSalva(
      nome.trim(),
      cognome.trim(),
      tipo,
      allergie.trim() || null
    );
  }

  return (
    <div className="modale-overlay" onClick={onChiudi}>
      <div className="modale-content" onClick={(e) => e.stopPropagation()}>
        <div className="modale-header">
          <h3>Aggiungi Invitato Manuale</h3>
        </div>
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

            <label className="modale-campo-checkbox" style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", marginTop: "8px" }}>
              <input
                type="checkbox"
                checked={tipo === "bambino"}
                onChange={(e) => setTipo(e.target.checked ? "bambino" : "adulto")}
                style={{ width: "auto", margin: 0 }}
              />
              <span style={{ fontSize: "0.95rem", fontWeight: "normal", userSelect: "none" }}>È un bambino</span>
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
              Aggiungi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
