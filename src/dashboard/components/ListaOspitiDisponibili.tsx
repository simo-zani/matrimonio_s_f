import { useState } from "react";
import type { DBRsvp, DBSeat } from "../lib/queries";
import "../dashboard.css";

interface ListaOspitiDisponibiliProps {
  rsvps: DBRsvp[];
  posti: DBSeat[]; // Posti già assegnati nel DB
  ospiteSelezionato: any | null;
  onSelezionaOspite: (ospite: any | null) => void;
  onApriModaleManuale: () => void;
}

export function ListaOspitiDisponibili({
  rsvps,
  posti,
  ospiteSelezionato,
  onSelezionaOspite,
  onApriModaleManuale,
}: ListaOspitiDisponibiliProps) {
  const [cerca, setCerca] = useState("");

  // Compila la lista di tutti gli ospiti da RSVP confermati (presenza = true)
  const ospitiRsvp: any[] = [];

  rsvps
    .filter((r) => r.presenza)
    .forEach((r) => {
      // 1. Il compilatore principale (index -1)
      // Dividiamo il nome contatto per isolare nome e cognome se possibile
      const parti = r.nome_contatto.split(" ");
      const nome = parti[0] || "";
      const cognome = parti.slice(1).join(" ") || "(Compilatore)";

      ospitiRsvp.push({
        rsvp_id: r.id,
        rsvp_guest_index: -1,
        nome,
        cognome,
        tipo: "adulto",
        allergie: r.allergie || null,
        fonte: "rsvp",
      });

      // 2. Accompagnatori
      if (r.guests && Array.isArray(r.guests)) {
        r.guests.forEach((g, idx) => {
          ospitiRsvp.push({
            rsvp_id: r.id,
            rsvp_guest_index: idx,
            nome: g.nome,
            cognome: g.cognome,
            tipo: g.tipo,
            allergie: r.allergie || null, // le allergie sono per nucleo
            fonte: "rsvp",
          });
        });
      }
    });

  // Filtra solo gli ospiti che NON sono ancora seduti in un tavolo
  const ospitiDisponibili = ospitiRsvp.filter((guest) => {
    const giaSeduto = posti.some(
      (p) => p.rsvp_id === guest.rsvp_id && p.rsvp_guest_index === guest.rsvp_guest_index
    );
    return !giaSeduto;
  });

  // Filtro di ricerca (case-insensitive su nome e cognome)
  const ospitiFiltrati = ospitiDisponibili.filter((g) => {
    const nomeCompleto = `${g.nome} ${g.cognome}`.toLowerCase();
    return nomeCompleto.includes(cerca.toLowerCase());
  });

  return (
    <div className="sidebar-disponibili">
      <div className="sidebar-header">
        <h3>Ospiti da Sistemare ({ospitiDisponibili.length})</h3>
        <input
          type="text"
          className="disponibili-search"
          placeholder="Cerca invitato..."
          value={cerca}
          onChange={(e) => setCerca(e.target.value)}
        />
      </div>

      <div className="disponibili-list">
        {ospitiFiltrati.length === 0 ? (
          <p style={{ textAlign: "center", color: "var(--c-oro-scuro)", fontSize: "0.9rem", marginTop: "var(--sp-4)" }}>
            Nessun invitato disponibile.
          </p>
        ) : (
          ospitiFiltrati.map((g, idx) => {
            const isSel =
              ospiteSelezionato &&
              ospiteSelezionato.rsvp_id === g.rsvp_id &&
              ospiteSelezionato.rsvp_guest_index === g.rsvp_guest_index;

            return (
              <div
                key={idx}
                className={`riga-disponibile ${isSel ? "selezionato" : ""}`}
                onClick={() => onSelezionaOspite(isSel ? null : g)}
              >
                <div className="riga-ospite-info">
                  <span className="ospite-nome">
                    {g.nome} {g.cognome}
                  </span>
                  <span className="ospite-badge-tipo">{g.tipo}</span>
                </div>
                {g.allergie && <span className="badge-allergia">allergie</span>}
              </div>
            );
          })
        )}
      </div>

      <div className="manuale-btn-container">
        <button type="button" className="aggiungi-manuale-btn" onClick={onApriModaleManuale}>
          + Aggiungi Ospite Manuale
        </button>
      </div>
    </div>
  );
}
