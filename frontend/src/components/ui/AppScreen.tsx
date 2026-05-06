import type { ReactNode } from 'react';

interface AppScreenProps {
  children: ReactNode;
  mode?: 'page' | 'overlay';
  width?: 'compact' | 'wide' | 'full';
  scroll?: 'page' | 'none';
  className?: string;
  contentClassName?: string;
}

const widthClasses = {
  compact: 'mx-auto w-full max-w-md',
  wide: 'mx-auto w-full max-w-7xl',
  full: 'w-full',
};

export function AppScreen({
  children,
  mode = 'page',
  width = 'wide',
  scroll = 'page',
  className = '',
  contentClassName = '',
}: AppScreenProps) {
  const rootMode = mode === 'overlay' ? 'fixed inset-0 z-50' : 'min-h-dvh';
  const scrollClass = scroll === 'page' ? 'overflow-y-auto' : 'overflow-hidden';

  return (
    <div
      className={`${rootMode} ${scrollClass} bg-gradient-to-br from-indigo-50 via-white to-purple-50 transition-colors duration-300 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 ${className}`}
    >
      <div className={`${widthClasses[width]} ${contentClassName}`}>
        {children}
      </div>
    </div>
  );
}
