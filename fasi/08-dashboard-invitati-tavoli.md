# Fase 8 — Dashboard privata: invitati + tavoli

**Obiettivo:** una pagina non linkata dal sito pubblico, protetta da password, dove
vedi chi ha confermato (con accompagnatori e allergie) e organizzi i tavoli della
cerimonia trascinando gli ospiti dentro tavoli che crei tu, di capienza libera.
Puoi anche aggiungere a mano persone che non hanno fatto RSVP (es. nonni).

**Prerequisito:** Fase 5 (tabella `rsvp` con RLS insert-only già attiva).

---

## 0. La password qui è un caso diverso dalla busta — leggi prima questo

Per la busta (Fase 2) la password è puramente estetica: va bene farla via
`if` lato client perché **non protegge niente di leggibile** — la tabella
`rsvp` non ha nessuna policy di `select` per anon, quindi anche aprendo il
codice sorgente nessuno legge le risposte altrui.

Qui è diverso: la dashboard deve **leggere** `rsvp` (nomi, allergie) e
**scrivere** `tavoli`/`posti`. Se implementi il gate come un semplice
`if (password === "xyz")` in JavaScript, chiunque apra gli strumenti sviluppatore
sul sito pubblicato vede quella stringa nel bundle **e** vede quale chiave Supabase
usi per leggere i dati — a quel punto il gate non protegge nulla, non è che
"estetico ma innocuo" come per la busta: qui dietro ci sono dati reali (allergie,
nomi) leggibili da chiunque trovi il link.

