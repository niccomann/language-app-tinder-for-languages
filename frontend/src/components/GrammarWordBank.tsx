import { useMemo } from 'react';
import { Check, Plus } from 'lucide-react';
import type { GrammarNode } from '../types';
import { useGrammarNodeFilters } from '../hooks/useGrammarNodeFilters';
import { getNodeColor, getNodeLabel } from '../utils/grammarColors';
import { GrammarNodeFilterBar } from './GrammarNodeFilterBar';
import { SurfacePanel, UI_RADIUS, UI_SIZE } from './ui';

interface GrammarWordBankProps {
  nodes: GrammarNode[];
  selectedNodeIds?: string[];
  onNodeClick: (node: GrammarNode) => void;
  className?: string;
  actionLabel?: string;
  layout?: 'contained' | 'full';
}

interface GrammarWordGroup {
  id: string;
  title: string;
  matcher: (node: GrammarNode) => boolean;
  panelClass: string;
  titleClass: string;
  countClass: string;
  selectedClass: string;
  idleClass: string;
}

const NOUN_NODE_TYPES = ['subject', 'object', 'direct_object', 'indirect_object'];

const WORD_GROUPS: GrammarWordGroup[] = [
  {
    id: 'nouns',
    title: 'Nouns',
    matcher: (node) => node.part_of_speech === 'noun' || NOUN_NODE_TYPES.includes(node.type),
    panelClass: 'border-hairline bg-surface-card',
    titleClass: 'text-primary',
    countClass: 'text-primary',
    selectedClass: 'border-primary bg-surface-card',
    idleClass: 'border-hairline bg-canvas',
  },
  {
    id: 'verbs',
    title: 'Verbs',
    matcher: (node) => node.type === 'predicate' || node.part_of_speech === 'verb',
    panelClass: 'border-hairline bg-surface-card',
    titleClass: 'text-error',
    countClass: 'text-error',
    selectedClass: 'border-error bg-error/10',
    idleClass: 'border-hairline bg-canvas',
  },
  {
    id: 'pronouns',
    title: 'Pronouns',
    matcher: (node) => node.type === 'pronoun' || node.part_of_speech === 'pronoun',
    panelClass: 'border-hairline bg-surface-card',
    titleClass: 'text-primary',
    countClass: 'text-primary',
    selectedClass: 'border-primary bg-surface-card',
    idleClass: 'border-hairline bg-canvas',
  },
  {
    id: 'adjectives',
    title: 'Adjectives',
    matcher: (node) => node.type === 'adjective' || node.part_of_speech === 'adjective',
    panelClass: 'border-hairline bg-surface-card',
    titleClass: 'text-accent-teal',
    countClass: 'text-accent-teal',
    selectedClass: 'border-accent-teal bg-accent-teal/10',
    idleClass: 'border-hairline bg-canvas',
  },
  {
    id: 'adverbs',
    title: 'Adverbs',
    matcher: (node) => node.type === 'adverb' || node.part_of_speech === 'adverb',
    panelClass: 'border-hairline bg-surface-card',
    titleClass: 'text-accent-teal',
    countClass: 'text-accent-teal',
    selectedClass: 'border-accent-teal bg-accent-teal/10',
    idleClass: 'border-hairline bg-canvas',
  },
  {
    id: 'prepositions',
    title: 'Prepositions',
    matcher: (node) => node.type === 'preposition' || node.part_of_speech === 'preposition',
    panelClass: 'border-hairline bg-surface-card',
    titleClass: 'text-success',
    countClass: 'text-success',
    selectedClass: 'border-success bg-success/10',
    idleClass: 'border-hairline bg-canvas',
  },
  {
    id: 'articles',
    title: 'Articles',
    matcher: (node) => node.type === 'article' || node.part_of_speech === 'article',
    panelClass: 'border-hairline bg-surface-card',
    titleClass: 'text-accent-amber',
    countClass: 'text-accent-amber',
    selectedClass: 'border-accent-amber bg-accent-amber/10',
    idleClass: 'border-hairline bg-canvas',
  },
  {
    id: 'conjunctions',
    title: 'Conjunctions',
    matcher: (node) => node.type === 'conjunction' || node.part_of_speech === 'conjunction',
    panelClass: 'border-hairline bg-surface-card',
    titleClass: 'text-accent-teal',
    countClass: 'text-accent-teal',
    selectedClass: 'border-accent-teal bg-accent-teal/10',
    idleClass: 'border-hairline bg-canvas',
  },
];

