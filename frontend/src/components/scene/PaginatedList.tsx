import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { UI_INTERACTION, UI_RADIUS } from '../ui';

interface PaginatedListProps<T> {
  items: readonly T[];
  pageSize: number;
  page: number;
  onPageChange: (page: number) => void;
  renderItem: (item: T, index: number) => ReactNode;
  emptyState?: ReactNode;
  className?: string;
}

export function PaginatedList<T>({
  items,
  pageSize,
  page,
  onPageChange,
  renderItem,
  emptyState,
  className = '',
}: PaginatedListProps<T>) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  const slice = items.slice(start, start + pageSize);

  if (items.length === 0) return <>{emptyState}</>;

  const goPrev = () => {
    if (safePage > 1) onPageChange(safePage - 1);
  };
  const goNext = () => {
    if (safePage < totalPages) onPageChange(safePage + 1);
  };

  const btnBase = `inline-flex items-center gap-1 px-3 py-2 ${UI_RADIUS.control} text-body-sm font-medium ${UI_INTERACTION.fastTransition}`;

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      <ul className="flex flex-col gap-2">
        {slice.map((item, i) => (
          <li key={start + i}>{renderItem(item, start + i)}</li>
        ))}
      </ul>
      <nav aria-label="Paginazione" className="flex items-center justify-between gap-2 text-muted">
        <button
          type="button"
          onClick={goPrev}
          disabled={safePage === 1}
          className={`${btnBase} ${safePage === 1 ? 'opacity-40' : 'hover:bg-surface-card hover:text-ink'}`}
        >
          <ChevronLeft size={16} /> Precedente
        </button>
        <span className="text-body-sm">
          Pagina {safePage} di {totalPages}
        </span>
        <button
          type="button"
          onClick={goNext}
          disabled={safePage === totalPages}
          className={`${btnBase} ${safePage === totalPages ? 'opacity-40' : 'hover:bg-surface-card hover:text-ink'}`}
        >
          Successiva <ChevronRight size={16} />
        </button>
      </nav>
    </div>
  );
}
