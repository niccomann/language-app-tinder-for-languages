/**
 * GrammarNodeFilterBar - Barra filtri per nodi grammaticali
 * 
 * Componente UI per filtrare i nodi grammaticali per CEFR, gender, frequency, etc.
 * Da usare in FunSentenceBuilder e SentenceBuilder.
 */
import React from 'react';
import { X } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import type { GrammarFilterCriteria, GrammarFilterConfig } from '../hooks/useGrammarNodeFilters';
import { formatFilterLabel } from '../hooks/useGrammarNodeFilters';

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
  const { isDark } = useTheme();

  if (compact) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={activeCriteria}
          onChange={(e) => onCriteriaChange(e.target.value as GrammarFilterCriteria)}
          className={`
            px-2 py-1 rounded text-xs font-medium cursor-pointer
            ${isDark 
              ? 'bg-slate-700 text-white border-slate-600' 
              : 'bg-white text-gray-800 border-gray-300'
            }
            border focus:outline-none focus:ring-1 focus:ring-purple-500
          `}
        >
          {configs.map((config) => (
            <option key={config.id} value={config.id}>
              {config.label}
            </option>
          ))}
        </select>

        {activeCriteria !== 'all' && availableOptions.length > 0 && (
          <select
            value={activeFilterValue || ''}
            onChange={(e) => onFilterValueChange(e.target.value || null)}
            className={`
              px-2 py-1 rounded text-xs font-medium cursor-pointer
              ${isDark 
                ? 'bg-slate-700 text-white border-slate-600' 
                : 'bg-white text-gray-800 border-gray-300'
              }
              border focus:outline-none focus:ring-1 focus:ring-purple-500
            `}
          >
            <option value="">Seleziona...</option>
            {availableOptions.map((option) => (
              <option key={option} value={option}>
                {formatFilterLabel(activeCriteria, option)}
              </option>
            ))}
          </select>
        )}

        {hasActiveFilter && (
          <button
            onClick={onClearFilters}
            className={`
              p-1 rounded transition-all
              ${isDark ? 'hover:bg-slate-600 text-slate-400' : 'hover:bg-gray-200 text-gray-500'}
            `}
            title="Rimuovi filtro"
          >
            <X size={14} />
          </button>
        )}

        <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
          {filteredCount}/{totalCount}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-2 p-2 rounded-lg ${isDark ? 'bg-slate-800/50' : 'bg-gray-100/50'}`}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
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
                flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                transition-all duration-200
                ${isActive
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                  : isDark
                    ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    : 'bg-white text-gray-600 hover:bg-gray-200 shadow-sm'
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
          <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
            Valore:
          </span>
          
          {availableOptions.map((option) => {
            const isSelected = activeFilterValue === option;
            
            return (
              <button
                key={option}
                onClick={() => onFilterValueChange(isSelected ? null : option)}
                className={`
                  px-2 py-0.5 rounded-full text-xs font-medium transition-all
                  ${isSelected
                    ? 'bg-purple-500 text-white'
                    : isDark
                      ? 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
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
          <span className={`text-xs ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>
            Mostrando {filteredCount} di {totalCount} nodi
          </span>
          <button
            onClick={onClearFilters}
            className={`
              flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-all
              ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-600' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200'}
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
