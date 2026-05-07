import type { ReactNode } from 'react';
import { UI_ELEVATION, UI_INTERACTION, UI_RADIUS } from './geometry';

type ColorVariant = 'indigo' | 'purple' | 'blue' | 'green' | 'red' | 'gray';

interface NavButtonProps {
  onClick: () => void;
  icon: ReactNode;
  label: string;
  color?: ColorVariant;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

const colorStyles: Record<ColorVariant, string> = {
  indigo: 'text-indigo-600 border-indigo-300 hover:from-indigo-600 hover:to-purple-600',
  purple: 'text-purple-600 border-purple-300 hover:from-purple-600 hover:to-pink-600',
  blue: 'text-blue-600 border-blue-300 hover:from-blue-600 hover:to-cyan-600',
  green: 'text-green-600 border-green-300 hover:from-green-600 hover:to-teal-600',
  red: 'text-red-600 border-red-300 hover:from-red-600 hover:to-pink-600',
  gray: 'text-gray-600 border-gray-300 hover:from-gray-600 hover:to-slate-600',
};

const sizeStyles = {
  small: 'px-5 py-2.5 text-xs',
  medium: 'px-8 py-4 text-sm',
  large: 'px-12 py-5 text-base',
};

export function NavButton({ 
  onClick, 
  icon, 
  label, 
  color = 'indigo',
  size = 'medium',
  className = '',
}: NavButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`${sizeStyles[size]} font-bold ${colorStyles[color]} hover:text-white bg-white hover:bg-gradient-to-r border-2 hover:border-transparent ${UI_RADIUS.pill} ${UI_INTERACTION.transition} ${UI_ELEVATION.raised} ${UI_INTERACTION.raisedHover} ${UI_INTERACTION.lift} ${UI_INTERACTION.press} whitespace-nowrap min-w-fit ${className}`}
    >
      <span className="flex items-center gap-2">
        {icon}
        <span>{label}</span>
      </span>
    </button>
  );
}
