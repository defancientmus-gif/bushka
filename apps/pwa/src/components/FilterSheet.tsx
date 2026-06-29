import type { Category, Condition, DeliveryKind } from '../types';
import { supportedConditions } from '../lib/importer';
import { CloseIcon } from './icons';

export type PriceBand = 'any' | 'lt10' | 'b1030' | 'b3060' | 'gt60';
export type Sort = 'fresh' | 'cheap' | 'pricey';

export type MarketFilters = {
  category: 'all' | Category;
  price: PriceBand;
  condition: 'any' | Condition;
  delivery: 'any' | DeliveryKind;
  sort: Sort;
};

export const emptyFilters: MarketFilters = { category: 'all', price: 'any', condition: 'any', delivery: 'any', sort: 'fresh' };

/** Сколько фильтров реально сужают выдачу (сортировка не в счёт — она всегда задана). */
export function activeFilterCount(f: MarketFilters): number {
  return (f.category !== 'all' ? 1 : 0) + (f.price !== 'any' ? 1 : 0) + (f.condition !== 'any' ? 1 : 0) + (f.delivery !== 'any' ? 1 : 0);
}

export function inPriceBand(value: number, band: PriceBand): boolean {
  switch (band) {
    case 'lt10': return value > 0 && value < 10000;
    case 'b1030': return value >= 10000 && value < 30000;
    case 'b3060': return value >= 30000 && value < 60000;
    case 'gt60': return value >= 60000;
    default: return true;
  }
}

const priceBands: Array<{ id: PriceBand; label: string }> = [
  { id: 'any', label: 'Любая' },
  { id: 'lt10', label: 'до 10к' },
  { id: 'b1030', label: '10–30к' },
  { id: 'b3060', label: '30–60к' },
  { id: 'gt60', label: '60к+' }
];

const deliveries: Array<{ id: 'any' | DeliveryKind; label: string }> = [
  { id: 'any', label: 'Любое' },
  { id: 'delivery', label: 'Доставка' },
  { id: 'pickup', label: 'Самовывоз' }
];

const sortOptions: Array<{ id: Sort; label: string }> = [
  { id: 'fresh', label: 'Сначала новые' },
  { id: 'cheap', label: 'Сначала дешевле' },
  { id: 'pricey', label: 'Сначала дороже' }
];

export type CategoryOption = { id: 'all' | Category; label: string; count: number };

export function FilterSheet({
  filters,
  onChange,
  resultCount,
  onClose,
  categories
}: {
  filters: MarketFilters;
  onChange: (next: MarketFilters) => void;
  resultCount: number;
  onClose: () => void;
  categories: CategoryOption[];
}) {
  return (
    <div className="sheet-backdrop" role="presentation" onClick={onClose}>
      <section className="sheet" role="dialog" aria-modal="true" aria-label="Фильтр" onClick={event => event.stopPropagation()}>
        <div className="sheet-grip" aria-hidden="true" />
        <div className="sheet-head">
          <div>
            <p className="eyebrow">фильтр</p>
            <h2>Подобрать за секунды</h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Закрыть"><CloseIcon size={18} /></button>
        </div>

        <div className="filter-group">
          <span>Категория</span>
          <div className="pick-row">
            {categories.map(option => (
              <button key={option.id} type="button" className={`pick-chip ${filters.category === option.id ? 'active' : ''}`} onClick={() => onChange({ ...filters, category: option.id })}>
                {option.label}<i>{option.count}</i>
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <span>Цена</span>
          <div className="pick-row">
            {priceBands.map(band => (
              <button key={band.id} type="button" className={`pick-chip ${filters.price === band.id ? 'active' : ''}`} onClick={() => onChange({ ...filters, price: band.id })}>{band.label}</button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <span>Состояние</span>
          <div className="pick-row">
            <button type="button" className={`pick-chip ${filters.condition === 'any' ? 'active' : ''}`} onClick={() => onChange({ ...filters, condition: 'any' })}>Любое</button>
            {supportedConditions().map(condition => (
              <button key={condition} type="button" className={`pick-chip ${filters.condition === condition ? 'active' : ''}`} onClick={() => onChange({ ...filters, condition })}>{condition}</button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <span>Получение</span>
          <div className="pick-row">
            {deliveries.map(option => (
              <button key={option.id} type="button" className={`pick-chip ${filters.delivery === option.id ? 'active' : ''}`} onClick={() => onChange({ ...filters, delivery: option.id })}>{option.label}</button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <span>Сортировка</span>
          <div className="pick-row">
            {sortOptions.map(option => (
              <button key={option.id} type="button" className={`pick-chip ${filters.sort === option.id ? 'active' : ''}`} onClick={() => onChange({ ...filters, sort: option.id })}>{option.label}</button>
            ))}
          </div>
        </div>

        <div className="sheet-actions">
          <button type="button" className="ghost-btn grow" onClick={() => onChange(emptyFilters)}>Сбросить</button>
          <button type="button" className="solid-btn grow big" onClick={onClose}>Показать {resultCount}</button>
        </div>
      </section>
    </div>
  );
}
