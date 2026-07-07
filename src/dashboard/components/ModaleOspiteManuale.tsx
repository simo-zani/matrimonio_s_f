import { useState } from "react";
import "../dashboard.css";

interface Companion {
  nome: string;
  cognome: string;
  tipo: "adulto" | "bambino";
}

interface ModaleOspiteManualeProps {
  onChiudi: () => void;
  onSalva: (
    nome: string,
    cognome: string,
    allergie: string | null,
    accompagnatori: Companion[]
  ) => void;
}

export function ModaleOspiteManuale({ onChiudi, onSalva }: ModaleOspiteManualeProps) {
  const [nome, setNome] = useState("");
  const [cognome, setCognome] = useState("");
  const [tipo, setTipo] = useState<"adulto" | "bambino">("adulto");
  const [allergie, setAllergie] = useState("");
  const [numAccompagnatori, setNumAccompagnatori] = useState(0);
  const [accompagnatori, setAccompagnatori] = useState<Companion[]>([]);

  function handleNumChange(n: number) {
    const clamped = Math.max(0, n);
    setNumAccompagnatori(clamped);
    setAccompagnatori((prev) => {
      const next = [...prev];
      while (next.length < clamped) {
        next.push({ nome: "", cognome: "", tipo: "adulto" });
      }
      return next.slice(0, clamped);
    });
  }

  function updateAccompagnatore(idx: number, field: keyof Companion, value: string) {
    setAccompagnatori((prev) =>
      prev.map((a, i) =>
        i === idx ? { ...a, [field]: value } : a
      )
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim() || !cognome.trim()) return;
    onSalva(
      nome.trim(),
      cognome.trim(),
      allergie.trim() || null,
      accompagnatori
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

            {/* Nome e Cognome */}
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

            {/* Checkbox Bambino */}
            <label
              className="modale-campo-checkbox"
              style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", marginTop: "8px" }}
            >
              <input
                type="checkbox"
                checked={tipo === "bambino"}
                onChange={(e) => setTipo(e.target.checked ? "bambino" : "adulto")}
                style={{ width: "auto", margin: 0 }}
              />
              <span style={{ fontSize: "0.95rem", fontWeight: "normal", userSelect: "none" }}>È un bambino</span>
            </label>

            {/* Numero accompagnatori */}
            <label className="modale-campo" style={{ marginTop: "12px" }}>
              <span>Numero di accompagnatori</span>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => handleNumChange(numAccompagnatori - 1)}
                  style={{
                    width: "32px", height: "32px", borderRadius: "6px", border: "1px solid var(--c-oro)",
                    background: "white", fontSize: "1.2rem", cursor: "pointer", lineHeight: 1,
                    color: "var(--c-oro-scuro)", fontWeight: 700,
                  }}
                >
                  −
                </button>
                <span style={{ minWidth: "24px", textAlign: "center", fontSize: "1.1rem", fontWeight: 600 }}>
                  {numAccompagnatori}
                </span>
                <button
                  type="button"
                  onClick={() => handleNumChange(numAccompagnatori + 1)}
                  style={{
                    width: "32px", height: "32px", borderRadius: "6px", border: "1px solid var(--c-oro)",
                    background: "white", fontSize: "1.2rem", cursor: "pointer", lineHeight: 1,
                    color: "var(--c-oro-scuro)", fontWeight: 700,
                  }}
                >
                  +
                </button>
              </div>
            </label>

            {/* Campi dinamici per ogni accompagnatore */}
            {accompagnatori.map((acc, idx) => (
              <div
                key={idx}
                style={{
                  marginTop: "10px",
                  padding: "10px 12px",
                  background: "#faf8f5",
                  borderRadius: "6px",
                  border: "1px solid #f2ece1",
                }}
              >
                <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--c-oro-scuro)", marginBottom: "6px" }}>
                  Accompagnatore {idx + 1}
                </div>
                <div className="modale-riga-scelta">
                  <label className="modale-campo" style={{ flex: 1 }}>
                    <span>Nome</span>
                    <input
                      type="text"
                      value={acc.nome}
                      onChange={(e) => updateAccompagnatore(idx, "nome", e.target.value)}
                      placeholder="es: Lucia"
                      required
                    />
                  </label>
                  <label className="modale-campo" style={{ flex: 1 }}>
                    <span>Cognome</span>
                    <input
                      type="text"
                      value={acc.cognome}
                      onChange={(e) => updateAccompagnatore(idx, "cognome", e.target.value)}
                      placeholder="es: Rossi"
                      required
                    />
                  </label>
                </div>
                <label
                  style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", marginTop: "6px" }}
                >
                  <input
                    type="checkbox"
                    checked={acc.tipo === "bambino"}
                    onChange={(e) =>
                      updateAccompagnatore(idx, "tipo", e.target.checked ? "bambino" : "adulto")
                    }
                    style={{ width: "auto", margin: 0 }}
                  />
                  <span style={{ fontSize: "0.88rem", userSelect: "none" }}>È un bambino</span>
                </label>
              </div>
            ))}

            {/* Allergie */}
            <label className="modale-campo" style={{ marginTop: "12px" }}>
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