**Soluzione che resta semplice quanto un hardcoded, ma è vera sicurezza:**
usi **Supabase Auth** con un solo utente (tu), e nella dashboard chiedi solo la
password (l'email la tieni fissa nel codice). Il login è reale: la RLS su
`rsvp`/`tavoli`/`posti` richiede `authenticated`, quindi senza login corretto
i dati non si leggono **nemmeno chiamando l'API Supabase direttamente**, non
solo nascondendo un bottone. Il codice che scrivi tu resta uno solo, un campo
password — cambia solo cosa succede sotto.

### Crea il tuo utente (una volta, dalla dashboard Supabase)

Supabase → Authentication → Users → **Add user** → inserisci una tua email e
una password a scelta. Non serve altro (niente email di conferma da gestire se
scegli "Auto Confirm User").

### Route segreta (niente router in più)

Non serve installare `react-router` per un'unica pagina in più. Basta
controllare il path a mano in `App.tsx`:

```tsx
const isDashboard = window.location.pathname === "/dashboard-mg2027"; // scegli tu lo slug, non linkarlo da nessuna parte nel sito
```

> Lo slug è la parte "solo via link": non compare in nessun `<a>` del sito
> pubblico, quindi non è indicizzabile e non ci si finisce per caso. La vera
> protezione dei dati resta comunque il login Supabase sopra, non la segretezza
> dello slug.

## 1. Login

`src/dashboard/lib/dashboardAuth.ts`
```ts
import { supabase } from "../../lib/supabase";

const DASHBOARD_EMAIL = "tuo-indirizzo@esempio.it"; // quello creato sopra

export async function loginDashboard(password: string) {
  const { error } = await supabase.auth.signInWithPassword({
    email: DASHBOARD_EMAIL,
    password,
  });
  return !error;
}

export async function logoutDashboard() {
  await supabase.auth.signOut();
}

export function useSessioneAttiva() {
  const [attiva, setAttiva] = useState<boolean | null>(null); // null = "sto controllando"
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAttiva(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setAttiva(!!session)
    );
    return () => sub.subscription.unsubscribe();
  }, []);
  return attiva;
}
```

Componente form: un solo campo password, come la busta ma senza normalizzazione
tollerante (qui sei solo tu, se sbagli riprovi).

## 2. Schema tabelle — tavoli e posti

```sql
create table public.tavoli (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,          -- es. "Sposi", "Tavolo 1", "Zii di Marco"
  capienza   int  not null check (capienza > 0),
  pos_x      int  not null default 40,
  pos_y      int  not null default 40,
  created_at timestamptz default now()
);

create table public.posti (
  id                uuid primary key default gen_random_uuid(),
  tavolo_id         uuid not null references public.tavoli(id) on delete cascade,
  nome              text not null,
  cognome           text not null,
  tipo              text not null default 'adulto',   -- 'adulto' | 'bambino'
  allergie          text,                              -- copiata dal gruppo rsvp, se presente
  fonte             text not null default 'manuale',   -- 'rsvp' | 'manuale'
  rsvp_id           uuid references public.rsvp(id) on delete set null,
  rsvp_guest_index  int,   -- indice nell'array guests del rsvp — identifica la persona
  created_at        timestamptz default now(),
  unique (rsvp_id, rsvp_guest_index)  -- impedisce di sedere due volte la stessa persona rsvp
);
```

`rsvp_guest_index` è la chiave per il "se già inserito non deve comparire":
quando assegni una persona proveniente dall'RSVP a un tavolo, scrivi qui
l'indice che occupava in `guests[]`. La lista "disponibili" nella dashboard
mostra solo le combinazioni `(rsvp_id, index)` che **non** esistono ancora in
`posti`.

Non serve una tabella "Tavolo Sposi" speciale nel codice: è semplicemente il
primo tavolo che crei tu, capienza 2, nome "Sposi". Il modello resta uniforme,
niente casi speciali da gestire nella UI.

### RLS

```sql
alter table public.tavoli enable row level security;
alter table public.posti  enable row level security;

create policy "tavoli solo autenticati" on public.tavoli
  for all to authenticated using (true) with check (true);

create policy "posti solo autenticati" on public.posti
  for all to authenticated using (true) with check (true);

-- serve anche una policy di lettura su rsvp per te, che oggi ha solo insert:
create policy "rsvp lettura autenticati" on public.rsvp
  for select to authenticated using (true);
```

## 3. Schermata "Invitati" — chi ha confermato

Query: `rsvp` dove `presenza = true`, espandi `guests[]`.

```tsx
const { data: rsvps } = await supabase
  .from("rsvp")
  .select("*")
  .eq("presenza", true)
  .order("created_at");
```

Per ogni riga mostra: chi ha compilato (`nome_contatto`), la lista
accompagnatori con tipo (adulto/bambino), e le `allergie` (nota: nello schema
Fase 5 le allergie sono **per nucleo**, non per singola persona — mostralo
come nota del gruppo, non attaccato al singolo nome).

Un contatore in alto aiuta subito: totale adulti, totale bambini, quante
famiglie hanno segnalato allergie.

## 4. Schermata "Tavoli" — la parte visuale

Layout a tre colonne su desktop:

- **Sinistra, lista ospiti disponibili**: tutte le persone confermate (RSVP)
  non ancora sedute, + un pulsante "Aggiungi persona" per chi non ha fatto
  RSVP (nonni, ecc. — vedi punto 5). Ogni riga ha nome, tipo, e badge allergie
  se presenti. Un campo di ricerca se la lista è lunga.
- **Centro, il piano dei tavoli**: i tavoli come **cerchi**, posizionabili
  liberamente trascinandoli (gratis con `motion`, come sotto).
- **Destra, elenco tavoli**: lista testuale nome + numero persone/capienza,
  cliccabile per far lampeggiare/evidenziare il tavolo corrispondente nel
  piano centrale — utile quando i tavoli sono tanti e sparsi.

### Il tavolo: cerchio + sedie intorno

Ogni tavolo è un cerchio (`border-radius: 50%`), con tante sedie quante la
`capienza`, disposte in cerchio intorno a lui via trigonometria (niente
libreria in più). Sedia = un semplice rettangolo, basta così.

- **Sedia vuota** → un **"+" verde**, cliccabile.
- **Sedia occupata** → **iniziali** dell'ospite (es. "SZ"), `title` con nome
  completo per il tooltip al passaggio del mouse, più una **× rossa** piccola
  in overlay per rimuoverlo — **senza conferma**, un click e sparisce, deve
  essere immediato.
- **Tavolo degli sposi** → riempimento **oro** (`--c-oro`), sempre, per
  distinguerlo a colpo d'occhio dagli altri.
- **Tavolo evidenziato dalla lista di destra** → un **anello azzurro**
  (`box-shadow`) intorno al cerchio, indipendente dal colore di riempimento
  (così funziona anche sul tavolo sposi, che resta oro ma con l'anello sopra).

```tsx
function TavoloCerchio({ tavolo, ospiti, isSposi, evidenziato, ospiteSelezionato,
                          onAssegna, onRimuovi, onDragEnd }) {
  const raggio = 70;          // px, raggio del cerchio tavolo
  const raggioSedie = raggio + 34; // le sedie stanno fuori dal bordo

  return (
    <motion.div
      drag
      dragMomentum={false}
      onDragEnd={(_, info) => onDragEnd(tavolo.id, info.point.x, info.point.y)}
      style={{ position: "absolute", left: tavolo.pos_x, top: tavolo.pos_y, width: raggio * 2, height: raggio * 2 }}
    >
      <div
        className="tavolo-cerchio"
        style={{
          width: raggio * 2, height: raggio * 2, borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          background: isSposi ? "var(--c-oro)" : "var(--c-bianco)",
          border: "2px solid var(--c-oro-scuro)",
          boxShadow: evidenziato ? "0 0 0 4px #4fc3f7" : "none",
          fontWeight: 600,
        }}
      >
        {tavolo.nome}
      </div>

      {Array.from({ length: tavolo.capienza }).map((_, i) => {
        const angolo = (360 / tavolo.capienza) * i - 90; // -90 = si parte da sopra
        const rad = (angolo * Math.PI) / 180;
        const x = raggio + raggioSedie * Math.cos(rad);
        const y = raggio + raggioSedie * Math.sin(rad);
        const occupante = ospiti[i];

        return (
          <div key={i} style={{ position: "absolute", left: x, top: y, transform: "translate(-50%, -50%)" }}>
            {occupante ? (
              <div className="sedia-piena" title={`${occupante.nome} ${occupante.cognome}`}>
                <span>{iniziali(occupante)}</span>
                <button className="rimuovi-x" onClick={() => onRimuovi(occupante.id)}>×</button>
              </div>
            ) : (
              <button
                className="sedia-vuota"
                disabled={!ospiteSelezionato}
                onClick={() => onAssegna(tavolo.id, i)}
              >+</button>
            )}
          </div>
        );
      })}
    </motion.div>
  );
}

function iniziali(p: { nome: string; cognome: string }) {
  return `${p.nome[0] ?? ""}${p.cognome[0] ?? ""}`.toUpperCase();
}
```

```css
.sedia-vuota {
  width: 26px; height: 26px; border-radius: 6px; /* rettangolo, basta così */
  background: #eafaf0; border: 1.5px solid #2ecc71; color: #2ecc71;
  font-size: 16px; line-height: 1; cursor: pointer;
}
.sedia-vuota:disabled { opacity: 0.4; cursor: not-allowed; }

.sedia-piena {
  position: relative;
  width: 30px; height: 26px; border-radius: 6px;
  background: var(--c-panna); border: 1.5px solid var(--c-oro-scuro);
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 600;
}
.rimuovi-x {
  position: absolute; top: -8px; right: -8px;
  width: 16px; height: 16px; border-radius: 50%;
  background: #e74c3c; color: #fff; font-size: 11px; line-height: 1;
  border: none; cursor: pointer;
}
```

**Interazione di assegnazione (MVP, senza drag-and-drop delle persone):** clic
su una persona nella lista di sinistra la "seleziona" (evidenziata lì); il "+"
verde sulle sedie vuote diventa cliccabile solo quando c'è una selezione
attiva (`disabled` altrimenti, per evitare click a vuoto) e assegna la persona
a quella sedia. Più semplice da costruire di un drag&drop vero. Se poi vuoi
alzare l'asticella, si può aggiungere il trascinamento della singola persona
con `@dnd-kit`, ma non è necessario per l'MVP.

**Rimozione**: click sulla × rossa cancella subito la riga in `posti`, nessun
popup di conferma. Se la persona veniva da RSVP, ricompare automaticamente
nella lista di sinistra (la query "disponibili" esclude solo chi è ancora
presente in `posti`).

**"+ Nuovo tavolo"**: modale con due campi, nome e numero di posti (libero,
lo decidi tu per ogni tavolo). Crea una riga in `tavoli`. Il tavolo "Sposi"
è semplicemente il primo che crei, con quel nome esatto — è il nome a
determinare il colore oro (confronto case-insensitive), non un flag a parte
nello schema.

**Elenco tavoli a destra**: una riga per tavolo, `{nome} — {occupati}/{capienza}`.
Click su una riga imposta lo stato `tavoloEvidenziato = tavolo.id`, che è
l'unica cosa che serve per far comparire l'anello azzurro sul cerchio
corrispondente nel piano centrale.

## 5. Ospiti senza RSVP (nonni, ecc.)

Pulsante "Aggiungi persona" nella lista di sinistra: modale con nome,
cognome, tipo (adulto/bambino), eventuali allergie in un campo libero. Alla
conferma crei subito una riga in `posti` con `fonte = 'manuale'`,
`rsvp_id = null` — puoi scegliere se assegnarla subito a un tavolo o lasciarla
"in sospeso" (in tal caso serve un `tavolo_id` nullable, oppure — più semplice,
dato lo schema attuale con `tavolo_id not null` — falle scegliere il tavolo
nello stesso modale, visto che tipicamente sai già dove va un nonno quando lo
aggiungi).

## 6. Struttura file

```
src/
  dashboard/
    Login.tsx
    ListaInvitati.tsx        # Fase 8.3
    GestioneTavoli.tsx       # Fase 8.4
    components/
      TavoloCerchio.tsx       # cerchio + sedie disposte intorno
      ListaOspitiDisponibili.tsx
      ListaTavoli.tsx         # elenco laterale, click = evidenzia
      ModaleNuovoTavolo.tsx
      ModaleOspiteManuale.tsx
    lib/
      dashboardAuth.ts
      queries.ts             # tutte le select/insert/delete di tavoli+posti
```

---

## Definition of done

- [ ] Utente Supabase Auth creato, login dalla dashboard funziona con la sola password
- [ ] Senza login, chiamando direttamente l'API Supabase non si leggono `rsvp`/`tavoli`/`posti` (verificato disconnettendo la sessione)
- [ ] Route `/dashboard-<slug>` raggiungibile solo conoscendo l'URL, non linkata dal sito pubblico
- [ ] Schermata Invitati mostra tutti i confermati, accompagnatori e allergie del nucleo
- [ ] Posso creare tavoli con nome e capienza a piacere (incluso il tavolo Sposi da 2)
- [ ] I tavoli sono cerchi con tante sedie quanto la capienza; il tavolo "Sposi" è oro
- [ ] Sedia vuota = "+" verde; sedia occupata = iniziali, tooltip col nome intero, × rossa per rimuovere senza conferma
- [ ] Cliccando una riga nell'elenco tavoli a destra, il cerchio corrispondente si evidenzia in azzurro
- [ ] Un ospite assegnato a un tavolo sparisce dalla lista "disponibili"
- [ ] Rimuovendo un ospite da un tavolo, ricompare in lista se veniva da RSVP
- [ ] Posso aggiungere persone senza RSVP e assegnarle a un tavolo
- [ ] La posizione dei tavoli sul piano si salva e si ricarica al refresh
- [ ] Provato con dati reali: nessuna doppia assegnazione della stessa persona
