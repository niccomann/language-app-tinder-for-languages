# Guided Feature Flow Design

## Goal

Reduce visible choice overload without removing any existing feature. The app should feel closer to a guided learning game: the user sees a primary next action, then secondary missions, while every existing direct route remains available.

## Product Direction

The home screen becomes the main learning path. It should not present the app as a toolbox. It should present the app as a progression:

1. Vocabulary scan.
2. Review German level.
3. Sentence placement.
4. Grammar practice.
5. Library collection.
6. Advanced exploration.

The user can still consume all current features: swipe learning, filters, adaptive learning system explanation, sentence placement, library, grammar graph, word cloud, build sentence, compose sentence, clusters, dialects, hierarchy, and word detail tabs.

## Architecture

Add a centralized feature-flow registry in the frontend. Each existing feature gets metadata: route, label, description, mission phase, priority, guide id, and visual tone. The home screen consumes this registry to render guided missions instead of hardcoding scattered navigation buttons.

Direct routing remains unchanged. Existing route parsing in `frontend/src/routes/appRoutes.ts` remains compatible with all current URLs.

## UI Behavior

The home screen should show one dominant action: continue the current recommended mission. Secondary actions should be grouped as upcoming missions and advanced exploration, not shown as equal choices.

The guided flow should make features feel sequential:

- "Continue" starts the highest-priority practice step.
- Sentence placement is the next visible mission after vocabulary review.
- Grammar and library become later mission cards.
- Advanced grammar tools remain present but grouped as an exploration area.

The first-visit vocabulary scan remains unchanged and still hides library, grammar, and filters until the scan is complete.

## Testing

Add Playwright coverage that proves:

- The home screen exposes a guided path with one primary continue action.
- Existing features remain accessible from the guided flow.
- Direct feature routes still work for grammar, library, placement, and learning.

## Constraints

- Do not delete any feature.
- Do not remove any existing route.
- Do not make the UI depend on AI inference.
- Keep the visual system consistent with existing reusable UI components.
