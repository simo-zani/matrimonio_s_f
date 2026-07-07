import { motion } from "motion/react";
import type { DBTable, DBSeat } from "../lib/queries";
import "../dashboard.css";

interface TavoloCerchioProps {
  tavolo: DBTable;
  ospiti: DBSeat[]; // Posti occupati in questo tavolo
  evidenziato: boolean;
  ospiteSelezionato: any | null; // Ospite selezionato nella sidebar
  onAssegna: (tavoloId: string, sediaIndex: number, ospiteDaAssegnare?: any) => void;
  onRimuovi: (postoId: string) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
  onEvidenzia: () => void;
  zoom: number;
}

export function TavoloCerchio({
  tavolo,
  ospiti,
  evidenziato,
  ospiteSelezionato,
  onAssegna,
  onRimuovi,
  onDragEnd,
  onEvidenzia,
  zoom,
}: TavoloCerchioProps) {
  const isSposi = tavolo.nome.toLowerCase() === "sposi";

  // Dimensioni e calcolo delle posizioni delle sedie in base alla forma
  let w = 140;
  let h = 140;
  let classForma = "tavolo-cerchio";
  let borderRadius = "50%";
  const sediePos: { x: number; y: number }[] = [];

  const capienza = tavolo.capienza;

  if (tavolo.forma === "tondo") {
    w = 140;
    h = 140;
    classForma = "tavolo-tondo";
    borderRadius = "50%";
    const raggioCentrale = 70;
    const raggioSedie = raggioCentrale + 24;

    for (let i = 0; i < capienza; i++) {
      let angolo = (360 / capienza) * i - 90; // Inizia dall'alto (-90deg)
      if (isSposi && capienza === 2) {
        angolo = i === 0 ? -125 : -55;
      }
      const rad = (angolo * Math.PI) / 180;
      sediePos.push({
        x: raggioCentrale + raggioSedie * Math.cos(rad),
        y: raggioCentrale + raggioSedie * Math.sin(rad),
      });
    }
  } else if (tavolo.forma === "ellisse") {
    w = 160;
    h = 100;
    classForma = "tavolo-ellisse";
    borderRadius = "50%";
    const cx = 80;
    const cy = 50;
    const rxSedie = 80 + 24;
    const rySedie = 50 + 24;

    for (let i = 0; i < capienza; i++) {
      const angolo = (360 / capienza) * i - 90;
      const rad = (angolo * Math.PI) / 180;
      sediePos.push({
        x: cx + rxSedie * Math.cos(rad),
        y: cy + rySedie * Math.sin(rad),
      });
    }
  } else if (tavolo.forma === "quadrato") {
    w = 140;
    h = 140;
    classForma = "tavolo-quadrato";
    borderRadius = "10px";
    const side = 140;
    const offsetSedia = 24;

    for (let i = 0; i < capienza; i++) {
      const perimetroPos = (side * 4 / capienza) * i;
      let sx = 0;
      let sy = 0;

      if (perimetroPos < side) {
        // Lato Superiore (da sinistra a destra)
        sx = perimetroPos;
        sy = -offsetSedia;
      } else if (perimetroPos < side * 2) {
        // Lato Destro (dall'alto in basso)
        sx = side + offsetSedia;
        sy = perimetroPos - side;
      } else if (perimetroPos < side * 3) {
        // Lato Inferiore (da destra a sinistra)
        sx = side - (perimetroPos - side * 2);
        sy = side + offsetSedia;
      } else {
        // Lato Sinistro (dal basso in alto)
        sx = -offsetSedia;
        sy = side - (perimetroPos - side * 3);
      }

      sediePos.push({ x: sx, y: sy });
    }
  } else if (tavolo.forma === "imperiale") {
    w = 220;
    h = 80;
    classForma = "tavolo-imperiale";
    borderRadius = "6px";
    const offsetSedia = 24;

    // Metà sopra e metà sotto, senza capotavola
    const nSopra = Math.ceil(capienza / 2);
    const nSotto = capienza - nSopra;

    // Sedie Sopra
    for (let i = 0; i < nSopra; i++) {
      const sx = nSopra === 1 ? w / 2 : 24 + ((w - 48) / (nSopra - 1)) * i;
      sediePos.push({ x: sx, y: -offsetSedia });
    }

    // Sedie Sotto
    for (let i = 0; i < nSotto; i++) {
      const sx = nSotto === 1 ? w / 2 : 24 + ((w - 48) / (nSotto - 1)) * i;
      sediePos.push({ x: sx, y: h + offsetSedia });
    }
  }

  // Genera sigla
  function getSigla(p: DBSeat) {
    return `${p.nome[0] ?? ""}${p.cognome[0] ?? ""}`.toUpperCase();
  }

  return (
    <motion.div
      drag
      dragMomentum={false}
      onDragEnd={(_, info) => {
        // Salva le nuove coordinate dividendo lo spostamento per lo zoom corrente
        const deltaX = info.offset.x / zoom;
        const deltaY = info.offset.y / zoom;
        onDragEnd(tavolo.id, Math.round(tavolo.pos_x + deltaX), Math.round(tavolo.pos_y + deltaY));
      }}
      onPointerDown={onEvidenzia}
      className="tavolo-contenitore"
      style={{
        left: tavolo.pos_x,
        top: tavolo.pos_y,
        width: w,
        height: h,
      }}
    >
      {/* Corpo del tavolo */}
      <div
        className={`${classForma} ${isSposi ? "tavolo-sposi" : ""} ${
          evidenziato ? "tavolo-evidenziato" : ""
        }`}
        style={{
          width: "100%",
          height: "100%",
          borderRadius: borderRadius,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "2px",
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.currentTarget.classList.add("drag-over");
        }}
        onDragLeave={(e) => {
          e.currentTarget.classList.remove("drag-over");
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.currentTarget.classList.remove("drag-over");
          try {
            const guest = JSON.parse(e.dataTransfer.getData("application/json"));
            // Trova la prima sedia vuota
            const primoPostoVuoto = Array.from({ length: tavolo.capienza }).findIndex((_, i) =>
              !ospiti.some((o) =>
                o.sedia_index !== null && o.sedia_index !== undefined
                  ? o.sedia_index === i
                  : o.rsvp_guest_index === i ||
                    (o.fonte === "manuale" && ospiti.indexOf(o) === i)
              )
            );
            if (primoPostoVuoto !== -1) {
              onAssegna(tavolo.id, primoPostoVuoto, guest);
            }
          } catch (err) {
            console.error("Errore drop su tavolo:", err);
          }
        }}
      >
        <span
          style={{
            fontFamily: "var(--f-titolo)",
            fontSize: isSposi ? "1.45rem" : "1.25rem",
            fontWeight: "bold",
            lineHeight: 1.1,
            color: isSposi ? "white" : "var(--c-testo)",
            textAlign: "center",
          }}
        >
          {isSposi ? "SPOSI" : tavolo.nome}
        </span>
        {isSposi && (
          <span style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.9)", fontFamily: "var(--f-testo)", fontWeight: "bold", letterSpacing: "0.03em", marginTop: "3px", textAlign: "center" }}>
            STEFANO e FRANCESCA
          </span>
        )}
      </div>

      {/* Sedie disposte intorno */}
      {sediePos.map((pos, idx) => {
        // Cerca l'occupante di questa sedia
        const occupante = ospiti.find((o) =>
          o.sedia_index !== null && o.sedia_index !== undefined
            ? o.sedia_index === idx
            : o.rsvp_guest_index === idx ||
              (o.fonte === "manuale" && ospiti.indexOf(o) === idx)
        );

        return (
          <div
            key={idx}
            style={{
              position: "absolute",
              left: pos.x,
              top: pos.y,
              transform: "translate(-50%, -50%)",
            }}
          >
            {occupante ? (
              <div
                className="sedia-piena"
                title={`${occupante.nome} ${occupante.cognome}${
                  occupante.allergie ? ` (Allergie: ${occupante.allergie})` : ""
                }`}
              >
                <span>{getSigla(occupante)}</span>
                <button
                  type="button"
                  className="rimuovi-x"
                  onClick={(e) => {
                    e.stopPropagation(); // Evita il drag/evidenzia sul tavolo
                    onRimuovi(occupante.id);
                  }}
                  aria-label="Rimuovi ospite"
                >
                  ×
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="sedia-vuota"
                disabled={!ospiteSelezionato}
                onClick={(e) => {
                  e.stopPropagation(); // Evita il drag/evidenzia sul tavolo
                  onAssegna(tavolo.id, idx);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.add("drag-over");
                }}
                onDragLeave={(e) => {
                  e.currentTarget.classList.remove("drag-over");
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove("drag-over");
                  try {
                    const guest = JSON.parse(e.dataTransfer.getData("application/json"));
                    onAssegna(tavolo.id, idx, guest);
                  } catch (err) {
                    console.error("Errore drop su sedia:", err);
                  }
                }}
                aria-label="Assegna sedia"
              >
                +
              </button>
            )}
          </div>
        );
      })}
    </motion.div>
  );
}
