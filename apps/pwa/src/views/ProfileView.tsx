import { useMemo, useState } from 'react';
import type { Item } from '../types';
import { useStore } from '../lib/store';
import { StatRing } from '../components/StatRing';
import { Field } from '../components/Field';
import { ItemCard, contactHref } from '../components/ItemCard';
import { useOnline } from '../lib/hooks';
import { pluralize } from '../lib/format';
import { APP_BUILD, APP_CHANNEL, APP_VERSION } from '../lib/version';

type Side = 'buy' | 'sell';

export function ProfileView({ onExport }: { onExport: (item: Item) => void }) {
  const { profile, items, seed, favorites, updateProfile, saveProfile, updateStatus, deleteItem, toggleFavorite, isFavorite, showToast } = useStore();
  const online = useOnline();
  const [side, setSide] = useState<Side>(() => (items.length ? 'sell' : 'buy'));

  const favItems = useMemo(
    () => [...items, ...seed].filter(item => favorites.includes(item.id)),
    [items, seed, favorites]
  );

  const sold = items.filter(item => item.status === 'sold').length;

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
    <section className="view profile-view">
      <header className="view-head">
        <p className="eyebrow">кабинет</p>
        <h1>Профиль</h1>
      </header>

      <div className="profile-card">
        <div className="avatar">{(profile.name || 'Б').trim().charAt(0).toUpperCase()}</div>
        <div className="profile-id">
          <strong>{profile.name || 'Без имени'}</strong>
          <span>{profile.city || 'Город не указан'}</span>
        </div>
        <span className={`net-dot ${online ? 'on' : 'off'}`}>{online ? 'online' : 'офлайн'}</span>
      </div>

      <div className="segmented two" role="tablist" aria-label="Сторона">
        <span className="seg-indicator" style={{ transform: `translateX(${side === 'buy' ? 0 : 100}%)` }} aria-hidden="true" />
        <button type="button" role="tab" aria-selected={side === 'buy'} className={side === 'buy' ? 'active' : ''} onClick={() => setSide('buy')}>Покупаю</button>
        <button type="button" role="tab" aria-selected={side === 'sell'} className={side === 'sell' ? 'active' : ''} onClick={() => setSide('sell')}>Продаю</button>
      </div>

      {side === 'buy' ? (
        <>
          <div className="rings">
            <StatRing value={favItems.length} max={Math.max(6, favItems.length)} display={String(favItems.length)} label="в избранном" />
            <StatRing value={profile.rating} max={5} display={profile.rating.toFixed(1)} label="рейтинг" />
            <StatRing value={0} max={3} display="0" label="заданий" />
          </div>

          <p className="section-label">Избранное</p>
          <div className="feed-grid">
            {favItems.map((item, index) => (
              <ItemCard
                key={item.id}
                item={item}
                index={index}
                variant="market"
                favorite={isFavorite(item.id)}
                onBuy={() => buy(item)}
                onFavorite={() => toggleFavorite(item.id)}
                onExport={() => onExport(item)}
              />
            ))}
            {!favItems.length && (
              <div className="empty-state">
                <p>Пока пусто</p>
                <small>Лайкай лоты на Рынке — они соберутся здесь</small>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="rings">
            <StatRing value={items.length} max={Math.max(10, items.length)} display={String(items.length)} label={pluralize(items.length, 'товар', 'товара', 'товаров')} />
            <StatRing value={profile.rating} max={5} display={profile.rating.toFixed(1)} label="рейтинг" />
            <StatRing value={profile.deals} max={Math.max(10, profile.deals)} display={String(profile.deals)} label={pluralize(profile.deals, 'сделка', 'сделки', 'сделок')} />
          </div>

          <div className="form-grid">
            <Field label="Имя или магазин" wide>
              <input value={profile.name} onChange={event => updateProfile({ name: event.target.value })} placeholder="Как тебя зовут покупателю" />
            </Field>
            <Field label="Город">
              <input value={profile.city} onChange={event => updateProfile({ city: event.target.value })} placeholder="Симферополь" />
            </Field>
            <Field label="Контакт">
              <input value={profile.contact} onChange={event => updateProfile({ contact: event.target.value })} placeholder="@username" />
            </Field>
          </div>
          <button type="button" className="solid-btn wide big" onClick={saveProfile}>Сохранить профиль</button>

          <p className="section-label">Мои товары · в наличии {items.length - sold}, продано {sold}</p>
          <div className="feed-grid">
            {items.map((item, index) => (
              <ItemCard
                key={item.id}
                item={item}
                index={index}
                variant="own"
                onStatusChange={status => updateStatus(item.id, status)}
                onDelete={() => deleteItem(item.id)}
                onExport={() => onExport(item)}
              />
            ))}
            {!items.length && (
              <div className="empty-state">
                <p>Склад пуст</p>
                <small>Во вкладке «Создать» выставишь первый товар за минуту</small>
              </div>
            )}
          </div>
        </>
      )}

      <div className="profile-foot">
        <span className="version-tag">БУ.шка · {APP_VERSION} · {APP_CHANNEL} · сборка {APP_BUILD}</span>
        <small>Данные хранятся локально на этом устройстве</small>
      </div>
    </section>
  );
}
