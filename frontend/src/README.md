> Last updated: 2026-03-07

# Frontend Source Code

> **Per LLM**: Guida rapida alla struttura del frontend React.

## Entry Points

| File | Descrizione |
|------|-------------|
| `main.tsx` | Bootstrap React app |
| `App.tsx` | Root component, routing leggero, keyboard handlers |
| `components/CardStack.tsx` | Sessione learning + completion |

## Cartelle

```
components/     # Componenti React attivi
├── CardStack.tsx         # ENTRY POINT UI - decide quale screen mostrare
├── Card.tsx              # Singola flashcard draggable
├── LearningScreen.tsx    # Schermata principale apprendimento
├── LearningCategoryStrip.tsx # Topic deck gamificato
├── LearningFiltersPanel.tsx # Filtri categorie dentro il deck
├── LearningSystemMenu.tsx # Slogan/concetti del sistema adattivo
├── GrammarLab.tsx        # Laboratorio grammatica (7 tab)
├── WordsLibraryEnriched.tsx  # Libreria parole
└── ui/                   # Componenti base riutilizzabili

hooks/          # Custom React hooks
├── useLearningSession.ts # ⭐ Core: stato sessione, swipe logic
├── useCategories.ts      # Selezione categorie
├── useAudio.ts           # Audio playback hook
├── useGrammarNodeFilters.ts # Grammar node filtering
├── useLinguisticFilters.ts  # Linguistic filtering
└── useZoomControls.ts    # Zoom controls

services/       # Client API
└── api.ts                # ⭐ Tutte le chiamate al backend

contexts/       # React Context
└── ThemeContext.tsx      # Dark/Light mode

types/          # TypeScript interfaces
└── index.ts              # Flashcard, Progress, GrammarNode, etc.

config/         # Configurazione
└── appMode.ts            # Feature flags (online/offline)

utils/          # Utility functions
├── animations.ts         # Framer Motion variants
├── grammarColors.ts      # Colori per tipi grammaticali
└── imageHelper.ts        # Base64 image handling
```

## Flusso Principale

```
App.tsx
  ├── CardStack.tsx → learning session
  │     ├── CompletionScreen → sessione finita
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

```
1. loadFlashcards(categories) → carica il deck filtrato
2. handleSwipe('right' | 'left') → salva progresso known/unknown
3. updateWordStatistics() → aggiorna il mastery score parola
4. reset() → azzera progresso sessione e torna alla prima card
```
