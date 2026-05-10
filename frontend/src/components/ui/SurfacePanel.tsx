import type { ReactNode } from 'react';
import { UI_RADIUS } from './geometry';

interface SurfacePanelProps {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  tone?: 'default' | 'muted' | 'dark';
  variant?: 'canvas' | 'cream' | 'dark';
}

const paddingClasses = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

const toneClasses = {
  default: `border-hairline bg-canvas`,
  muted: `border-hairline bg-surface-card`,
  dark: `border-hairline bg-surface-dark text-on-dark`,
};

export function SurfacePanel({
  children,
  className = '',
  padding = 'md',
  tone = 'default',
  variant,
}: SurfacePanelProps) {
  // If `variant` is provided, it takes precedence over `tone`
  let surfaceClass: string;
  if (variant === 'cream') {
    surfaceClass = 'bg-surface-card p-8 rounded-lg';
  } else if (variant === 'dark') {
    surfaceClass = 'bg-surface-dark text-on-dark p-8 rounded-lg';
  } else {
    // variant === 'canvas' or not provided — use tone map
    surfaceClass = `${UI_RADIUS.surface} border ${toneClasses[tone]} ${paddingClasses[padding]}`;
  }

  return (
    <section className={`${surfaceClass} ${className}`.trim()}>
      {children}
    </section>
  );
}
