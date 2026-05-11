> Last updated: 2026-05-11 16:50

# Mobile Scene Split — Design Spec

**Status:** Approved by user (2026-05-11) — ready for implementation.

## Goal

Ridurre il carico cognitivo per-schermata mantenendo TUTTE le feature esistenti, distribuendole su più scene sequenziali invece di accumularle nella stessa pagina. Ottimizzare per viewport mobile (frame ~480px centrato anche su desktop), con micro-spiegazioni persistenti per le feature complesse.

## Non-goals

- Non rimuovere feature.
- Non cambiare logica di business (memory model, mastery, scoring, swipe ML, backend).
- Non ridisegnare il design system: tutte le scene riusano le primitive Claude (Fraunces/Inter, palette warm-editorial, radii, elevations) introdotte nel restyle `2026-05-10-claude-design-system-restyle-design.md`.

---

## §0 — Deroghe e principi

- **Frame mobile globale**: ogni scena vive in colonna centrata `max-w-[480px] px-4`. Su desktop il resto del viewport resta canvas neutro (nessuna sidebar contestuale). Capacitor: pieno schermo come prima.
- **Routing reale per ogni step**: ogni "scena" è una URL distinta. Niente wizard interni con state `step={1,2}`. Il back del browser ≡ il back logico.
- **Bottom-nav sempre presente** (Path · Learn · Review · Explore). La sezione attiva si determina dal prefisso URL.
- **Una scena = un compito**. Niente tab-switcher interni come pattern di navigazione globale. Eccezione consentita: `<SubNav>` orizzontale solo per scene-sorelle di una stessa entità (es. gli 8 tab di Word Detail per `/library/words/:id/*`).
- **Sub-headline obbligatoria** sotto ogni titolo, max ~20 parole, spiega scopo della scena in linguaggio piano.
- **Chip `ⓘ Cos'è?`** accanto al titolo: apre un bottom-sheet con descrizione+esempio+`Non mostrare più` per-scena (chiave `languageApp:explainerDismissed:<key>:v1`).
- **Vecchie route restano raggiungibili**: ogni route obsoleta fa `navigateTo(newPath, { replace: true })` lato client, così link esistenti non rompono.

---

## §A — Mobile shell (frame globale)

Tre strati fissi:

1. **Top bar** (`h-12`, sticky, bordo basso):
   - icona back (se la scena ha un parent logico) — l'icona è `ArrowLeft` di lucide
   - titolo scena (truncate)
   - slot azione contestuale a destra (es. `Edit`, `Filter`)
   - il chrome attuale (Theme/Developer/Tester/Online) si sposta in un menu kebab `⋯` aperto da un bottone a destra. Le voci del menu: `Tester feedback`, `Sviluppatore` (se `SHOW_DEVELOPER_TOOLS`), toggle tema, badge Online/Offline.

2. **Body** — scrollabile, `pb-24` per non finire sotto la bottom-nav.

3. **Bottom-nav** (`h-14`, fixed). 4 voci. La sezione attiva si determina dal prefisso URL:
   - `/`, `/path*` → Path
   - `/learn*` → Learn
   - `/review`, `/vocabulary*`, `/library*` → Review
   - `/explore*`, `/grammar*`, `/placement*` → Explore

Niente sub-navigazioni interne globali. Le sub-scene di una stessa entità (es. Word Detail tab) usano `<SubNav>` orizzontale sticky.

---

## §B — Anatomia di una scena

Ogni route renderizza uno `<SceneShell>` che compone:

1. **Eyebrow** (caption uppercase, 11-12px, primario) — sezione + sotto-sezione. Es. `LIBRARY · WORD DETAIL`.
2. **Titolo** (Fraunces 28-32px) — una sola frase, niente icone decorative.
3. **Sub-headline** (Inter 14-15px, color `muted`, max ~20 parole, **sempre presente**) — il "perché/come" della scena.
4. **Chip `ⓘ Cos'è?`** (small, inline accanto al titolo o sotto la sub) — apre `<ExplainerSheet>`.
5. **Body** — una sola responsabilità.

**Regole d'oro**:
- Una scena = un compito o una vista.
- Niente accordion che oscurano contenuto sottostante.
- Max 3 azioni primarie nel body. Le altre vanno in menu `⋯` o in step successivo.
- Niente stats roundup decorativi sparsi: gli StatCard vivono in scene dedicate (`/path/stats`, `/library/stats`).

---

## §C — Route map completa

