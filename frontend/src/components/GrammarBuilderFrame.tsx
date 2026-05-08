import type { ReactNode } from 'react';
import type { GrammarNode } from '../types';
import { useTheme } from '../contexts/useTheme';
import { GrammarWordBank } from './GrammarWordBank';

interface GrammarBuilderFrameProps {
  nodes: GrammarNode[];
  selectedNodeIds?: string[];
  onWordClick: (node: GrammarNode) => void;
  actionLabel: string;
  children: ReactNode;
  contentClassName?: string;
  layout?: 'contained' | 'full';
}

export function GrammarBuilderFrame({
  nodes,
  selectedNodeIds = [],
  onWordClick,
  actionLabel,
  children,
  contentClassName = '',
  layout = 'contained',
}: GrammarBuilderFrameProps) {
  const { isDark } = useTheme();
  const isFullLayout = layout === 'full';

  return (
    <div
      data-testid="grammar-builder-frame"
      className={`h-full min-h-0 overflow-y-auto transition-colors duration-300 ${
        isFullLayout ? 'px-0 py-2 sm:px-1' : 'p-3 sm:p-4'
      } ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}
    >
      <div className={`mx-auto flex min-h-0 flex-col gap-4 ${isFullLayout ? 'w-full max-w-none' : 'max-w-7xl'}`}>
        <GrammarWordBank
          nodes={nodes}
          selectedNodeIds={selectedNodeIds}
          onNodeClick={onWordClick}
          actionLabel={actionLabel}
          className="shrink-0"
          layout={layout}
        />
        <div className={`min-h-0 ${contentClassName}`}>
          {children}
        </div>
      </div>
    </div>
  );
}
