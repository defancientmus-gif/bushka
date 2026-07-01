import { useEffect, useMemo, useState } from 'react';
import type { Item } from '../types';
import { useStore } from '../lib/store';
import { ItemCard, contactHref } from '../components/ItemCard';
import { SearchIcon } from '../components/icons';
import { FilterSheet, activeFilterCount, emptyFilters, inPriceBand, type CategoryOption, type MarketFilters } from '../components/FilterSheet';
import { supportedCategories } from '../lib/importer';
import { toNum } from '../lib/money';
import { fetchMarket } from '../lib/cloud';

export function MarketView({ onExport }: { onExport: (item: Item) => void }) {
  const { seed, items, addQueue, toggleFavorite, isFavorite, showToast } = useStore();
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<MarketFilters>(emptyFilters);
  const [filterOpen, setFilterOpen] = useState(false);
  const [cloud, setCloud] = useState<Item[]>([]);

  // Витрина — общая: тянем чужие живые лоты из облака. Local-first: если двор не
  // достали (офлайн/не готов), показываем своё + сид, приложение живо.
  useEffect(() => {
    let alive = true;
    fetchMarket().then(list => { if (alive && list) setCloud(list); });
    return () => { alive = false; };
  }, []);

  // Склеиваем: чужие из облака + мои локальные (свежее) + сид-моки. Без проданных.
  const lots = useMemo(() => {
    const byId = new Map<string, Item>();
    for (const item of seed) byId.set(item.id, item);
    for (const item of cloud) byId.set(item.id, item);
    for (const item of items) byId.set(item.id, item);
    return [...byId.values()].filter(item => item.status !== 'sold');
  }, [cloud, items, seed]);

  // Свои товары в общей витрине — чтобы в карточке не показывать «Вы» как продавца.
  const myIds = useMemo(() => new Set(items.map(item => item.id)), [items]);

  const categoryOptions = useMemo<CategoryOption[]>(() => {
    const present = supportedCategories().filter(category => lots.some(item => item.category === category));
    return [
      { id: 'all', label: 'Всё', count: lots.length },
      ...present.map(category => ({ id: category, label: category, count: lots.filter(item => item.category === category).length }))
    ];
  }, [lots]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = lots.filter(item => {
      if (filters.category !== 'all' && item.category !== filters.category) return false;
      if (filters.price !== 'any' && !inPriceBand(toNum(item.price), filters.price)) return false;
      if (filters.condition !== 'any' && item.condition !== filters.condition) return false;
      if (filters.delivery !== 'any' && !(item.delivery || []).includes(filters.delivery)) return false;
      if (!q) return true;
      const hay = `${item.title} ${item.price} ${item.description} ${item.category} ${item.city}`.toLowerCase();
      return hay.includes(q);
    });
    return [...matched].sort((a, b) => {
      if (filters.sort === 'fresh') return b.createdAt - a.createdAt;
      const pa = toNum(a.price);
      const pb = toNum(b.price);
      // priceless ("договорная") always sinks to the bottom
      if (pa === 0) return 1;
      if (pb === 0) return -1;
      return filters.sort === 'cheap' ? pa - pb : pb - pa;
    });
  }, [lots, query, filters]);

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

  function resetAll() {
    setFilters(emptyFilters);
    setQuery('');
  }

  return (
    <section className="view market-view">
      <div className="search-box">
        <SearchIcon size={18} />
        <input value={query} onChange={event => setQuery(event.target.value)} type="search" placeholder="Что ищешь — телефон, ноут…" />
        <button type="button" className={`search-filter ${activeCount ? 'on' : ''}`} onClick={() => setFilterOpen(true)} aria-label="Фильтр">
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
            isOwn={myIds.has(item.id)}
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
            <small>{activeCount || query ? 'Ослабь фильтр или поиск' : 'Рынок пока пуст'}</small>
            {(activeCount || query) && (
              <button type="button" className="ghost-btn" style={{ marginTop: 12 }} onClick={resetAll}>Сбросить всё</button>
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
          categories={categoryOptions}
        />
      )}
    </section>
  );
}