Tutte le scene. Le frecce indicano "deriva da". Ogni nuova route registra l'eyebrow/title/subline definiti qui (i copywrites finali in italiano possono essere raffinati nel plan).

### C.1 — Path / Home

| Route | Eyebrow | Title | Subline |
|---|---|---|---|
| `/` | `PATH · HOME` | `German Learning` | `Decidi se sai una parola o no — il sistema fa il resto.` |
| `/path` | `PATH · 400-LEVEL` | `Full path` | `Tutti i 400 livelli del percorso e dove sei adesso.` |
| `/path/stats` | `PATH · STATS` | `Le tue cifre` | `Path level, words known, strong words, mastery medio.` |
| `/path/diary` | `PATH · DIARY` | `Learning diary` | `La storia delle missioni passate, in ordine cronologico.` |
| `/path/next` | `PATH · NEXT` | `Pronto a salire` | `La sfida successiva e gli strumenti consigliati per arrivarci.` |

Body di `/`: **solo** Mission corrente + bottone `Continue` (deriva da CalloutCard "Mission 1") + 1 card "Today's snapshot" minima. Tutto il resto (stats, diary, tools, next) sono link in fondo alla pagina.

### C.2 — Learn (swipe session)

| Route | Eyebrow | Title | Subline |
|---|---|---|---|
| `/learn` | `LEARN · SESSION` | `Swipe` | `Decidi sai/non sai. Sinistra non so, destra so.` |
| `/learn/deck` | `LEARN · DECK` | `Topic Deck` | `Quali pack stai usando in questa sessione.` |
| `/learn/deck/edit` | `LEARN · DECK · EDIT` | `Costruisci la deck` | `Scegli i pack che vuoi in sessione.` |
| `/learn/system` | `LEARN · SYSTEM` | `Come decide il sistema` | `Come gli swipe modificano la difficoltà successiva.` |

Body di `/learn`: rimosso il "Topic Deck" header e l'accordion "Learning System". La card swipeable è il centro. Bottoni Edit deck e System sono icone in top-bar.

### C.3 — Review hub

| Route | Eyebrow | Title | Subline |
|---|---|---|---|
| `/review` | `REVIEW · HUB` | `Review & Setup` | `Strumenti raggruppati qui per non rompere il flusso del path.` |

`<HubGrid>` con 4 card: Topic Deck (link `/learn/deck`), Your Vocabulary (`/vocabulary`), Word Library (`/library`), Learning System (`/learn/system`).

### C.4 — Vocabulary

| Route | Eyebrow | Title | Subline |
|---|---|---|---|
| `/vocabulary` | `REVIEW · VOCABULARY` | `Your Vocabulary` | `Le parole che hai visto, ordinate per quanto le sai.` |
| `/vocabulary/page/:n` | `REVIEW · VOCABULARY · PAGE :n` | `Your Vocabulary` | (stessa subline) |
| `/vocabulary/filters` | `REVIEW · VOCABULARY · FILTRI` | `Filtri` | `Filtra per mastery o livello.` |

`<PaginatedList>` page size 30. Search box sticky sotto la top-bar. Filter chips inline. Reload mantiene la pagina perché è nell'URL.

### C.5 — Explore

| Route | Eyebrow | Title | Subline |
|---|---|---|---|
| `/explore` | `EXPLORE · HUB` | `Explore German` | `Strumenti avanzati: pratica grammaticale o mappa della lingua.` |
| `/explore/grammar` | `EXPLORE · GRAMMAR TRAINING` | `Grammar Training` | `Sentence-level checks, builder, lab grammaticale.` |
| `/explore/map` | `EXPLORE · LANGUAGE MAP` | `Language Map` | `Cluster, dialetti, gerarchia e nuvole di parole.` |

`/explore` mostra 2 card grandi (Grammar Training, Language Map). Ogni hub figlio mostra 4 card.

### C.6 — Placement (Sentence Placement)

Wizard 3-step. Ogni step è una route.

| Route | Eyebrow | Title | Subline |
|---|---|---|---|
| `/placement/sentence` | `PLACEMENT · BRIEFING` | `Sentence Placement` | `Costruisci una frase per valutare grammatica, logica e parole funzione.` |
| `/placement/sentence/play` | `PLACEMENT · CHALLENGE` | `Traduci la frase` | `Tocca le parole nell'ordine giusto.` |
| `/placement/sentence/result` | `PLACEMENT · RESULT` | `Punteggio` | `Cosa hai fatto bene e dove migliorare.` |

