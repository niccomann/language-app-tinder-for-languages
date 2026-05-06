import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { UI_ELEVATION, UI_RADIUS } from './geometry';

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
            className={`p-3 bg-white ${UI_RADIUS.touchIcon} ${UI_ELEVATION.raised} hover:shadow-lg transition-all hover:scale-[1.02]`}
          >
            <ArrowLeft size={24} className="text-gray-700" />
          </button>
        )}
        <div>
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
            {icon}
            {title}
          </h1>
          {subtitle && <p className="text-gray-600 mt-1">{subtitle}</p>}
        </div>
      </div>
      {rightContent}
    </div>
  );
}
