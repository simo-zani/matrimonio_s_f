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
  // Il PDF dice solo "dopo la cerimonia", nessun orario esatto.
  orario: "a seguire",
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
export const storia = `Ci sono incontri che sembrano semplici coincidenze e altri che rivelano di essere sempre stati destino.

La nostra storia è iniziata nel 2011. Eravamo poco più che bambini e ci siamo conosciuti grazie ai nostri fratelli. 
Da quel giorno le nostre strade non si sono mai davvero separate. 
La vita ci ha portati a vivere momenti diversi, ci ha fatti avvicinare e allontanare, ma il filo che ci univa non si è mai spezzato.

Per anni siamo stati amici. Di quelli che si ritrovano sempre, anche dopo il silenzio. Di quelli che maturano insieme senza accorgersi che il tempo sta preparando qualcosa di ancora più bello.

Poi è arrivato il 2023. 
Senza fretta, senza forzature, abbiamo capito che ciò che avevamo sempre cercato era rimasto davanti ai nostri occhi per tutto quel tempo. 
L’amicizia ha lasciato spazio a un amore profondo, fatto di fiducia, di rispetto e della certezza di aver trovato, finalmente, il posto in cui sentirsi a casa.

Il 5 settembre non inizierà la nostra storia. 
Quel giorno celebreremo quindici anni di sorrisi, ricordi, crescita e un legame che ha saputo aspettare il momento giusto per diventare il nostro per sempre.

Grazie per essere qui, a condividere con noi il giorno più bello della nostra vita.`;

/** DA CONFERMARE: nessuna scadenza RSVP indicata finora. */
export const scadenzaRsvp = "DA CONFERMARE";
