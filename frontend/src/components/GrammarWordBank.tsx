import { useMemo } from 'react';
import { Check, Plus } from 'lucide-react';
import type { GrammarNode } from '../types';
import { useTheme } from '../contexts/useTheme';
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
    panelClass: 'border-blue-100 bg-blue-50/70 dark:border-blue-900/50 dark:bg-blue-950/20',
    titleClass: 'text-blue-700 dark:text-blue-300',
    countClass: 'text-blue-700 dark:text-blue-300',
    selectedClass: 'border-blue-500 bg-white ring-2 ring-blue-200 dark:bg-slate-900 dark:ring-blue-900/70',
    idleClass: 'border-blue-100 bg-white hover:border-blue-300 hover:bg-blue-50 dark:border-blue-900/50 dark:bg-slate-900 dark:hover:bg-blue-950/40',
  },
  {
    id: 'verbs',
    title: 'Verbs',
    matcher: (node) => node.type === 'predicate' || node.part_of_speech === 'verb',
    panelClass: 'border-red-100 bg-red-50/70 dark:border-red-900/50 dark:bg-red-950/20',
    titleClass: 'text-red-700 dark:text-red-300',
    countClass: 'text-red-700 dark:text-red-300',
    selectedClass: 'border-red-500 bg-white ring-2 ring-red-200 dark:bg-slate-900 dark:ring-red-900/70',
    idleClass: 'border-red-100 bg-white hover:border-red-300 hover:bg-red-50 dark:border-red-900/50 dark:bg-slate-900 dark:hover:bg-red-950/40',
  },
  {
    id: 'pronouns',
    title: 'Pronouns',
    matcher: (node) => node.type === 'pronoun' || node.part_of_speech === 'pronoun',
    panelClass: 'border-pink-100 bg-pink-50/70 dark:border-pink-900/50 dark:bg-pink-950/20',
    titleClass: 'text-pink-700 dark:text-pink-300',
    countClass: 'text-pink-700 dark:text-pink-300',
    selectedClass: 'border-pink-500 bg-white ring-2 ring-pink-200 dark:bg-slate-900 dark:ring-pink-900/70',
    idleClass: 'border-pink-100 bg-white hover:border-pink-300 hover:bg-pink-50 dark:border-pink-900/50 dark:bg-slate-900 dark:hover:bg-pink-950/40',
  },
  {
    id: 'adjectives',
    title: 'Adjectives',
    matcher: (node) => node.type === 'adjective' || node.part_of_speech === 'adjective',
    panelClass: 'border-violet-100 bg-violet-50/70 dark:border-violet-900/50 dark:bg-violet-950/20',
    titleClass: 'text-violet-700 dark:text-violet-300',
    countClass: 'text-violet-700 dark:text-violet-300',
    selectedClass: 'border-violet-500 bg-white ring-2 ring-violet-200 dark:bg-slate-900 dark:ring-violet-900/70',
    idleClass: 'border-violet-100 bg-white hover:border-violet-300 hover:bg-violet-50 dark:border-violet-900/50 dark:bg-slate-900 dark:hover:bg-violet-950/40',
  },
  {
    id: 'adverbs',
    title: 'Adverbs',
    matcher: (node) => node.type === 'adverb' || node.part_of_speech === 'adverb',
    panelClass: 'border-cyan-100 bg-cyan-50/70 dark:border-cyan-900/50 dark:bg-cyan-950/20',
    titleClass: 'text-cyan-700 dark:text-cyan-300',
    countClass: 'text-cyan-700 dark:text-cyan-300',
    selectedClass: 'border-cyan-500 bg-white ring-2 ring-cyan-200 dark:bg-slate-900 dark:ring-cyan-900/70',
    idleClass: 'border-cyan-100 bg-white hover:border-cyan-300 hover:bg-cyan-50 dark:border-cyan-900/50 dark:bg-slate-900 dark:hover:bg-cyan-950/40',
  },
  {
    id: 'prepositions',
    title: 'Prepositions',
    matcher: (node) => node.type === 'preposition' || node.part_of_speech === 'preposition',
    panelClass: 'border-green-100 bg-green-50/70 dark:border-green-900/50 dark:bg-green-950/20',
    titleClass: 'text-green-700 dark:text-green-300',
    countClass: 'text-green-700 dark:text-green-300',
    selectedClass: 'border-green-500 bg-white ring-2 ring-green-200 dark:bg-slate-900 dark:ring-green-900/70',
    idleClass: 'border-green-100 bg-white hover:border-green-300 hover:bg-green-50 dark:border-green-900/50 dark:bg-slate-900 dark:hover:bg-green-950/40',
  },
  {
    id: 'articles',
    title: 'Articles',
    matcher: (node) => node.type === 'article' || node.part_of_speech === 'article',
    panelClass: 'border-orange-100 bg-orange-50/70 dark:border-orange-900/50 dark:bg-orange-950/20',
    titleClass: 'text-orange-700 dark:text-orange-300',
    countClass: 'text-orange-700 dark:text-orange-300',
    selectedClass: 'border-orange-500 bg-white ring-2 ring-orange-200 dark:bg-slate-900 dark:ring-orange-900/70',
    idleClass: 'border-orange-100 bg-white hover:border-orange-300 hover:bg-orange-50 dark:border-orange-900/50 dark:bg-slate-900 dark:hover:bg-orange-950/40',
  },
  {
    id: 'conjunctions',
    title: 'Conjunctions',
    matcher: (node) => node.type === 'conjunction' || node.part_of_speech === 'conjunction',
    panelClass: 'border-teal-100 bg-teal-50/70 dark:border-teal-900/50 dark:bg-teal-950/20',
    titleClass: 'text-teal-700 dark:text-teal-300',
    countClass: 'text-teal-700 dark:text-teal-300',
    selectedClass: 'border-teal-500 bg-white ring-2 ring-teal-200 dark:bg-slate-900 dark:ring-teal-900/70',
    idleClass: 'border-teal-100 bg-white hover:border-teal-300 hover:bg-teal-50 dark:border-teal-900/50 dark:bg-slate-900 dark:hover:bg-teal-950/40',
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
  const { isDark } = useTheme();
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
          <h2 className={`text-lg font-semibold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
            Word Bank
          </h2>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Choose the words for the sentence.
          </p>
        </div>
        <span className={`px-3 py-1 text-xs font-semibold ${UI_RADIUS.pill} ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
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
              <span className={`bg-white px-2 py-0.5 text-xs font-bold dark:bg-slate-900 ${UI_RADIUS.pill} ${group.countClass}`}>
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
                      <span className={`block font-medium leading-tight ${isFullLayout ? 'break-words' : 'truncate'} ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                        {node.label}
                      </span>
                      <span className={`block truncate text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {detailLabel}
                      </span>
                    </span>
                    <span className={`ml-auto flex h-5 w-5 shrink-0 items-center justify-center ${UI_RADIUS.touchIcon} ${
                      isSelected
                        ? isDark ? 'bg-slate-700 text-slate-100' : 'bg-slate-900 text-white'
                        : isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {isSelected ? <Check size={14} /> : <Plus size={14} />}
                    </span>
                  </button>
                );
              })}
              {group.nodes.length === 0 && (
                <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
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
