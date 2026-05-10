import type { ReactNode } from 'react';

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
  md: 'px-3.5 text-body-md h-10',
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
      className={`${sizeClasses[size]} rounded-md cursor-pointer border border-hairline bg-canvas font-medium text-ink transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 ${className}`}
    >
      {children}
    </select>
  );
}
