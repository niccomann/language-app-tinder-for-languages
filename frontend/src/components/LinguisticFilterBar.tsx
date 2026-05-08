/**
 * LinguisticFilterBar - reusable UI component for linguistic filters.
 * 
 * This component can be used in any D3 game/view to provide consistent
 * linguistic filtering/grouping UI.
 */
import { useTheme } from '../contexts/useTheme';
import type { LinguisticCriteria, LinguisticFilterConfig } from '../hooks/useLinguisticFilters';
import { FilterSelect, UI_RADIUS } from './ui';

export type FilterBarVariant = 'horizontal' | 'vertical' | 'compact' | 'dropdown';

export interface LinguisticFilterBarProps {
  configs: LinguisticFilterConfig[];
  activeCriteria: LinguisticCriteria;
  onCriteriaChange: (criteria: LinguisticCriteria) => void;
  variant?: FilterBarVariant;
  showDescriptions?: boolean;
  showIcons?: boolean;
  className?: string;
}

export function LinguisticFilterBar({
  configs,
  activeCriteria,
  onCriteriaChange,
  variant = 'horizontal',
  showDescriptions = false,
  showIcons = true,
  className = '',
}: LinguisticFilterBarProps) {
  const { isDark } = useTheme();

  if (variant === 'dropdown') {
    return (
      <div className={`relative ${className}`}>
        <FilterSelect
          ariaLabel="Linguistic grouping"
          value={activeCriteria}
          onChange={(value) => onCriteriaChange(value as LinguisticCriteria)}
        >
          {configs.map((config) => (
            <option key={config.id} value={config.id}>
              {config.label}
            </option>
          ))}
        </FilterSelect>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`flex flex-wrap gap-1 ${className}`}>
        {configs.map((config) => {
          const Icon = config.icon;
          const isActive = activeCriteria === config.id;
          
          return (
            <button
              key={config.id}
              onClick={() => onCriteriaChange(config.id)}
              title={config.description}
              className={`
                p-2 ${UI_RADIUS.control} transition-all duration-200
                ${isActive
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg scale-[1.02]'
                  : isDark
                    ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
              `}
            >
              {showIcons && <Icon size={18} />}
            </button>
          );
        })}
      </div>
    );
  }

  if (variant === 'vertical') {
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        {configs.map((config) => {
          const Icon = config.icon;
          const isActive = activeCriteria === config.id;
          
          return (
            <button
              key={config.id}
              onClick={() => onCriteriaChange(config.id)}
              className={`
                flex items-center gap-3 px-4 py-3 ${UI_RADIUS.control} transition-all duration-200 text-left
                ${isActive
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                  : isDark
                    ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
              `}
            >
              {showIcons && <Icon size={20} />}
              <div>
                <span className="font-semibold">{config.label}</span>
                {showDescriptions && (
                  <p className={`text-xs mt-0.5 ${isActive ? 'text-white/80' : isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    {config.description}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap gap-2 justify-center ${className}`}>
      {configs.map((config) => {
        const Icon = config.icon;
        const isActive = activeCriteria === config.id;
        
        return (
          <button
            key={config.id}
            onClick={() => onCriteriaChange(config.id)}
            title={config.description}
            className={`
              flex items-center gap-2 px-4 py-2 ${UI_RADIUS.pill} font-semibold 
              transition-all duration-200 whitespace-nowrap
              ${isActive
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg scale-[1.02]'
                : isDark
                  ? 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:scale-[1.02]'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:scale-[1.02]'
              }
            `}
          >
            {showIcons && <Icon size={18} />}
            <span>{config.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export interface GroupLegendProps {
  groups: Map<string, any[]>;
  getColor: (groupName: string, index: number) => string;
  onGroupClick?: (groupName: string) => void;
  selectedGroup?: string | null;
  className?: string;
}

export function GroupLegend({
  groups,
  getColor,
  onGroupClick,
  selectedGroup,
  className = '',
}: GroupLegendProps) {
  const { isDark } = useTheme();
  const sortedGroups = Array.from(groups.entries()).sort((a, b) => b[1].length - a[1].length);

  return (
    <div className={`flex flex-wrap gap-2 justify-center ${className}`}>
      {sortedGroups.map(([groupName, items], index) => {
        const isSelected = selectedGroup === groupName;
        const color = getColor(groupName, index);
        
        return (
          <button
            key={groupName}
            onClick={() => onGroupClick?.(groupName)}
            className={`
              flex items-center gap-2 px-3 py-1.5 ${UI_RADIUS.pill} text-sm font-medium
              transition-all duration-200
              ${isSelected
                ? 'ring-2 ring-offset-2 ring-purple-500 scale-[1.02]'
                : 'hover:scale-[1.02]'
              }
              ${isDark ? 'bg-slate-700/80' : 'bg-white/80'}
              backdrop-blur-sm shadow-sm
            `}
          >
            <div 
              className={`w-3 h-3 ${UI_RADIUS.pill}`} 
              style={{ backgroundColor: color }}
            />
            <span className={isDark ? 'text-slate-200' : 'text-gray-700'}>
              {groupName}
            </span>
            <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              ({items.length})
            </span>
          </button>
        );
      })}
    </div>
  );
}

export interface FilterStatsProps {
  totalItems: number;
  filteredItems: number;
  activeFilter: string;
  className?: string;
}

export function FilterStats({
  totalItems,
  filteredItems,
  activeFilter,
  className = '',
}: FilterStatsProps) {
  const { isDark } = useTheme();

  return (
    <div className={`flex items-center gap-4 text-sm ${className}`}>
      <span className={isDark ? 'text-slate-400' : 'text-gray-500'}>
        Raggruppamento: <strong className={isDark ? 'text-white' : 'text-gray-800'}>{activeFilter}</strong>
      </span>
      <span className={isDark ? 'text-slate-400' : 'text-gray-500'}>
        {filteredItems} / {totalItems} elementi
      </span>
    </div>
  );
}
