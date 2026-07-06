# Fase 0 — Asset da fornire (fallo TU, prima di tutto)

Questa fase non ha codice. È la **checklist di tutto quello che devi
consegnare** perché le fasi successive possano partire. Metti i file nelle
cartelle indicate dentro `assets/`.

> Regola d'oro: **niente inventato**. Testi, luoghi, nomi, storia → li dai tu,
> esatti. Se un campo resta vuoto qui, quella parte del sito resta bloccata.

---

## 1. Colori (esadecimali esatti)

Servono i codici precisi, non "bianco/oro/panna" a parole. Compila:

- [ ] Bianco: `#________`
- [ ] Panna / avorio (sfondo): `#________`
- [ ] Oro (dettagli, testo di pregio): `#________`
- [ ] Oro scuro / bronzo (bordi, ombre, per contrasto): `#________`
- [ ] Colore testo principale (spesso un marrone/grigio caldo, non nero puro): `#________`
- [ ] Colore ceralacca del sigillo (rosso profondo? oro? bordeaux?): `#________`

Se ne hai solo alcuni, dai quelli e ricaviamo le varianti.

## 2. Font

Metti i file in `assets/font/`. Servono **3 ruoli** (possono coincidere):

- [ ] **Script / corsivo** — per i nomi degli sposi e la "scrittura a mano"
      dell'input password sulla busta. (es. un calligrafico elegante)
- [ ] **Titoli** — un serif di pregio per gli headline delle sezioni.
- [ ] **Testo** — leggibile per paragrafi, form, indicazioni.

Per ogni font serve:
- il file (`.woff2` preferito, oppure `.ttf`/`.otf` e li convertiamo)
- [ ] conferma che la **licenza consenta l'uso web/embed** (importante)

Se usi Google Fonts, basta il nome esatto.

## 3. Immagini e grafiche

Metti tutto in `assets/immagini/`. Elenco:

- [ ] **Texture / fronte della busta** (o indicazioni se la costruiamo in CSS)
- [ ] **Texture del cartoncino / carta** (lo sfondo su cui sta la landing)
- [ ] **Sigillo di ceralacca**: preferibilmente PNG con **sfondo trasparente**.
      Idealmente 2 stati: sigillo **intero** e sigillo **spezzato/sollevato**.
      (In alternativa lo facciamo in SVG/CSS — dimmi tu.)
- [ ] **Monogramma / iniziali** degli sposi (se lo avete), preferibilmente SVG
- [ ] Eventuale **sfondo generale** della pagina
- [ ] Foto degli sposi (opzionale, per hero o sezione storia)
- [ ] Eventuali decori/cornici/ornamenti (SVG o PNG trasparente)

Formati: **SVG** per loghi/decori (scala perfetta), **PNG trasparente** per il
sigillo, **JPG/WebP** per le foto. Se hai i sorgenti (AI, PSD, Figma) tienili da
parte, possono servire.

## 4. Testi (metti in `assets/testi/` o compila qui)

- [ ] **Nomi degli sposi** (esatti, come vanno scritti): ________________
- [ ] **Data** dell'evento: ________________
- [ ] **La storia / storiella** dell'evento — testo completo, già scritto:
      → `assets/testi/storia.md`
- [ ] Eventuale **titolo/frase** per l'hero (es. "Ci sposiamo!"): ________
- [ ] Testo introduttivo del form RSVP (se ne vuoi uno custom): ________
- [ ] Testo del form allergie/intolleranze: ________
- [ ] Eventuale testo di chiusura / ringraziamenti: ________

## 5. La password (cancello della busta)

- [ ] **Password esatta** da usare (i nomi degli sposi): ________________
- [ ] **Varianti da accettare** — pensa a come la scriveranno gli ospiti.
      Consiglio: accettare a prescindere da maiuscole, accenti e ordine.
      Esempio: "Marco e Giulia", "giulia marco", "Marco&Giulia" → tutte OK.
      Dimmi se vuoi questo comportamento (consigliato) o match esatto.
- [ ] **Messaggio di errore** se sbaglia (tono: scherzoso? formale?): ______

## 6. Luoghi (per la sezione "Come arrivare")

Per **ciascuno** dei due luoghi:

**Chiesa / cerimonia**
- [ ] Nome: ________________
- [ ] Indirizzo completo: ________________
- [ ] Orario: ________________
- [ ] Link Google Maps (o coordinate): ________________

**Location ricevimento**
- [ ] Nome: ________________
- [ ] Indirizzo completo: ________________
- [ ] Orario: ________________
- [ ] Link Google Maps (o coordinate): ________________

- [ ] Vuoi mappa **interattiva embed** o **immagine statica + bottone "Apri in
      Maps"** (più leggera ed elegante, consigliata)? ________

## 7. Dettagli RSVP

- [ ] **Entro quale data** si può rispondere (scadenza)? ________________
- [ ] Vuoi il conteggio **bambini** separato dagli adulti (per il catering)? ____
- [ ] Campi extra che vuoi raccogliere oltre a nome/cognome/presenza? ________
- [ ] A quale **email** ti arrivano o dove leggi le risposte (dashboard
      Supabase va bene)? ________

## 8. Dominio (per il deploy, Fase 7)

- [ ] Hai un dominio dedicato (es. `marco-e-giulia.it`) o va bene un
      sottodominio Vercel gratis? ________________

---

## Consegna

Quando hai riempito le cartelle `assets/` e risposto ai punti sopra, si parte
dalla **Fase 1**. Il primo obiettivo concreto sarà un prototipo della sola
apertura busta→sigillo→cartoncino (Fasi 1-3), per sentire subito se il "feel" è
quello giusto prima di metterci contenuti e form.
