import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { UI_RADIUS } from './geometry';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  onBack?: () => void;
  rightContent?: ReactNode;
}

export function PageHeader({ title, subtitle, icon, onBack, rightContent }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-4">
        {onBack && (
          <button
            onClick={onBack}
            className={`p-3 bg-canvas ${UI_RADIUS.touchIcon} border border-hairline hover:bg-surface-card transition-colors duration-150`}
          >
            <ArrowLeft size={24} className="text-body-strong" />
          </button>
        )}
        <div>
          <h1 className="font-display font-normal text-display-md tracking-[-0.5px] text-ink flex items-center gap-3">
            {icon}
            {title}
          </h1>
          {subtitle && <p className="font-sans text-body-md text-muted mt-1">{subtitle}</p>}
        </div>
      </div>
      {rightContent}
    </div>
  );
}
