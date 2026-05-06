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
}

export function GrammarBuilderFrame({
  nodes,
  selectedNodeIds = [],
  onWordClick,
  actionLabel,
  children,
  contentClassName = '',
}: GrammarBuilderFrameProps) {
  const { isDark } = useTheme();

  return (
    <div className={`h-full min-h-0 overflow-y-auto p-3 transition-colors duration-300 sm:p-4 ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <div className="mx-auto flex min-h-0 max-w-7xl flex-col gap-4">
        <GrammarWordBank
          nodes={nodes}
          selectedNodeIds={selectedNodeIds}
          onNodeClick={onWordClick}
          actionLabel={actionLabel}
          className="shrink-0"
        />
        <div className={`min-h-0 ${contentClassName}`}>
          {children}
        </div>
      </div>
    </div>
  );
}
