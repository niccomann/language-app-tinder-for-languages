import type { ReactNode } from 'react';
import type { GrammarNode } from '../types';
import { GrammarWordBank } from './GrammarWordBank';

interface GrammarBuilderFrameProps {
  nodes: GrammarNode[];
  selectedNodeIds?: string[];
  onWordClick: (node: GrammarNode) => void;
  actionLabel: string;
  children: ReactNode;
  contentClassName?: string;
  layout?: 'contained' | 'full';
  // When true the whole tool fits within one viewport: the word bank gets a
  // capped, internally-scrolling height and the content area (e.g. a canvas)
  // fills the rest — so it stays visible instead of being pushed far below a
  // tall word list. Opt-in, used by the graph canvas builder.
  fitViewport?: boolean;
}

export function GrammarBuilderFrame({
  nodes,
  selectedNodeIds = [],
  onWordClick,
  actionLabel,
  children,
  contentClassName = '',
  layout = 'contained',
  fitViewport = false,
}: GrammarBuilderFrameProps) {
  const isFullLayout = layout === 'full';

  return (
    <div
      data-testid="grammar-builder-frame"
      className={`min-h-0 transition-colors duration-300 ${
        fitViewport
          ? 'flex h-[calc(100dvh-9rem)] min-h-[30rem] flex-col overflow-hidden'
          : 'h-full overflow-y-auto'
      } ${isFullLayout ? 'px-0 py-2 sm:px-1' : 'p-3 sm:p-4'} bg-canvas`}
    >
      <div
        className={`mx-auto flex min-h-0 flex-col ${fitViewport ? 'h-full flex-1 gap-3' : 'gap-4'} ${
          isFullLayout ? 'w-full max-w-none' : 'max-w-7xl'
        }`}
      >
        <GrammarWordBank
          nodes={nodes}
          selectedNodeIds={selectedNodeIds}
          onNodeClick={onWordClick}
          actionLabel={actionLabel}
          className={`shrink-0 ${fitViewport ? 'max-h-[34vh] overflow-y-auto' : ''}`}
          layout={layout}
        />
        <div className={`min-h-0 ${fitViewport ? 'flex-1' : ''} ${contentClassName}`}>
          {children}
        </div>
      </div>
    </div>
  );
}
