# Guided Feature Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the home screen guide users through sequential missions while preserving every existing feature and direct route.

**Architecture:** Add a frontend feature-flow registry, then make `LearningPathHome` render primary, upcoming, and advanced missions from that registry. Existing route parsing and feature components stay intact.

**Tech Stack:** React, TypeScript, Tailwind, Playwright.

---

### Task 1: Add Guided Flow Regression Test

**Files:**
- Modify: `frontend/test-swipe-first.spec.ts`

- [ ] **Step 1: Write the failing test**

Add a Playwright test that opens `/`, expects a single primary "Continue path" action, expects the mission cards for vocabulary, sentence placement, grammar, library, and advanced exploration, then clicks the sentence placement mission and verifies `/placement/sentence`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx playwright test test-swipe-first.spec.ts -g "home presents a constrained guided mission flow" --workers=1`

Expected: FAIL because the home still exposes the previous equal-weight action set.

- [ ] **Step 3: Commit after green implementation**

Run: `git add frontend/test-swipe-first.spec.ts frontend/src && git commit -m "feat: guide feature discovery through missions"`

### Task 2: Create Feature Flow Registry

**Files:**
- Create: `frontend/src/gamification/featureFlowRegistry.ts`

- [ ] **Step 1: Implement registry**

Create a typed registry for existing features with route, title, short description, phase, priority, and tone. Include entries for learning review, topics, learning system, sentence placement, library, grammar graph, word cloud, build sentence, compose sentence, clusters, dialects, and hierarchy.

- [ ] **Step 2: Export selectors**

Export helpers for the primary mission, upcoming missions, and advanced exploration missions.

### Task 3: Refactor Home To Guided Missions

**Files:**
- Modify: `frontend/src/components/LearningPathHome.tsx`

- [ ] **Step 1: Replace equal-weight CTA cluster**

Keep one dominant "Continue path" button. Render the sentence placement and grammar/library missions as sequenced cards.

- [ ] **Step 2: Preserve all feature access**

Keep buttons or cards for topics, library, grammar lab, and all advanced grammar tools. They should be visually grouped as missions, not scattered as equal top-level options.

- [ ] **Step 3: Keep existing callbacks**

Use existing callbacks: `onStartSession`, `onOpenFilters`, `onStartGrammarPlacement`, `onOpenLibrary`, and `onOpenGrammarLab`. For advanced grammar subroutes, use browser navigation only if the component does not receive a dedicated callback.

### Task 4: Verify

**Files:**
- No production file changes.

- [ ] **Step 1: Run targeted tests**

Run:

```bash
npx playwright test test-swipe-first.spec.ts --workers=1
npx playwright test test-feature-routing.spec.ts --workers=1
```

- [ ] **Step 2: Run quality checks**

Run:

```bash
npm run lint
npm run build:strict
```

- [ ] **Step 3: Review git diff**

Run: `git diff --check && git status --short`
