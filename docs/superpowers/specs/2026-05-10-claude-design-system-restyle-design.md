> Last updated: 2026-05-10 17:20

# Claude Design System — UI Restyle (tinder-for-languages frontend)

## Obiettivo

Sostituire l'attuale estetica indigo/purple-gradient + sans neutro del frontend `tinder-for-languages` con il **Claude warm-editorial design system** descritto in [voltagent/awesome-design-md/design-md/claude/DESIGN.md](https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/claude/DESIGN.md).

Il restyle è puramente estetico: nessun cambio funzionale, di routing, di API, di copy o di logica di apprendimento. La struttura dei componenti React resta com'è; cambiano i token grafici, la tipografia, le superfici e le primitive UI condivise.

## Decisioni guida (esito brainstorming)

- **Principio cardine**: **massima aderenza** alla spec Claude `DESIGN.md`. Deroghe consentite solo per vincoli reali documentati (vedi §0). Qualsiasi scelta non spiegata come deroga deve combaciare 1:1 con i token e i pattern della spec.
- **Scope**: tutta l'app — design system globale, non singola schermata.
- **Dark mode**: light cream + dark navy come dark mode. Manteniamo `ThemeProvider` e `ThemeToggle`. Light usa la palette Claude purissima; dark adatta la palette Claude usando `surface-dark` come canvas e `on-dark` come testo, mantenendo coral come accento (saturazione invariata).
- **Font**: Fraunces (serif display, variabile, opsz tuned, peso 400) + Inter (sans body, variabile, pesi 400/500/600). Entrambi via Google Fonts. Letter-spacing negativo sui display (-0.5px → -1.5px) come da spec — non negoziabile.
- **Word title flashcard**: Fraunces 60–72px regular, `text-ink`. Niente gradient di colore: il protagonismo viene da serif + dimensione + tracking.
- **Branch**: lavoro su `restyle-frontend`. Checkpoint pre-restyle = commit `04be3d7`. Rollback = `git reset --hard 6b419f6`.

## 0. Deroghe esplicite alla spec Claude

Ogni deroga è motivata. Tutto il resto deve aderire 1:1.

| Deroga | Motivo | Limite |
|---|---|---|
| Fraunces + Inter (invece di Copernicus + StyreneB) | Copernicus e StyreneB sono proprietari Anthropic, non distribuibili. Fraunces e Inter sono i sostituti più vicini documentati. | Manteniamo le regole di tracking negativo, peso 400 sui display, pesi 500 sui title. |
| Dark mode aggiunto | La spec Claude non prevede un vero dark mode (usa il navy come accento). L'app ha già un `ThemeToggle` funzionale: rimuoverlo sarebbe regressione UX. | I token in dark sono una riproposizione delle stesse relazioni semantiche (canvas→ink, surface-card→hairline) trasposte sull'asse navy/cream invertito. Coral resta invariato — è il brand voltage. |
| Verde/rosso swipe (success/error) | La spec Claude definisce `success` #5db872 e `error` #c64545 — quindi non è una vera deroga, ma li usiamo come segnaletica di affordance swipe (uso strutturale, non solo validation). | Usati solo per feedback istantaneo del gesto swipe; mai come superficie permanente. |
| `bg-ink/15` overlay invece di `surface-dark` puro su immagine | Le immagini delle flashcard sono fotografiche/illustrative: un overlay leggibile è necessario per il mastery badge in alto. | Si usa l'`ink` token, non un nero arbitrario. |

Niente altre deroghe. In particolare **non si introducono**: gradient, blu/ciano/violetto, shadow drammatiche, pesi serif > 400, letter-spacing positivo sui display, surface ripetute in due band consecutive, hover state oltre il darkening del primary.

## Non-obiettivi

- Cambio di routing, contenuti, copy, i18n.
- Refactor logico di `CardStack`, `LearningPathHome`, `GrammarLab`, `WordsLibraryEnriched` oltre quanto serve a sostituire le classi visive.
- Rinnovo del mascot / illustrazioni / immagini delle flashcard.
- Migrazione a un altro toolkit CSS (restiamo su Tailwind v4 + CSS vars).

