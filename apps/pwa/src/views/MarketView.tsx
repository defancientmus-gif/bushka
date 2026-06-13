import { useMemo, useState } from 'react';
import type { Category, Item } from '../types';
import { useStore } from '../lib/store';
import { ItemCard, contactHref } from '../components/ItemCard';
import { SearchIcon } from '../components/icons';
import { supportedCategories } from '../lib/importer';

type CatFilter = 'all' | Category;

export function MarketView({ onExport }: { onExport: (item: Item) => void }) {
  const { seed, items, addQueue, toggleFavorite, isFavorite, showToast } = useStore();
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState<CatFilter>('all');

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
    return lots.filter(item => {
      if (cat !== 'all' && item.category !== cat) return false;
      if (!q) return true;
      const hay = `${item.title} ${item.price} ${item.description} ${item.category} ${item.city}`.toLowerCase();
      return hay.includes(q);
    });
  }, [lots, query, cat]);

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
            <p>Ничего не нашлось</p>
            <small>Поменяй запрос или категорию — рынок большой</small>
          </div>
        )}
      </div>
    </section>
  );
}
