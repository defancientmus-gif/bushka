import { useEffect, useRef, useState } from 'react';
import type { Item, ItemStatus } from '../types';
import { dealModeLabels, statusLabels, statusOrder } from '../lib/labels';
import { CategoryGlyph, CopyIcon, PhoneIcon, SendIcon, TrashIcon } from './icons';

export function ItemCard({
  item,
  index = 0,
  variant = 'feed',
  isOwn = false,
  onQueue,
  onExport,
  onDelete,
  onStatusChange
}: {
  item: Item;
  index?: number;
  variant?: 'feed' | 'preview';
  isOwn?: boolean;
  onQueue?: () => void;
  onExport?: () => void;
  onDelete?: () => void;
  onStatusChange?: (status: ItemStatus) => void;
}) {
  const media = item.media[0];
  const isPreview = variant === 'preview';
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
    <article className={`card ${isPreview ? 'preview' : ''}`} style={{ animationDelay: `${Math.min(index, 12) * 45}ms` }}>
      <div className={`card-media status-${item.status}`}>
        {media ? (
          <img src={media.src} alt="" loading="lazy" />
        ) : (
          <span className="media-glyph"><CategoryGlyph category={item.category} size={38} /></span>
        )}
        <span className={`status-pill ${item.status}`}>{statusLabels[item.status]}</span>
        {item.media.length > 1 && <span className="media-count">{item.media.length}</span>}
      </div>

      <div className="card-body">
        <div className="card-head">
          <h3>{item.title || 'Без названия'}</h3>
          <strong>{item.price || 'договорная'}</strong>
        </div>

        <div className="chip-line">
          <span className="tag">{item.condition}</span>
          <span className="tag grade">{item.grade}</span>
          {item.dealMode !== 'free' && <span className="tag deal">{dealModeLabels[item.dealMode]}</span>}
        </div>

        {item.description && <p className="card-desc">{item.description}</p>}

        {(item.battery || item.kit || item.defects) && (
          <dl className="specs">
            {item.battery && <div><dt>Батарея</dt><dd>{item.battery}</dd></div>}
            {item.kit && <div><dt>Комплект</dt><dd>{item.kit}</dd></div>}
            {item.defects && <div><dt>Нюансы</dt><dd>{item.defects}</dd></div>}
          </dl>
        )}

        {item.status === 'reserved' && item.reservedUntil && (
          <p className="reserve-note">Бронь до {item.reservedUntil}</p>
        )}

        <div className="card-meta">
          <span>{[item.sellerName, item.city].filter(Boolean).join(' · ')}</span>
          {item.queueCount > 0 && <span className="queue">{item.queueCount} в очереди</span>}
        </div>

        {!isPreview && (
          <div className="card-actions">
            {isOwn ? (
              <>
                <span className="status-select">
                  <select value={item.status} onChange={event => onStatusChange?.(event.target.value as ItemStatus)} aria-label="Статус товара">
                    {statusOrder.map(status => <option value={status} key={status}>{statusLabels[status]}</option>)}
                  </select>
                </span>
                <button type="button" className="ghost-btn" onClick={onExport}><SendIcon size={16} />Репост</button>
                <button type="button" className={`icon-btn danger ${confirm ? 'confirm' : ''}`} onClick={handleDelete} aria-label="Удалить">
                  {confirm ? 'Точно?' : <TrashIcon size={16} />}
                </button>
              </>
            ) : (
              <>
                <button type="button" className="solid-btn" onClick={onQueue}>Запрос</button>
                <ContactLink contact={item.contact} />
                <button type="button" className="icon-btn" onClick={onExport} aria-label="Текст репоста"><CopyIcon size={16} /></button>
              </>
            )}
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

function ContactLink({ contact }: { contact: string }) {
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
  return <span className="contact-link muted">{contact || 'Контакт'}</span>;
}
