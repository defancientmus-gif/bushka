import { useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import type { MediaAsset } from '../types';
import { TrashIcon } from './icons';

type Live = {
  mode: 'pending' | 'scroll' | 'drag';
  id: string;
  index: number;
  el: HTMLElement;
  pointerId: number;
  w: number;
  startX: number;
  startY: number;
  startScroll: number;
  to: number;
  del: boolean;
};

type DragView = { id: string; from: number; to: number; dx: number; dy: number; w: number; del: boolean };

const GAP = 8;
const HOLD_MS = 240;    // зажать столько → включается перетаскивание
const MOVE_CANCEL = 8;  // двинул раньше — это листание, не перетаскивание

/** Лента вложений: свайп листает, зажатие (~0.24с) включает перетаскивание,
 *  перетащить на зону «Убрать» снизу — удалить. Без крестиков/стрелок. */
export function MediaStrip({ media, onReorder, onRemove }: {
  media: MediaAsset[];
  onReorder: (from: number, to: number) => void;
  onRemove: (id: string) => void;
}) {
  const stripRef = useRef<HTMLDivElement>(null);
  const trashRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef(0);
  const liveRef = useRef<Live | null>(null);
  const [drag, setDrag] = useState<DragView | null>(null);

  function clearTimer() {
    if (timerRef.current) { window.clearTimeout(timerRef.current); timerRef.current = 0; }
  }

  function onDown(event: ReactPointerEvent, index: number, id: string) {
    if (event.button != null && event.button !== 0) return;
    const el = event.currentTarget as HTMLElement;
    const strip = stripRef.current;
    el.setPointerCapture?.(event.pointerId);
    liveRef.current = {
      mode: 'pending', id, index, el, pointerId: event.pointerId,
      w: el.getBoundingClientRect().width + GAP,
      startX: event.clientX, startY: event.clientY,
      startScroll: strip ? strip.scrollLeft : 0,
      to: index, del: false
    };
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      const s = liveRef.current;
      if (!s || s.mode !== 'pending') return;
      s.mode = 'drag';
      navigator.vibrate?.(8);
      setDrag({ id: s.id, from: s.index, to: s.index, dx: 0, dy: 0, w: s.w, del: false });
    }, HOLD_MS);
  }

  function onMove(event: ReactPointerEvent) {
    const s = liveRef.current;
    if (!s) return;
    const dx = event.clientX - s.startX;
    const dy = event.clientY - s.startY;

    if (s.mode === 'pending') {
      if (Math.hypot(dx, dy) > MOVE_CANCEL) { clearTimer(); s.mode = 'scroll'; }
      else return;
    }

    if (s.mode === 'scroll') {
      const strip = stripRef.current;
      if (strip) strip.scrollLeft = s.startScroll - dx;
      return;
    }

    // mode === 'drag'
    event.preventDefault();
    const strip = stripRef.current;
    if (!strip) return;
    const sr = strip.getBoundingClientRect();
    const tr = trashRef.current?.getBoundingClientRect();
    const del = !!tr && event.clientY >= tr.top - 6 && event.clientX >= tr.left && event.clientX <= tr.right;
    const rel = event.clientX - sr.left + strip.scrollLeft;
    const to = Math.max(0, Math.min(media.length - 1, Math.floor(rel / s.w)));
    s.to = del ? s.index : to;
    s.del = del;
    setDrag({ id: s.id, from: s.index, to: s.to, dx, dy, w: s.w, del });
  }

  function onUp() {
    clearTimer();
    const s = liveRef.current;
    if (s && s.mode === 'drag') {
      if (s.del) onRemove(s.id);
      else if (s.to !== s.index) onReorder(s.index, s.to);
    }
    liveRef.current = null;
    setDrag(null);
  }

  return (
    <div className="strip-wrap">
      <div className="photo-strip" ref={stripRef}>
        {media.map((asset, i) => {
          const dragging = drag?.id === asset.id;
          let shift = 0;
          if (drag && !drag.del && drag.id !== asset.id) {
            if (drag.from < drag.to && i > drag.from && i <= drag.to) shift = -drag.w;
            else if (drag.from > drag.to && i >= drag.to && i < drag.from) shift = drag.w;
          }
          const style: CSSProperties = dragging
            ? { transform: `translate(${drag.dx}px, ${drag.dy}px) scale(1.06)`, transition: 'none', zIndex: 6 }
            : { transform: `translateX(${shift}px)` };
          return (
            <span
              key={asset.id}
              className={`photo-thumb ${dragging ? 'dragging' : ''} ${dragging && drag?.del ? 'del' : ''}`}
              style={style}
              onPointerDown={event => onDown(event, i, asset.id)}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
            >
              <img src={asset.src} alt="" draggable={false} />
              {asset.kind === 'video' && <span className="thumb-clip">видео</span>}
              {i === 0 && !dragging && <span className="thumb-cover">обложка</span>}
            </span>
          );
        })}
      </div>
      {drag && (
        <div className={`strip-trash ${drag.del ? 'armed' : ''}`} ref={trashRef}>
          <TrashIcon size={17} />
          {drag.del ? 'Отпустите, чтобы удалить' : 'Перетащите сюда, чтобы удалить'}
        </div>
      )}
    </div>
  );
}
