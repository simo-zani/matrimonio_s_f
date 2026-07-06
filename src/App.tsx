import { useState } from "react";
import { Envelope } from "./components/Envelope/Envelope";
import { Cartoncino } from "./components/Reveal/Cartoncino";
import { Hero } from "./components/sections/Hero";
import { Storia } from "./components/sections/Storia";
import { DoveQuando } from "./components/sections/DoveQuando";
import { Rsvp } from "./components/forms/Rsvp";

function App() {
  const [aperta, setAperta] = useState(false);

  if (!aperta) {
    return <Envelope onAperta={() => setAperta(true)} />;
  }

  return (
    <Cartoncino>
      <Hero />
      <Storia />
      <DoveQuando />
      <Rsvp />
    </Cartoncino>
  );
}

export default App;
