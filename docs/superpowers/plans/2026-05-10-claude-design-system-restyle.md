> Last updated: 2026-05-10 17:35

# Claude Design System UI Restyle — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sostituire l'estetica indigo/purple-gradient del frontend `tinder-for-languages` con il Claude warm-editorial design system (cream/coral/dark-navy + Fraunces/Inter), aderendo 1:1 alla spec salvo le quattro deroghe documentate in `docs/superpowers/specs/2026-05-10-claude-design-system-restyle-design.md` §0.

**Architecture:** Tre layer: (1) design tokens come CSS custom properties in `frontend/src/styles/tokens.css`, esposti a Tailwind v4 via `@theme` in `frontend/src/index.css`; (2) primitives UI in `frontend/src/components/ui/` aggiornati o nuovi (`Button`, `Badge`, `CalloutCard`); (3) componenti applicativi rimappati per usare le nuove classi, in 5 fasi commit-per-fase.

**Tech Stack:** React 19, Vite 7, TypeScript 5.9, Tailwind v4 (CSS-only theme), framer-motion 12, Capacitor 6, Playwright 1.56, ESLint 9. Font: Fraunces + Inter via Google Fonts (preconnect + display=swap).

**Branch:** `restyle-frontend`. Pre-restyle checkpoint: commit `04be3d7`. Spec commit: `c899aeb`. Rollback baseline: `git reset --hard 6b419f6`.

