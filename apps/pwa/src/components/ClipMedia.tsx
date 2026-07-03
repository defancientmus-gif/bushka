import { useEffect, useState } from 'react';
import type { Category, MediaAsset } from '../types';
import { CategoryGlyph } from './icons';

/** Немая петля кадров (как ТГ-гифка). Для фото — обычная картинка.
 *  Если фото битое (не сохранилось / пустой src) — показываем значок категории,
 *  а не «полоску». */
export function ClipMedia({ asset, category }: { asset: MediaAsset; category: Category }) {
  const frames = asset.frames;
  const [idx, setIdx] = useState(0);
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [asset.id]);
  useEffect(() => {
    if (!frames || frames.length < 2) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    let last = 0;
    let i = 0;
    const step = 1000 / 8; // ~8 кадров/сек — живо, но спокойно
    const loop = (ts: number) => {
      if (ts - last >= step) {
        i = (i + 1) % frames.length;
        setIdx(i);
        last = ts;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [frames]);
  const src = frames && frames.length ? frames[idx] : asset.src;
  if (failed || !src) return <span className="media-glyph"><CategoryGlyph category={category} size={38} /></span>;
  return <img src={src} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />;
}
