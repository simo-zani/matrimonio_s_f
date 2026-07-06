// Fase 2 — match della password (tollerante).
// Cancello estetico, non sicurezza vera: gira lato client. Va bene così
// per un matrimonio (vedi README).

function normalizza(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/\p{Diacritic}/gu, "") // via accenti
    .replace(/[^a-z0-9 ]/g, " ")                       // via & , ecc.
    .split(/\s+/).filter(Boolean).sort().join(" ");    // ordine-indipendente
}

// Nomi reali (Partecipazione_2.pdf): Stefano Zani e Francesca Lucia Cubello.
// Uso qui solo i nomi propri, come da regola README "password = nomi sposi":
// se preferite includere anche i cognomi, sostituite la stringa sotto.
const PASSWORD = normalizza("Stefano e Francesca");

export function passwordCorretta(input: string): boolean {
  const norm = input
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
  
  return norm.includes("stefano") && norm.includes("francesca");
}
