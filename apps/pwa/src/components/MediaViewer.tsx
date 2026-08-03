import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Category, MediaAsset } from '../types';
import { ClipMedia } from './ClipMedia';
import { VideoMedia } from './VideoMedia';
import { CloseIcon } from './icons';

/** Полноэкранный просмотр вложений товара: листать фото и видео-петли. */
export function MediaViewer({ media, category, startIndex = 0, onClose }: {
  media: MediaAsset[];
  category: Category;
  startIndex?: number;
  onClose: () => void;
}) {
  const [i, setI] = useState(startIndex);
  const count = media.length;
  const startX = useRef(0);

  function go(dir: number) {
    setI(prev => (prev + dir + count) % count);
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      else if (event.key === 'ArrowRight') go(1);
      else if (event.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  const cur = media[i];
  if (!cur) return null;

  // Портал в body: иначе transform карточки «ловит» fixed-оверлей в себя.
  return createPortal(
    <div className="viewer-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <button type="button" className="viewer-close" onClick={onClose} aria-label="Закрыть"><CloseIcon size={18} /></button>
      {count > 1 && <span className="viewer-count">{i + 1} / {count}</span>}
      <div
        className="viewer-stage"
        onClick={event => event.stopPropagation()}
        onTouchStart={event => { startX.current = event.touches[0].clientX; }}
        onTouchEnd={event => {
          const dx = event.changedTouches[0].clientX - startX.current;
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
        }}
      >
        <div className="viewer-media">
          {cur.kind === 'video' && !cur.frames
            ? <VideoMedia asset={cur} category={category} />
            : <ClipMedia asset={cur} category={category} autoplay />}
        </div>
        {count > 1 && (
          <>
            <button type="button" className="viewer-nav prev" onClick={() => go(-1)} aria-label="Назад">‹</button>
            <button type="button" className="viewer-nav next" onClick={() => go(1)} aria-label="Вперёд">›</button>
            <div className="viewer-dots">
              {media.map((asset, k) => <span key={asset.id} className={k === i ? 'on' : ''} />)}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
