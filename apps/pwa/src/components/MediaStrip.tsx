import { useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import type { MediaAsset } from '../types';

type DragState = {
  id: string;
  from: number;
  to: number;
  dx: number;
  dy: number;
  w: number;
  moved: boolean;
  del: boolean;
};

const GAP = 8;
const THRESHOLD = 6;     // px прежде чем считать это перетаскиванием, а не тапом
const DELETE_DROP = 36;  // насколько ниже ленты тянуть, чтобы убрать

/** Лента вложений с перетаскиванием зажатием: взял фото — приподнимается,
 *  соседние расступаются, видно куда встанет. Вниз — убрать. Без крестиков/стрелок. */
export function MediaStrip({ media, onReorder, onRemove }: {
  media: MediaAsset[];
  onReorder: (from: number, to: number) => void;
  onRemove: (id: string) => void;
}) {
  const stripRef = useRef<HTMLDivElement>(null);
  const startRef = useRef({ x: 0, y: 0 });
  const [drag, setDrag] = useState<DragState | null>(null);

  function onDown(event: ReactPointerEvent, index: number, id: string) {
    if (event.button != null && event.button !== 0) return;
    const el = event.currentTarget as HTMLElement;
    el.setPointerCapture?.(event.pointerId);
    const rect = el.getBoundingClientRect();
    startRef.current = { x: event.clientX, y: event.clientY };
    setDrag({ id, from: index, to: index, dx: 0, dy: 0, w: rect.width + GAP, moved: false, del: false });
  }

  function onMove(event: ReactPointerEvent) {
    if (!drag) return;
    const dx = event.clientX - startRef.current.x;
    const dy = event.clientY - startRef.current.y;
    const moved = drag.moved || Math.hypot(dx, dy) > THRESHOLD;
    const strip = stripRef.current;
    let to = drag.to;
    let del = false;
    if (strip) {
      const sr = strip.getBoundingClientRect();
      del = event.clientY > sr.bottom + DELETE_DROP;
      const rel = event.clientX - sr.left + strip.scrollLeft;
      to = Math.max(0, Math.min(media.length - 1, Math.floor(rel / drag.w)));
    }
    setDrag({ ...drag, dx, dy, moved, to: del ? drag.from : to, del });
  }

  function onUp() {
    if (drag && drag.moved) {
      if (drag.del) onRemove(drag.id);
      else if (drag.to !== drag.from) onReorder(drag.from, drag.to);
    }
    setDrag(null);
  }

  return (
    <div className="photo-strip" ref={stripRef}>
      {media.map((asset, i) => {
        const dragging = drag?.id === asset.id && drag.moved;
        let shift = 0;
        if (drag && drag.moved && !drag.del && drag.id !== asset.id) {
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
            {dragging && drag?.del && <span className="thumb-trash">убрать</span>}
          </span>
        );
      })}
    </div>
  );
}
