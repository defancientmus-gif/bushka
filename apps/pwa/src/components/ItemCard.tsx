import { useEffect, useRef, useState } from 'react';
import type { Item, ItemStatus } from '../types';
import { dealModeLabels, statusLabels, statusOrder } from '../lib/labels';
import { daysOld, formatMoney, isStale, lightLabel, marginLight, qtyOf, toNum } from '../lib/money';
import { pluralize } from '../lib/format';
import { CategoryGlyph, CopyIcon, HeartIcon, PencilIcon, PhoneIcon, SendIcon, TrashIcon } from './icons';
import { ClipMedia } from './ClipMedia';
import { VideoMedia } from './VideoMedia';
import { MediaViewer } from './MediaViewer';
import { ItemDetail } from './ItemDetail';

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
  // Рынок и живое превью — минимум на глаз (цена + название), подробности только внутри.
  const minimal = variant === 'market' || isPreview;
  const light = marginLight(item.price, item.costPrice);
  const margin = toNum(item.price) - toNum(item.costPrice);
  const stale = variant === 'own' && isStale(item);
  const age = daysOld(item.createdAt);
  const [confirm, setConfirm] = useState(false);
  const [viewer, setViewer] = useState(false);
  const [detail, setDetail] = useState(false);
  const [live, setLive] = useState(false); // петля играет, пока смотрят на эту карточку
  const timer = useRef(0);
  // Рынок: тап по всей карточке открывает полную карточку товара (кнопок на превью больше нет).
  // Свои (склад): тап по фото — просмотр.
  const canOpenDetail = variant === 'market';
  const canOpenMedia = variant === 'own' && item.media.length > 0;

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function openCard() {
    if (canOpenDetail) setDetail(true);
    else if (canOpenMedia) setViewer(true);
  }

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
    <article
      className={`card card-${variant} ${isPreview ? 'preview' : ''} ${canOpenDetail ? 'openable' : ''} ${live ? 'live' : ''}`}
      style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
      onClick={canOpenDetail ? openCard : undefined}
      role={canOpenDetail ? 'button' : undefined}
      aria-label={canOpenDetail ? 'Открыть товар' : undefined}
    >
      <div
        className={`card-media status-${item.status} ${canOpenMedia ? 'openable' : ''}`}
        onClick={canOpenMedia ? openCard : undefined}
        role={canOpenMedia ? 'button' : undefined}
        aria-label={canOpenMedia ? 'Открыть фото' : undefined}
        /* Наведение/касание ловим на всей плитке: поверх картинки лежат значок видео,
           сердечко и статус — до самой картинки мышь и палец не доходят. */
        onMouseEnter={() => setLive(true)}
        onMouseLeave={() => setLive(false)}
        onTouchStart={() => setLive(true)}
      >
        {media ? (
          media.kind === 'video' && !media.frames
            ? <VideoMedia asset={media} category={item.category} />
            : <ClipMedia asset={media} category={item.category} play={live} />
        ) : (
          <span className="media-glyph"><CategoryGlyph category={item.category} size={38} /></span>
        )}
        {media?.kind === 'video' && <span className="media-clip" aria-label="видео" />}
        <span className={`status-pill ${item.status}`}>{statusLabels[item.status]}</span>
        {variant === 'market' && onFavorite && (
          <button
            type="button"
            className={`heart-btn ${favorite ? 'on' : ''}`}
            onClick={event => { event.stopPropagation(); onFavorite(); }}
            aria-pressed={favorite}
            aria-label={favorite ? 'Убрать из избранного' : 'В избранное'}
          >
            <HeartIcon size={18} filled={favorite} />
          </button>
        )}
        {item.media.length > 1 && <span className="media-count">{item.media.length}</span>}
      </div>
      {viewer && (
        <MediaViewer media={item.media} category={item.category} onClose={() => setViewer(false)} />
      )}
      {detail && (
        <ItemDetail
          item={item}
          favorite={favorite}
          own={isOwn}
          onFavorite={() => onFavorite?.()}
          onBuy={() => onBuy?.()}
          onQueue={() => onQueue?.()}
          onExport={() => onExport?.()}
          onClose={() => setDetail(false)}
        />
      )}

      <div className="card-body">
        {minimal ? (
          <>
            <strong className="card-price">{item.price || 'Цена договорная'}</strong>
            <p className="card-title">{item.title || 'Без названия'}</p>
          </>
        ) : (
          <>
            <div className="card-head">
              <h3>{item.title || 'Без названия'}</h3>
              <strong>{item.price || 'договорная'}</strong>
            </div>

            <div className="quality">
              <span className={`grade-badge g-${item.grade}`}>{item.grade}</span>
              <span className="quality-word">{item.condition}</span>
              {item.battery && <span className="quality-sub">· АКБ {item.battery}</span>}
              {qtyOf(item) > 1 && <span className="quality-sub qty">· {qtyOf(item)} шт</span>}
              {item.dealMode !== 'free' && <span className="quality-sub">· {dealModeLabels[item.dealMode]}</span>}
            </div>

            {light && (
              <p className={`navar-line ${light}`}>
                <span className={`light-dot ${light}`} aria-hidden="true" />
                Прибыль {margin >= 0 ? `+${formatMoney(margin)}` : formatMoney(margin)} · {lightLabel[light]}
              </p>
            )}

            {stale && <p className="stale-line">На площадке {age} {pluralize(age, 'день', 'дня', 'дней')} · пересмотрите цену</p>}

            {item.defects && <p className="defect-line">Нюансы: {item.defects}</p>}

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
          </>
        )}

        {variant === 'own' && (
          <div className="card-actions">
            <span className="status-select">
              <select value={item.status} onChange={event => onStatusChange?.(event.target.value as ItemStatus)} aria-label="Статус товара">
                {statusOrder.map(status => <option value={status} key={status}>{statusLabels[status]}</option>)}
              </select>
            </span>
            <button type="button" className="icon-btn" onClick={onEdit} aria-label="Изменить"><PencilIcon size={16} /></button>
            <button type="button" className="icon-btn" onClick={onExport} aria-label="Поделиться"><SendIcon size={16} /></button>
            <button type="button" className={`icon-btn danger ${confirm ? 'confirm' : ''}`} onClick={handleDelete} aria-label="Удалить">
              {confirm ? 'Удалить?' : <TrashIcon size={16} />}
            </button>
          </div>
        )}

        {isPreview && (
          <div className="card-actions">
            <button type="button" className="ghost-btn wide" onClick={onExport}><SendIcon size={16} />Поделиться</button>
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
