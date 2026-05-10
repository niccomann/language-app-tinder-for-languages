# Onboarding Preference Questions Design

## Goal

The first-run experience should feel guided and game-like before the vocabulary scan starts. The app asks the learner a short set of preference questions so the product can explain that future exercises are personalized by domain, tone, word style, and learning goal.

## Flow

1. The fullscreen mascot intro remains the first visual moment.
2. The intro leads into a 10-step preference questionnaire.
3. Each question presents a small set of tappable options with concise labels.
4. The user sees progress through the questions and can move forward by selecting an option.
5. The completed answers are saved locally and can later be sent to the backend.
6. After the questionnaire, the existing Tinder-style vocabulary scan starts.
7. The analysis and science explanation screens remain unchanged, but can reference the stored preferences later.

## Data

Static onboarding text and question definitions live in the locale JSON files, not hardcoded in the component. This keeps the flow ready for English, Italian, French, and future language mappings.

Answers are stored in browser storage under a dedicated onboarding preference key. The first implementation stores them locally only; backend persistence can be added later without changing the UI flow.

## UI

The questionnaire uses the same fullscreen mascot and speech-bubble language already used by the onboarding. The question card uses rounded, game-like option buttons, a progress indicator, and a primary action. The UI should avoid showing the whole app menu at this stage; the user should feel inside a guided path.

## Testing

Tests should verify that the first-run onboarding includes a preference phase before the vocabulary scan, that the questions are centralized in JSON/static copy, and that answers are persisted through the shared browser storage utility instead of direct localStorage calls.
