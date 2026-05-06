import type { ReactNode } from 'react';
import { UI_RADIUS } from './geometry';

interface FilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  ariaLabel?: string;
  className?: string;
  size?: 'sm' | 'md';
}

const sizeClasses = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-2 text-sm',
};

export function FilterSelect({
  value,
  onChange,
  children,
  ariaLabel,
  className = '',
  size = 'md',
}: FilterSelectProps) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={`${sizeClasses[size]} ${UI_RADIUS.control} cursor-pointer border-2 border-gray-200 bg-white font-medium text-gray-800 transition-colors focus:border-indigo-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white ${className}`}
    >
      {children}
    </select>
  );
}
