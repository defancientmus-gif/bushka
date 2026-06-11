import { useMemo, useState } from 'react';
import type { Item } from '../types';
import { useStore } from '../lib/store';
import { ItemCard } from '../components/ItemCard';
import { FilterChips, type StatusFilter } from '../components/FilterChips';
import { SearchIcon } from '../components/icons';

export function FeedView({ onExport }: { onExport: (item: Item) => void }) {
  const { items, seed, updateStatus, addQueue, deleteItem } = useStore();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('all');

  const all = useMemo(() => [...items, ...seed], [items, seed]);

  const counts = useMemo(() => {
    const base: Record<StatusFilter, number> = {
      all: all.length, available: 0, reserved: 0, sold: 0, exchange: 0, lot: 0
    };
    for (const item of all) base[item.status] += 1;
    return base;
  }, [all]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter(item => {
      if (filter !== 'all' && item.status !== filter) return false;
      if (!q) return true;
      const hay = `${item.title} ${item.price} ${item.description} ${item.category} ${item.city} ${item.contact}`.toLowerCase();
      return hay.includes(q);
    });
  }, [all, query, filter]);

  return (
    <section className="view feed-view">
      <header className="view-head">
        <p className="eyebrow">витрина</p>
        <h1>Склад</h1>
        <span className="count-badge">{items.length}</span>
      </header>

      <div className="search-box">
        <SearchIcon size={18} />
        <input value={query} onChange={event => setQuery(event.target.value)} type="search" placeholder="Поиск по складу" />
      </div>

      <FilterChips active={filter} counts={counts} onChange={setFilter} />

      <div className="feed-grid">
        {visible.map((item, index) => {
          const isOwn = !item.id.startsWith('seed-');
          return (
            <ItemCard
              key={item.id}
              item={item}
              index={index}
              isOwn={isOwn}
              onExport={() => onExport(item)}
              onQueue={() => addQueue(item)}
              onStatusChange={isOwn ? status => updateStatus(item.id, status) : undefined}
              onDelete={isOwn ? () => deleteItem(item.id) : undefined}
            />
          );
        })}
        {!visible.length && (
          <div className="empty-state">
            <p>{query || filter !== 'all' ? 'Ничего не найдено' : 'Склад пуст'}</p>
            <small>{query || filter !== 'all' ? 'Измени фильтр или запрос' : 'Создай первый товар во вкладке «Создать»'}</small>
          </div>
        )}
      </div>
    </section>
  );
}
