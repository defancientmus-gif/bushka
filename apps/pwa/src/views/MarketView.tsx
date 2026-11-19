import { useEffect, useMemo, useState } from 'react';
import type { Item } from '../types';
import { useStore } from '../lib/store';
import { ItemCard, contactHref } from '../components/ItemCard';
import { CloseIcon, SearchIcon } from '../components/icons';
import { FilterSheet, activeFilterCount, emptyFilters, inPriceBand, type CategoryOption, type MarketFilters } from '../components/FilterSheet';
import { supportedCategories } from '../lib/importer';
import { toNum } from '../lib/money';
import { fetchMarket } from '../lib/cloud';
import { dropChip, priceHints, smartSearch } from '../lib/search';

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

  // Склеиваем: чужие из облака + мои локальные (свежее). Без проданных.
  // Образцы показываем, только пока живых объявлений нет: рядом с настоящими товарами
  // выдуманный продавец — это обман покупателя.
  const lots = useMemo(() => {
    const byId = new Map<string, Item>();
    if (!cloud.length) for (const item of seed) byId.set(item.id, item);
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

  // Сначала то, что выбрано в листе фильтра, потом — смысл фразы из строки поиска.
  const filtered = useMemo(() => lots.filter(item => {
    if (filters.category !== 'all' && item.category !== filters.category) return false;
    if (filters.price !== 'any' && !inPriceBand(toNum(item.price), filters.price)) return false;
    if (filters.condition !== 'any' && item.condition !== filters.condition) return false;
    if (filters.delivery !== 'any' && !(item.delivery || []).includes(filters.delivery)) return false;
    return true;
  }), [lots, filters]);

  const found = useMemo(() => smartSearch(filtered, query), [filtered, query]);

  const visible = useMemo(() => {
    const cheap = filters.sort === 'cheap' || (filters.sort === 'fresh' && found.understood.cheapFirst);
    if (filters.sort === 'fresh' && !cheap) {
      // Есть слова — порядок по смыслу уже расставлен поиском; нет — как всегда, свежие сверху.
      return found.ranked ? found.items : [...found.items].sort((a, b) => b.createdAt - a.createdAt);
    }
    return [...found.items].sort((a, b) => {
      const pa = toNum(a.price);
      const pb = toNum(b.price);
      // «договорная» всегда внизу
      if (pa === 0) return 1;
      if (pb === 0) return -1;
      return cheap ? pa - pb : pb - pa;
    });
  }, [found, filters.sort]);

  // Цена относительно таких же вещей на витрине — считаем по всем лотам, а не по выдаче.
  const hints = useMemo(() => priceHints(lots), [lots]);
  const sense = found.understood.chips;
  const samples = lots.some(item => item.id.startsWith('seed-'));

  const activeCount = activeFilterCount(filters);

  function buy(item: Item) {
    const href = contactHref(item.contact);
    if (href) {
      window.open(href, '_blank', 'noopener');
      showToast('Открываю контакт продавца');
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
        <input value={query} onChange={event => setQuery(event.target.value)} type="search" placeholder="Айфон 13 до 30к, Симферополь" aria-label="Поиск по витрине" enterKeyHint="search" autoCapitalize="off" autoCorrect="off" spellCheck={false} />
        <button type="button" className={`search-filter ${activeCount ? 'on' : ''}`} onClick={() => setFilterOpen(true)} aria-label="Фильтр">
          Фильтр{activeCount > 0 && <i>{activeCount}</i>}
        </button>
      </div>

      {(sense.length > 0 || found.note) && (
        <div className="search-sense" aria-live="polite">
          {sense.map(chip => (
            <button
              key={`${chip.id}-${chip.start}`}
              type="button"
              className="sense-chip"
              onClick={() => setQuery(dropChip(found.understood.query, chip))}
              aria-label={`Убрать условие: ${chip.label}`}
            >
              {chip.label}<CloseIcon size={12} />
            </button>
          ))}
          {found.note && <span className="sense-note">{found.note}</span>}
        </div>
      )}

      {samples && !query && (
        <p className="feed-note">Это образцы объявлений. Ваша вещь встанет здесь первой</p>
      )}

      <div className="feed-grid">
        {visible.map((item, index) => (
          <ItemCard
            key={item.id}
            item={item}
            index={index}
            variant="market"
            isOwn={myIds.has(item.id)}
            hint={hints.get(item.id)}
            favorite={isFavorite(item.id)}
            onBuy={() => buy(item)}
            onQueue={() => addQueue(item)}
            onFavorite={() => toggleFavorite(item.id)}
            onExport={() => onExport(item)}
          />
        ))}
        {!visible.length && (
          <div className="empty-state">
            <p>{activeCount || query ? 'Такого пока нет' : 'Витрина пока пуста'}</p>
            <small>{activeCount || query ? 'Уберите одно условие или напишите короче' : 'Выставьте первую вещь — это минута'}</small>
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
