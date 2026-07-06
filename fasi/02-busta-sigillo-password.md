# Fase 2 — Busta + input password + sigillo cliccabile

**Obiettivo:** all'apertura del sito si vede la busta. Si digita la password
(nomi degli sposi) e la si vede comparire "sulla busta". Al match, il sigillo di
ceralacca si attiva e diventa cliccabile; al click il lembo si apre di poco.

**Questa è la fase più delicata insieme alla 3.** Se il feel non convince qui,
meglio scoprirlo ora.

---

## Stati dell'interazione

Modella l'apertura come una macchina a stati esplicita:

```
'chiusa' → (password corretta) → 'sbloccata' → (click sigillo) → 'aperta'
```

```tsx
type EnvelopeState = 'chiusa' | 'sbloccata' | 'aperta';
const [state, setState] = useState<EnvelopeState>('chiusa');
```

## 1. Match della password (tollerante)

Un gate troppo rigido = ospiti bloccati e messaggi "non funziona" il giorno
prima. Normalizza prima di confrontare.

`src/lib/password.ts`
```ts
// minuscole, via accenti, via punteggiatura, spazi collassati,
// e ordine-indipendente ("marco e giulia" == "giulia marco")
function normalizza(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // via accenti
    .replace(/[^a-z0-9 ]/g, " ")                       // via & , ecc.
    .split(/\s+/).filter(Boolean).sort().join(" ");    // ordine-indip.
}

// SOSTITUISCI con i nomi esatti (Fase 0)
const PASSWORD = normalizza("Marco e Giulia");

export function passwordCorretta(input: string): boolean {
  return normalizza(input) === PASSWORD;
}
```

> Ricorda: è un cancello estetico, non sicurezza. Sta tutto lato client. Va
> bene così per un matrimonio.

## 2. Input "scritto a mano" sulla busta

L'input usa il font script (`--f-script`) e sta posizionato sopra la busta.
Mentre digita, il testo appare come se fosse scritto a penna.

```tsx
<input
  value={testo}
  onChange={(e) => {
    setTesto(e.target.value);
    if (passwordCorretta(e.target.value)) setState('sbloccata');
  }}
  placeholder="i nostri nomi…"
  style={{
    fontFamily: "var(--f-script)",
    background: "transparent",
    border: "none",
    borderBottom: "1px solid var(--c-oro)",
    color: "var(--c-testo)",
    textAlign: "center",
    outline: "none",
  }}
/>
```

Tocco in più (opzionale): un piccolo effetto "inchiostro che appare" animando
`opacity` degli ultimi caratteri. Non esagerare, deve restare leggibile.

## 3. Il sigillo di ceralacca

- Stato `chiusa`: sigillo presente ma "spento" (opacità ridotta, non cliccabile).
- Stato `sbloccata`: il sigillo si "accende" — leggero glow / scale-in, cursore
  a pointer, animazione di richiamo (un piccolo pulse una volta sola).
- Click → `state = 'aperta'`.

```tsx
<motion.button
  disabled={state === 'chiusa'}
  onClick={() => setState('aperta')}
  animate={state === 'sbloccata'
    ? { scale: [1, 1.06, 1], filter: "drop-shadow(0 0 12px var(--c-oro))" }
    : { scale: 1, opacity: state === 'chiusa' ? 0.5 : 1 }}
  transition={{ duration: 0.6 }}
  style={{ background: "none", border: "none", cursor: state !== 'chiusa' ? "pointer" : "default" }}
>
  {/* immagine sigillo (PNG trasparente Fase 0) o SVG */}
  <img src="/immagini/sigillo.png" alt="sigillo" />
</motion.button>
```

## 4. Apertura del lembo (3D reale)

Al passaggio a `'aperta'`, il lembo superiore ruota con prospettiva vera e il
sigillo si spezza/solleva. Il cartoncino fa capolino di pochi pixel — il resto
esce nella Fase 3.

```tsx
// contenitore con prospettiva
<div style={{ perspective: 1200, transformStyle: "preserve-3d" }}>
  <motion.div            // il lembo
    style={{ transformOrigin: "top center" }}
    animate={{ rotateX: state === 'aperta' ? -155 : 0 }}
    transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
  />
</div>
```

Regole di fluidità (valgono da qui in poi): **anima solo `transform` e
`opacity`** (girano su GPU), niente animazioni su `width/height/top/left`.

---

## Definition of done

- [ ] La busta appare centrata al load
- [ ] Digitando i nomi (con varianti) lo stato passa a `sbloccata`
- [ ] Il sigillo è spento finché non sblocchi, poi si accende
- [ ] Click sul sigillo → lembo si apre, sigillo si spezza, cartoncino accenna
- [ ] Zero scatti; testato anche a rallentatore
