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
    'inline-flex items-center px-3 py-1 rounded-full text-caption font-sans font-medium bg-success text-on-primary',
  error:
    'inline-flex items-center px-3 py-1 rounded-full text-caption font-sans font-medium bg-error text-on-primary',
};

export function Badge({ variant = 'pill', className = '', children, ...rest }: BadgeProps) {
  const cls = `${baseByVariant[variant]} ${className}`.trim();
  return (
    <span {...rest} className={cls}>
      {children}
    </span>
  );
}
