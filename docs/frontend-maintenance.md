# Frontend Maintenance Notes

This file tracks the shared surfaces that should stay centralized as the app grows.

## Routing

Route parsing and path generation live in `frontend/src/routes/appRoutes.ts`.
Feature views should not keep their own URL maps. Add route segments there first, then pass the parsed state down through `App.tsx`.

## UI System

Reusable geometry, screens, headers, panels, tabs, navigation buttons, and badges live in `frontend/src/components/ui`.
New views should start from `AppScreen`, `ScreenHeader`, `SurfacePanel`, `PillTabs`, `NavButton`, `StatCard`, `GameSignalBadge`, `UI_RADIUS`, and `UI_INTERACTION` before adding local shape or interaction classes.

## Browser Storage

Browser storage access is centralized in `frontend/src/utils/browserStorage.ts`.
Components should call `readStorageValue` and `writeStorageValue` instead of touching `localStorage` directly.

## First Vocabulary Onboarding

The first-run vocabulary scan uses shared thresholds, persistence, insight formatting, and route gating from `frontend/src/components/firstVocabularyOnboardingMeta.ts`.
`CardStack.tsx` should stay focused on orchestration, not on local onboarding policy.

## Shared Data Hooks

Common frontend data loading should live in hooks under `frontend/src/hooks`.
For example, both sentence builders load grammar nodes through `useAvailableGrammarNodes` instead of duplicating fetch and loading state.

## Gamified Guidance

Feature-level explanatory animations are centralized in `frontend/src/gamification/featureGuideManifest.ts` and rendered through `frontend/src/components/GameGuideOverlay.tsx`.
Each guide uses transparent cutout assets from `frontend/src/assets/gamification` and should animate only when the route changes or the user asks to replay the guide.
Do not add looping decorative motion inside individual feature views.

## Playwright Helpers

Shared browser-test URLs, onboarding setup, learning API mocks, and viewport assertions live in `frontend/test-utils/appTestHelpers.ts`.
Specs should import `APP_URL`, `API_URL`, `mockLearningApi`, `markFirstVocabularyOnboardingDone`, `expectInViewport`, and `expectNoHorizontalOverflow` rather than redefining them.

## Deprecated Code

Old YouTube and AI video flows are intentionally under `deprecated` paths.
Do not reconnect deprecated modules to active routes unless the feature is intentionally restored and reviewed as part of the main flow.
