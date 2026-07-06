import { sposi, evento } from "../../lib/dati-evento";
import "./sections.css";

export function Hero() {
  return (
    <section className="sezione hero">
      <p className="hero-eyelet">Ci sposiamo</p>
      <h1 className="hero-nomi">
        {sposi.lui}
        <span className="hero-e"> &amp; </span>
        {sposi.lei}
      </h1>
      <p className="hero-data">
        {evento.dataLeggibile} · ore {evento.ora}
      </p>
    </section>
  );
}
