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
components/     # Active React components
├── CardStack.tsx         # UI entry point: decides which screen to show
├── Card.tsx              # Single draggable flashcard
├── LearningScreen.tsx    # Main learning screen
├── LearningCategoryStrip.tsx # Gamified topic deck
├── LearningFiltersPanel.tsx # Category filters inside the deck
├── LearningSystemMenu.tsx # Adaptive system slogans/concepts
├── FirstVocabularyOnboarding.tsx # First vocabulary scan
├── GameGuideOverlay.tsx  # Event-driven animated feature guide
├── GrammarLab.tsx        # Grammar lab (7 tabs)
├── WordsLibraryEnriched.tsx  # Word library
└── ui/                   # Reusable base components

hooks/          # Custom React hooks
├── useLearningSession.ts # ⭐ Core: session state, swipe logic
├── useCategories.ts      # Category selection
├── useAvailableGrammarNodes.ts # Grammar nodes shared by builders
├── useAudio.ts           # Audio playback hook
├── useGrammarNodeFilters.ts # Grammar node filtering
├── useLinguisticFilters.ts  # Linguistic filtering
└── useZoomControls.ts    # Zoom controls

services/       # Client API
└── api.ts                # ⭐ All backend calls

contexts/       # React Context
└── ThemeContext.tsx      # Dark/Light mode

gamification/   # Asset manifests and guide mapping
├── mascotManifest.ts     # Mascot feedback for correct/wrong/level up
└── featureGuideManifest.ts # 13 guide x 2 frame cutout

types/          # TypeScript interfaces
└── index.ts              # Flashcard, Progress, GrammarNode, etc.

config/         # Configuration
└── appMode.ts            # Feature flags (online/offline)

routes/         # Lightweight routing without react-router
└── appRoutes.ts          # parseAppRoute, grammarPath, libraryWordPath

utils/          # Utility functions
├── animations.ts         # Framer Motion variants
├── browserStorage.ts     # Centralized localStorage access
├── grammarColors.ts      # Colors for grammar types
└── imageHelper.ts        # Base64 image handling
```

## Main Flow

```
App.tsx
  ├── appRoutes.ts → route state
  ├── GameGuideOverlay → animated guide for the current feature
  ├── CardStack.tsx → learning session
  │     ├── FirstVocabularyOnboarding → first vocabulary scan
  │     ├── CompletionScreen → finished session
  │     ├── LearningPathHome → 400-level path
  │     └── LearningScreen → swipe flashcards + category filters
  │           ├── Card.tsx (draggable)
  │           ├── LearningCategoryStrip.tsx
  │           ├── LearningFiltersPanel.tsx
  │           ├── LearningSystemMenu.tsx
  │           └── SwipeButtons.tsx
  ├── GrammarLab → grammar exercises
  └── WordsLibraryEnriched → browse words
```

## Key Hooks

### `useLearningSession`
```typescript
// Handles the full learning flow
const session = useLearningSession();
session.loadFlashcards(categories);  // Loads cards
session.handleSwipe('right');        // Swipe = known
session.handleSwipe('left');         // Swipe = unknown
```

### Deprecated

The old YouTube flow has been moved to `deprecated/youtube/` and is not imported by the main flow.
The old AI video flow has been moved to `deprecated/ai-video/` and is not imported by the main flow.
The old initial category gate has been moved to `deprecated/category-gate/`.

### `useCategories`
```typescript
// Handles category selection
const categories = useCategories();
categories.toggleCategory('animals');
categories.selectAll();
```

### `useAvailableGrammarNodes`
```typescript
// Shares fetch + loading state across sentence builders
const { availableNodes, loading } = useAvailableGrammarNodes();
```

## Centralized Surfaces

- `routes/appRoutes.ts`: main routes and deep-linkable tabs.
- `components/ui/`: shapes, panels, tabs, headers, buttons, and interaction tokens.
- `gamification/featureGuideManifest.ts`: assets, copy, and route-to-guide mapping.
- `components/GameGuideOverlay.tsx`: single event-driven, non-continuous feature animation layer.
- `utils/browserStorage.ts`: single direct access layer for `localStorage`.
- `components/firstVocabularyOnboardingMeta.ts`: thresholds, insights, and first onboarding persistence.
- `frontend/test-utils/appTestHelpers.ts`: shared URLs, API mocks, and Playwright helpers.

For maintenance details: `docs/frontend-maintenance.md`.

## API Calls (services/api.ts)

| Function | Endpoint | Description |
|----------|----------|-------------|
| `getFlashcards()` | GET /api/cards | Flashcard list |
| `recordProgress()` | POST /api/progress | Saves progress |
| `speakText()` | POST /api/tts/speak | Text-to-speech |
| `getLibraryWords()` | GET /api/library/words | Filtered words |

---

## Progress and Mastery

`useLearningSession` records every swipe through `api.recordProgress()` and updates the confidence score with `api.updateWordStatistics()`.
The home also uses `api.getAdaptiveLearningSummary()` to show the global path:
the user path goes from level 1 to 400, while each individual word keeps a separate mastery score from 1 to 10.

```
1. loadFlashcards(categories) → loads the filtered deck
2. handleSwipe('right' | 'left') → saves known/unknown progress
3. updateWordStatistics() → updates the word mastery score
4. getAdaptiveLearningSummary() → updates path level, XP, and trend
5. reset() → clears session progress and returns to the first card
```
