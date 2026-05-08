> Last updated: 2026-05-07

# Frontend Source Code

> **Per LLM**: Guida rapida alla struttura del frontend React.

## Entry Points

| File | Descrizione |
|------|-------------|
| `main.tsx` | Bootstrap React app |
| `App.tsx` | Root component, routing leggero, keyboard handlers |
| `components/CardStack.tsx` | Sessione learning + completion |
| `routes/appRoutes.ts` | Parsing e generazione route app |
| `gamification/featureGuideManifest.ts` | Guide animate per ogni feature routata |

## Cartelle

```
components/     # Componenti React attivi
├── CardStack.tsx         # ENTRY POINT UI - decide quale screen mostrare
├── Card.tsx              # Singola flashcard draggable
├── LearningScreen.tsx    # Schermata principale apprendimento
├── LearningCategoryStrip.tsx # Topic deck gamificato
├── LearningFiltersPanel.tsx # Filtri categorie dentro il deck
├── LearningSystemMenu.tsx # Slogan/concetti del sistema adattivo
├── FirstVocabularyOnboarding.tsx # Primo scan vocabolario
├── GameGuideOverlay.tsx  # Guida animata event-driven per feature
├── GrammarLab.tsx        # Laboratorio grammatica (7 tab)
├── WordsLibraryEnriched.tsx  # Libreria parole
└── ui/                   # Componenti base riutilizzabili

hooks/          # Custom React hooks
├── useLearningSession.ts # ⭐ Core: stato sessione, swipe logic
├── useCategories.ts      # Selezione categorie
├── useAvailableGrammarNodes.ts # Nodi grammaticali condivisi dai builder
├── useAudio.ts           # Audio playback hook
├── useGrammarNodeFilters.ts # Grammar node filtering
├── useLinguisticFilters.ts  # Linguistic filtering
└── useZoomControls.ts    # Zoom controls

services/       # Client API
└── api.ts                # ⭐ Tutte le chiamate al backend

contexts/       # React Context
└── ThemeContext.tsx      # Dark/Light mode

gamification/   # Manifest asset e mapping guide
├── mascotManifest.ts     # Mascot feedback corretto/sbagliato/level up
└── featureGuideManifest.ts # 13 guide x 2 frame cutout

types/          # TypeScript interfaces
└── index.ts              # Flashcard, Progress, GrammarNode, etc.

config/         # Configurazione
└── appMode.ts            # Feature flags (online/offline)

routes/         # Routing leggero senza react-router
└── appRoutes.ts          # parseAppRoute, grammarPath, libraryWordPath

utils/          # Utility functions
├── animations.ts         # Framer Motion variants
├── browserStorage.ts     # Accesso localStorage centralizzato
├── grammarColors.ts      # Colori per tipi grammaticali
└── imageHelper.ts        # Base64 image handling
```

## Flusso Principale

```
App.tsx
  ├── appRoutes.ts → route state
  ├── GameGuideOverlay → guida animata per la feature corrente
  ├── CardStack.tsx → learning session
  │     ├── FirstVocabularyOnboarding → primo scan vocabolario
  │     ├── CompletionScreen → sessione finita
  │     ├── LearningPathHome → percorso 400 livelli
  │     └── LearningScreen → swipe flashcards + filtri categorie
  │           ├── Card.tsx (draggable)
  │           ├── LearningCategoryStrip.tsx
  │           ├── LearningFiltersPanel.tsx
  │           ├── LearningSystemMenu.tsx
  │           └── SwipeButtons.tsx
  ├── GrammarLab → esercizi grammatica
  └── WordsLibraryEnriched → browse parole
```

## Hooks Chiave

### `useLearningSession`
```typescript
// Gestisce tutto il flusso di apprendimento
const session = useLearningSession();
session.loadFlashcards(categories);  // Carica cards
session.handleSwipe('right');        // Swipe = conosco
session.handleSwipe('left');         // Swipe = non conosco
```

### Deprecated

Il vecchio flusso YouTube è stato spostato in `deprecated/youtube/` e non viene importato dal flusso principale.
Il vecchio flusso video AI è stato spostato in `deprecated/ai-video/` e non viene importato dal flusso principale.
Il vecchio gate iniziale di selezione categorie è stato spostato in `deprecated/category-gate/`.

### `useCategories`
```typescript
// Gestisce selezione categorie
const categories = useCategories();
categories.toggleCategory('animals');
categories.selectAll();
```

### `useAvailableGrammarNodes`
```typescript
// Condivide fetch + loading state fra i sentence builder
const { availableNodes, loading } = useAvailableGrammarNodes();
```

## Superfici Centralizzate

- `routes/appRoutes.ts`: route principali e tab deep-linkabili.
- `components/ui/`: forme, panel, tab, header, bottoni e interaction token.
- `gamification/featureGuideManifest.ts`: asset, copy e mapping route → guida.
- `components/GameGuideOverlay.tsx`: unico layer per animazioni feature, event-driven e non continuo.
- `utils/browserStorage.ts`: unico accesso diretto a `localStorage`.
- `components/firstVocabularyOnboardingMeta.ts`: soglie, insight e persistenza del primo onboarding.
- `frontend/test-utils/appTestHelpers.ts`: URL, mock API e helper Playwright condivisi.

Per dettagli manutentivi: `docs/frontend-maintenance.md`.

## API Calls (services/api.ts)

| Funzione | Endpoint | Descrizione |
|----------|----------|-------------|
| `getFlashcards()` | GET /api/cards | Lista flashcards |
| `recordProgress()` | POST /api/progress | Salva progresso |
| `speakText()` | POST /api/tts/speak | Text-to-speech |
| `getLibraryWords()` | GET /api/library/words | Parole con filtri |

---

## Progresso e Mastery

`useLearningSession` registra ogni swipe tramite `api.recordProgress()` e aggiorna il confidence score con `api.updateWordStatistics()`.
La home usa anche `api.getAdaptiveLearningSummary()` per mostrare il percorso globale:
il path dell'utente va da livello 1 a 400, mentre la singola parola mantiene una mastery separata da 1 a 10.

```
1. loadFlashcards(categories) → carica il deck filtrato
2. handleSwipe('right' | 'left') → salva progresso known/unknown
3. updateWordStatistics() → aggiorna la mastery score parola
4. getAdaptiveLearningSummary() → aggiorna path level, XP e trend
5. reset() → azzera progresso sessione e torna alla prima card
```