---

## 1. Architettura del design system

### 1.1 Layer di token

Nuovo file `frontend/src/styles/tokens.css` con CSS custom properties divise per scope:

```css
:root {
  /* Brand */
  --color-primary: #cc785c;
  --color-primary-active: #a9583e;
  --color-primary-disabled: #e6dfd8;
  --color-accent-teal: #5db8a6;
  --color-accent-amber: #e8a55a;

  /* Surfaces */
  --color-canvas: #faf9f5;
  --color-surface-soft: #f5f0e8;
  --color-surface-card: #efe9de;
  --color-surface-cream-strong: #e8e0d2;
  --color-surface-dark: #181715;
  --color-surface-dark-elevated: #252320;
  --color-surface-dark-soft: #1f1e1b;
  --color-hairline: #e6dfd8;
  --color-hairline-soft: #ebe6df;

  /* Text */
  --color-ink: #141413;
  --color-body-strong: #252523;
  --color-body: #3d3d3a;
  --color-muted: #6c6a64;
  --color-muted-soft: #8e8b82;
  --color-on-primary: #ffffff;
  --color-on-dark: #faf9f5;
  --color-on-dark-soft: #a09d96;

  /* Semantic */
  --color-success: #5db872;
  --color-warning: #d4a017;
  --color-error: #c64545;

  /* Spacing (rhythm) */
  --space-xxs: 4px;
  --space-xs: 8px;
  --space-sm: 12px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-xxl: 48px;
  --space-section: 96px;

  /* Radii */
  --radius-xs: 4px;
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-pill: 9999px;
  --radius-full: 9999px;

  /* Elevation (rara) */
  --shadow-soft: 0 1px 3px rgba(20, 20, 19, 0.08);
}

.dark {
  --color-canvas: #181715;
  --color-surface-soft: #1f1e1b;
  --color-surface-card: #252320;
  --color-surface-cream-strong: #2c2a26;
  --color-surface-dark: #0e0d0c;
  --color-surface-dark-elevated: #1f1e1b;
  --color-surface-dark-soft: #15140f;
  --color-hairline: #2c2a26;
  --color-hairline-soft: #252320;

  --color-ink: #faf9f5;
  --color-body-strong: #ebe6df;
  --color-body: #d6d2ca;
  --color-muted: #a09d96;
  --color-muted-soft: #6c6a64;
  --color-on-primary: #ffffff;
  --color-on-dark: #faf9f5;
  --color-on-dark-soft: #a09d96;

  /* Coral resta lo stesso anche in dark — è il brand voltage */
}
```

### 1.2 Tailwind v4 theme

In `frontend/src/index.css`, esposizione dei token a Tailwind via `@theme`:

```css
@import "tailwindcss";
@import "./styles/tokens.css";

@theme {
  --color-canvas: var(--color-canvas);
  --color-ink: var(--color-ink);
  --color-primary: var(--color-primary);
  /* ... tutti i token rilevanti per la composizione di classi ... */

  --font-display: 'Fraunces', 'EB Garamond', Georgia, serif;
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace;

  --text-display-xl: 64px;
  --text-display-lg: 48px;
  --text-display-md: 36px;
  --text-display-sm: 28px;
  --text-title-lg: 22px;
  --text-title-md: 18px;
  --text-title-sm: 16px;
  --text-body-md: 16px;
  --text-body-sm: 14px;
  --text-caption: 13px;
  --text-caption-uppercase: 12px;
  --text-code: 14px;
  --text-button: 14px;
  --text-nav-link: 14px;
}
```

Risultato: utility tipo `bg-canvas`, `text-ink`, `bg-primary`, `border-hairline`, `text-display-lg`, `font-display`, `rounded-lg` (12px) funzionano nativamente. Il file `tailwind.config.js` viene svuotato dei custom (`primary`, `success`, `error` attuali) — i token globali sono ora in `@theme`.

