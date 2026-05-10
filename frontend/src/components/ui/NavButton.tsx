import type { ReactNode } from 'react';
import { UI_INTERACTION } from './geometry';

type ColorVariant = 'indigo' | 'purple' | 'blue' | 'green' | 'red' | 'gray';

interface NavButtonProps {
  onClick: () => void;
  icon: ReactNode;
  label: string;
  color?: ColorVariant;
  size?: 'small' | 'medium' | 'large';
  isActive?: boolean;
  className?: string;
}

const sizeStyles = {
  small: 'px-5 py-2.5 text-xs',
  medium: 'px-8 py-4 text-sm',
  large: 'px-12 py-5 text-base',
};

export function NavButton({
  onClick,
  icon,
  label,
  color: _color = 'indigo',
  size = 'medium',
  isActive = false,
  className = '',
}: NavButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`${sizeStyles[size]} font-medium rounded-md ${UI_INTERACTION.transition} whitespace-nowrap min-w-fit ${
        isActive
          ? 'bg-ink text-canvas'
          : 'bg-transparent text-muted hover:bg-surface-card hover:text-ink'
      } ${className}`}
    >
      <span className="flex items-center gap-2">
        {icon}
        <span>{label}</span>
      </span>
    </button>
  );
}