**Working directory for all commands:** `/Users/nicco/Desktop/progetti-miei/language-app/tinder-for-languages` (`cd` lì all'inizio della sessione di esecuzione).

---

## File Structure

### Nuovi file
- `frontend/src/styles/tokens.css` — design tokens (CSS custom properties) per `:root` e `.dark`.
- `frontend/src/components/ui/Button.tsx` — primitiva pulsante con varianti `primary`/`secondary`/`secondary-on-dark`/`text`/`icon`.
- `frontend/src/components/ui/Badge.tsx` — primitiva badge con varianti `pill` (cream) e `coral`.
- `frontend/src/components/ui/CalloutCard.tsx` — card coral full-bleed (max 1 per pagina).

### Modificati strutturali
- `frontend/index.html` — preconnect + link Google Fonts.
- `frontend/src/index.css` — `@theme` Tailwind con i token e la type scale.
- `frontend/tailwind.config.js` — svuotato dei custom obsoleti.
- `frontend/src/components/ui/geometry.ts` — radius/elevation/interaction Claude-compliant.
- `frontend/src/components/ui/index.ts` — export dei nuovi primitives.

### Modificati per restyle (refactor classi)
~50 file in `frontend/src/components/`, `frontend/src/components/ui/`, `frontend/src/App.tsx`, `frontend/src/gamification/*` e `frontend/src/learning/*` con classi visive.

---

## Convenzioni di refactor (valide per tutti i task di rebrand)

Quando un task chiede di "rimappare le classi del file X", applicare meccanicamente queste sostituzioni:

| Pattern vecchio | Pattern nuovo |
|---|---|
| `bg-white` | `bg-canvas` |
| `bg-gray-50`, `bg-gray-100`, `bg-slate-100`, `bg-slate-50` | `bg-surface-card` (light) / `dark:bg-surface-dark-soft` |
| `bg-gray-200`, `bg-slate-200` | `bg-surface-cream-strong` |
| `bg-slate-900`, `bg-slate-950`, `bg-gray-900` | `bg-ink` |
| `bg-indigo-*`, `bg-purple-*`, `bg-pink-*`, `bg-violet-*`, `bg-fuchsia-*` (CTA solidi) | `bg-primary` |
| `bg-indigo-100`, `bg-purple-100`, `bg-pink-100` (soft surface) | `bg-surface-card` |
| `bg-gradient-to-*` (qualsiasi) | rimuovere il gradient — sostituire con tinta piena del colore dominante mappata sopra |
| `text-white` | `text-on-primary` (su CTA coral) o `text-canvas` (su `bg-ink`) o `text-on-dark` (su navy) |
| `text-gray-900`, `text-slate-900`, `text-gray-800` | `text-ink` |
| `text-gray-700`, `text-slate-700` | `text-body-strong` |
| `text-gray-600`, `text-slate-600`, `text-gray-500`, `text-slate-500` | `text-muted` |
| `text-gray-400`, `text-slate-400` | `text-muted-soft` |
| `text-indigo-*`, `text-purple-*`, `text-pink-*`, `text-violet-*` | `text-primary` (solo su link / icon attivo); altrimenti `text-ink` |
| `text-transparent bg-clip-text bg-gradient-to-*` | `text-ink font-display` |
| `border-gray-100`, `border-gray-200`, `border-slate-200`, `border-gray-300` | `border-hairline` |
| `border-2`, `border-4` | `border` (1px) salvo motivo specifico |
| `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-xl`, `shadow-2xl` | rimuovere (eccezione: `shadow-soft` per hover-elevated specifico, vedi `geometry.ts`) |
| `rounded-2xl`, `rounded-3xl` | `rounded-lg` (12px) o `rounded-xl` (16px) per hero/illustration container |
| `rounded-full` | resta `rounded-full` |
| `backdrop-blur-*` | rimuovere — la spec è "color-block first, no glassmorphism" |
| `font-bold`, `font-extrabold` su display headings | `font-normal` (Fraunces 400) + `font-display` |
| `font-bold`, `font-extrabold` su body/label | `font-medium` (500) o `font-semibold` (600) Inter |
| `tracking-tight` su display headings | `tracking-[-1px]` (display-lg) o `tracking-[-1.5px]` (display-xl) o `tracking-[-0.5px]` (display-md) |
| classi dark mode `dark:bg-slate-800`, `dark:bg-slate-900`, `dark:bg-gray-800` | `dark:bg-surface-card` o `dark:bg-canvas` (= surface-dark in dark) a seconda del livello |
| `dark:text-white`, `dark:text-slate-100`, `dark:text-gray-100` | `dark:text-ink` (= on-dark in dark) |
| `dark:border-slate-700`, `dark:border-gray-700` | `dark:border-hairline` |

**Regola operativa**: dopo ogni rimappatura del file, eseguire il grep di verifica del task per garantire 0 occorrenze residue.

**Regola hover**: `hover:scale-*`, `hover:shadow-*`, `hover:-translate-*` vanno rimossi. L'unico hover ammesso è `hover:bg-[var(--color-primary-active)]` per i CTA primary; per gli altri, `hover:bg-surface-card` o equivalente shift di tinta.

---

## Phase 1 — Tokens & Font

### Task 1.1: Creare `frontend/src/styles/tokens.css`

**Files:**
- Create: `frontend/src/styles/tokens.css`

- [ ] **Step 1: Creare il file con i token light e dark**

```css
/* frontend/src/styles/tokens.css
   Claude design system tokens.
   Light scope: cream canvas + coral + dark-navy as accent surface.
   Dark scope: navy canvas + coral kept as brand voltage.
*/

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

  /* Spacing rhythm */
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

  /* Elevation (rare) */
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
}
```

- [ ] **Step 2: Verificare che il file esista e sia valido**

Run: `head -5 frontend/src/styles/tokens.css`
Expected: stampa il commento iniziale e l'apertura `:root {`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/styles/tokens.css
git commit -m "feat(ui): add Claude design system tokens (light + dark)"
```

---

### Task 1.2: Esporre i token a Tailwind v4 via `@theme`

**Files:**
- Modify: `frontend/src/index.css`

- [ ] **Step 1: Sostituire integralmente il contenuto di `frontend/src/index.css`**

```css
@import "tailwindcss";
@import "./styles/tokens.css";

@theme {
  /* Colors mirror tokens.css for Tailwind utility generation. */
  --color-primary: #cc785c;
  --color-primary-active: #a9583e;
  --color-canvas: #faf9f5;
  --color-surface-soft: #f5f0e8;
  --color-surface-card: #efe9de;
  --color-surface-cream-strong: #e8e0d2;
  --color-surface-dark: #181715;
  --color-surface-dark-elevated: #252320;
  --color-surface-dark-soft: #1f1e1b;
  --color-hairline: #e6dfd8;
  --color-hairline-soft: #ebe6df;
  --color-ink: #141413;
  --color-body-strong: #252523;
  --color-body: #3d3d3a;
  --color-muted: #6c6a64;
  --color-muted-soft: #8e8b82;
  --color-on-primary: #ffffff;
  --color-on-dark: #faf9f5;
  --color-on-dark-soft: #a09d96;
  --color-success: #5db872;
  --color-warning: #d4a017;
  --color-error: #c64545;
  --color-accent-teal: #5db8a6;
  --color-accent-amber: #e8a55a;

  /* Typography */
  --font-display: 'Fraunces', 'EB Garamond', Georgia, serif;
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace;

  --text-display-xl: 64px;
  --text-display-xl--line-height: 1.05;
  --text-display-xl--letter-spacing: -1.5px;
  --text-display-lg: 48px;
  --text-display-lg--line-height: 1.1;
  --text-display-lg--letter-spacing: -1px;
  --text-display-md: 36px;
  --text-display-md--line-height: 1.15;
  --text-display-md--letter-spacing: -0.5px;
  --text-display-sm: 28px;
  --text-display-sm--line-height: 1.2;
  --text-display-sm--letter-spacing: -0.3px;
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

  /* Radii */
  --radius-xs: 4px;
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
}

*, *::before, *::after {
  box-sizing: border-box;
}

html, body {
  background-color: var(--color-canvas);
  color: var(--color-ink);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

- [ ] **Step 2: Verifica che le utility siano riconosciute (build dev)**

Run: `cd frontend && npm run build 2>&1 | tail -30`
Expected: build completata senza errori "unknown utility". Se il build fallisce con `Cannot apply unknown utility class`, leggere l'errore — è un bug della rimappatura, non procedere.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/index.css
git commit -m "feat(ui): expose design tokens to Tailwind via @theme"
```

---

### Task 1.3: Caricare Fraunces + Inter da Google Fonts

**Files:**
- Modify: `frontend/index.html`

- [ ] **Step 1: Aggiungere preconnect + link al `<head>` di `frontend/index.html`**

Sostituire il blocco `<head>` esistente con:

```html
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500&family=Inter:wght@400;500;600&display=swap"
      rel="stylesheet"
    />
    <title>Tinder for Languages</title>
  </head>
```

- [ ] **Step 2: Avviare il dev server e verificare il caricamento font**

Run: `cd frontend && npm run dev` (in background) — aprire `http://localhost:5173`, aprire DevTools → Network → filtro "fonts" e verificare che `Fraunces` e `Inter` carichino con status 200. Il body deve renderizzare in Inter.

- [ ] **Step 3: Fermare il dev server e committare**

```bash
git add frontend/index.html
git commit -m "feat(ui): load Fraunces and Inter from Google Fonts"
```

---

### Task 1.4: Svuotare i custom obsoleti da `tailwind.config.js`

**Files:**
- Modify: `frontend/tailwind.config.js`

- [ ] **Step 1: Sostituire integralmente il contenuto di `frontend/tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {},
  plugins: [],
}
```

(I custom `primary`, `success`, `error` precedenti sono ora gestiti via `@theme` in `index.css`.)

- [ ] **Step 2: Build di verifica**

Run: `cd frontend && npm run build 2>&1 | tail -10`
Expected: build ok. Se compaiono errori "unknown utility" su classi rimappate, sospendere e diagnosticare.

- [ ] **Step 3: Commit**

```bash
git add frontend/tailwind.config.js
git commit -m "chore(ui): drop legacy tailwind custom theme entries"
```

---

## Phase 2 — UI Primitives

### Task 2.1: Aggiornare `geometry.ts`

**Files:**
- Modify: `frontend/src/components/ui/geometry.ts`

- [ ] **Step 1: Sostituire integralmente il contenuto**

```ts
export const UI_RADIUS = {
  surface: 'rounded-lg',
  control: 'rounded-md',
  pill: 'rounded-full',
  touchIcon: 'rounded-full',
  media: 'rounded-lg',
  hero: 'rounded-xl',
} as const;

export const UI_SIZE = {
  touchControl: 'min-h-10',
  iconButton: 'h-10 w-10',
  smallIcon: 'h-9 w-9',
  nodeImage: 'h-8 w-8',
} as const;

export const UI_ELEVATION = {
  surface: '',
  raised: '',
  floating: '',
  hoverSoft: 'hover:shadow-[0_1px_3px_rgba(20,20,19,0.08)]',
} as const;

export const UI_INTERACTION = {
  transition: 'transition-colors duration-200',
  fastTransition: 'transition-colors duration-150',
  lift: '',
  iconLift: '',
  press: '',
  subtlePress: '',
  raisedHover: '',
  floatingHover: '',
} as const;
```

- [ ] **Step 2: Build di verifica**

Run: `cd frontend && npm run build 2>&1 | tail -10`
Expected: build ok. Le classi vuote (`''`) di `UI_ELEVATION`/`UI_INTERACTION` resteranno innocue ovunque siano interpolate.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ui/geometry.ts
git commit -m "refactor(ui): align geometry tokens to Claude radii and flat elevation"
```

---

### Task 2.2: Creare `Button.tsx`

**Files:**
- Create: `frontend/src/components/ui/Button.tsx`

- [ ] **Step 1: Creare il file**

```tsx
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'secondary-on-dark' | 'text' | 'icon';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

const baseByVariant: Record<Variant, string> = {
  primary:
    'inline-flex items-center justify-center gap-2 h-10 px-5 rounded-md text-button font-sans font-medium bg-primary text-on-primary hover:bg-primary-active disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-150',
  secondary:
    'inline-flex items-center justify-center gap-2 h-10 px-5 rounded-md text-button font-sans font-medium bg-canvas text-ink border border-hairline hover:bg-surface-card disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-150',
  'secondary-on-dark':
    'inline-flex items-center justify-center gap-2 h-10 px-5 rounded-md text-button font-sans font-medium bg-surface-dark-elevated text-on-dark hover:bg-surface-dark-soft disabled:opacity-60 transition-colors duration-150',
  text:
    'inline-flex items-center gap-1 text-button font-sans font-medium text-primary hover:text-primary-active transition-colors duration-150',
  icon:
    'inline-flex items-center justify-center h-10 w-10 rounded-full bg-canvas text-ink border border-hairline hover:bg-surface-card transition-colors duration-150',
};

export function Button({
  variant = 'primary',
  leadingIcon,
  trailingIcon,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  const cls = `${baseByVariant[variant]} ${className}`.trim();
  return (
    <button {...rest} className={cls}>
      {leadingIcon}
      {children}
      {trailingIcon}
    </button>
  );
}
```

- [ ] **Step 2: Verifica TypeScript**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.app.json 2>&1 | tail -15`
Expected: nessun errore relativo al nuovo file.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ui/Button.tsx
git commit -m "feat(ui): add Button primitive with Claude variants"
```

---

### Task 2.3: Creare `Badge.tsx`

**Files:**
- Create: `frontend/src/components/ui/Badge.tsx`

- [ ] **Step 1: Creare il file**

```tsx
import type { HTMLAttributes, ReactNode } from 'react';

type Variant = 'pill' | 'coral' | 'success' | 'error';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
  children: ReactNode;
}

const baseByVariant: Record<Variant, string> = {
  pill:
    'inline-flex items-center px-3 py-1 rounded-full text-caption font-sans font-medium bg-surface-card text-ink',
  coral:
    'inline-flex items-center px-3 py-1 rounded-full text-caption-uppercase font-sans font-medium uppercase tracking-[1.5px] bg-primary text-on-primary',
  success:
    'inline-flex items-center px-3 py-1 rounded-full text-caption font-sans font-medium bg-[var(--color-success)] text-on-primary',
  error:
    'inline-flex items-center px-3 py-1 rounded-full text-caption font-sans font-medium bg-[var(--color-error)] text-on-primary',
};

export function Badge({ variant = 'pill', className = '', children, ...rest }: BadgeProps) {
  const cls = `${baseByVariant[variant]} ${className}`.trim();
  return (
    <span {...rest} className={cls}>
      {children}
    </span>
  );
}
```

- [ ] **Step 2: Verifica TypeScript**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.app.json 2>&1 | tail -10`
Expected: nessun nuovo errore.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ui/Badge.tsx
git commit -m "feat(ui): add Badge primitive (pill, coral, semantic)"
```

---

### Task 2.4: Creare `CalloutCard.tsx`

**Files:**
- Create: `frontend/src/components/ui/CalloutCard.tsx`

- [ ] **Step 1: Creare il file**

```tsx
import type { ReactNode } from 'react';

interface CalloutCardProps {
  title: ReactNode;
  body?: ReactNode;
  cta?: ReactNode;
  className?: string;
}

export function CalloutCard({ title, body, cta, className = '' }: CalloutCardProps) {
  return (
    <section
      className={`rounded-lg bg-primary text-on-primary p-12 flex flex-col gap-4 ${className}`.trim()}
    >
      <h2 className="font-display font-normal text-display-sm leading-tight tracking-[-0.3px]">
        {title}
      </h2>
      {body ? <p className="font-sans text-body-md text-on-primary/90 max-w-prose">{body}</p> : null}
      {cta ? <div className="pt-2">{cta}</div> : null}
    </section>
  );
}
```

- [ ] **Step 2: Verifica TypeScript**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.app.json 2>&1 | tail -10`
Expected: nessun nuovo errore.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ui/CalloutCard.tsx
git commit -m "feat(ui): add CalloutCard for full-bleed coral moments"
```

---

### Task 2.5: Esportare i nuovi primitives da `ui/index.ts`

**Files:**
- Modify: `frontend/src/components/ui/index.ts`

- [ ] **Step 1: Aggiungere gli export**

In coda al file, dopo l'ultimo export esistente:

```ts
export { Button } from './Button';
export { Badge } from './Badge';
export { CalloutCard } from './CalloutCard';
```

- [ ] **Step 2: Verifica build**

Run: `cd frontend && npm run build 2>&1 | tail -10`
Expected: build ok.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ui/index.ts
git commit -m "chore(ui): export Button, Badge, CalloutCard from primitives barrel"
```

---

### Task 2.6: Refactor primitives esistenti — surface/header/panel

**Files:**
- Modify: `frontend/src/components/ui/SurfacePanel.tsx`
- Modify: `frontend/src/components/ui/PageHeader.tsx`
- Modify: `frontend/src/components/ui/ScreenHeader.tsx`
- Modify: `frontend/src/components/ui/AppScreen.tsx`

- [ ] **Step 1: Leggere i file e applicare le sostituzioni di "Convenzioni di refactor"**

Per ciascuno dei 4 file:
1. `Read` il file.
2. Applicare le sostituzioni di tabella (palette, font, radius, shadow, hover).
3. Per gli heading principali in `PageHeader` e `ScreenHeader`: usare `font-display font-normal text-display-md tracking-[-0.5px] text-ink` (o `text-display-lg` per le pagine top-level).
4. Per il sottotitolo: `font-sans text-body-md text-muted`.
5. `SurfacePanel` deve avere una variante `cream` (default `bg-surface-card p-8 rounded-lg`) e una `dark` (`bg-surface-dark text-on-dark p-8 rounded-lg`). Se il componente attuale espone già una prop `variant`, mantenere i nomi; altrimenti aggiungerla retrocompatibile (`variant?: 'canvas' | 'cream' | 'dark'`, default `canvas`).
6. `AppScreen` deve avere `bg-canvas` come root (light) e affidarsi al token per il dark.

- [ ] **Step 2: Verifica TypeScript**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.app.json 2>&1 | tail -10`
Expected: nessun errore.

- [ ] **Step 3: Verifica grep — niente palette obsoleta nei 4 file**

Run:
```bash
cd frontend && grep -nE "indigo|purple|pink|violet|fuchsia|slate-|gray-[1-9]|shadow-(sm|md|lg|xl|2xl)|backdrop-blur|bg-gradient" \
  src/components/ui/SurfacePanel.tsx \
  src/components/ui/PageHeader.tsx \
  src/components/ui/ScreenHeader.tsx \
  src/components/ui/AppScreen.tsx || echo "OK: no legacy palette"
```
Expected: `OK: no legacy palette`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/ui/SurfacePanel.tsx frontend/src/components/ui/PageHeader.tsx frontend/src/components/ui/ScreenHeader.tsx frontend/src/components/ui/AppScreen.tsx
git commit -m "refactor(ui): rebrand surface/header primitives to Claude tokens"
```

---

### Task 2.7: Refactor primitives esistenti — tabs/nav/stat/badge

**Files:**
- Modify: `frontend/src/components/ui/PillTabs.tsx`
- Modify: `frontend/src/components/ui/NavButton.tsx`
- Modify: `frontend/src/components/ui/StatCard.tsx`
- Modify: `frontend/src/components/ui/GameSignalBadge.tsx`
- Modify: `frontend/src/components/ui/FilterSelect.tsx`
- Modify: `frontend/src/components/ui/LoadingSpinner.tsx`
- Modify: `frontend/src/components/ui/ErrorState.tsx`
- Modify: `frontend/src/components/ui/ZoomControlBar.tsx`

- [ ] **Step 1: Per ciascun file applicare le sostituzioni di "Convenzioni di refactor"**

Linee guida specifiche:
- `PillTabs`: tab inattiva `bg-transparent text-muted text-nav-link px-3.5 py-2 rounded-md font-medium`; tab attiva `bg-surface-card text-ink rounded-md` (light), `dark:bg-surface-dark-elevated dark:text-on-dark`. Niente shadow.
- `NavButton`: vedi `App.tsx` AppChrome — bottoni `bg-ink text-canvas` (attivo) / `bg-transparent text-muted hover:bg-surface-card` (inattivo). Border `rounded-md`.
- `StatCard`: `bg-surface-card rounded-lg p-6`. Label in `text-caption-uppercase tracking-[1.5px] text-muted uppercase`. Valore in `font-display text-display-sm font-normal text-ink`.
- `GameSignalBadge`: cream pill o coral pill come descritto in spec §4.7.
- `FilterSelect`: input `bg-canvas border border-hairline rounded-md h-10 px-3.5 text-body-md text-ink focus:border-primary focus:ring-2 focus:ring-primary/15`.
- `LoadingSpinner`, `ErrorState`: `bg-canvas`, accent `text-primary` per spinner, `text-error` per errore.
- `ZoomControlBar`: pulsanti rotondi `bg-canvas border-hairline` come icon-button.

- [ ] **Step 2: Verifica TypeScript**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.app.json 2>&1 | tail -10`
Expected: nessun errore.

- [ ] **Step 3: Verifica grep**

Run:
```bash
cd frontend && grep -nE "indigo|purple|pink|violet|fuchsia|slate-|gray-[1-9]|shadow-(sm|md|lg|xl|2xl)|backdrop-blur|bg-gradient" \
  src/components/ui/PillTabs.tsx \
  src/components/ui/NavButton.tsx \
  src/components/ui/StatCard.tsx \
  src/components/ui/GameSignalBadge.tsx \
  src/components/ui/FilterSelect.tsx \
  src/components/ui/LoadingSpinner.tsx \
  src/components/ui/ErrorState.tsx \
  src/components/ui/ZoomControlBar.tsx || echo "OK: no legacy palette"
```
Expected: `OK: no legacy palette`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/ui/PillTabs.tsx frontend/src/components/ui/NavButton.tsx frontend/src/components/ui/StatCard.tsx frontend/src/components/ui/GameSignalBadge.tsx frontend/src/components/ui/FilterSelect.tsx frontend/src/components/ui/LoadingSpinner.tsx frontend/src/components/ui/ErrorState.tsx frontend/src/components/ui/ZoomControlBar.tsx
git commit -m "refactor(ui): rebrand tabs/nav/stat/filter/state primitives"
```

---

### Task 2.8: ThemeToggle ridisegno

**Files:**
- Modify: `frontend/src/components/ui/ThemeToggle.tsx`

- [ ] **Step 1: Sostituire le classi del toggle**

Il bottone deve essere icon-button circolare 40px: `bg-canvas text-ink border border-hairline rounded-full h-10 w-10 hover:bg-surface-card transition-colors duration-150`. Niente `dark:bg-slate-*`. L'icona Sun/Moon resta da `lucide-react`.

- [ ] **Step 2: Verifica TypeScript + grep**

Run:
```bash
cd frontend && npx tsc --noEmit -p tsconfig.app.json 2>&1 | tail -5
grep -nE "indigo|purple|pink|slate-|gray-[1-9]|shadow-(sm|md|lg|xl|2xl)" src/components/ui/ThemeToggle.tsx || echo "OK"
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ui/ThemeToggle.tsx
git commit -m "refactor(ui): redesign ThemeToggle as cream icon-button"
```

---

### Task 2.9: Build & test gate fine fase 2

- [ ] **Step 1: Build strict**

Run: `cd frontend && npm run build:strict 2>&1 | tail -20`
Expected: build TypeScript strict ok.

- [ ] **Step 2: Lint**

Run: `cd frontend && npm run lint 2>&1 | tail -20`
Expected: nessun errore lint.

- [ ] **Step 3: Test Playwright (subset rapido)**

Run: `cd frontend && npx playwright test test-feature-routing.spec.ts test-i18n-static-copy.spec.ts 2>&1 | tail -20`
Expected: tutti i test verdi. Se falliscono per asserzioni su classi/colori, annotare e correggere lo `.spec.ts` solo dopo aver verificato che il comportamento è preservato.

- [ ] **Step 4: Commit di gate (se tutto verde, commit vuoto)**

```bash
git commit --allow-empty -m "chore(ui): phase 2 gate — primitives green (build, lint, routing, i18n)"
```

---

## Phase 3 — Componenti core

### Task 3.1: `App.tsx` body bg + AppChrome

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Sostituire le classi del wrapper root**

Cambiare la riga del `<div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 pb-24 transition-colors duration-300 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 md:pb-0">` in:

```tsx
<div className="min-h-screen bg-canvas pb-24 transition-colors duration-300 md:pb-0">
```

- [ ] **Step 2: Sostituire il `<nav>` AppChrome**

Sostituire la classe della nav con:

```tsx
className={`fixed inset-x-3 bottom-3 z-[60] border border-hairline bg-canvas p-1 dark:border-hairline dark:bg-canvas md:bottom-auto md:left-4 md:right-auto md:top-4 ${UI_RADIUS.control}`}
```

(niente `shadow-lg`, niente `backdrop-blur`, niente `bg-white/95`.)

- [ ] **Step 3: Aggiornare i bottoni nav**

Per i bottoni `navItems.map`, sostituire la className con:

```tsx
className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 px-1.5 py-2 text-[11px] font-sans font-medium leading-none md:min-h-11 md:flex-row md:px-3 md:text-nav-link ${UI_RADIUS.control} ${UI_INTERACTION.fastTransition} ${
  item.active
    ? 'bg-ink text-canvas'
    : 'text-muted hover:bg-surface-card hover:text-ink'
}`}
```

- [ ] **Step 4: Aggiornare il floating cluster top-right (Sviluppatore + indicator + ThemeToggle)**

Per il bottone Sviluppatore:

```tsx
className={`flex min-h-10 items-center gap-2 px-3 py-2 ${UI_RADIUS.control} font-sans font-medium ${UI_INTERACTION.fastTransition} ${
  developerButtonActive
    ? 'bg-ink text-canvas hover:bg-body-strong'
    : 'bg-canvas text-ink border border-hairline hover:bg-surface-card'
}`}
```

Per lo span Online/Offline:

```tsx
className={`hidden min-h-10 items-center border border-hairline bg-canvas px-3 text-caption font-medium text-muted sm:flex ${UI_RADIUS.control}`}
```

- [ ] **Step 5: Aggiornare RouteFallback**

```tsx
<div className="min-h-screen flex items-center justify-center text-body-sm font-medium text-muted">
  Loading...
</div>
```

- [ ] **Step 6: Verifica grep su `App.tsx`**

Run: `cd frontend && grep -nE "indigo|purple|pink|violet|fuchsia|slate-|gray-[1-9]|shadow-(sm|md|lg|xl|2xl)|backdrop-blur|bg-gradient|bg-white/" src/App.tsx || echo "OK"`
Expected: `OK`.

- [ ] **Step 7: Verifica visiva**

Run: `cd frontend && npm run dev` (background), aprire `http://localhost:5173`. Verificare:
- background cream
- nav bottom mobile in cream con hairline
- bottone Path attivo in `bg-ink text-canvas`
- toggle dark mode → background navy, nav adatta

- [ ] **Step 8: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "refactor(ui): rebrand App root and AppChrome to Claude palette"
```

---

### Task 3.2: `Card.tsx` flashcard surface + word title

**Files:**
- Modify: `frontend/src/components/Card.tsx`

- [ ] **Step 1: Sostituire la card surface**

Riga `<div className="bg-white ${UI_RADIUS.surface} shadow-2xl overflow-hidden border-2 border-gray-100">` →

```tsx
<div className={`bg-canvas border border-hairline ${UI_RADIUS.surface} overflow-hidden`}>
```

- [ ] **Step 2: Sostituire il container immagine**

Riga `<div className="aspect-[4/3] relative overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">` →

```tsx
<div className="aspect-[4/3] relative overflow-hidden bg-surface-card">
```

- [ ] **Step 3: Fallback iniziale (no image)**

Sostituire il blocco `<div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-100 to-purple-100">` →

```tsx
<div className="w-full h-full flex items-center justify-center bg-surface-card">
  <span className="text-display-lg font-display font-normal text-ink">{flashcard.word.charAt(0)}</span>
</div>
```

- [ ] **Step 4: Overlay immagine**

Riga `<div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>` →

```tsx
<div className="absolute inset-0 bg-gradient-to-t from-ink/15 to-transparent" />
```

(Nota: questo gradient ink/15→transparent è una micro-deroga ammessa per leggibilità del mastery badge — vedi §0 deroga "ink/15 overlay".)

- [ ] **Step 5: Category badge**

Sostituire il blocco `<div className={`absolute top-5 right-5 px-5 py-2.5 bg-white/95 backdrop-blur-md ${UI_RADIUS.pill} text-sm font-bold text-gray-800 capitalize shadow-lg border border-white/50`}>` →

```tsx
<div className={`absolute top-5 right-5 px-3 py-1 bg-surface-card ${UI_RADIUS.pill} text-caption font-medium text-ink capitalize border border-hairline`}>
  {flashcard.category}
</div>
```

- [ ] **Step 6: Word title**

Sostituire il blocco `<h2 ...>{flashcard.word}</h2>` →

```tsx
<h2 className="font-display font-normal text-[64px] leading-[1.05] tracking-[-1px] text-ink">
  {flashcard.word}
</h2>
```

- [ ] **Step 7: Audio button**

Sostituire la className del button audio →

```tsx
className={`p-3 ${UI_RADIUS.touchIcon} border border-hairline transition-colors duration-150 ${
  isPlaying
    ? 'bg-primary text-on-primary'
    : 'bg-canvas text-ink hover:bg-surface-card'
}`}
```

(rimuovere `animate-pulse`.)

- [ ] **Step 8: Container del word section**

Sostituire `<div className="px-12 py-10 text-center bg-gradient-to-b from-white to-gray-50">` →

```tsx
<div className="px-12 py-10 text-center bg-canvas">
```

- [ ] **Step 9: Verifica grep**

Run: `cd frontend && grep -nE "indigo|purple|pink|violet|fuchsia|slate-|gray-[1-9]|shadow-(sm|md|lg|xl|2xl)|backdrop-blur|bg-white(?!\\b/15)|from-indigo|from-purple|to-purple|to-pink|via-purple" src/components/Card.tsx || echo "OK"`
Expected: `OK` (l'unica occorrenza di `from-` ammessa è `from-ink/15`).

- [ ] **Step 10: Verifica visiva swipe**

`npm run dev`, aprire `/learn`, swipare una card. Verificare: word in serif Fraunces nero, surface cream, no shadow, audio button cerchio cream.

- [ ] **Step 11: Commit**

```bash
git add frontend/src/components/Card.tsx
git commit -m "refactor(ui): restyle flashcard Card to cream canvas + Fraunces title"
```

---

### Task 3.3: `CardStack.tsx`, `SwipeButtons.tsx`, badge correlati

**Files:**
- Modify: `frontend/src/components/CardStack.tsx`
- Modify: `frontend/src/components/SwipeButtons.tsx`
- Modify: `frontend/src/components/ConfidenceBadge.tsx`
- Modify: `frontend/src/components/WordMasteryBadge.tsx`
- Modify: `frontend/src/components/AudioButton.tsx`

- [ ] **Step 1: Per ciascun file applicare le sostituzioni di "Convenzioni di refactor"**

Specifico:
- `CardStack`: counter `text-caption-uppercase tracking-[1.5px] text-muted`. Background sezione `bg-canvas`. Rimuovere shadow su card stack background.
- `SwipeButtons`: bottone "Don't know" → `Button variant="secondary"` con icona X (`lucide-react`) o classe equivalente; bottone "Know" → `bg-[var(--color-success)] text-on-primary` con icona Check. Mantenere `aria-label` esistente.
- `ConfidenceBadge`: cream pill di base; nel caso di confidenza alta usare `bg-[var(--color-success)] text-on-primary`, bassa `bg-surface-card text-muted`.
- `WordMasteryBadge`: cream surface-card pill con bordo hairline; livelli alti → coral text; livelli bassi → muted.
- `AudioButton`: icon button cream circolare 40px (allineato a Card).

- [ ] **Step 2: Verifica grep**

Run:
```bash
cd frontend && grep -nE "indigo|purple|pink|violet|fuchsia|slate-|gray-[1-9]|shadow-(sm|md|lg|xl|2xl)|backdrop-blur|bg-gradient" \
  src/components/CardStack.tsx \
  src/components/SwipeButtons.tsx \
  src/components/ConfidenceBadge.tsx \
  src/components/WordMasteryBadge.tsx \
  src/components/AudioButton.tsx || echo "OK"
```
Expected: `OK`.

- [ ] **Step 3: Verifica TypeScript + Playwright swipe**

Run:
```bash
cd frontend && npx tsc --noEmit -p tsconfig.app.json 2>&1 | tail -5
npx playwright test test-swipe-first.spec.ts 2>&1 | tail -10
```
Expected: tsc ok, swipe test verde.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/CardStack.tsx frontend/src/components/SwipeButtons.tsx frontend/src/components/ConfidenceBadge.tsx frontend/src/components/WordMasteryBadge.tsx frontend/src/components/AudioButton.tsx
git commit -m "refactor(ui): restyle swipe stack, buttons and confidence badges"
```

---

### Task 3.4: `LearningPathHome.tsx` + componenti correlati

**Files:**
- Modify: `frontend/src/components/LearningPathHome.tsx`
- Modify: `frontend/src/components/LearningCategoryStrip.tsx`
- Modify: `frontend/src/components/LearningFiltersPanel.tsx`
- Modify: `frontend/src/components/LearningSystemMenu.tsx`
- Modify: `frontend/src/components/LearningScreen.tsx`
- Modify: `frontend/src/components/LearningFeedbackBanner.tsx`
- Modify: `frontend/src/components/FeatureHubScreen.tsx`
- Modify: `frontend/src/components/CompletionScreen.tsx`

- [ ] **Step 1: Per ciascun file applicare le sostituzioni di "Convenzioni di refactor"**

Linee guida specifiche:
- `LearningPathHome`: hero `bg-canvas` con padding-y responsive (`py-12 md:py-24`). Heading `font-display font-normal text-display-xl tracking-[-1.5px] text-ink leading-[1.05]` (mobile scala a `text-display-md`). Sub-copy `font-sans text-body-md text-muted`. Feature cards in griglia 1/2/3-up con `bg-surface-card rounded-lg p-8` + icona + `font-sans font-medium text-title-md text-ink` + `text-body-md text-muted`. Eventuali CTA primari → `Button variant="primary"`. Massimo un `CalloutCard` coral nella pagina (es. CTA "Inizia").
- `LearningCategoryStrip`: chip in `category-tab` style (transparent → `surface-card` su attivo).
- `LearningFiltersPanel`: pannello `bg-surface-card rounded-lg p-6`, label `caption-uppercase tracking-[1.5px] text-muted uppercase`, input via `FilterSelect` aggiornato.
- `LearningSystemMenu`: menu list su `surface-card`, voci `text-body-md`, hover `bg-surface-cream-strong`.
- `LearningScreen`: layout principale `bg-canvas`. Eventuali wrapper interni → `surface-card` o canvas.
- `LearningFeedbackBanner`: per banner positivi `bg-[var(--color-success)] text-on-primary`; per banner di richiamo `bg-primary text-on-primary`. Niente toni viola.
- `FeatureHubScreen`: griglia feature card (vedere `LearningPathHome`) — uniforme.
- `CompletionScreen`: hero coral `CalloutCard` con titolo Fraunces e CTA secondaria cream.

- [ ] **Step 2: Verifica grep**

Run:
```bash
cd frontend && grep -nE "indigo|purple|pink|violet|fuchsia|slate-|gray-[1-9]|shadow-(sm|md|lg|xl|2xl)|backdrop-blur|bg-gradient" \
  src/components/LearningPathHome.tsx \
  src/components/LearningCategoryStrip.tsx \
  src/components/LearningFiltersPanel.tsx \
  src/components/LearningSystemMenu.tsx \
  src/components/LearningScreen.tsx \
  src/components/LearningFeedbackBanner.tsx \
  src/components/FeatureHubScreen.tsx \
  src/components/CompletionScreen.tsx || echo "OK"
```
Expected: `OK`.

- [ ] **Step 3: Verifica TypeScript + visual**

Run:
```bash
cd frontend && npx tsc --noEmit -p tsconfig.app.json 2>&1 | tail -5
```
Avviare `npm run dev`, controllare home `/`, `/learn`, schermo completion.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/LearningPathHome.tsx frontend/src/components/LearningCategoryStrip.tsx frontend/src/components/LearningFiltersPanel.tsx frontend/src/components/LearningSystemMenu.tsx frontend/src/components/LearningScreen.tsx frontend/src/components/LearningFeedbackBanner.tsx frontend/src/components/FeatureHubScreen.tsx frontend/src/components/CompletionScreen.tsx
git commit -m "refactor(ui): restyle Learning home and learning-flow screens"
```

---

### Task 3.5: Phase 3 gate

- [ ] **Step 1: Build strict + lint**

Run:
```bash
cd frontend && npm run build:strict 2>&1 | tail -10
cd frontend && npm run lint 2>&1 | tail -10
```
Expected: entrambi ok.

- [ ] **Step 2: Test Playwright core**

Run: `cd frontend && npx playwright test test-swipe-first.spec.ts test-app-feature-usability.spec.ts test-feature-routing.spec.ts 2>&1 | tail -20`
Expected: verdi.

- [ ] **Step 3: Verifica visuale manuale**

Aprire `http://localhost:5173/`, navigare home → learn → swipe → completion. In light e dark mode. Nessun viola/indigo a video.

- [ ] **Step 4: Commit di gate**

```bash
git commit --allow-empty -m "chore(ui): phase 3 gate — core screens green"
```

---

## Phase 4 — Pagine secondarie

### Task 4.1: `GrammarLab` + componenti grammar

**Files:**
- Modify: `frontend/src/components/GrammarLab.tsx`
- Modify: `frontend/src/components/SentenceBuilder.tsx`
- Modify: `frontend/src/components/FunSentenceBuilder.tsx`
- Modify: `frontend/src/components/GrammarBuilderFrame.tsx`
- Modify: `frontend/src/components/GrammarWordBank.tsx`
- Modify: `frontend/src/components/GrammarNodeFilterBar.tsx`
- Modify: `frontend/src/components/EmbeddedGrammarGraph.tsx`
- Modify: `frontend/src/components/GrammarPlacementAssessment.tsx`
- Modify: `frontend/src/components/SentencePlacementChallenge.tsx`

- [ ] **Step 1: Applicare le sostituzioni**

Linee guida specifiche:
- `GrammarLab`: layout `bg-canvas`. Sidebar/pannello filtri `bg-surface-card rounded-lg p-6`. Area centrale canvas. Pill tabs aggiornati.
- `SentenceBuilder`/`FunSentenceBuilder`: tile parole `bg-surface-card border border-hairline rounded-md px-3 py-1.5 text-body-md text-ink`. Word selezionato `bg-primary text-on-primary`. Drop zone con bordo `border-dashed border-hairline`.
- `GrammarBuilderFrame`, `GrammarWordBank`: frame `bg-canvas border border-hairline rounded-lg`.
- `GrammarNodeFilterBar`: `category-tab` style.
- `EmbeddedGrammarGraph`: wrapper `bg-surface-dark rounded-lg p-6 text-on-dark`. Per i colori D3, vedere Task 4.4.
- `GrammarPlacementAssessment`/`SentencePlacementChallenge`: card cream `surface-card`, CTA `Button variant="primary"`.

- [ ] **Step 2: Verifica grep**

Run:
```bash
cd frontend && grep -nE "indigo|purple|pink|violet|fuchsia|slate-|gray-[1-9]|shadow-(sm|md|lg|xl|2xl)|backdrop-blur|bg-gradient" \
  src/components/GrammarLab.tsx \
  src/components/SentenceBuilder.tsx \
  src/components/FunSentenceBuilder.tsx \
  src/components/GrammarBuilderFrame.tsx \
  src/components/GrammarWordBank.tsx \
  src/components/GrammarNodeFilterBar.tsx \
  src/components/EmbeddedGrammarGraph.tsx \
  src/components/GrammarPlacementAssessment.tsx \
  src/components/SentencePlacementChallenge.tsx || echo "OK"
```
Expected: `OK`.

- [ ] **Step 3: Test Playwright grammar**

Run: `cd frontend && npx playwright test test-grammar-d3-images.spec.ts test-grammar-navigation-consistency.spec.ts 2>&1 | tail -15`
Expected: verdi.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/GrammarLab.tsx frontend/src/components/SentenceBuilder.tsx frontend/src/components/FunSentenceBuilder.tsx frontend/src/components/GrammarBuilderFrame.tsx frontend/src/components/GrammarWordBank.tsx frontend/src/components/GrammarNodeFilterBar.tsx frontend/src/components/EmbeddedGrammarGraph.tsx frontend/src/components/GrammarPlacementAssessment.tsx frontend/src/components/SentencePlacementChallenge.tsx
git commit -m "refactor(ui): restyle Grammar Lab and grammar components"
```

---

### Task 4.2: `WordsLibraryEnriched` + modal word

**Files:**
- Modify: `frontend/src/components/WordsLibraryEnriched.tsx`
- Modify: `frontend/src/components/WordDetailModal.tsx`
- Modify: `frontend/src/components/WordDetailModalEnriched.tsx`
- Modify: `frontend/src/components/LinguisticFilterBar.tsx`

- [ ] **Step 1: Applicare le sostituzioni**

Linee guida specifiche:
- `WordsLibraryEnriched`: lista parole `bg-canvas` con divider `border-b border-hairline` per riga. Hover row `hover:bg-surface-soft`. Filter chips → `category-tab`.
- `WordDetailModal`/`WordDetailModalEnriched`: backdrop `bg-ink/40`. Modal surface `bg-canvas rounded-lg overflow-hidden`. Header sticky `border-b border-hairline px-6 py-4`. Sezioni alternate: prima `bg-canvas`, seconda `bg-surface-card`. Tab interne `PillTabs`.
- `LinguisticFilterBar`: chip cream cream-on-active.

- [ ] **Step 2: Verifica grep + Playwright library**

Run:
```bash
cd frontend && grep -nE "indigo|purple|pink|violet|fuchsia|slate-|gray-[1-9]|shadow-(sm|md|lg|xl|2xl)|backdrop-blur|bg-gradient" \
  src/components/WordsLibraryEnriched.tsx \
  src/components/WordDetailModal.tsx \
  src/components/WordDetailModalEnriched.tsx \
  src/components/LinguisticFilterBar.tsx || echo "OK"
npx playwright test test-library-total.spec.ts 2>&1 | tail -10
```
Expected: `OK` + test verde.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/WordsLibraryEnriched.tsx frontend/src/components/WordDetailModal.tsx frontend/src/components/WordDetailModalEnriched.tsx frontend/src/components/LinguisticFilterBar.tsx
git commit -m "refactor(ui): restyle Words Library and word detail modals"
```

---

### Task 4.3: Modal/overlay/mascot/onboarding

**Files:**
- Modify: `frontend/src/components/GameGuideOverlay.tsx`
- Modify: `frontend/src/components/MascotReaction.tsx`
- Modify: `frontend/src/components/MascotSpeechCallout.tsx`
- Modify: `frontend/src/components/StreamingSpeechBubble.tsx`
- Modify: `frontend/src/components/FirstVocabularyOnboarding.tsx`
- Modify: `frontend/src/components/ProgressBar.tsx`
- Modify: `frontend/src/components/YourVocabularyScreen.tsx`

- [ ] **Step 1: Applicare le sostituzioni**

Linee guida specifiche:
- `GameGuideOverlay`: scrim `bg-ink/40`. Card `bg-canvas rounded-lg p-8 border border-hairline`. CTA `Button variant="primary"`.
- `MascotReaction`/`MascotSpeechCallout`/`StreamingSpeechBubble`: bubble `bg-surface-card text-ink rounded-lg p-4 border border-hairline`. Tail bubble: stesso colore. Niente gradient.
- `FirstVocabularyOnboarding`: card hero `bg-canvas`, heading Fraunces `display-md`, illustration su `surface-card`.
- `ProgressBar`: track `bg-surface-card rounded-full h-2`, fill `bg-primary rounded-full`.
- `YourVocabularyScreen`: stats grid con `StatCard` aggiornato.

- [ ] **Step 2: Verifica grep**

Run:
```bash
cd frontend && grep -nE "indigo|purple|pink|violet|fuchsia|slate-|gray-[1-9]|shadow-(sm|md|lg|xl|2xl)|backdrop-blur|bg-gradient" \
  src/components/GameGuideOverlay.tsx \
  src/components/MascotReaction.tsx \
  src/components/MascotSpeechCallout.tsx \
  src/components/StreamingSpeechBubble.tsx \
  src/components/FirstVocabularyOnboarding.tsx \
  src/components/ProgressBar.tsx \
  src/components/YourVocabularyScreen.tsx || echo "OK"
```
Expected: `OK`.

- [ ] **Step 3: Test Playwright feature-guide**

Run: `cd frontend && npx playwright test test-feature-guide-fullscreen.spec.ts 2>&1 | tail -10`
Expected: verde.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/GameGuideOverlay.tsx frontend/src/components/MascotReaction.tsx frontend/src/components/MascotSpeechCallout.tsx frontend/src/components/StreamingSpeechBubble.tsx frontend/src/components/FirstVocabularyOnboarding.tsx frontend/src/components/ProgressBar.tsx frontend/src/components/YourVocabularyScreen.tsx
git commit -m "refactor(ui): restyle overlays, mascot, onboarding and progress"
```

---

### Task 4.4: D3 / Mermaid / charts — palette refactor

**Files:**
- Modify: `frontend/src/components/DeveloperChartsScreen.tsx`
- Modify: `frontend/src/components/MermaidChart.tsx`
- Modify: `frontend/src/components/EmbeddedWordCloud.tsx`
- Modify: `frontend/src/components/ClusteredNodes.tsx`
- Modify: `frontend/src/components/HierarchySunburst.tsx`
- Modify: `frontend/src/components/DialectMap.tsx`

- [ ] **Step 1: Definire la palette categorica Claude per i grafici**

In ciascun file con scale di colori D3, sostituire l'array di colori con:

```ts
const CHART_PALETTE = [
  '#cc785c', // primary
  '#5db8a6', // accent-teal
  '#e8a55a', // accent-amber
  '#5db872', // success
  '#6c6a64', // muted
  '#252320', // surface-dark-elevated
  '#a9583e', // primary-active
  '#181715', // surface-dark
];
```

Esportarlo da un nuovo modulo condiviso `frontend/src/components/charts/palette.ts` se è usato in più file (creare il file con `export const CHART_PALETTE = [...]`). Se è usato solo in un file, definirlo localmente.

- [ ] **Step 2: Wrapper grafico**

Ciascun chart container deve essere wrappato in `<div className="bg-surface-dark rounded-lg p-6 text-on-dark">`. Eventuali label/legenda interne in `text-on-dark-soft text-caption`. Eccezione: word cloud su canvas può restare cream se è la scelta visuale (scegliere uno dei due e essere consistenti).

- [ ] **Step 3: Mermaid theme**

In `MermaidChart.tsx`, configurare `mermaid.initialize({ theme: 'base', themeVariables: { ... } })` con:

```ts
mermaid.initialize({
  startOnLoad: false,
  theme: 'base',
  themeVariables: {
    primaryColor: '#efe9de',
    primaryTextColor: '#141413',
    primaryBorderColor: '#e6dfd8',
    lineColor: '#6c6a64',
    secondaryColor: '#cc785c',
    tertiaryColor: '#5db8a6',
    background: '#faf9f5',
  },
});
```

- [ ] **Step 4: Verifica grep**

Run:
```bash
cd frontend && grep -nE "indigo|purple|pink|violet|fuchsia|slate-|gray-[1-9]|shadow-(sm|md|lg|xl|2xl)|backdrop-blur|bg-gradient|d3\\.schemeCategory10|d3\\.schemeSet|interpolateViridis|interpolateSpectral" \
  src/components/DeveloperChartsScreen.tsx \
  src/components/MermaidChart.tsx \
  src/components/EmbeddedWordCloud.tsx \
  src/components/ClusteredNodes.tsx \
  src/components/HierarchySunburst.tsx \
  src/components/DialectMap.tsx || echo "OK"
```
Expected: `OK`.

- [ ] **Step 5: Verifica visiva**

`npm run dev`, aprire `/developer` (se sviluppatore attivo) e una pagina con un grafico (Grammar Lab → Embedded graph; Library → DialectMap). Verificare palette coerente.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/DeveloperChartsScreen.tsx frontend/src/components/MermaidChart.tsx frontend/src/components/EmbeddedWordCloud.tsx frontend/src/components/ClusteredNodes.tsx frontend/src/components/HierarchySunburst.tsx frontend/src/components/DialectMap.tsx frontend/src/components/charts/palette.ts 2>/dev/null || true
git commit -m "refactor(ui): rebrand D3 and Mermaid charts to Claude palette"
```

(Il `2>/dev/null || true` permette di evitare errore se `palette.ts` non è stato creato.)

---

### Task 4.5: Phase 4 gate

- [ ] **Step 1: Build strict + lint**

Run:
```bash
cd frontend && npm run build:strict 2>&1 | tail -10
cd frontend && npm run lint 2>&1 | tail -10
```
Expected: ok.

- [ ] **Step 2: Suite Playwright completa**

Run: `cd frontend && npx playwright test 2>&1 | tail -30`
Expected: tutti verdi.

- [ ] **Step 3: Commit di gate**

```bash
git commit --allow-empty -m "chore(ui): phase 4 gate — secondary screens green"
```

---

## Phase 5 — Pulizia & verifica

### Task 5.1: Audit globale palette/legacy

- [ ] **Step 1: Grep globale palette legacy**

Run:
```bash
cd frontend && grep -rn -E "(^|\\W)(indigo|purple|pink|violet|fuchsia)-[0-9]" src/ \
  --include='*.ts' --include='*.tsx' --include='*.css' --include='*.html' || echo "OK no legacy palette"
```
Expected: `OK no legacy palette`. Se ci sono occorrenze, rimapparle file per file.

- [ ] **Step 2: Grep gradient residui**

Run:
```bash
cd frontend && grep -rn -E "bg-gradient|from-(indigo|purple|pink|violet|fuchsia|slate|gray)" src/ \
  --include='*.tsx' --include='*.ts' --include='*.css' \
  | grep -v "from-ink/15" || echo "OK no gradient"
```
Expected: `OK no gradient`. (L'unico `from-ink/15` ammesso è l'overlay immagine in `Card.tsx` — vedi spec §0.)

- [ ] **Step 3: Grep shadow legacy**

Run:
```bash
cd frontend && grep -rn -E "shadow-(sm|md|lg|xl|2xl)" src/ \
  --include='*.tsx' --include='*.ts' || echo "OK no shadow legacy"
```
Expected: `OK no shadow legacy`. Se restano, valutare se sono motivati (non dovrebbero) e altrimenti rimuoverli.

- [ ] **Step 4: Grep backdrop-blur residui**

Run:
```bash
cd frontend && grep -rn "backdrop-blur" src/ --include='*.tsx' --include='*.ts' || echo "OK no backdrop-blur"
```
Expected: `OK no backdrop-blur`.

- [ ] **Step 5: Commit (se sono state fatte rimappature aggiuntive)**

```bash
git add -A && git diff --cached --quiet || git commit -m "chore(ui): final palette/shadow/blur cleanup"
```

---

### Task 5.2: Verifica accessibility / dark mode

- [ ] **Step 1: Verifica contrasto manuale**

Avviare `npm run dev`. Per ciascuna delle seguenti combinazioni verificare contrasto AA (≥ 4.5:1 per body, ≥ 3:1 per large text) usando DevTools → Inspect → Accessibility:
- light: `text-ink` su `bg-canvas` ✓
- light: `text-on-primary` su `bg-primary` ✓
- light: `text-muted` su `bg-canvas` ✓
- dark: `text-ink` su `bg-canvas` (= on-dark su navy) ✓
- dark: `text-on-primary` su `bg-primary` ✓

Se una combinazione fallisce, aggiustare il token corrispondente in `tokens.css` e ri-buildare.

- [ ] **Step 2: Smoke test in dark mode di tutte le schermate**

Toggle dark mode, navigare: home → learn → swipe → grammar → library → modal word. Annotare visualmente eventuali rotture (testo invisibile, contrasto basso, surface incoerenti). Correggere a livello di token o componente, committando le fix.

- [ ] **Step 3: Commit eventuali fix**

```bash
git add -A && git diff --cached --quiet || git commit -m "fix(ui): contrast and dark-mode adjustments"
```

---

### Task 5.3: Aggiornare README con la sezione Design system

**Files:**
- Modify: `frontend/src/components/ui/README.md` (se esiste, altrimenti `frontend/README.md`)

- [ ] **Step 1: Aggiungere sezione "Design system" al README primario**

Nel file scelto, aggiungere/aggiornare:

```markdown
## Design system

Lo styling segue il **Claude warm-editorial design system**. Vedi
`docs/superpowers/specs/2026-05-10-claude-design-system-restyle-design.md`
per la spec completa.

- **Token**: `frontend/src/styles/tokens.css` (CSS custom properties),
  esposti a Tailwind v4 via `@theme` in `frontend/src/index.css`.
- **Font**: Fraunces (display, peso 400) + Inter (body, pesi 400/500/600).
- **Primitives**: `frontend/src/components/ui/` — `Button`, `Badge`,
  `CalloutCard`, `SurfacePanel`, `PageHeader`, `PillTabs`, etc.
- **Palette base**: `bg-canvas` (#faf9f5) + `bg-primary` (#cc785c) +
  `bg-surface-dark` (#181715). Coral solo su CTA primario,
  `Badge variant="coral"` o `CalloutCard` (max 1 per pagina).
- **Niente**: gradient, palette indigo/purple/blue, shadow drammatiche,
  serif > 400, hover oltre il darkening del primary.
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/ui/README.md frontend/README.md 2>/dev/null || true
git diff --cached --quiet || git commit -m "docs: document Claude design system in README"
```

---

### Task 5.4: Final gate

- [ ] **Step 1: Build strict + lint + Playwright**

Run:
```bash
cd frontend && npm run build:strict 2>&1 | tail -10
cd frontend && npm run lint 2>&1 | tail -10
cd frontend && npx playwright test 2>&1 | tail -30
```
Expected: tutto verde.

- [ ] **Step 2: Capacitor sync (se native build è in pipeline)**

Run: `cd frontend && npm run cap:sync 2>&1 | tail -20`
Expected: sync completo senza errori. Se fallisce per font remoti, valutare bundling locale (out of scope se non rompe).

- [ ] **Step 3: Commit di final gate**

```bash
git commit --allow-empty -m "chore(ui): final gate — restyle complete"
```

- [ ] **Step 4: Verifica visiva finale**

`npm run dev`. Tour completo dell'app in light + dark. Confermare aderenza alla spec Claude. Se tutto coerente, comunicare al richiedente la chiusura.

---

## Self-review

**Spec coverage check**

- spec §0 deroghe — tabella riportata in convenzioni di refactor + Card.tsx step 4 (ink/15 overlay) + Task 4.4 (palette categorica usa success/error). ✓
- spec §1.1 token light + dark — Task 1.1. ✓
- spec §1.2 @theme Tailwind — Task 1.2. ✓
- spec §1.3 font loading — Task 1.3. ✓
- spec §1.4 geometry — Task 2.1. ✓
- spec §2 primitives (Button/Badge/CalloutCard + refactor surface/header/tabs/nav/stat/state) — Task 2.2–2.8. ✓
- spec §3 mappa surface/colore — convenzioni di refactor + applicate file per file. ✓
- spec §4.1 Card flashcard — Task 3.2. ✓
- spec §4.2 CardStack — Task 3.3. ✓
- spec §4.3 AppChrome — Task 3.1. ✓
- spec §4.4 LearningPathHome — Task 3.4. ✓
- spec §4.5 GrammarLab — Task 4.1. ✓
- spec §4.6 WordsLibrary — Task 4.2. ✓
- spec §4.7 charts D3/Mermaid — Task 4.4. ✓
- spec §4.8 modali/mascot — Task 4.3. ✓
- spec §5 fasi 1–5 — Phase 1–5. ✓
- spec §6 file toccati — file list per task riflette. ✓
- spec §7 rischi (Playwright, font offline, Mermaid/D3, dark mode contrasto) — Task 5.2 (contrasto), Task 5.4 (capacitor sync), Task 4.4 (charts). ✓
- spec §8 DoD — Task 5.4 final gate copre build/lint/test/dark/coral usage; documentazione in Task 5.3. ✓

**Placeholder scan:** rimosse tutte le voci "TBD/TODO/handle edge cases". Le linee guida specifiche per file rimappati derivano dalle convenzioni di refactor, esplicitate in apertura.

**Type consistency:** `Button` props, `Badge` props, `CalloutCard` props sono usati coerentemente nei task successivi. `UI_RADIUS.surface` ora vale `rounded-lg` ovunque interpolato. Token names (`canvas`, `primary`, `surface-card`, `ink`, etc.) coerenti tra `tokens.css`, `@theme` e classi.
