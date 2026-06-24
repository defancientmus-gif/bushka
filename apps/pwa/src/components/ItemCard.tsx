import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import type { Item, ItemStatus } from '../types';
import { dealModeLabels, deliveryLabels, statusLabels, statusOrder } from '../lib/labels';
import { daysOld, formatMoney, isStale, lightLabel, marginLight, toNum } from '../lib/money';
import { pluralize } from '../lib/format';
import { CategoryGlyph, CopyIcon, HeartIcon, PencilIcon, PhoneIcon, SendIcon, TrashIcon } from './icons';
import { ClipMedia } from './ClipMedia';
import { VideoMedia } from './VideoMedia';
import { MediaViewer } from './MediaViewer';

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
  const stale = variant === 'own' && isStale(item);
  const age = daysOld(item.createdAt);
  const [confirm, setConfirm] = useState(false);
  const [viewer, setViewer] = useState(false);
  const timer = useRef(0);
  const canOpen = !isPreview && item.media.length > 0;

  // Лупа: зажал на фото → кружок увеличивает кусок (из исходника, резче карточки).
  // Слушатели вешаем на window только на время касания: пока ждём зажатие — passive
  // (прокрутка остаётся гладкой), когда лупа активна — non-passive (глушим скролл).
  const LOUPE_R = 66;
  const LOUPE_ZOOM = 2.4;
  const mediaRef = useRef<HTMLDivElement>(null);
  const loupeTimer = useRef(0);
  const Lref = useRef<{ x0: number; y0: number; active: boolean; moved: boolean; pid: number } | null>(null);
  const nat = useRef<{ w: number; h: number }>({ w: 0, h: 0 });
  const canOpenRef = useRef(canOpen);
  canOpenRef.current = canOpen;
  const [loupe, setLoupe] = useState<{ x: number; y: number; cx: number; cy: number } | null>(null);
  const canLoupe = !!(media && media.src);

  const fns = useRef<{ pending: (e: PointerEvent) => void; active: (e: PointerEvent) => void; block: (e: TouchEvent) => void; end: () => void } | null>(null);
  if (!fns.current) {
    fns.current = {
      pending: (e) => {
        const L = Lref.current;
        if (!L || L.active) return;
        if (Math.hypot(e.clientX - L.x0, e.clientY - L.y0) > 12) { L.moved = true; window.clearTimeout(loupeTimer.current); }
      },
      active: (e) => {
        const L = Lref.current;
        const el = mediaRef.current;
        if (!L || !L.active || !el) return;
        const r = el.getBoundingClientRect();
        setLoupe({ x: e.clientX - r.left, y: e.clientY - r.top, cx: e.clientX, cy: e.clientY });
      },
      // На мобиле прокрутку глушит только non-passive touchmove (не pointermove).
      block: (e) => { if (Lref.current?.active && e.cancelable) e.preventDefault(); },
      end: () => {
        window.clearTimeout(loupeTimer.current);
        const f = fns.current!;
        window.removeEventListener('pointermove', f.pending);
        window.removeEventListener('pointermove', f.active);
        window.removeEventListener('touchmove', f.block);
        window.removeEventListener('pointerup', f.end);
        window.removeEventListener('pointercancel', f.end);
        const L = Lref.current;
        Lref.current = null;
        setLoupe(null);
        if (L && !L.active && !L.moved && canOpenRef.current) setViewer(true); // тап → открыть галерею
      }
    };
  }

  useEffect(() => () => {
    window.clearTimeout(timer.current);
    window.clearTimeout(loupeTimer.current);
    const f = fns.current;
    if (f) {
      window.removeEventListener('pointermove', f.pending);
      window.removeEventListener('pointermove', f.active);
      window.removeEventListener('touchmove', f.block);
      window.removeEventListener('pointerup', f.end);
      window.removeEventListener('pointercancel', f.end);
    }
  }, []);

  function loupeDown(event: ReactPointerEvent) {
    if (!canLoupe || (event.button != null && event.button !== 0)) return;
    const el = mediaRef.current;
    if (!el) return;
    const f = fns.current!;
    const pid = event.pointerId;
    Lref.current = { x0: event.clientX, y0: event.clientY, active: false, moved: false, pid };
    window.clearTimeout(loupeTimer.current);
    window.addEventListener('pointermove', f.pending, { passive: true });
    window.addEventListener('pointerup', f.end);
    window.addEventListener('pointercancel', f.end);
    loupeTimer.current = window.setTimeout(() => {
      const L = Lref.current;
      if (!L || L.active) return;
      L.active = true;
      try { el.setPointerCapture(pid); } catch { /* synthetic */ }
      navigator.vibrate?.(6);
      const inner = el.querySelector('img, video') as HTMLImageElement | HTMLVideoElement | null;
      nat.current = {
        w: (inner as HTMLImageElement)?.naturalWidth || (inner as HTMLVideoElement)?.videoWidth || el.clientWidth,
        h: (inner as HTMLImageElement)?.naturalHeight || (inner as HTMLVideoElement)?.videoHeight || el.clientHeight
      };
      window.removeEventListener('pointermove', f.pending);
      window.addEventListener('pointermove', f.active, { passive: true });
      window.addEventListener('touchmove', f.block, { passive: false }); // глушим прокрутку под лупой
      const r = el.getBoundingClientRect();
      setLoupe({ x: L.x0 - r.left, y: L.y0 - r.top, cx: L.x0, cy: L.y0 });
    }, 240);
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

  function renderLoupe() {
    if (!loupe || !media || !mediaRef.current) return null;
    const CW = mediaRef.current.clientWidth;
    const CH = mediaRef.current.clientHeight;
    if (!(CW > 0 && CH > 0)) return null; // ещё нет размеров — не считаем NaN
    const IW = nat.current.w || CW;
    const IH = nat.current.h || CH;
    const s = Math.max(CW / IW, CH / IH) || 1; // как object-fit: cover
    const rw = IW * s;
    const rh = IH * s;
    const ox = (CW - rw) / 2;
    const oy = (CH - rh) / 2;
    const imgStyle: CSSProperties = {
      width: rw * LOUPE_ZOOM,
      height: rh * LOUPE_ZOOM,
      left: LOUPE_R - (loupe.x - ox) * LOUPE_ZOOM,
      top: LOUPE_R - (loupe.y - oy) * LOUPE_ZOOM
    };
    const lift = 56;
    let left = Math.max(6, Math.min(window.innerWidth - 2 * LOUPE_R - 6, loupe.cx - LOUPE_R));
    let top = loupe.cy - LOUPE_R - lift;
    if (top < 6) top = loupe.cy + lift; // у верхнего края — показываем ниже пальца
    return createPortal(
      <div className="loupe" style={{ left, top }} aria-hidden="true">
        <img src={media.src} alt="" draggable={false} style={imgStyle} />
      </div>,
      document.body
    );
  }

  return (
    <article className={`card card-${variant} ${isPreview ? 'preview' : ''}`} style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}>
      <div
        ref={mediaRef}
        className={`card-media status-${item.status} ${canOpen ? 'openable' : ''} ${loupe ? 'louping' : ''}`}
        onPointerDown={canLoupe ? loupeDown : undefined}
        onContextMenu={canLoupe ? (event => event.preventDefault()) : undefined}
        role={canOpen ? 'button' : undefined}
        aria-label={canOpen ? 'Открыть фото и видео' : undefined}
      >
        {media ? (
          media.kind === 'video' && !media.frames
            ? <VideoMedia asset={media} category={item.category} />
            : <ClipMedia asset={media} category={item.category} />
        ) : (
          <span className="media-glyph"><CategoryGlyph category={item.category} size={38} /></span>
        )}
        {media?.kind === 'video' && <span className="media-clip" aria-label="видео" />}
        <span className={`status-pill ${item.status}`}>{statusLabels[item.status]}</span>
        {variant === 'market' && onFavorite && (
          <button
            type="button"
            className={`heart-btn ${favorite ? 'on' : ''}`}
            onPointerDown={event => event.stopPropagation()}
            onClick={event => { event.stopPropagation(); onFavorite(); }}
            aria-pressed={favorite}
            aria-label={favorite ? 'Убрать из избранного' : 'В избранное'}
          >
            <HeartIcon size={18} filled={favorite} />
          </button>
        )}
        {item.media.length > 1 && <span className="media-count">{item.media.length}</span>}
      </div>
      {renderLoupe()}
      {viewer && (
        <MediaViewer media={item.media} category={item.category} onClose={() => setViewer(false)} />
      )}

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

        {stale && <p className="stale-line">Висит {age} {pluralize(age, 'день', 'дня', 'дней')} · подвинь цену, освободи кэш</p>}

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
