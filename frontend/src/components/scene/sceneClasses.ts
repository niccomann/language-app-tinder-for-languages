import { UI_INTERACTION, UI_RADIUS } from '../ui';

/** Shared class for circular icon buttons (back, close, kebab). */
export function iconButtonClass(size: 9 | 10 = 9) {
  const dim = size === 10 ? 'h-10 w-10' : 'h-9 w-9';
  return `inline-flex ${dim} items-center justify-center ${UI_RADIUS.control} text-ink ${UI_INTERACTION.fastTransition} hover:bg-surface-card`;
}

/** Sticky semi-translucent top bar used in SceneShell and SubNav. */
export const STICKY_BAR_CLASS =
  'sticky z-[63] -mx-4 border-b border-hairline bg-canvas/95 backdrop-blur-sm';
