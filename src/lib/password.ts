// Fase 2 — match della password (tollerante).
// Cancello estetico, non sicurezza vera: gira lato client. Va bene così
// per un matrimonio (vedi README).
//
// Nomi reali (Partecipazione_2.pdf): Stefano Zani e Francesca Lucia Cubello.
// La password sono i nomi propri degli sposi: basta che l'input contenga
// entrambi ("stefano" e "francesca"), a prescindere da accenti e ordine.

export function passwordCorretta(input: string): boolean {
  const norm = input
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
  
  return norm.includes("stefano") && norm.includes("francesca");
}