`<StepFooter>` su ogni step: `← Indietro` · `Inizia` / `Check` / `Riprova`.

### C.7 — Grammar (appiattito)

| Route | Eyebrow | Title | Subline |
|---|---|---|---|
| `/grammar` | `EXPLORE · GRAMMAR · HUB` | `Grammar Lab` | `Sette strumenti per analizzare grammatica e vocabolario.` |
| `/grammar/graph` | `GRAMMAR · SENTENCE GRAPH` | `Sentence Graph` | `Relazioni grammaticali tra le parole di ogni frase.` |
| `/grammar/word-cloud` | `GRAMMAR · WORD CLOUD` | `Word Cloud` | `Quanto sono frequenti le parole che hai incontrato.` |
| `/grammar/build-sentence` | `GRAMMAR · BUILD SENTENCE` | `Build Sentence` | `Costruisci frasi grammaticali a partire da un word bank.` |
| `/grammar/compose-sentence` | `GRAMMAR · COMPOSE · WORDS` | `Scegli le parole` | `Filtra e seleziona i tile che ti servono.` |
| `/grammar/compose-sentence/build` | `GRAMMAR · COMPOSE · BUILD` | `Componi la frase` | `Trascina i tile selezionati e costruisci la frase.` |
| `/grammar/compose-sentence/result` | `GRAMMAR · COMPOSE · RESULT` | `Risultato` | `Cosa funziona e cosa rivedere nella frase composta.` |
| `/grammar/clusters` | `GRAMMAR · CLUSTERS` | `Clusters` | `Gruppi semantici e quartieri di parole correlate.` |
| `/grammar/dialects` | `GRAMMAR · DIALECTS` | `Dialects` | `Varianti regionali del vocabolario.` |
| `/grammar/hierarchy` | `GRAMMAR · HIERARCHY` | `Hierarchy` | `Struttura gerarchica dei concetti e categorie.` |

`/grammar` sostituisce il vecchio `GrammarLab` orchestrator. Ogni vista non ha più il tab-switcher: è una scena standalone.

### C.8 — Library

| Route | Eyebrow | Title | Subline |
|---|---|---|---|
| `/library` | `REVIEW · LIBRARY` | `Word Library` | `Cerca tra tutte le parole con dati linguistici ricchi.` |
| `/library/stats` | `REVIEW · LIBRARY · STATS` | `Stats della libreria` | `Total, learned, to-review, not-viewed.` |
| `/library/filters` | `REVIEW · LIBRARY · FILTRI` | `Filtri libreria` | `CEFR, gender, frequenza, categoria, register.` |
| `/library/words/:id` | `LIBRARY · WORD` | (titolo = parola) | (default redirect a `/library/words/:id/overview`) |
| `/library/words/:id/overview` | `WORD · OVERVIEW` | (parola) | `Forma base, traduzione, livello CEFR, immagine.` |
| `/library/words/:id/examples` | `WORD · ESEMPI` | (parola) | `Frasi reali in cui questa parola compare.` |
| `/library/words/:id/etymology` | `WORD · ETIMOLOGIA` | (parola) | `Da dove viene questa parola e come è cambiata.` |
| `/library/words/:id/false-friends` | `WORD · FALSI AMICI` | (parola) | `Parole simili in altre lingue con significato diverso.` |
| `/library/words/:id/proverbs` | `WORD · PROVERBI` | (parola) | `Proverbi e modi di dire che la contengono.` |
| `/library/words/:id/collocations` | `WORD · COLLOCAZIONI` | (parola) | `Con quali altre parole si combina più spesso.` |
| `/library/words/:id/dialects` | `WORD · DIALETTI` | (parola) | `Varianti regionali di questa parola.` |
| `/library/words/:id/db-row` | `WORD · DB ROW` | (parola) | `Riga del database, per debug.` |

Word Detail è **full-screen**, non più modal. `<SubNav>` orizzontale sticky con gli 8 tab. `<StepFooter>` con `← scena precedente` · `scena successiva →` in ordine fisso.

### C.9 — Developer

