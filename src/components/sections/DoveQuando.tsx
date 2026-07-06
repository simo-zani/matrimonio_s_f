import { chiesa, location, linkMaps } from "../../lib/dati-evento";
import "./sections.css";

export function DoveQuando() {
  return (
    <section className="sezione dove-quando">
      <h2>Dove &amp; quando</h2>
      <div className="luoghi">
        <article className="luogo-card">
          <img src="/immagini/chiesa.jpg" alt={chiesa.nome} />
          <h3>Cerimonia</h3>
          <p className="luogo-nome">{chiesa.nome}</p>
          <p>{chiesa.indirizzo}</p>
          <p>Ore {chiesa.orario}</p>
          <a
            className="luogo-link"
            href={linkMaps(chiesa.indirizzo)}
            target="_blank"
            rel="noreferrer"
          >
            Apri in Maps
          </a>
        </article>

        <article className="luogo-card">
          <img src="/immagini/villa.jpg" alt={location.nome} />
          <h3>Ricevimento</h3>
          <p className="luogo-nome">{location.nome}</p>
          <p>{location.indirizzo}</p>
          <p>{location.orario}</p>
          <a
            className="luogo-link"
            href={linkMaps(location.indirizzo)}
            target="_blank"
            rel="noreferrer"
          >
            Apri in Maps
          </a>
        </article>
      </div>
    </section>
  );
}
