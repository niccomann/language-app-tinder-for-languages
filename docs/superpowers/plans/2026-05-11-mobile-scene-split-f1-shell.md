> Last updated: 2026-05-11 17:00

# Mobile Scene Split — F1 Shell & Primitives — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introdurre il frame mobile globale (`max-w-[480px]`), 8 primitive UI riutilizzabili e un kebab menu in top-bar che consolida il chrome accessorio (Theme/Developer/Tester/Online). Nessuna scena viene ancora migrata: F1 prepara solo il terreno.

**Architecture:** Tutti i nuovi componenti vivono in `frontend/src/components/scene/`. `<SceneShell>` è il wrapper di tutte le route future; oggi viene esportato e adoperato in una sola scena di prova (`/developer` per verifica end-to-end). Le primitive sono pure: usano i token Claude esistenti (Fraunces/Inter, palette warm-editorial). Niente nuovo design system.

**Tech Stack:** React 19 + Vite 7 + TypeScript + Tailwind v4 (`@theme` + token CSS in `index.css`) + framer-motion + lucide-react. Niente librerie nuove.

**Riferimento spec:** `docs/superpowers/specs/2026-05-11-mobile-scene-split-design.md`

---

## File map

| Path | Responsabilità |
|---|---|
| `frontend/src/components/scene/SceneShell.tsx` | wrapper: frame mobile + top-bar + body + slot per bottom-nav |
| `frontend/src/components/scene/SceneHeader.tsx` | eyebrow + title + sub-headline + chip Cos'è? |
| `frontend/src/components/scene/ExplainerSheet.tsx` | bottom-sheet con "Non mostrare più" persistente |
| `frontend/src/components/scene/HubGrid.tsx` | griglia 1 colonna di card hub uniformi |
| `frontend/src/components/scene/SubNav.tsx` | barra tab orizzontale sticky per scene-sorelle |
| `frontend/src/components/scene/PaginatedList.tsx` | lista paginata URL-driven |
| `frontend/src/components/scene/StepFooter.tsx` | footer wizard con back/primary |
| `frontend/src/components/scene/BottomNav.tsx` | nav fissa 4 voci con prefix matching (refactor dell'attuale) |
| `frontend/src/components/scene/AppHeaderMenu.tsx` | kebab menu (Theme/Developer/Tester/Online) |
| `frontend/src/components/scene/explainerStorage.ts` | helper `isExplainerDismissed` / `markExplainerDismissed` |
| `frontend/src/components/scene/index.ts` | barrel export |
| `frontend/src/App.tsx` | applica frame mobile globale, sostituisce AppChrome con SceneShell-style top bar |
| `frontend/src/routes/appRoutes.ts` | unchanged in F1 (no nuove route ancora) |

---

## Task 1: Helper `explainerStorage`

**Files:**
- Create: `frontend/src/components/scene/explainerStorage.ts`

- [ ] **Step 1: Create helper file**

```ts
const PREFIX = 'languageApp:explainerDismissed:';
const SUFFIX = ':v1';

export function explainerKey(key: string): string {
  return `${PREFIX}${key}${SUFFIX}`;
}

export function isExplainerDismissed(key: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(explainerKey(key)) === 'true';
  } catch {
    return false;
  }
}

export function markExplainerDismissed(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(explainerKey(key), 'true');
  } catch {
    /* ignore quota errors */
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && pnpm tsc --noEmit`
Expected: no errors related to this file.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/scene/explainerStorage.ts
git commit -m "feat(scene): explainer dismiss persistence helper"
```

---

## Task 2: `ExplainerSheet` component

**Files:**
- Create: `frontend/src/components/scene/ExplainerSheet.tsx`

- [ ] **Step 1: Implement**

```tsx
import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button, UI_INTERACTION, UI_RADIUS } from '../ui';
import { markExplainerDismissed } from './explainerStorage';

interface ExplainerSheetProps {
  open: boolean;
  onClose: () => void;
  storageKey: string;
  title: string;
  children: ReactNode;
}

