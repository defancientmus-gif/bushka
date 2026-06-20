import { useMemo, useState } from 'react';
import type { Category, Item } from '../types';
import { useStore } from '../lib/store';
import { ItemCard, contactHref } from '../components/ItemCard';
import { SearchIcon } from '../components/icons';
import { FilterSheet, activeFilterCount, emptyFilters, inPriceBand, type MarketFilters } from '../components/FilterSheet';
import { supportedCategories } from '../lib/importer';
import { toNum } from '../lib/money';

type CatFilter = 'all' | Category;
type Sort = 'fresh' | 'cheap' | 'pricey';

const sortLabels: Array<{ id: Sort; label: string }> = [
  { id: 'fresh', label: 'Новые' },
  { id: 'cheap', label: 'Дешевле' },
  { id: 'pricey', label: 'Дороже' }
];

export function MarketView({ onExport }: { onExport: (item: Item) => void }) {
  const { seed, items, addQueue, toggleFavorite, isFavorite, showToast } = useStore();
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState<CatFilter>('all');
  const [sort, setSort] = useState<Sort>('fresh');
  const [filters, setFilters] = useState<MarketFilters>(emptyFilters);
  const [filterOpen, setFilterOpen] = useState(false);

  // The market shows everyone's live lots (mock seed + my own that are for sale),
  // never sold ones — a buyer shops what they can actually take home.
  const lots = useMemo(
    () => [...items, ...seed].filter(item => item.status !== 'sold'),
    [items, seed]
  );

  const cats = useMemo(() => {
    const present = new Set(lots.map(item => item.category));
    return supportedCategories().filter(category => present.has(category));
  }, [lots]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = lots.filter(item => {
      if (cat !== 'all' && item.category !== cat) return false;
      if (filters.price !== 'any' && !inPriceBand(toNum(item.price), filters.price)) return false;
      if (filters.condition !== 'any' && item.condition !== filters.condition) return false;
      if (filters.delivery !== 'any' && !(item.delivery || []).includes(filters.delivery)) return false;
      if (!q) return true;
      const hay = `${item.title} ${item.price} ${item.description} ${item.category} ${item.city}`.toLowerCase();
      return hay.includes(q);
    });
    return [...matched].sort((a, b) => {
      if (sort === 'fresh') return b.createdAt - a.createdAt;
      const pa = toNum(a.price);
      const pb = toNum(b.price);
      // priceless ("договорная") always sinks to the bottom
      if (pa === 0) return 1;
      if (pb === 0) return -1;
      return sort === 'cheap' ? pa - pb : pb - pa;
    });
  }, [lots, query, cat, filters, sort]);

  const activeCount = activeFilterCount(filters);

  function buy(item: Item) {
    const href = contactHref(item.contact);
    if (href) {
      window.open(href, '_blank', 'noopener');
      showToast('Открываю продавца — скажи «беру»');
    } else {
      showToast('Продавец не оставил контакт');
    }
  }

  return (
    <section className="view market-view">
      <header className="view-head">
        <p className="eyebrow">маркет</p>
        <h1>Рынок</h1>
        <span className="count-badge">{lots.length}</span>
      </header>

      <div className="search-box">
        <SearchIcon size={18} />
        <input value={query} onChange={event => setQuery(event.target.value)} type="search" placeholder="Что ищешь — телефон, ноут…" />
      </div>

      <div className="chip-row" role="tablist" aria-label="Категории">
        <button type="button" role="tab" aria-selected={cat === 'all'} className={`filter-chip ${cat === 'all' ? 'active' : ''}`} onClick={() => setCat('all')}>
          Всё<i>{lots.length}</i>
        </button>
        {cats.map(category => (
          <button
            key={category}
            type="button"
            role="tab"
            aria-selected={cat === category}
            className={`filter-chip ${cat === category ? 'active' : ''}`}
            onClick={() => setCat(category)}
          >
            {category}<i>{lots.filter(item => item.category === category).length}</i>
          </button>
        ))}
      </div>

      <div className="market-controls">
        <div className="sort-chips">
          {sortLabels.map(option => (
            <button key={option.id} type="button" className={`pick-chip ${sort === option.id ? 'active' : ''}`} onClick={() => setSort(option.id)}>{option.label}</button>
          ))}
        </div>
        <button type="button" className={`filter-btn ${activeCount ? 'on' : ''}`} onClick={() => setFilterOpen(true)}>
          Фильтр{activeCount > 0 && <i>{activeCount}</i>}
        </button>
      </div>

      <div className="feed-grid">
        {visible.map((item, index) => (
          <ItemCard
            key={item.id}
            item={item}
            index={index}
            variant="market"
            favorite={isFavorite(item.id)}
            onBuy={() => buy(item)}
            onQueue={() => addQueue(item)}
            onFavorite={() => toggleFavorite(item.id)}
            onExport={() => onExport(item)}
          />
        ))}
        {!visible.length && (
          <div className="empty-state">
            <p>Под фильтр ничего нет</p>
            <small>{activeCount || query || cat !== 'all' ? 'Ослабь фильтр или поиск' : 'Рынок пока пуст'}</small>
            {(activeCount || query || cat !== 'all') && (
              <button type="button" className="ghost-btn" style={{ marginTop: 12 }} onClick={() => { setFilters(emptyFilters); setQuery(''); setCat('all'); }}>Сбросить всё</button>
            )}
          </div>
        )}
      </div>

      {filterOpen && (
        <FilterSheet
          filters={filters}
          onChange={setFilters}
          resultCount={visible.length}
          onClose={() => setFilterOpen(false)}
        />
      )}
    </section>
  );
}
