import type { ReactNode } from 'react';
import { UI_INTERACTION, UI_SIZE } from './geometry';

interface StatCardProps {
  label: string;
  value: number;
  icon: ReactNode;
  color: 'muted' | 'success' | 'error' | 'teal' | 'coral' | 'coral-strong';
  isActive?: boolean;
  onClick?: () => void;
}

export function StatCard({ label, value, icon, color, isActive, onClick }: StatCardProps) {
  void color; // kept for API compatibility; styling is now token-based
  return (
    <div
      onClick={onClick}
      className={`h-full bg-surface-card rounded-lg p-6 border ${UI_INTERACTION.transition} ${
        onClick ? 'cursor-pointer' : ''
      } ${isActive ? 'border-primary ring-2 ring-primary/20' : 'border-hairline'}`}
    >
      <div className="flex h-full items-center justify-between">
        <div>
          <p className="text-caption-uppercase tracking-[1.5px] text-muted uppercase font-sans font-medium mb-1">{label}</p>
          <p className="font-display text-display-sm font-normal text-ink">
            {value}
          </p>
        </div>
        <div className={`${UI_SIZE.iconButton} bg-surface-soft rounded-full flex items-center justify-center text-muted`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
