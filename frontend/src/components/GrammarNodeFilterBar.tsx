/**
 * GrammarNodeFilterBar - Barra filtri per nodi grammaticali
 *
 * Componente UI per filtrare i nodi grammaticali per CEFR, gender, frequency, etc.
 * Da usare in FunSentenceBuilder e SentenceBuilder.
 */
import { X } from 'lucide-react';
import type { GrammarFilterCriteria, GrammarFilterConfig } from '../hooks/useGrammarNodeFilters';
import { formatFilterLabel } from '../hooks/useGrammarNodeFilters';
import { FilterSelect, UI_RADIUS } from './ui';

export interface GrammarNodeFilterBarProps {
  configs: GrammarFilterConfig[];
  activeCriteria: GrammarFilterCriteria;
  onCriteriaChange: (criteria: GrammarFilterCriteria) => void;
  availableOptions: string[];
  activeFilterValue: string | null;
  onFilterValueChange: (value: string | null) => void;
  hasActiveFilter: boolean;
  onClearFilters: () => void;
  filteredCount: number;
  totalCount: number;
  compact?: boolean;
}

export function GrammarNodeFilterBar({
  configs,
  activeCriteria,
  onCriteriaChange,
  availableOptions,
  activeFilterValue,
  onFilterValueChange,
  hasActiveFilter,
  onClearFilters,
  filteredCount,
  totalCount,
  compact = false,
}: GrammarNodeFilterBarProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <FilterSelect
          ariaLabel="Grammar filter criteria"
          value={activeCriteria}
          onChange={(value) => onCriteriaChange(value as GrammarFilterCriteria)}
          size="sm"
        >
          {configs.map((config) => (
            <option key={config.id} value={config.id}>
              {config.label}
            </option>
          ))}
        </FilterSelect>

        {activeCriteria !== 'all' && availableOptions.length > 0 && (
          <FilterSelect
            ariaLabel="Grammar filter value"
            value={activeFilterValue || ''}
            onChange={(value) => onFilterValueChange(value || null)}
            size="sm"
          >
            <option value="">Select...</option>
            {availableOptions.map((option) => (
              <option key={option} value={option}>
                {formatFilterLabel(activeCriteria, option)}
              </option>
            ))}
          </FilterSelect>
        )}

        {hasActiveFilter && (
          <button
            onClick={onClearFilters}
            className={`p-1 ${UI_RADIUS.control} transition-all hover:bg-surface-card text-muted`}
            title="Rimuovi filtro"
          >
            <X size={14} />
          </button>
        )}

        <span className="text-xs text-muted">
          {filteredCount}/{totalCount}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-2 p-2 ${UI_RADIUS.control} bg-surface-soft`}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-muted">
          Filtra per:
        </span>

        {configs.map((config) => {
          const Icon = config.icon;
          const isActive = activeCriteria === config.id;

          return (
            <button
              key={config.id}
              onClick={() => onCriteriaChange(config.id)}
              title={config.description}
              className={`
                flex items-center gap-1.5 px-2.5 py-1 ${UI_RADIUS.pill} text-xs font-medium
                transition-all duration-200
                ${isActive
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-card text-body hover:bg-surface-cream-strong'
                }
              `}
            >
              <Icon size={12} />
              <span>{config.label}</span>
            </button>
          );
        })}
      </div>

      {activeCriteria !== 'all' && availableOptions.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted">
            Valore:
          </span>

          {availableOptions.map((option) => {
            const isSelected = activeFilterValue === option;

            return (
              <button
                key={option}
                onClick={() => onFilterValueChange(isSelected ? null : option)}
                className={`
                  px-2 py-0.5 ${UI_RADIUS.pill} text-xs font-medium transition-all
                  ${isSelected
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-card text-body hover:bg-surface-cream-strong'
                  }
                `}
              >
                {formatFilterLabel(activeCriteria, option)}
              </button>
            );
          })}
        </div>
      )}

      {hasActiveFilter && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-primary">
            Mostrando {filteredCount} di {totalCount} nodi
          </span>
          <button
            onClick={onClearFilters}
            className={`
              flex items-center gap-1 px-2 py-0.5 ${UI_RADIUS.control} text-xs transition-all
              text-muted hover:text-ink hover:bg-surface-card
            `}
          >
            <X size={12} />
            Rimuovi filtro
          </button>
        </div>
      )}
    </div>
  );
}
