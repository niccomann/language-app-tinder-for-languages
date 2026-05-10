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
