import type { ReactNode } from 'react';
import { UI_ELEVATION, UI_RADIUS } from './geometry';

interface SurfacePanelProps {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  tone?: 'default' | 'muted' | 'dark';
}

const paddingClasses = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

const toneClasses = {
  default: `border-slate-200 bg-white ${UI_ELEVATION.surface} dark:border-slate-700 dark:bg-slate-800`,
  muted: `border-slate-200 bg-slate-50 ${UI_ELEVATION.surface} dark:border-slate-700 dark:bg-slate-800/80`,
  dark: `border-slate-800 bg-slate-950 text-white ${UI_ELEVATION.floating} dark:border-slate-700 dark:bg-slate-900`,
};

export function SurfacePanel({
  children,
  className = '',
  padding = 'md',
  tone = 'default',
}: SurfacePanelProps) {
  return (
    <section className={`${UI_RADIUS.surface} border ${toneClasses[tone]} ${paddingClasses[padding]} ${className}`}>
      {children}
    </section>
  );
}