| Route | Eyebrow | Title | Subline |
|---|---|---|---|
| `/developer` | `DEV · HUB` | `Sviluppatore` | `Diagrammi Mermaid basati sul codice realmente implementato.` |
| `/developer/preference-driven-learning` | `DEV · CHART 1` | `Preference-driven learning` | `Come il sistema usa le preferenze per scegliere le parole.` |
| `/developer/memory-loop` | `DEV · CHART 2` | `Vocabulary memory loop` | `Il loop di memorizzazione e la confidenza per parola.` |
| `/developer/sentence-challenge` | `DEV · CHART 3` | `Sentence challenge truth flow` | `Come si valuta una sentence challenge.` |
| `/developer/semantic-diversity` | `DEV · CHART 4` | `Semantic diversity ordering` | `Diversificazione semantica della deck.` |
| `/developer/route-map` | `DEV · CHART 5` | `Route and feature map` | `Mappa delle route e delle feature dell'app.` |

`/developer` è un `<HubGrid>` di 5 card. Ogni route ospita un solo chart full-width.

---

## §D — Componenti riutilizzabili

Ogni scena è composizione di queste primitive. Una sola implementazione, usata ovunque.

### D.1 `<SceneShell>`

```ts
<SceneShell
  eyebrow="LIBRARY · WORD DETAIL"
  title="Hund"
  subline="Da dove viene questa parola e come è cambiata nel tempo."
  explainerKey="library.word.etymology"
  explainerBody={<>Cosa fa la feature... esempio: per "Hund" vedrai...</>}
  back={{ to: '/library' }}
  action={<button>...</button>}
>
  {/* body */}
</SceneShell>
```

Wrappa: frame mobile (`max-w-[480px] px-4 pb-24`), top-bar (back + truncated title + action slot + kebab), `<SceneHeader>`, body.

### D.2 `<SceneHeader>`

Renderizza eyebrow + title + subline + chip `ⓘ Cos'è?` (se `explainerBody` fornito). Stato dismiss letto da localStorage.

### D.3 `<ExplainerSheet>`

Bottom-sheet (HeadlessUI Dialog + slide-up). Contenuto: corpo passato + bottoni `Non mostrare più` (scrive `languageApp:explainerDismissed:<key>:v1`) + `Chiudi`. Backdrop dismiss.

### D.4 `<BottomNav>`

4 voci fisse. Sezione attiva via prefisso URL come definito in §A. Già esiste — viene aggiornata al nuovo mapping.

### D.5 `<HubGrid>`

Griglia 1 colonna di card hub uniformi (icona, titolo, sub, link, `min-h-[88px]`). Props: `items: Array<{icon, title, sub, to}>`.

### D.6 `<SubNav>`

Barra orizzontale scrollabile, sticky sotto la top-bar. Usata SOLO per Word Detail (`/library/words/:id/*`). Mostra gli 8 tab; il tab attivo è evidenziato.

### D.7 `<PaginatedList>`

Lista paginata URL-driven. Page size 30. In fondo: `← Pagina N-1` · `N di Tot` · `Pagina N+1 →`. Niente infinite scroll.

### D.8 `<StepFooter>`

Footer per wizard sequenziali. Mostra `← Indietro` a sinistra e azione primaria a destra. Coerente in Placement, Compose Sentence, Word Detail.

---

## §E — Fasi di rollout (5 plans separati)

Ogni fase ha il proprio plan in `docs/superpowers/plans/`. Ogni fase è merge-able da sola.

| Fase | File plan | Contenuto |
|---|---|---|
| **F1** | `2026-05-11-mobile-scene-split-f1-shell.md` | Primitive `<SceneShell>`, `<SceneHeader>`, `<ExplainerSheet>`, `<BottomNav>` refactor, `<HubGrid>`, `<SubNav>`, `<PaginatedList>`, `<StepFooter>` + `max-w-[480px]` globale + `App.tsx` chrome → menu kebab |
| **F2** | `2026-05-11-mobile-scene-split-f2-path.md` | `/` minimalizzato + `/path`, `/path/stats`, `/path/diary`, `/path/next` |
| **F3** | `2026-05-11-mobile-scene-split-f3-grammar.md` | `/grammar` hub + 7 viste standalone (rimuovo tab-switcher) + Compose Sentence wizard 3-step |
| **F4** | `2026-05-11-mobile-scene-split-f4-library.md` | `/library` stats fuori, word-detail full-screen con `<SubNav>` + `<StepFooter>` |
| **F5** | `2026-05-11-mobile-scene-split-f5-longtail.md` | `/vocabulary` paginato, `/explore` split, `/placement/sentence` wizard, `/developer` paginato |

**Dipendenze**: F2-F5 dipendono da F1 (primitive). F2-F5 sono indipendenti tra loro e ordinabili a piacere; l'ordine suggerito riflette ROI percepito.

