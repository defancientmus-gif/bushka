import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Item } from '../types';
import { ClipMedia } from './ClipMedia';
import { VideoMedia } from './VideoMedia';
import { MediaViewer } from './MediaViewer';
import { CategoryGlyph, CloseIcon, HeartIcon, SendIcon } from './icons';
import { dealModeLabels, deliveryLabels, statusLabels } from '../lib/labels';

/** Полная карточка товара: фото/видео листаются, ниже — вся информация по полочкам,
 *  внизу — действия. Открывается на весь экран (портал в body). */
export function ItemDetail({ item, favorite, own = false, onFavorite, onBuy, onQueue, onExport, onClose }: {
  item: Item;
  favorite: boolean;
  own?: boolean;
  onFavorite: () => void;
  onBuy: () => void;
  onQueue: () => void;
  onExport: () => void;
  onClose: () => void;
}) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const media = item.media;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return createPortal(
    <div className="detail-backdrop" role="presentation" onClick={onClose}>
      <section className="detail-sheet" role="dialog" aria-modal="true" aria-label={item.title || 'Товар'} onClick={event => event.stopPropagation()}>
        <button type="button" className="detail-close" onClick={onClose} aria-label="Закрыть"><CloseIcon size={18} /></button>

        <div className="detail-scroll">
          <div className={`detail-media status-${item.status}`}>
            {media.length ? (
              <div className="detail-slides">
                {media.map((asset, i) => (
                  <button type="button" key={asset.id} className="detail-slide" onClick={() => setViewerIndex(i)} aria-label="Открыть на весь экран">
                    {asset.kind === 'video' && !asset.frames
                      ? <VideoMedia asset={asset} category={item.category} />
                      : <ClipMedia asset={asset} category={item.category} autoplay />}
                    {asset.kind === 'video' && <span className="media-clip" aria-label="видео" />}
                  </button>
                ))}
              </div>
            ) : (
              <span className="media-glyph"><CategoryGlyph category={item.category} size={48} /></span>
            )}
            <span className={`status-pill ${item.status}`}>{statusLabels[item.status]}</span>
            {media.length > 1 && <span className="media-count">{media.length} фото</span>}
          </div>

          <div className="detail-info">
            <div className="detail-head">
              <h2>{item.title || 'Без названия'}</h2>
              <strong className="detail-price">{item.price || 'договорная'}</strong>
            </div>

            <div className="quality">
              <span className={`grade-badge g-${item.grade}`}>{item.grade}</span>
              <span className="quality-word">{item.condition}</span>
              {item.battery && <span className="quality-sub">· АКБ {item.battery}</span>}
              {item.dealMode !== 'free' && <span className="quality-sub">· {dealModeLabels[item.dealMode]}</span>}
            </div>

            <p className={`defect-line ${item.defects?.trim() ? '' : 'clean'}`}>
              Недостатки: {item.defects?.trim() || 'нет'}
            </p>

            {item.status === 'reserved' && item.reservedUntil && (
              <p className="reserve-note">Бронь до {item.reservedUntil}</p>
            )}

            {item.description && <p className="detail-desc">{item.description}</p>}

            <dl className="detail-specs">
              {item.kit && <div><dt>Комплект</dt><dd>{item.kit}</dd></div>}
              {item.delivery && item.delivery.length > 0 && (
                <div><dt>Получение</dt><dd>{item.delivery.map(kind => deliveryLabels[kind]).join(' · ')}</dd></div>
              )}
              {item.city && <div><dt>Город</dt><dd>{item.city}</dd></div>}
            </dl>

            {!own && (
              <div className="detail-seller">
                <div className="avatar sm">{(item.sellerName || 'Б').trim().charAt(0).toUpperCase()}</div>
                <div className="detail-seller-id">
                  <strong>{item.sellerName || 'Продавец'}</strong>
                  <span>
                    {item.sellerRating != null && <b className="star">★ {item.sellerRating.toFixed(1)}</b>}
                    {item.city || 'Город не указан'}
                  </span>
                </div>
                {item.queueCount > 0 && (
                  <span className="detail-queue">{item.queueCount} в очереди</span>
                )}
              </div>
            )}
          </div>
        </div>

        {own ? (
          <div className="detail-actions own">
            <span className="own-note">Ваш товар — так его видит покупатель</span>
            <button type="button" className="ghost-btn grow" onClick={onExport}><SendIcon size={16} />Поделиться</button>
          </div>
        ) : (
          <div className="detail-actions">
            <button type="button" className={`heart-btn-lg ${favorite ? 'on' : ''}`} onClick={onFavorite} aria-pressed={favorite} aria-label={favorite ? 'Убрать из избранного' : 'В избранное'}>
              <HeartIcon size={20} filled={favorite} />
            </button>
            <button type="button" className="ghost-btn" onClick={onExport} aria-label="Поделиться"><SendIcon size={16} /></button>
            <button type="button" className="ghost-btn grow" onClick={onQueue}>Запрос</button>
            <button type="button" className="solid-btn accent grow big" onClick={onBuy}>Купить</button>
          </div>
        )}

        {viewerIndex != null && (
          <MediaViewer media={media} category={item.category} startIndex={viewerIndex} onClose={() => setViewerIndex(null)} />
        )}
      </section>
    </div>,
    document.body
  );
}
