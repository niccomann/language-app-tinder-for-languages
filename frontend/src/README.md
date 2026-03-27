> Last updated: 2026-03-07

# Frontend Source Code

> **Per LLM**: Guida rapida alla struttura del frontend React.

## Entry Points

| File | Descrizione |
|------|-------------|
| `main.tsx` | Bootstrap React app |
| `App.tsx` | Root component, keyboard handlers |
| `components/CardStack.tsx` | **UI Orchestrator** - gestisce tutti gli screen |

## Cartelle

```
components/     # 32 componenti React
├── CardStack.tsx         # ENTRY POINT UI - decide quale screen mostrare
├── Card.tsx              # Singola flashcard draggable
├── LearningScreen.tsx    # Schermata principale apprendimento
├── CategorySelector.tsx  # Home - selezione categorie
├── GrammarLab.tsx        # Laboratorio grammatica (7 tab)
├── WordsLibraryEnriched.tsx  # Libreria parole
├── VideoReel.tsx         # Feed video YouTube
└── ui/                   # Componenti base riutilizzabili

hooks/          # Custom React hooks
├── useLearningSession.ts # ⭐ Core: stato sessione, swipe logic
├── useCategories.ts      # Selezione categorie
├── useAudio.ts           # Audio playback hook
├── useGrammarNodeFilters.ts # Grammar node filtering
├── useLinguisticFilters.ts  # Linguistic filtering
├── useWordStats.ts       # Word statistics
└── useZoomControls.ts    # Zoom controls

services/       # Client API
├── api.ts                # ⭐ Tutte le chiamate al backend
├── video.ts              # YouTube search
└── sora.ts               # AI video generation

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
  └── CardStack.tsx (orchestrator)
        ├── CategorySelector → seleziona categorie
        ├── LearningScreen → swipe flashcards
        │     ├── Card.tsx (draggable)
        │     └── SwipeButtons.tsx
        ├── GrammarLab → esercizi grammatica
        ├── WordsLibraryEnriched → browse parole
        └── CompletionScreen → sessione finita
```

## Hooks Chiave

### `useLearningSession`
```typescript
// Gestisce tutto il flusso di apprendimento
const session = useLearningSession();
session.loadFlashcards(categories);  // Carica cards
session.handleSwipe('right');        // Swipe = conosco
session.handleSwipe('left');         // Swipe = non conosco → video
```

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

## Sistema di Tracking

### Overview

Il sistema traccia le interazioni utente per generare statistiche e infografiche AI.

### Logica Soglia Minima

```typescript
// useLearningSession.ts
const MINIMUM_INTERACTIONS = 30;

// Il tracking salva nel DB solo se:
// 1. trackingActive = true (bottone premuto), OPPURE
// 2. interactionCount >= 30 (auto-attivazione)
const shouldTrack = trackingActive || interactionCount >= MINIMUM_INTERACTIONS;
```

### Hook `useLearningSession` - Tracking

```typescript
const session = useLearningSession();

// Stato tracking
session.trackingActive;      // boolean - tracking attivo?
session.interactionCount;    // number - contatore interazioni
session.MINIMUM_INTERACTIONS; // 30 - soglia auto-attivazione
session.sessionUuid;         // string - UUID sessione

// Funzioni tracking
session.startTracking();     // Attiva tracking manualmente
session.stopTracking();      // Ferma tracking, chiude sessione
```

### API Tracking (services/api.ts)

```typescript
export const trackingApi = {
  // Inizia sessione (chiamato automaticamente da loadFlashcards)
  async startSession(params?: {
    user_id?: string;
    device_type?: string;
  }): Promise<{ session_uuid: string }>;

  // Traccia singola azione
  async trackAction(params: {
    session_uuid: string;
    action_type: 'swipe_right' | 'swipe_left' | 'sentence_validated';
    word?: string;
    word_id?: number;
    translation?: string;
  }): Promise<{ success: boolean }>;

  // Termina sessione
  async endSession(session_uuid: string): Promise<{ success: boolean }>;
};
```

### UI Tracking (LearningScreen.tsx)

```tsx
// Props ricevute da CardStack
trackingActive: boolean;
interactionCount: number;
minimumInteractions: number;
onStartTracking: () => void;
onStopTracking: () => void;

// UI mostra:
// - [🟢 Start Tracking] quando tracking OFF
// - [🔴 Stop (N)] quando tracking ON (N = counter)
// - "X more for auto-save" o "✓ Auto-saving"
```

### Componenti con Tracking

| Componente | Azione Tracciata | File |
|------------|------------------|------|
| LearningScreen | `swipe_right`, `swipe_left` | via `useLearningSession` |
| FunSentenceBuilder | `sentence_validated` | diretto in componente |

### Flusso Completo

```
1. loadFlashcards() → trackingApi.startSession() → session_uuid
2. handleSwipe() → interactionCount++ 
   └─► se shouldTrack → trackingApi.trackAction()
3. reset() / stopTracking() → trackingApi.endSession()
4. [Backend] POST /api/infographics/from-session → Gemini genera immagine
```
