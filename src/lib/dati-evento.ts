/**
 * Dati dell'evento — fonte unica di verità.
 *
 * Tutti i valori sotto "confermati" arrivano dalla Partecipazione_2.pdf
 * (assets/Partecipazione_2.pdf) già pronta, quindi NON sono inventati.
 * I valori sotto "da confermare" mancano sia nel PDF sia in
 * assets/testi/dati-evento.md (ancora vuoto): sono segnaposto chiaramente
 * marcati, da sostituire prima di andare online.
 */

export const sposi = {
  lui: "Stefano Zani",
  lei: "Francesca Lucia Cubello",
  iniziali: "S F",
} as const;

export const evento = {
  dataLeggibile: "sabato 5 settembre 2026",
  ora: "10:30",
  // Data ISO comoda per eventuali calcoli (countdown, aggiungi al calendario)
  dataISO: "2026-09-05T10:30:00+02:00",
};

export const chiesa = {
  nome: "Chiesa San Giuseppe",
  indirizzo: "Via Milano 99, Cologno Monzese (MI)",
  orario: "10:30",
};

export const location = {
  nome: "Villa San Michele",
  indirizzo: "Via dei Fontanoni 4, Ripalta Cremasca (CR)",
  // DA CONFERMARE: il PDF dice solo "dopo la cerimonia", nessun orario esatto.
  orario: "a seguire — DA CONFERMARE",
};

/** Link Maps costruito dall'indirizzo reale (query standard Google Maps). */
export function linkMaps(indirizzo: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(indirizzo)}`;
}

/**
 * Testo della storia — preso dalla pagina "poesia" della Partecipazione_2.pdf,
 * perché assets/testi/storia.md è ancora vuoto (solo il template). È testo
 * reale degli sposi, solo preso da un altro file fornito invece che da
 * storia.md. Se preferite un testo diverso per il sito, aggiornate
 * assets/testi/storia.md e questo file va riallineato.
 */
export const storia = `Eravamo amici, prima di tutto.
Prima dei sogni condivisi, prima delle promesse, prima dell'amore.
Eravamo presenza e complicità silenziosa.

Poi, senza fare rumore, qualcosa ha trovato il suo posto.
Un amore capace di aspettare, di capire, di restare.
Così l'amicizia ha imparato a chiamarsi amore,
ha scelto di diventare casa.

Oggi non celebriamo un inizio, ma tutto il cammino che ci ha portati fin qui.`;

/** DA CONFERMARE: nessuna scadenza RSVP indicata finora. */
export const scadenzaRsvp = "DA CONFERMARE";