**Backward-compatibility**: ogni nuovo router intercetta le path vecchie e fa `navigateTo(newPath, { replace: true })`. Esempi:
- `/learn/filters` → `/learn/deck/edit`
- `/learn/system` (vecchio dropdown su `/learn`) → resta come pagina ma il behaviour cambia
- Le URL vecchie nel codice esistente vengono rimappate in `appRoutes.ts`.

---

## §F — Testing strategy

- **Visual regression**: Playwright headless @ 390×844, screenshot di ogni nuova route, salvati in `/tmp/scene-split-shots/`. Confronto manuale a fine fase.
- **Tipi**: `pnpm tsc --noEmit` deve passare ad ogni fase.
- **Smoke E2E**: Playwright script che visita tutte le route nuove, controlla che ognuna abbia `<h1>` non vuoto, sub-headline non vuoto, e che la bottom-nav riconosca la sezione attiva.
- **Backward**: script che visita ognuna delle 14 route vecchie e verifica che approdi su una route valida (eventualmente via redirect).

---

## §G — Note di rischio

- **Bundle size**: 40 route distinte = +bundle. Mitigazione: ogni scena resta `lazy()` (già pattern in `App.tsx`), così il code-splitting copre.
- **State condivido tra step di wizard**: il wizard di Compose Sentence ha state che attraversa 3 scene. Mitigazione: useReducer al livello del subroute parent (`/grammar/compose-sentence/*`), passato via context. Refresh di una sub-route → ridirige al primo step.
- **localStorage**: lo schema `languageApp:explainerDismissed:<key>:v1` è separato dal `languageApp:featureGuideDismissedAll:v1` esistente. Il guide overlay legacy resta per ora e convive.
- **Word Detail non più modal**: chi linkava al modal (es. da CardStack swipe → "vedi dettagli parola") ora naviga a `/library/words/:id`. È un cambio di flow ma allinea il pattern.

---

## §H — Pseudo-codice indicativo (frammenti)

### SceneShell

```tsx
function SceneShell({ eyebrow, title, subline, explainerKey, explainerBody, back, action, children }: Props) {
  return (
    <div className="mx-auto min-h-screen max-w-[480px] px-4 pb-24">
      <TopBar back={back} title={title} action={action} />
      <SceneHeader
        eyebrow={eyebrow}
        title={title}
        subline={subline}
        explainerKey={explainerKey}
        explainerBody={explainerBody}
      />
      <main className="mt-4">{children}</main>
      <BottomNav />
    </div>
  );
}
```

### ExplainerSheet

```tsx
function ExplainerSheet({ open, onClose, storageKey, children }: Props) {
  const dismissAll = () => {
    localStorage.setItem(`languageApp:explainerDismissed:${storageKey}:v1`, 'true');
    onClose();
  };
  return (
    <Dialog open={open} onClose={onClose} className="fixed inset-0 z-[80]">
      <div className="absolute inset-0 bg-ink/40" aria-hidden />
      <div className="absolute inset-x-0 bottom-0 mx-auto max-w-[480px] rounded-t-2xl bg-canvas p-5">
        <div className="prose-sm">{children}</div>
        <div className="mt-4 flex justify-between gap-2">
          <button onClick={dismissAll}>Non mostrare più</button>
          <button onClick={onClose}>Chiudi</button>
        </div>
      </div>
    </Dialog>
  );
}
```

### PaginatedList

```tsx
function PaginatedList<T>({ items, pageSize, basePath, renderItem }: Props<T>) {
  const { page } = useParams();
  const n = Math.max(1, Number(page ?? 1));
  const slice = items.slice((n - 1) * pageSize, n * pageSize);
  const totalPages = Math.ceil(items.length / pageSize);
  return (
    <>
      <ul>{slice.map(renderItem)}</ul>
      <nav className="mt-6 flex items-center justify-between text-body-sm">
        <Link to={`${basePath}/page/${Math.max(1, n - 1)}`} className={n === 1 ? 'opacity-40 pointer-events-none' : ''}>
          ← Pagina {n - 1}
        </Link>
        <span>{n} di {totalPages}</span>
        <Link to={`${basePath}/page/${Math.min(totalPages, n + 1)}`} className={n === totalPages ? 'opacity-40 pointer-events-none' : ''}>
          Pagina {n + 1} →
        </Link>
      </nav>
    </>
  );
}
```

---

**Owner**: niccolo
**Reviewed**: 2026-05-11 (verbal approval during brainstorming session)
**Implementation owner**: assistant via subagent-driven-development across 5 phase-plans.
