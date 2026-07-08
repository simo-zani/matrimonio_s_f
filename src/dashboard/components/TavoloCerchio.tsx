import { useEffect } from "react";
import { motion, useMotionValue } from "motion/react";
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
  postoTarget: { tavoloId: string; sediaIndex: number } | null;
  zoom: number;
}

export function TavoloCerchio({
  tavolo,
  ospiti,
  evidenziato,
  onAssegna,
  onRimuovi,
  onDragEnd,
  onEvidenzia,
  postoTarget,
}: TavoloCerchioProps) {
  const isSposi = tavolo.nome.toLowerCase() === "sposi";

  // La posizione vive interamente nei motion values x/y (transform), così non
  // resta un transform residuo da sommare a left/top (che raddoppiava lo spostamento).
  const x = useMotionValue(tavolo.pos_x);
  const y = useMotionValue(tavolo.pos_y);

  // Riallinea x/y quando la posizione cambia dall'esterno (es. dopo il refetch).
  useEffect(() => {
    x.set(tavolo.pos_x);
    y.set(tavolo.pos_y);
  }, [tavolo.pos_x, tavolo.pos_y, x, y]);

  // Dimensioni e calcolo delle posizioni delle sedie in base alla forma
  let w = 140;
  let h = 140;
  let classForma = "tavolo-cerchio";
  let borderRadius = "50%";
  const sediePos: { x: number; y: number }[] = [];

  const capienza = tavolo.capienza;

  const offSedia = 24; // distanza costante tra il bordo del tavolo e le sedie
  const slotSedia = 44; // spaziatura minima tra i centri di due sedie adiacenti

  if (tavolo.forma === "tondo") {
    classForma = "tavolo-tondo";
    borderRadius = "50%";
    // Raggio dinamico: l'anello delle sedie deve avere circonferenza >= slot·capienza,
    // così oltre un certo numero di invitati il tavolo si allarga e non si sovrappongono.
    const raggioSedie = Math.max(94, (slotSedia * capienza) / (2 * Math.PI));
    const raggioCentrale = raggioSedie - offSedia;
    w = raggioCentrale * 2;
    h = raggioCentrale * 2;

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
    classForma = "tavolo-ellisse";
    borderRadius = "50%";
    // Fattore di crescita: scala l'ellisse (mantenendo le proporzioni) finché il
    // perimetro dell'anello sedie basta a contenere tutte le sedie senza sovrapporle.
    const rxBase = 80;
    const ryBase = 50;
    // Perimetro ellisse (approssimazione di Ramanujan)
    const perim = (a: number, b: number) =>
      Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
    const fattore = Math.max(
      1,
      (slotSedia * capienza) / perim(rxBase + offSedia, ryBase + offSedia)
    );
    const rx = rxBase * fattore;
    const ry = ryBase * fattore;
    w = rx * 2;
    h = ry * 2;
    const cx = rx;
    const cy = ry;
    const rxSedie = rx + offSedia;
    const rySedie = ry + offSedia;

    for (let i = 0; i < capienza; i++) {
      const angolo = (360 / capienza) * i - 90;
      const rad = (angolo * Math.PI) / 180;
      sediePos.push({
        x: cx + rxSedie * Math.cos(rad),
        y: cy + rySedie * Math.sin(rad),
      });
    }
  } else if (tavolo.forma === "quadrato") {
    classForma = "tavolo-quadrato";
    borderRadius = "10px";
    const offsetSedia = 24;

    // Distribuisci le sedie il più equamente possibile sui 4 lati [top, right, bottom, left]
    const perLato = [0, 0, 0, 0];
    const base = Math.floor(capienza / 4);
    const resto = capienza % 4;
    for (let s = 0; s < 4; s++) perLato[s] = base;
    const ordineResto = [0, 2, 3, 1]; // il resto va prima a top e bottom, poi a left e right
    for (let k = 0; k < resto; k++) perLato[ordineResto[k]]++;

    // Lato dinamico: evita che le sedie si sovrappongano sul lato più affollato
    const maxPerLato = Math.max(...perLato, 1);
    const slotSedia = 44;
    const side = Math.max(140, slotSedia * (maxPerLato + 1));
    w = side;
    h = side;

    // Sedie equidistanti lungo ogni lato, con margine dagli angoli.
    // Ordine di push lungo il perimetro (top → right → bottom → left) per mantenere
    // coerente l'adiacenza usata negli avvisi sul nucleo.
    for (let j = 0; j < perLato[0]; j++) // top: da sinistra a destra
      sediePos.push({ x: (side * (j + 1)) / (perLato[0] + 1), y: -offsetSedia });
    for (let j = 0; j < perLato[1]; j++) // right: dall'alto in basso
      sediePos.push({ x: side + offsetSedia, y: (side * (j + 1)) / (perLato[1] + 1) });
    for (let j = 0; j < perLato[2]; j++) // bottom: da destra a sinistra
      sediePos.push({ x: side - (side * (j + 1)) / (perLato[2] + 1), y: side + offsetSedia });
    for (let j = 0; j < perLato[3]; j++) // left: dal basso in alto
      sediePos.push({ x: -offsetSedia, y: side - (side * (j + 1)) / (perLato[3] + 1) });
  } else if (tavolo.forma === "imperiale") {
    h = 80;
    classForma = "tavolo-imperiale";
    borderRadius = "6px";
    const offsetSedia = 24;

    // Le sedie sono disposte in colonne (coppie che si fronteggiano), senza capotavola.
    // Con capienza dispari l'ultima colonna ha solo la sedia sopra (nessuno di fronte).
    const nColonne = Math.ceil(capienza / 2);
    const nSopra = nColonne;
    const nSotto = capienza - nSopra;

    // Larghezza dinamica: ogni colonna ha il suo "slot", così le sedie restano sempre
    // visibili e non sovrapposte, con un piccolo gap tra una e l'altra.
    const slotSedia = 44; // distanza tra i centri di due colonne adiacenti
    const bordoLat = 24; // margine tra bordo del tavolo e prima/ultima sedia
    w = Math.max(160, slotSedia * (nColonne - 1) + bordoLat * 2);

    // x del centro della colonna c (stesso per la sedia sopra e quella sotto → si fronteggiano)
    const colX = (c: number) =>
      nColonne === 1 ? w / 2 : bordoLat + ((w - bordoLat * 2) / (nColonne - 1)) * c;

    // Sedie Sopra (una per colonna)
    for (let c = 0; c < nSopra; c++) {
      sediePos.push({ x: colX(c), y: -offsetSedia });
    }

    // Sedie Sotto (allineate sotto le prime colonne)
    for (let c = 0; c < nSotto; c++) {
      sediePos.push({ x: colX(c), y: h + offsetSedia });
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
      onDragEnd={() => {
        // La posizione finale è già nel motion value (nessun raddoppio).
        const nx = Math.max(0, Math.round(x.get()));
        const ny = Math.max(0, Math.round(y.get()));
        x.set(nx);
        y.set(ny);
        onDragEnd(tavolo.id, nx, ny);
      }}
      onPointerDown={onEvidenzia}
      onClick={(e) => e.stopPropagation()}
      className="tavolo-contenitore"
      style={{
        x,
        y,
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
          {isSposi ? "SPOSI" : tavolo.nome.toUpperCase()}
        </span>
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
                className={`sedia-piena ${isSposi ? "sedia-piena-sposi" : ""}`}
                title={`${occupante.nome} ${occupante.cognome}${
                  occupante.allergie ? ` (Allergie: ${occupante.allergie})` : ""
                }`}
              >
                <span>{isSposi ? occupante.nome.toUpperCase() : getSigla(occupante)}</span>
                {!isSposi && (
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
                )}
              </div>
            ) : (
              <button
                type="button"
                className={`sedia-vuota ${
                  postoTarget &&
                  postoTarget.tavoloId === tavolo.id &&
                  postoTarget.sediaIndex === idx
                    ? "in-attesa"
                    : ""
                }`}
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
