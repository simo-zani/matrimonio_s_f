import { useEffect, useState } from "react";
import { evento } from "../../lib/dati-evento";

type Rimanente = { giorni: number; ore: number; minuti: number; secondi: number };

function calcola(target: number): Rimanente {
  const diff = Math.max(0, target - Date.now());
  const secondiTot = Math.floor(diff / 1000);
  return {
    giorni: Math.floor(secondiTot / 86400),
    ore: Math.floor((secondiTot % 86400) / 3600),
    minuti: Math.floor((secondiTot % 3600) / 60),
    secondi: secondiTot % 60,
  };
}

export function Countdown() {
  const target = new Date(evento.dataISO).getTime();
  const [r, setR] = useState<Rimanente>(() => calcola(target));

  useEffect(() => {
    const id = setInterval(() => setR(calcola(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  // A matrimonio iniziato (data passata) non ha più senso: nascondiamo la sezione.
  const scaduto = r.giorni + r.ore + r.minuti + r.secondi === 0;
  if (scaduto) return null;

  const voci: { valore: number; etichetta: string }[] = [
    { valore: r.giorni, etichetta: "giorni" },
    { valore: r.ore, etichetta: "ore" },
    { valore: r.minuti, etichetta: "minuti" },
    { valore: r.secondi, etichetta: "secondi" },
  ];

  return (
    <div className="countdown" aria-label="Countdown al matrimonio">
      {voci.map((v) => (
        <div className="countdown-voce" key={v.etichetta}>
          <span className="countdown-numero">{v.valore}</span>
          <span className="countdown-etichetta">{v.etichetta}</span>
        </div>
      ))}
    </div>
  );
}
