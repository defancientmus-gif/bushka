import type { ItemStatus } from '../types';
import { statusLabels, statusOrder } from '../lib/labels';

export type StatusFilter = 'all' | ItemStatus;

const filters: Array<{ id: StatusFilter; label: string }> = [
  { id: 'all', label: 'Все' },
  ...statusOrder.map(status => ({ id: status as StatusFilter, label: statusLabels[status] }))
];

export function FilterChips({
  active,
  counts,
  onChange
}: {
  active: StatusFilter;
  counts: Record<StatusFilter, number>;
  onChange: (filter: StatusFilter) => void;
}) {
  return (
    <div className="chip-row" role="tablist" aria-label="Фильтр статуса">
      {filters.map(({ id, label }) => {
        const count = counts[id] ?? 0;
        if (id !== 'all' && count === 0) return null;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active === id}
            className={`filter-chip ${id} ${active === id ? 'active' : ''}`}
            onClick={() => onChange(id)}
          >
            {label}
            <i>{count}</i>
          </button>
        );
      })}
    </div>
  );
}
