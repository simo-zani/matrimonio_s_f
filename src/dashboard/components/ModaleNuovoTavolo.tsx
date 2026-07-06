import { useState } from "react";
import type { DBTable } from "../lib/queries";
import "../dashboard.css";

interface ModaleNuovoTavoloProps {
  onChiudi: () => void;
  onSalva: (nome: string, capienza: number, forma: DBTable["forma"]) => void;
}

export function ModaleNuovoTavolo({ onChiudi, onSalva }: ModaleNuovoTavoloProps) {
  const [nome, setNome] = useState("");
  const [capienza, setCapienza] = useState<number>(8);
  const [forma, setForma] = useState<DBTable["forma"]>("tondo");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim() || capienza <= 0) return;
    onSalva(nome.trim(), capienza, forma);
  }

  return (
    <div className="modale-overlay" onClick={onChiudi}>
      <div className="modale-content" onClick={(e) => e.stopPropagation()}>
        <div className="modale-header">
          <h3>Aggiungi Nuovo Tavolo</h3>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modale-body">
            <label className="modale-campo">
              <span>Nome Tavolo</span>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="es: Tavolo 1, Amici, Zii sposa..."
                required
                autoFocus
              />
            </label>

            <label className="modale-campo">
              <span>Numero di Posti (Capienza)</span>
              <input
                type="number"
                min={1}
                max={20}
                value={capienza}
                onChange={(e) => setCapienza(Number(e.target.value))}
                required
              />
            </label>

            <label className="modale-campo">
              <span>Forma Tavolo</span>
              <select
                value={forma}
                onChange={(e) => setForma(e.target.value as DBTable["forma"])}
              >
                <option value="tondo">Tondo (Cerchio)</option>
                <option value="quadrato">Quadrato</option>
                <option value="ellisse">Ellisse</option>
                <option value="imperiale">Tavolata Imperiale (Rettangolo, no capotavola)</option>
              </select>
            </label>
          </div>
          <div className="modale-footer">
            <button type="button" className="btn-annulla" onClick={onChiudi}>
              Annulla
            </button>
            <button type="submit" className="btn-salva">
              Crea Tavolo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