### 1.3 Tipografia caricata

In `frontend/index.html`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
```

Variazione opsz di Fraunces tunata sui display (96+) per dare il "soft slab" desiderato.

### 1.4 Geometria

Aggiorno `frontend/src/components/ui/geometry.ts`:

- `UI_RADIUS.surface` → `rounded-lg` (12px) — era spesso 24px+.
- `UI_RADIUS.control` → `rounded-md` (8px).
- `UI_RADIUS.pill` → `rounded-full`.
- `UI_RADIUS.touchIcon` → `rounded-full` (icon button circolari 36–40px).
- `UI_ELEVATION.floating`/`raised` → quasi tutti `''` (no shadow). Manteniamo `shadow-soft` solo per uno stato hover specifico se serve, definito come `shadow-[0_1px_3px_rgba(20,20,19,0.08)]`.
- `UI_INTERACTION.transition`, `iconLift`, `press` semplificati: solo background darkening su hover/press, niente translate/scale.

---

## 2. UI primitives nuovi

In `frontend/src/components/ui/` aggiungo / aggiorno:

### 2.1 `Button.tsx` (nuovo)

```tsx
type Variant = 'primary' | 'secondary' | 'secondary-on-dark' | 'text' | 'icon';
```

- `primary`: `bg-primary text-on-primary h-10 px-5 rounded-md text-button font-sans font-medium hover:bg-[var(--color-primary-active)]`
- `secondary`: `bg-canvas text-ink border border-hairline h-10 px-5 rounded-md text-button font-sans font-medium hover:bg-surface-card`
- `secondary-on-dark`: `bg-surface-dark-elevated text-on-dark h-10 px-5 rounded-md`
- `text`: link inline coral o ink
- `icon`: cerchio 36px cream

### 2.2 `Badge.tsx` (nuovo)

- `<Badge variant="pill">`: `bg-surface-card text-ink text-caption px-3 py-1 rounded-full`
- `<Badge variant="coral">`: `bg-primary text-on-primary text-caption-uppercase tracking-[1.5px] uppercase px-3 py-1 rounded-full` — riservato a "NEW"/"BETA".

### 2.3 `CalloutCard.tsx` (nuovo)

Coral full-bleed, padding 48px, radius 12px. Da usare al massimo una volta per pagina.

### 2.4 `SurfacePanel.tsx` (refactor)

Varianti: `canvas` (default, hairline border opzionale), `cream` (`surface-card`, no shadow, padding 32px), `dark` (`surface-dark`, padding 32px), `dark-elevated`.

### 2.5 `PageHeader.tsx`, `ScreenHeader.tsx`

Headline in `font-display text-display-lg` (o `display-md`/`display-sm` su pagine secondarie), peso 400, tracking -1px. Sub-copy in `font-sans text-body-md text-muted`.

### 2.6 `PillTabs.tsx`, `NavButton.tsx`

- Tab inattiva: `bg-transparent text-muted text-nav-link px-3.5 py-2 rounded-md`
- Tab attiva: `bg-surface-card text-ink rounded-md` (light) / `bg-surface-dark-elevated text-on-dark` (dark)
- Niente più `bg-slate-950 text-white` su attivo.

### 2.7 `StatCard.tsx`, `GameSignalBadge.tsx`

Background `surface-card`, hairline opzionale, no shadow, label `caption-uppercase` muted, valore `display-sm` Fraunces.

---

## 3. Mappa surface/colore (vecchio → nuovo)

| Vecchio | Light | Dark |
|---|---|---|
| `bg-gradient-to-br from-indigo-50 via-white to-purple-50` (body root) | `bg-canvas` | `bg-surface-dark` (`.dark` → `--color-canvas` punta a #181715) |
| `bg-white shadow-2xl border-2 border-gray-100` (Card surface) | `bg-canvas border border-hairline` (no shadow) | `bg-surface-card` (#252320) `border-hairline` |
| `bg-indigo-500/600`, `bg-purple-500` (CTA) | `bg-primary` | `bg-primary` |
| `text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600` (word) | `text-ink font-display` | `text-on-dark font-display` |
| `bg-slate-950 text-white` (active nav) | `bg-ink text-canvas` | `bg-canvas text-ink` |
| `bg-slate-100`, `bg-gray-100` (secondary surface) | `bg-surface-card` | `bg-surface-dark-soft` |
| `bg-indigo-100 text-indigo-600` (audio button) | `bg-canvas text-ink border-hairline` | `bg-surface-card text-on-dark` |
| `bg-gradient-to-br from-indigo-100 to-purple-100` (image fallback) | `bg-surface-card` (flat) | `bg-surface-dark-soft` |
| `bg-black/20` overlay immagine | `bg-ink/15` (più sobrio) | identico |
| `text-slate-600`, `text-slate-500` | `text-muted` | `text-muted` |
| `text-gray-900`, `text-slate-900` | `text-ink` | `text-ink` |
| Verde/rosso swipe feedback | `success` #5db872 / `error` #c64545 | identici |
| `bg-white/95 backdrop-blur` (top-right floating) | `bg-canvas border border-hairline`, no backdrop | `bg-surface-card border-hairline` |

**Regola brutale**: ogni occorrenza di `indigo-*`, `purple-*`, `pink-*`, `violet-*`, `fuchsia-*`, `slate-*`, `gray-*` viene rimossa o rimappata. Eccezioni motivate solo dove un colore semantico è imprescindibile (semafori success/error), e in quel caso si usa il token semantico.

---

## 4. Componenti chiave (delta visivo)

### 4.1 `Card.tsx` (flashcard)

- Surface: `bg-canvas border border-hairline rounded-lg overflow-hidden` (no shadow).
- Image area: 4:3, `bg-surface-card` come fallback, overlay `bg-ink/15` (era `bg-black/20`).
- Word title: `font-display text-[64px] leading-[1.05] tracking-[-1px] font-normal text-ink`.
- Audio button: icon-button cream circolare 40px, `border-hairline`. Stato playing: `bg-primary text-on-primary` (no pulse), oppure spinner Loader2.
- Category badge: `<Badge variant="pill">` cream surface-card, niente backdrop blur.
- Mastery badge area in alto-sinistra: cream pill su overlay neutro.

### 4.2 `CardStack.tsx`

Sfondo canvas. Counter "X / Y" in `text-caption-uppercase tracking-[1.5px] text-muted`. Buttons left/right ridisegnati come `Button variant="secondary"` con icona, hairline border. Layout invariato.

### 4.3 `App.tsx` → `AppChrome` (nav)

- Body root: `bg-canvas` (light) / `dark:bg-canvas` con `.dark` token.
- Bottom mobile nav (`<nav>`): `bg-canvas border-hairline rounded-md`, niente `backdrop-blur`, niente shadow.
- Top-right floating cluster (Sviluppatore + ThemeToggle): stesso trattamento.
- Active nav button: `bg-ink text-canvas` (light) / `bg-canvas text-ink` (dark).
- `ThemeToggle`: icon-button cream circolare con icona Moon/Sun.

### 4.4 `LearningPathHome.tsx`

- Hero band: padding-y 96px (mobile 48px), titolo `font-display text-display-xl tracking-[-1.5px] font-normal text-ink`, sub-copy `text-body-md text-muted`.
- Feature card grid 3-up desktop / 2-up tablet / 1-up mobile: ciascuna `bg-surface-card rounded-lg p-8`, no shadow, icona + `text-title-md` Inter 500 + body muted.
- Una sola `CalloutCard` coral per pagina (es. "Inizia la tua prossima sessione" — è già il momento di voltage).
- Alternanza enforced: canvas → cream cards band → canvas → coral callout → cream stats → canvas.

### 4.5 `GrammarLab.tsx`

- Sidebar / pannelli filtri: `surface-card` con padding 24px.
- Area centrale (sentence builder, word bank): canvas con hairline divider tra zone.
- Code/preview (es. `MermaidChart`, `EmbeddedGrammarGraph`): wrapper in `surface-dark` con padding 24px, radius 12px, testo `on-dark`.
- Pill tab top: `PillTabs` aggiornato.

### 4.6 `WordsLibraryEnriched.tsx`

- Lista parole: row su canvas con bottom hairline, hover `bg-surface-soft`.
- Filter chips: `category-tab` style (transparent → `surface-card` on active).
- Modal `WordDetailModalEnriched`: surface canvas, header sticky con hairline, sezioni alternate canvas/surface-card.

### 4.7 `DeveloperChartsScreen.tsx`, `MermaidChart.tsx`, grafici D3

- Wrapper grafici: `surface-dark` con padding 24px (è il pattern "code-window-card" della spec).
- Palette dei plot: ink + primary + accent-teal + accent-amber + muted come scala categorica. Nessun viridis/spectral di default.

### 4.8 Modals, overlay, mascot

- `GameGuideOverlay`, `MascotReaction`, `MascotSpeechCallout`, `StreamingSpeechBubble`: bubble in `surface-card` con hairline, testo `body-md` ink, niente gradient.
- Modal background scrim: `bg-ink/40` (era `bg-black/50`).

---

## 5. Strategia di rollout (5 fasi, 1 commit per fase)

### Fase 1 — Tokens & font
- Aggiungo `frontend/src/styles/tokens.css`.
- Aggiorno `frontend/src/index.css` con `@theme`.
- Svuoto `frontend/tailwind.config.js` dei custom obsoleti.
- Aggiorno `frontend/index.html` con preconnect + Google Fonts.
- Aggiorno `ThemeContext` se serve perché `.dark` ora rimappa i token globali (verifica che il toggle scriva la classe sul `<html>` o `<body>`).
- **Test**: app si carica, fonts visibili, classi nuove disponibili. Vecchio look ancora intatto perché nessun componente è stato toccato. Nessun test rompe.

### Fase 2 — UI primitives
- Refactor `frontend/src/components/ui/geometry.ts` (radius, shadow, interaction).
- Refactor `SurfacePanel`, `PageHeader`, `ScreenHeader`, `PillTabs`, `NavButton`, `StatCard`, `GameSignalBadge`, `FilterSelect`, `LoadingSpinner`, `ErrorState`, `ZoomControlBar`, `AppScreen`.
- Aggiungo `Button.tsx`, `Badge.tsx`, `CalloutCard.tsx`.
- Esporto da `ui/index.ts`.
- **Test**: tutte le pagine che già usano i primitives ereditano il look senza modifiche. Playwright `test-feature-routing`, `test-i18n-static-copy` devono restare verdi (non testano colori, solo copy/dom).

### Fase 3 — Componenti core
- Refactor `App.tsx` (body bg + AppChrome).
- Refactor `Card.tsx`, `CardStack.tsx`, `SwipeButtons.tsx`, `ConfidenceBadge.tsx`, `WordMasteryBadge.tsx`, `AudioButton.tsx`.
- Refactor `LearningPathHome.tsx`, `LearningCategoryStrip.tsx`, `LearningFiltersPanel.tsx`, `LearningSystemMenu.tsx`, `LearningScreen.tsx`, `LearningFeedbackBanner.tsx`, `FeatureHubScreen.tsx`, `CompletionScreen.tsx`.
- **Test**: `npm run dev` + verifica manuale su mobile viewport di home + flow swipe. `test-swipe-first`, `test-app-feature-usability` verdi.

### Fase 4 — Pagine secondarie
- `GrammarLab.tsx` + componenti grammar (`SentenceBuilder`, `FunSentenceBuilder`, `GrammarBuilderFrame`, `GrammarWordBank`, `GrammarNodeFilterBar`, `EmbeddedGrammarGraph`, `GrammarPlacementAssessment`, `SentencePlacementChallenge`).
- `WordsLibraryEnriched.tsx`, `WordDetailModal.tsx`, `WordDetailModalEnriched.tsx`, `LinguisticFilterBar.tsx`, `EmbeddedWordCloud.tsx`, `ClusteredNodes.tsx`, `HierarchySunburst.tsx`, `DialectMap.tsx`.
- `DeveloperChartsScreen.tsx`, `MermaidChart.tsx`, `YourVocabularyScreen.tsx`.
- Modal e overlay: `GameGuideOverlay`, `MascotReaction`, `MascotSpeechCallout`, `StreamingSpeechBubble`, `FirstVocabularyOnboarding`, `ProgressBar`.
- **Test**: `test-grammar-d3-images`, `test-grammar-navigation-consistency`, `test-feature-guide-fullscreen`, `test-library-total` verdi.

### Fase 5 — Pulizia & verifica
- Grep su `indigo-`, `purple-`, `pink-`, `violet-`, `fuchsia-`, `slate-`, `gray-`, `from-`, `via-`, `to-` (gradient): zero risultati nel codice TS/TSX di `frontend/src/` (eccezione motivata documentata).
- Grep su `shadow-` (eccetto `shadow-soft`): zero o motivati.
- Verifica dark mode: contrasto WCAG AA su body text e CTA in entrambi i temi.
- Audit accessibility: tutti i Button hanno contrasto ≥ 4.5:1.
- `npm run lint` pulito, `npm run build` ok, intera suite Playwright verde.

---

## 6. File toccati (stima)

**Nuovi**: 4
- `frontend/src/styles/tokens.css`
- `frontend/src/components/ui/Button.tsx`
- `frontend/src/components/ui/Badge.tsx`
- `frontend/src/components/ui/CalloutCard.tsx`

**Aggiornati strutturali**: 3
- `frontend/index.html` (font preconnect)
- `frontend/src/index.css` (@theme)
- `frontend/tailwind.config.js` (svuotato dei custom)

**Aggiornati per restyle**: ~45 component file in `frontend/src/components/` + `App.tsx` + `frontend/src/components/ui/*` + alcuni file in `frontend/src/gamification/` e `frontend/src/learning/` se contengono classi visive.

---

## 7. Rischi & mitigazioni

| Rischio | Mitigazione |
|---|---|
| Test Playwright che asseriscono classi/colori specifici | Cerco `indigo`/`slate`/colori espliciti negli `.spec.ts`; aggiorno le aspettative o le rendo tolleranti se sono visive. |
| Fraunces non disponibile su mobile/Capacitor offline | Fallback `'EB Garamond', Georgia, serif` già nello stack. iOS/Android caricano da web; per offline-first valutiamo bundling locale solo se è una constraint emersa (al momento non lo è). |
| Mermaid / D3 charts hanno colori hardcoded | Sostituzione esplicita nelle componenti `MermaidChart`, `EmbeddedGrammarGraph`, `EmbeddedWordCloud`, `HierarchySunburst`, `ClusteredNodes`, `DialectMap`. |
| Dark mode contrasto insufficiente con coral su navy | Verifica WCAG; eventuale fallback testo bianco vivace su CTA in dark. |
| Pre-commit hook fallisce su lint | Risolvo nel singolo commit di fase, mai con `--no-verify`. |
| Capacitor sync rotto da nuovi font remoti | Test su build android/ios in fase 5; se serve, bundling locale dei font come fallback. |

---

## 8. Definition of Done

- Tutte le 5 fasi committed su `restyle-frontend`.
- `npm run build` ok, `npm run lint` ok, `npm run build:strict` ok (TypeScript strict).
- Intera suite Playwright verde.
- Verifica visuale manuale su tutte le schermate principali in light + dark.
- Nessuna occorrenza di palette indigo/purple/slate/gray non motivata.
- Coral usato solo su CTA primario, su `Badge variant="coral"` e su `CalloutCard` (max 1 per pagina).
- Documento riassuntivo dei token aggiornato in `frontend/README.md` (sezione Design system).