export function ExplainerSheet({ open, onClose, storageKey, title, children }: ExplainerSheetProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const dismissForever = () => {
    markExplainerDismissed(storageKey);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[85] flex items-end sm:items-center justify-center bg-ink/40 px-0 sm:px-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`relative w-full max-w-[480px] mx-auto bg-canvas border border-hairline ${UI_RADIUS.surface} sm:my-6 p-5 pb-6 max-h-[85vh] overflow-y-auto`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className={`absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center ${UI_RADIUS.control} text-muted ${UI_INTERACTION.fastTransition} hover:bg-surface-card hover:text-ink`}
        >
          <X size={18} />
        </button>
        <p className="text-caption-uppercase tracking-[1.5px] font-medium uppercase text-primary">
          Cos'è?
        </p>
        <h3 className="mt-2 font-display font-normal text-display-sm tracking-[-0.3px] text-ink">
          {title}
        </h3>
        <div className="mt-3 space-y-3 text-body-md text-body-strong">{children}</div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={dismissForever}
            className="text-body-sm font-medium text-muted underline-offset-2 hover:underline"
          >
            Non mostrare più
          </button>
          <Button variant="primary" onClick={onClose}>
            Chiudi
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && pnpm tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/scene/ExplainerSheet.tsx
git commit -m "feat(scene): ExplainerSheet bottom-sheet with persistent dismiss"
```

---

## Task 3: `SceneHeader` component

**Files:**
- Create: `frontend/src/components/scene/SceneHeader.tsx`

- [ ] **Step 1: Implement**

```tsx
import { useState, type ReactNode } from 'react';
import { Info } from 'lucide-react';
import { UI_INTERACTION, UI_RADIUS } from '../ui';
import { ExplainerSheet } from './ExplainerSheet';
import { isExplainerDismissed } from './explainerStorage';

interface SceneHeaderProps {
  eyebrow: string;
  title: string;
  subline: string;
  explainerKey?: string;
  explainerTitle?: string;
  explainerBody?: ReactNode;
  className?: string;
}

export function SceneHeader({
  eyebrow,
  title,
  subline,
  explainerKey,
  explainerTitle,
  explainerBody,
  className = '',
}: SceneHeaderProps) {
  const [open, setOpen] = useState(false);
  const dismissed = explainerKey ? isExplainerDismissed(explainerKey) : false;
  const showChip = explainerKey && explainerBody;

  return (
    <header className={`flex flex-col gap-2 ${className}`}>
      <p className="text-caption-uppercase tracking-[1.5px] font-medium uppercase text-primary">
        {eyebrow}
      </p>
      <div className="flex items-start gap-2">
        <h1 className="flex-1 font-display font-normal text-display-sm leading-tight tracking-[-0.3px] text-ink">
          {title}
        </h1>
        {showChip && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 ${UI_RADIUS.control} border border-hairline bg-canvas text-caption font-medium ${dismissed ? 'text-muted-soft' : 'text-muted'} ${UI_INTERACTION.fastTransition} hover:bg-surface-card hover:text-ink`}
            aria-label="Cos'è questa schermata?"
          >
            <Info size={14} />
            Cos'è?
          </button>
        )}
      </div>
      <p className="text-body-md text-muted">{subline}</p>
      {showChip && (
        <ExplainerSheet
          open={open}
          onClose={() => setOpen(false)}
          storageKey={explainerKey!}
          title={explainerTitle ?? title}
        >
          {explainerBody}
        </ExplainerSheet>
      )}
    </header>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && pnpm tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/scene/SceneHeader.tsx
git commit -m "feat(scene): SceneHeader with eyebrow/title/subline + Cos'è chip"
```

---

## Task 4: `BottomNav` refactor

**Files:**
- Create: `frontend/src/components/scene/BottomNav.tsx`

L'obiettivo è una bottom-nav fissa che riconosce la sezione attiva via prefix URL. Sostituirà il nav corrente in `App.tsx` (al Task 9).

- [ ] **Step 1: Implement**

```tsx
import { BookOpen, Compass, Home, Sparkles } from 'lucide-react';
import { UI_INTERACTION, UI_RADIUS } from '../ui';

type SectionId = 'path' | 'learn' | 'review' | 'explore';

interface BottomNavItem {
  id: SectionId;
  label: string;
  path: string;
  icon: typeof Home;
  prefixes: string[];
}

const ITEMS: readonly BottomNavItem[] = [
  { id: 'path', label: 'Path', path: '/', icon: Home, prefixes: ['/', '/path'] },
  { id: 'learn', label: 'Learn', path: '/learn', icon: BookOpen, prefixes: ['/learn'] },
  { id: 'review', label: 'Review', path: '/review', icon: Sparkles, prefixes: ['/review', '/vocabulary', '/library'] },
  { id: 'explore', label: 'Explore', path: '/explore', icon: Compass, prefixes: ['/explore', '/grammar', '/placement'] },
];

function matchSection(pathname: string): SectionId {
  if (pathname === '/' || pathname.startsWith('/path')) return 'path';
  if (pathname.startsWith('/learn')) return 'learn';
  if (pathname.startsWith('/review') || pathname.startsWith('/vocabulary') || pathname.startsWith('/library')) {
    return 'review';
  }
  if (pathname.startsWith('/explore') || pathname.startsWith('/grammar') || pathname.startsWith('/placement')) {
    return 'explore';
  }
  return 'path';
}

interface BottomNavProps {
  pathname: string;
  onNavigate: (path: string) => void;
}

export function BottomNav({ pathname, onNavigate }: BottomNavProps) {
  const active = matchSection(pathname);
  return (
    <nav
      aria-label="Product navigation"
      className={`fixed inset-x-0 bottom-0 z-[60] mx-auto max-w-[480px] border-t border-hairline bg-canvas px-2 py-1.5`}
    >
      <ul className="grid grid-cols-4 gap-1">
        {ITEMS.map((item) => {
          const isActive = item.id === active;
          const Icon = item.icon;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onNavigate(item.path)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex w-full min-h-12 flex-col items-center justify-center gap-1 px-1 py-1.5 text-[11px] font-medium leading-none ${UI_RADIUS.control} ${UI_INTERACTION.fastTransition} ${
                  isActive
                    ? 'bg-ink text-canvas'
                    : 'text-muted hover:bg-surface-card hover:text-ink'
                }`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export { matchSection };
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && pnpm tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/scene/BottomNav.tsx
git commit -m "feat(scene): BottomNav with prefix-based section detection"
```

---

## Task 5: `AppHeaderMenu` (kebab)

Consolida Theme toggle / Developer / Tester feedback / Online badge in un menu unico nel top-bar.

**Files:**
- Create: `frontend/src/components/scene/AppHeaderMenu.tsx`

- [ ] **Step 1: Implement**

```tsx
import { useEffect, useRef, useState } from 'react';
import { Code2, MessageSquarePlus, MoreVertical } from 'lucide-react';
import { ThemeToggle } from '../ui/ThemeToggle';
import { FeedbackButton } from '../FeedbackButton';
import { APP_MODE, SHOW_DEVELOPER_TOOLS } from '../../config/appMode';
import { UI_INTERACTION, UI_RADIUS } from '../ui';

interface AppHeaderMenuProps {
  onNavigate: (path: string) => void;
}

export function AppHeaderMenu({ onNavigate }: AppHeaderMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="App menu"
        aria-expanded={open}
        className={`inline-flex h-10 w-10 items-center justify-center ${UI_RADIUS.control} border border-hairline bg-canvas text-ink ${UI_INTERACTION.fastTransition} hover:bg-surface-card`}
      >
        <MoreVertical size={18} />
      </button>
      {open && (
        <div
          role="menu"
          className={`absolute right-0 mt-2 w-56 origin-top-right ${UI_RADIUS.surface} border border-hairline bg-canvas p-2 shadow-sm z-[75]`}
        >
          <div className="flex items-center gap-2 px-1 py-1">
            <FeedbackButton />
            <span className="text-body-sm text-muted">Feedback</span>
          </div>
          {SHOW_DEVELOPER_TOOLS && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onNavigate('/developer');
              }}
              className={`flex w-full items-center gap-2 px-2 py-2 text-left text-body-sm font-medium text-ink ${UI_RADIUS.control} ${UI_INTERACTION.fastTransition} hover:bg-surface-card`}
            >
              <Code2 size={16} />
              Sviluppatore
            </button>
          )}
          <div className="mt-1 border-t border-hairline pt-1">
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-body-sm text-muted">Tema</span>
              <ThemeToggle />
            </div>
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-body-sm text-muted">Stato</span>
              <span className="text-caption font-medium text-muted">
                {APP_MODE === 'offline' ? 'Offline' : 'Online'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && pnpm tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/scene/AppHeaderMenu.tsx
git commit -m "feat(scene): kebab menu consolidating chrome (theme/dev/feedback/online)"
```

---

## Task 6: `SceneShell` wrapper

**Files:**
- Create: `frontend/src/components/scene/SceneShell.tsx`

- [ ] **Step 1: Implement**

```tsx
import { ArrowLeft, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { UI_INTERACTION, UI_RADIUS } from '../ui';
import { SceneHeader } from './SceneHeader';
import { AppHeaderMenu } from './AppHeaderMenu';

interface SceneShellProps {
  eyebrow: string;
  title: string;
  subline: string;
  explainerKey?: string;
  explainerTitle?: string;
  explainerBody?: ReactNode;
  back?: { onClick: () => void; label?: string };
  action?: ReactNode;
  onNavigate: (path: string) => void;
  children: ReactNode;
}

export function SceneShell({
  eyebrow,
  title,
  subline,
  explainerKey,
  explainerTitle,
  explainerBody,
  back,
  action,
  onNavigate,
  children,
}: SceneShellProps) {
  return (
    <div className="mx-auto min-h-dvh max-w-[480px] px-4 pb-24">
      <div className="sticky top-0 z-[65] -mx-4 flex h-12 items-center justify-between border-b border-hairline bg-canvas/95 px-4 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          {back && (
            <button
              type="button"
              onClick={back.onClick}
              aria-label={back.label ?? 'Indietro'}
              className={`inline-flex h-9 w-9 items-center justify-center ${UI_RADIUS.control} text-ink ${UI_INTERACTION.fastTransition} hover:bg-surface-card`}
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <span className="truncate text-body-sm font-medium text-muted">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          {action}
          <AppHeaderMenu onNavigate={onNavigate} />
        </div>
      </div>
      <SceneHeader
        eyebrow={eyebrow}
        title={title}
        subline={subline}
        explainerKey={explainerKey}
        explainerTitle={explainerTitle}
        explainerBody={explainerBody}
        className="mt-5"
      />
      <main className="mt-5">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && pnpm tsc --noEmit`
Expected: no errors. (If unused import `LucideIcon` warns, remove it.)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/scene/SceneShell.tsx
git commit -m "feat(scene): SceneShell wrapper (frame + top-bar + header)"
```

---

## Task 7: `HubGrid` component

**Files:**
- Create: `frontend/src/components/scene/HubGrid.tsx`

- [ ] **Step 1: Implement**

```tsx
import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { UI_INTERACTION, UI_RADIUS } from '../ui';

export interface HubGridItem {
  id: string;
  icon: ReactNode;
  title: string;
  sub: string;
  onClick: () => void;
  trailing?: ReactNode;
}

interface HubGridProps {
  items: HubGridItem[];
  className?: string;
}

export function HubGrid({ items, className = '' }: HubGridProps) {
  return (
    <ul className={`flex flex-col gap-3 ${className}`}>
      {items.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            onClick={item.onClick}
            className={`flex w-full min-h-[88px] items-center gap-3 ${UI_RADIUS.surface} border border-hairline bg-canvas px-4 py-3 text-left ${UI_INTERACTION.transition} hover:bg-surface-card`}
          >
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center ${UI_RADIUS.control} bg-surface-cream text-ink`}
              aria-hidden
            >
              {item.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display font-normal text-body-lg leading-tight text-ink">
                {item.title}
              </span>
              <span className="mt-0.5 block text-body-sm text-muted">{item.sub}</span>
            </span>
            {item.trailing ?? <ChevronRight size={18} className="text-muted-soft" />}
          </button>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && pnpm tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/scene/HubGrid.tsx
git commit -m "feat(scene): HubGrid uniform single-column card grid"
```

---

## Task 8: `SubNav` component

**Files:**
- Create: `frontend/src/components/scene/SubNav.tsx`

- [ ] **Step 1: Implement**

```tsx
import { UI_INTERACTION, UI_RADIUS } from '../ui';

export interface SubNavItem {
  id: string;
  label: string;
  onClick: () => void;
  active: boolean;
}

interface SubNavProps {
  items: SubNavItem[];
  ariaLabel: string;
}

export function SubNav({ items, ariaLabel }: SubNavProps) {
  return (
    <nav
      aria-label={ariaLabel}
      className="sticky top-12 z-[63] -mx-4 mt-3 overflow-x-auto border-b border-hairline bg-canvas/95 backdrop-blur-sm"
    >
      <ul className="flex min-w-max items-center gap-1 px-4 py-2">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={item.onClick}
              aria-current={item.active ? 'page' : undefined}
              className={`whitespace-nowrap px-3 py-1.5 text-body-sm font-medium ${UI_RADIUS.control} ${UI_INTERACTION.fastTransition} ${
                item.active ? 'bg-ink text-canvas' : 'text-muted hover:bg-surface-card hover:text-ink'
              }`}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && pnpm tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/scene/SubNav.tsx
git commit -m "feat(scene): SubNav horizontal sticky tab bar"
```

---

## Task 9: `PaginatedList` component

**Files:**
- Create: `frontend/src/components/scene/PaginatedList.tsx`

- [ ] **Step 1: Implement**

```tsx
import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { UI_INTERACTION, UI_RADIUS } from '../ui';

interface PaginatedListProps<T> {
  items: readonly T[];
  pageSize: number;
  page: number;
  onPageChange: (page: number) => void;
  renderItem: (item: T, index: number) => ReactNode;
  emptyState?: ReactNode;
  className?: string;
}

export function PaginatedList<T>({
  items,
  pageSize,
  page,
  onPageChange,
  renderItem,
  emptyState,
  className = '',
}: PaginatedListProps<T>) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  const slice = items.slice(start, start + pageSize);

  if (items.length === 0) return <>{emptyState}</>;

  const goPrev = () => safePage > 1 && onPageChange(safePage - 1);
  const goNext = () => safePage < totalPages && onPageChange(safePage + 1);

  const btnBase = `inline-flex items-center gap-1 px-3 py-2 ${UI_RADIUS.control} text-body-sm font-medium ${UI_INTERACTION.fastTransition}`;

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      <ul className="flex flex-col gap-2">
        {slice.map((item, i) => (
          <li key={start + i}>{renderItem(item, start + i)}</li>
        ))}
      </ul>
      <nav aria-label="Paginazione" className="flex items-center justify-between gap-2 text-muted">
        <button
          type="button"
          onClick={goPrev}
          disabled={safePage === 1}
          className={`${btnBase} ${safePage === 1 ? 'opacity-40' : 'hover:bg-surface-card hover:text-ink'}`}
        >
          <ChevronLeft size={16} /> Precedente
        </button>
        <span className="text-body-sm">
          Pagina {safePage} di {totalPages}
        </span>
        <button
          type="button"
          onClick={goNext}
          disabled={safePage === totalPages}
          className={`${btnBase} ${safePage === totalPages ? 'opacity-40' : 'hover:bg-surface-card hover:text-ink'}`}
        >
          Successiva <ChevronRight size={16} />
        </button>
      </nav>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && pnpm tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/scene/PaginatedList.tsx
git commit -m "feat(scene): PaginatedList URL-driven pagination component"
```

---

## Task 10: `StepFooter` component

**Files:**
- Create: `frontend/src/components/scene/StepFooter.tsx`

- [ ] **Step 1: Implement**

```tsx
import type { ReactNode } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button, UI_INTERACTION, UI_RADIUS } from '../ui';

interface StepFooterProps {
  back?: { label?: string; onClick: () => void };
  primary?: { label: string; onClick: () => void; disabled?: boolean; icon?: ReactNode };
  className?: string;
}

export function StepFooter({ back, primary, className = '' }: StepFooterProps) {
  return (
    <footer className={`mt-6 flex items-center justify-between gap-3 ${className}`}>
      {back ? (
        <button
          type="button"
          onClick={back.onClick}
          className={`inline-flex items-center gap-1 px-3 py-2 ${UI_RADIUS.control} text-body-sm font-medium text-muted ${UI_INTERACTION.fastTransition} hover:bg-surface-card hover:text-ink`}
        >
          <ArrowLeft size={16} /> {back.label ?? 'Indietro'}
        </button>
      ) : (
        <span />
      )}
      {primary && (
        <Button variant="primary" onClick={primary.onClick} disabled={primary.disabled}>
          <span className="inline-flex items-center gap-2">
            {primary.label}
            {primary.icon ?? <ArrowRight size={16} />}
          </span>
        </Button>
      )}
    </footer>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && pnpm tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/scene/StepFooter.tsx
git commit -m "feat(scene): StepFooter for sequential wizard navigation"
```

---

## Task 11: Barrel export

**Files:**
- Create: `frontend/src/components/scene/index.ts`

- [ ] **Step 1: Implement**

```ts
export { SceneShell } from './SceneShell';
export { SceneHeader } from './SceneHeader';
export { ExplainerSheet } from './ExplainerSheet';
export { BottomNav, matchSection } from './BottomNav';
export { AppHeaderMenu } from './AppHeaderMenu';
export { HubGrid } from './HubGrid';
export type { HubGridItem } from './HubGrid';
export { SubNav } from './SubNav';
export type { SubNavItem } from './SubNav';
export { PaginatedList } from './PaginatedList';
export { StepFooter } from './StepFooter';
export {
  isExplainerDismissed,
  markExplainerDismissed,
  explainerKey,
} from './explainerStorage';
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && pnpm tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/scene/index.ts
git commit -m "feat(scene): barrel export for scene primitives"
```

---

## Task 12: Wire `App.tsx` to new BottomNav + remove inline chrome cluster

Sostituisci la `<nav>` corrente e il cluster `Tester/Sviluppatore/Online/ThemeToggle` in `frontend/src/App.tsx` con `<BottomNav>` e nessun cluster top-right inline. Il kebab vivrà dentro `<SceneShell>` (Task 6) ma `App.tsx` non lo monta direttamente — sono le scene a farlo, una alla volta nelle fasi F2-F5. In F1 dobbiamo però mantenere la funzionalità chrome esistente per le route non ancora migrate.

**Soluzione minimale F1**: aggiungiamo un fallback `<AppHeaderMenu>` mostrato solo quando la route non usa `<SceneShell>`. Per ora TUTTE le route non lo usano (verrà cambiato dalla F2 in poi). Quindi in F1 il kebab compare globalmente; nelle fasi successive le scene che usano SceneShell hanno il loro kebab interno e il global viene nascosto.

Approccio: aggiungiamo una variabile context-like `useSceneShellMounted`. Più semplicemente, in F1 lasciamo `AppHeaderMenu` nel `App.tsx` come unico chrome top-right. Quando le scene F2+ usano SceneShell, il kebab del SceneShell sovrascrive il global (z-index più alto e position absolute dentro lo shell). Le due varianti non si interferiscono perché lo SceneShell ne contiene una propria e quella globale resta dietro.

In pratica per F1: rimuovi tutto il cluster top-right corrente (FeedbackButton/Developer/Online/ThemeToggle) e aggiungi un singolo `<AppHeaderMenu>` fisso top-right come oggi.

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Read current `App.tsx`**

Run: `wc -l frontend/src/App.tsx`
Expected: ~216 lines. Note the current structure: `<AppChrome>` renders bottom nav + top-right cluster.

- [ ] **Step 2: Replace the top-right cluster and bottom nav**

Edit `frontend/src/App.tsx`. The new `AppChrome` body:

```tsx
function AppChrome({ route, navigateTo, productNavigationHidden }: AppChromeProps) {
  const pathname = window.location.pathname;
  return (
    <>
      {!productNavigationHidden && <BottomNav pathname={pathname} onNavigate={navigateTo} />}
      <div className="fixed right-3 top-3 z-[70] flex items-center gap-2 sm:right-4 sm:top-4">
        <AppHeaderMenu onNavigate={navigateTo} />
      </div>
    </>
  );
}
```

Imports da aggiungere in cima al file:

```tsx
import { AppHeaderMenu, BottomNav } from './components/scene';
```

Imports da rimuovere (non più usati direttamente):
- `Code2, Compass, Home, Sparkles` (lucide-react)
- `ThemeToggle`
- `UI_INTERACTION, UI_RADIUS` (rimangono se altrove serviti — lascia se referenziati)
- `FeedbackButton`
- `APP_MODE, SHOW_DEVELOPER_TOOLS`
- Tutti i tipi/interfacce locali non più usati (`ProductNavItem`, vecchio array `navItems`)

Mantieni: `BookOpen` etc. NO — non più usati nel file. Verifica con tsc dopo.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd frontend && pnpm tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Smoke test app loads**

Run: `cd frontend && curl -sf http://localhost:5174/ -o /dev/null && echo OK`
Expected: `OK`.

- [ ] **Step 5: Visual check**

Take a screenshot with Playwright @ 390×844 and inspect that:
- Bottom nav still shows 4 voices
- Top-right shows a single kebab `⋮` icon
- Click on kebab opens a menu with Tester feedback, Sviluppatore (if dev), Tema, Stato

```bash
node /tmp/audit-mobile.mjs 2>&1 | tail -3
```

Open `/tmp/audit-mobile/00-path.png`, `/tmp/audit-mobile/01-learn.png`. Verify visually.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "refactor(app): consolidate top-right chrome into kebab menu"
```

---

## Task 13: Apply global mobile frame to root

**Files:**
- Modify: `frontend/src/App.tsx` (root div)

In F1 il `min-h-screen bg-canvas pb-24` root resta. Il frame mobile (`max-w-[480px]`) sarà applicato a livello di OGNI scena (via `SceneShell`) nelle fasi successive, e nelle scene non ancora migrate il body resta `mx-auto max-w-3xl` come oggi. Per evitare regressioni in F1, NON cambiare il root.

(Questo task è no-op intenzionale — è qui per documentare la decisione.)

- [ ] **Step 1: Verify root remains unchanged**

Run: `grep -n 'min-h-screen bg-canvas' frontend/src/App.tsx`
Expected: una sola riga con la classe corrente.

---

## Task 14: Add ASCII smoke test note

**Files:**
- Modify: `docs/superpowers/plans/2026-05-11-mobile-scene-split-f1-shell.md` (this file, append checklist)

- [ ] **Step 1: Manual smoke checklist**

Apri l'app a `http://localhost:5174/` su browser mobile (DevTools 390×844):
- [ ] Bottom nav presente con 4 voci, l'attiva è in nero
- [ ] Top-right: un solo bottone kebab
- [ ] Apri kebab: vedi Tester / Sviluppatore (se attivo) / Tema / Stato
- [ ] Tester apre il modal feedback (test invio)
- [ ] Sviluppatore navigate to `/developer`
- [ ] Tema toggle funziona
- [ ] Naviga in `/learn` → la nav bar segna "Learn"
- [ ] Naviga in `/library` → la nav bar segna "Review"
- [ ] Naviga in `/grammar/graph` → la nav bar segna "Explore"

---

## Self-Review

### Spec coverage

- §A Mobile shell (3 strati) — top bar consolidato (Task 5/6/12), bottom-nav (Task 4/12). Body: il root non cambia in F1, è documentato come deliberato (Task 13). ✓
- §B Anatomia scena — SceneHeader (Task 3) + ExplainerSheet (Task 2) + helper (Task 1) implementano eyebrow/title/subline/chip. ✓
- §C Route map — F1 non aggiunge route, solo primitive. F2-F5 le aggiungono. ✓
- §D Componenti — tutte 8 primitive coperte (Task 1-10, 1 helper + 8 component + barrel). ✓
- §F Testing — smoke checklist Task 14, screenshot Task 12 step 5. ✓

### Placeholder scan

Niente "TBD"/"TODO"/"add validation". Step 5 di Task 12 punta a uno script `/tmp/audit-mobile.mjs` esistente (creato durante l'audit). Confermato che esiste. ✓

### Type consistency

- `HubGridItem.id`: string in tutte le task (T7 ↔ futuri consumer F2/F3/F5).
- `SubNavItem.active`: boolean, coerente con SubNav.
- `BottomNav.pathname`: string, passato sempre da `window.location.pathname` in App.tsx.
- `SceneShell.onNavigate`: `(path: string) => void`, allineato con `App.tsx` `navigateTo`.

✓ Nessuna inconsistenza.

---

**Ready for execution via subagent-driven-development.**
