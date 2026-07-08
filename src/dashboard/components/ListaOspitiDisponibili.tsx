import { useState } from "react";
import type { DBRsvp, DBSeat } from "../lib/queries";
import "../dashboard.css";

interface ListaOspitiDisponibiliProps {
  rsvps: DBRsvp[];
  posti: DBSeat[]; // Posti già assegnati nel DB
  ospiteSelezionato: any | null;
  onSelezionaOspite: (ospite: any | null) => void;
  onInizioDrag: (ospite: any) => void;
  onApriModaleManuale: () => void;
}

export function ListaOspitiDisponibili({
  rsvps,
  posti,
  ospiteSelezionato,
  onSelezionaOspite,
  onInizioDrag,
  onApriModaleManuale,
}: ListaOspitiDisponibiliProps) {
  const [cerca, setCerca] = useState("");

  // Costruisce i nuclei (compilatore + accompagnatori) dai RSVP confermati.
  const nuclei = rsvps
    .filter((r) => r.presenza)
    .map((r) => {
      // Il compilatore principale (index -1): isola nome e cognome dal nome contatto
      const parti = r.nome_contatto.split(" ");
      const nome = parti[0] || "";
      const cognome = parti.slice(1).join(" ") || "(Compilatore)";

      const membri = [
        {
          rsvp_id: r.id,
          rsvp_guest_index: -1,
          nome,
          cognome,
          tipo: "adulto",
          allergie: r.allergie || null,
          fonte: "rsvp",
        },
        ...(Array.isArray(r.guests)
          ? r.guests.map((g, idx) => ({
              rsvp_id: r.id,
              rsvp_guest_index: idx,
              nome: g.nome,
              cognome: g.cognome,
              tipo: g.tipo,
              allergie: r.allergie || null, // le allergie sono per nucleo
              fonte: "rsvp",
            }))
          : []),
      ];

      return { rsvp: r, membri };
    });

  const isSeduto = (guest: any) =>
    posti.some(
      (p) => p.rsvp_id === guest.rsvp_id && p.rsvp_guest_index === guest.rsvp_guest_index
    );

  // Totale invitati non ancora seduti (per il conteggio in intestazione)
  const totaleDisponibili = nuclei.reduce(
    (acc, n) => acc + n.membri.filter((m) => !isSeduto(m)).length,
    0
  );

  // Nuclei con i soli membri ancora da sistemare che corrispondono alla ricerca
  const cercaLower = cerca.toLowerCase();
  const nucleiVisibili = nuclei
    .map((n) => ({
      ...n,
      membri: n.membri
        .filter((m) => !isSeduto(m))
        .filter((m) => `${m.nome} ${m.cognome}`.toLowerCase().includes(cercaLower)),
    }))
    .filter((n) => n.membri.length > 0);

  return (
    <div className="sidebar-disponibili">
      <div className="sidebar-header">
        <h3>Invitati da far Sedere ({totaleDisponibili})</h3>
        <input
          type="text"
          className="disponibili-search"
          placeholder="Cerca invitato..."
          value={cerca}
          onChange={(e) => setCerca(e.target.value)}
        />
      </div>

      <div
        className="disponibili-list"
        onClick={(e) => {
          // Click sullo sfondo dell'elenco (non su un invitato) → deseleziona
          if (e.target === e.currentTarget) onSelezionaOspite(null);
        }}
      >
        {nucleiVisibili.length === 0 ? (
          <p style={{ textAlign: "center", color: "var(--c-oro-scuro)", fontSize: "0.9rem", marginTop: "var(--sp-4)" }}>
            Nessun invitato disponibile.
          </p>
        ) : (
          nucleiVisibili.map((n) => (
            <div className="nucleo-gruppo" key={n.rsvp.id}>
              {n.membri.map((g) => {
                const isSel =
                  ospiteSelezionato &&
                  ospiteSelezionato.rsvp_id === g.rsvp_id &&
                  ospiteSelezionato.rsvp_guest_index === g.rsvp_guest_index;

                return (
                  <div
                    key={`${g.rsvp_id}-${g.rsvp_guest_index}`}
                    className={`riga-disponibile ${isSel ? "selezionato" : ""}`}
                    onClick={() => onSelezionaOspite(isSel ? null : g)}
                    draggable={true}
                    onDragStart={(e) => {
                      e.dataTransfer.setData("application/json", JSON.stringify(g));
                      onInizioDrag(g);
                    }}
                  >
                    <div className="riga-ospite-info">
                      <span className="ospite-nome">
                        {g.nome} {g.cognome}
                      </span>
                      <span className="ospite-badge-tipo">{g.tipo}</span>
                    </div>
                    {g.allergie && (
                      <span className="badge-allergia" title={g.allergie}>
                        allergie
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      <div className="manuale-btn-container">
        <button type="button" className="aggiungi-manuale-btn" onClick={onApriModaleManuale}>
          + Aggiungi Invitato Manuale
        </button>
      </div>
    </div>
  );
}
