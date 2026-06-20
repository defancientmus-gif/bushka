import { useEffect, useRef, useState } from 'react';
import type { Item, ItemStatus } from '../types';
import { dealModeLabels, deliveryLabels, statusLabels, statusOrder } from '../lib/labels';
import { formatMoney, lightLabel, marginLight, toNum } from '../lib/money';
import { CategoryGlyph, CopyIcon, HeartIcon, PencilIcon, PhoneIcon, SendIcon, TrashIcon } from './icons';

export function ItemCard({
  item,
  index = 0,
  variant = 'market',
  isOwn = false,
  favorite = false,
  onQueue,
  onBuy,
  onFavorite,
  onExport,
  onEdit,
  onDelete,
  onStatusChange
}: {
  item: Item;
  index?: number;
  variant?: 'market' | 'preview' | 'own';
  isOwn?: boolean;
  favorite?: boolean;
  onQueue?: () => void;
  onBuy?: () => void;
  onFavorite?: () => void;
  onExport?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onStatusChange?: (status: ItemStatus) => void;
}) {
  const media = item.media[0];
  const isPreview = variant === 'preview';
  const light = marginLight(item.price, item.costPrice);
  const margin = toNum(item.price) - toNum(item.costPrice);
  const [confirm, setConfirm] = useState(false);
  const timer = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function handleDelete() {
    if (!confirm) {
      setConfirm(true);
      timer.current = window.setTimeout(() => setConfirm(false), 2600);
      return;
    }
    window.clearTimeout(timer.current);
    setConfirm(false);
    onDelete?.();
  }

  return (
    <article className={`card ${isPreview ? 'preview' : ''}`} style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}>
      <div className={`card-media status-${item.status}`}>
        {media ? (
          <img src={media.src} alt="" loading="lazy" />
        ) : (
          <span className="media-glyph"><CategoryGlyph category={item.category} size={38} /></span>
        )}
        <span className={`status-pill ${item.status}`}>{statusLabels[item.status]}</span>
        {variant === 'market' && onFavorite && (
          <button
            type="button"
            className={`heart-btn ${favorite ? 'on' : ''}`}
            onClick={onFavorite}
            aria-pressed={favorite}
            aria-label={favorite ? 'Убрать из избранного' : 'В избранное'}
          >
            <HeartIcon size={18} filled={favorite} />
          </button>
        )}
        {item.media.length > 1 && <span className="media-count">{item.media.length}</span>}
      </div>

      <div className="card-body">
        <div className="card-head">
          <h3>{item.title || 'Без названия'}</h3>
          <strong>{item.price || 'договорная'}</strong>
        </div>

        <div className="quality">
          <span className={`grade-badge g-${item.grade}`}>{item.grade}</span>
          <span className="quality-word">{item.condition}</span>
          {item.battery && <span className="quality-sub">· АКБ {item.battery}</span>}
          {item.dealMode !== 'free' && <span className="quality-sub">· {dealModeLabels[item.dealMode]}</span>}
        </div>

        {variant === 'own' && light && (
          <p className={`navar-line ${light}`}>
            <span className="light-dot" aria-hidden="true" />
            Навар {margin >= 0 ? `+${formatMoney(margin)}` : formatMoney(margin)} · {lightLabel[light]}
          </p>
        )}

        {item.defects && <p className="defect-line">Нюансы: {item.defects}</p>}

        {variant === 'market' && item.delivery && item.delivery.length > 0 && (
          <p className="delivery-line">{item.delivery.map(kind => deliveryLabels[kind]).join(' · ')}</p>
        )}

        {item.description && <p className="card-desc">{item.description}</p>}

        {item.status === 'reserved' && item.reservedUntil && (
          <p className="reserve-note">Бронь до {item.reservedUntil}</p>
        )}

        <div className="card-meta">
          <span className="seller">
            {item.sellerRating != null && <b className="star">★ {item.sellerRating.toFixed(1)}</b>}
            {[item.sellerName, item.city].filter(Boolean).join(' · ')}
          </span>
          {item.queueCount > 0 && <span className="queue">{item.queueCount} в очереди</span>}
        </div>

        {variant === 'market' && (
          <div className="card-actions">
            <button type="button" className="solid-btn accent grow" onClick={onBuy}>Беру</button>
            <button type="button" className="ghost-btn" onClick={onQueue}>Запрос</button>
          </div>
        )}

        {variant === 'own' && (
          <div className="card-actions">
            <span className="status-select">
              <select value={item.status} onChange={event => onStatusChange?.(event.target.value as ItemStatus)} aria-label="Статус товара">
                {statusOrder.map(status => <option value={status} key={status}>{statusLabels[status]}</option>)}
              </select>
            </span>
            <button type="button" className="icon-btn" onClick={onEdit} aria-label="Изменить"><PencilIcon size={16} /></button>
            <button type="button" className="icon-btn" onClick={onExport} aria-label="Репост"><SendIcon size={16} /></button>
            <button type="button" className={`icon-btn danger ${confirm ? 'confirm' : ''}`} onClick={handleDelete} aria-label="Удалить">
              {confirm ? 'Точно?' : <TrashIcon size={16} />}
            </button>
          </div>
        )}

        {isPreview && (
          <div className="card-actions">
            <button type="button" className="ghost-btn wide" onClick={onExport}><SendIcon size={16} />Текст репоста</button>
          </div>
        )}
      </div>
    </article>
  );
}

export function ContactLink({ contact }: { contact: string }) {
  if (contact.startsWith('@')) {
    return (
      <a className="contact-link" href={`https://t.me/${contact.slice(1)}`} target="_blank" rel="noreferrer">
        <SendIcon size={15} />TG
      </a>
    );
  }
  if (/^(?:\+7|8)/.test(contact)) {
    return (
      <a className="contact-link" href={`tel:${contact.replace(/[^\d+]/g, '')}`}>
        <PhoneIcon size={15} />Звонок
      </a>
    );
  }
  if (/^https?:\/\//i.test(contact)) {
    return <a className="contact-link" href={contact} target="_blank" rel="noreferrer">Ссылка</a>;
  }
  return <span className="contact-link muted"><CopyIcon size={15} />{contact || 'Контакт'}</span>;
}

export function contactHref(contact: string): string | null {
  if (contact.startsWith('@')) return `https://t.me/${contact.slice(1)}`;
  if (/^(?:\+7|8)/.test(contact)) return `tel:${contact.replace(/[^\d+]/g, '')}`;
  if (/^https?:\/\//i.test(contact)) return contact;
  return null;
}
