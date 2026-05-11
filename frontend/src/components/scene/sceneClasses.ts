import { UI_INTERACTION, UI_RADIUS } from '../ui';

/** Shared class for circular icon buttons (back, close, kebab). */
export function iconButtonClass(size: 9 | 10 = 9) {
  const dim = size === 10 ? 'h-10 w-10' : 'h-9 w-9';
  return `inline-flex ${dim} items-center justify-center ${UI_RADIUS.control} text-ink ${UI_INTERACTION.fastTransition} hover:bg-surface-card`;
}

/** Sticky semi-translucent top bar used in SceneShell and SubNav. */
export const STICKY_BAR_CLASS =
  'sticky z-[63] -mx-4 border-b border-hairline bg-canvas/95 backdrop-blur-sm';

/** Clickable card row (left-aligned content, chevron-friendly trailing slot, hover). */
export const SURFACE_CARD_CLASS = `flex w-full items-start gap-3 ${UI_RADIUS.surface} border border-hairline bg-canvas p-4 text-left ${UI_INTERACTION.transition} hover:bg-surface-card`;

/** Compact uppercase eyebrow text used above titles. */
export const EYEBROW_CLASS = 'text-caption-uppercase font-medium uppercase tracking-[1.5px]';
