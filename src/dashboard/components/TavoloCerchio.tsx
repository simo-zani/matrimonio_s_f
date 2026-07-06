import { motion } from "motion/react";
import type { DBTable, DBSeat } from "../lib/queries";
import "../dashboard.css";

interface TavoloCerchioProps {
  tavolo: DBTable;
  ospiti: DBSeat[]; // Posti occupati in questo tavolo
  evidenziato: boolean;
  ospiteSelezionato: any | null; // Ospite selezionato nella sidebar
  onAssegna: (tavoloId: string, sediaIndex: number) => void;
  onRimuovi: (postoId: string) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
  onEvidenzia: () => void;
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
      const angolo = (360 / capienza) * i - 90; // Inizia dall'alto (-90deg)
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
        // Salva le nuove coordinate (aggiungendo la differenza traslata)
        onDragEnd(tavolo.id, tavolo.pos_x + info.delta.x, tavolo.pos_y + info.delta.y);
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
        }}
      >
        <span style={{ fontSize: "0.88rem" }}>{tavolo.nome}</span>
      </div>

      {/* Sedie disposte intorno */}
      {sediePos.map((pos, idx) => {
        // Cerca se c'è un occupante assegnato a questa sedia
        // Usiamo un indice virtuale per abbinare le sedie
        const occupante = ospiti.find((o) => o.rsvp_guest_index === idx || (o.fonte === "manuale" && ospiti.indexOf(o) === idx));

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
