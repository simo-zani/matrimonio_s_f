import { storia } from "../../lib/dati-evento";
import "./sections.css";

export function Storia() {
  return (
    <section className="sezione storia">
      <h2>La nostra storia</h2>
      <div className="storia-corpo">
        <div className="storia-testo">
          {storia.split("\n\n").map((paragrafo, i) => (
            <p key={i}>
              {paragrafo.split("\n").map((riga, j, arr) => (
                <span key={j}>
                  {riga}
                  {j < arr.length - 1 && <br />}
                </span>
              ))}
            </p>
          ))}
        </div>
        <img className="storia-foto" src="/immagini/bambini.jpg" alt="" />
      </div>
    </section>
  );
}