export function GrammarWordBank({
  nodes,
  selectedNodeIds = [],
  onNodeClick,
  className = '',
  actionLabel = 'Add word',
  layout = 'contained',
}: GrammarWordBankProps) {
  const isFullLayout = layout === 'full';
  const selectedIds = useMemo(() => new Set(selectedNodeIds), [selectedNodeIds]);
  const {
    activeCriteria,
    setActiveCriteria,
    activeFilterValue,
    setActiveFilterValue,
    availableConfigs,
    availableOptions,
    filteredNodes,
    hasActiveFilter,
    clearFilters,
  } = useGrammarNodeFilters({ nodes });

  const wordGroups = useMemo(() => {
    return WORD_GROUPS.map((group) => ({
      ...group,
      nodes: filteredNodes.filter(group.matcher),
    }));
  }, [filteredNodes]);

  return (
    <SurfacePanel className={`transition-colors duration-300 ${className}`} padding="sm">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-ink">
            Word Bank
          </h2>
          <p className="text-sm text-muted">
            Choose the words for the sentence.
          </p>
        </div>
        <span className={`px-3 py-1 text-xs font-semibold text-muted bg-surface-card ${UI_RADIUS.pill}`}>
          {filteredNodes.length}/{nodes.length} words
        </span>
      </div>

      <GrammarNodeFilterBar
        configs={availableConfigs}
        activeCriteria={activeCriteria}
        onCriteriaChange={setActiveCriteria}
        availableOptions={availableOptions}
        activeFilterValue={activeFilterValue}
        onFilterValueChange={setActiveFilterValue}
        hasActiveFilter={hasActiveFilter}
        onClearFilters={clearFilters}
        filteredCount={filteredNodes.length}
        totalCount={nodes.length}
      />

      <div className={`mt-3 grid gap-2 ${
        isFullLayout
          ? 'md:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-8'
          : 'md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8'
      }`}>
        {wordGroups.map((group) => (
          <div key={group.id} className={`${UI_RADIUS.control} border p-2 ${group.panelClass}`}>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <h3 className={`text-sm font-semibold ${group.titleClass}`}>{group.title}</h3>
              <span className={`bg-canvas px-2 py-0.5 text-xs font-semibold ${UI_RADIUS.pill} ${group.countClass}`}>
                {group.nodes.length}
              </span>
            </div>
            <div className={`flex flex-col gap-1.5 overflow-y-auto pr-1 ${
              isFullLayout ? 'max-h-44 xl:max-h-52' : 'max-h-28'
            }`}>
              {group.nodes.map((node) => {
                const isSelected = selectedIds.has(node.id);
                const nodeTypeLabel = getNodeLabel(node.type);
                const detailBits = [
                  node.lemma && node.lemma !== node.label ? node.lemma : null,
                  node.meta?.case,
                  node.meta?.number,
                  node.meta?.pronoun,
                  node.meta?.tense,
                ]
                  .filter((value): value is string => Boolean(value));
                const detailLabel = detailBits.length > 0
                  ? `${nodeTypeLabel} - ${detailBits.join(' - ')}`
                  : nodeTypeLabel;
                return (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => onNodeClick(node)}
                    aria-label={`${actionLabel}: ${node.label}`}
                    className={`flex min-h-10 w-full min-w-0 items-center gap-2 border px-2.5 py-1.5 text-left text-xs transition-all ${UI_RADIUS.control} ${
                      isSelected ? group.selectedClass : group.idleClass
                    }`}
                  >
                    {node.image_base64 ? (
                      <img
                        src={`data:image/jpeg;base64,${node.image_base64}`}
                        alt={node.label}
                        className={`${UI_SIZE.nodeImage} ${UI_RADIUS.pill} object-cover`}
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        className={`${UI_SIZE.nodeImage} ${UI_RADIUS.pill} shrink-0`}
                        style={{ backgroundColor: getNodeColor(node.type) }}
                      />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className={`block font-medium leading-tight text-ink ${isFullLayout ? 'break-words' : 'truncate'}`}>
                        {node.label}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {detailLabel}
                      </span>
                    </span>
                    <span className={`ml-auto flex h-5 w-5 shrink-0 items-center justify-center ${UI_RADIUS.touchIcon} ${
                      isSelected
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-card text-muted'
                    }`}>
                      {isSelected ? <Check size={14} /> : <Plus size={14} />}
                    </span>
                  </button>
                );
              })}
              {group.nodes.length === 0 && (
                <p className="text-sm text-muted">
                  No words for this filter.
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </SurfacePanel>
  );
}
