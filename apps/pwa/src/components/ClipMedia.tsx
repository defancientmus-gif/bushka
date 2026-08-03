import { useEffect, useRef, useState } from 'react';
import type { Category, MediaAsset } from '../types';
import { CategoryGlyph } from './icons';

/** Немая петля кадров (как ТГ-гифка). Для фото — обычная картинка.
 *
 *  Оживает НЕ всегда, а когда человек смотрит именно на неё:
 *  · `play` — снаружи: мышь навели на карточку / палец коснулся;
 *  · телефон — сама, когда карточка в середине экрана (как лента в ТГ);
 *  · `autoplay` — там, где товар уже открыт специально (карточка, просмотр фото).
 *  Иначе десятки петель дёргаются разом и рябит в глазах.
 *
 *  Битое фото (пустой src) — показываем значок категории, а не «полоску». */
export function ClipMedia({ asset, category, play = false, autoplay = false }: {
  asset: MediaAsset;
  category: Category;
  play?: boolean;
  autoplay?: boolean;
}) {
  const frames = asset.frames;
  const hasLoop = !!frames && frames.length > 1;
  const [idx, setIdx] = useState(0);
  const [failed, setFailed] = useState(false);
  const [inView, setInView] = useState(false);
  const hostRef = useRef<HTMLImageElement>(null);

  useEffect(() => { setFailed(false); }, [asset.id]);

  // Телефон: петля сама играет, когда карточка в середине экрана.
  useEffect(() => {
    if (!hasLoop || autoplay) return;
    const el = hostRef.current;
    if (!el || typeof IntersectionObserver !== 'function') return;
    // Автопуск нужен там, где мыши нет (телефон/планшет): наводить нечем, значит играем
    // по попаданию в центр экрана. Признак «мышиного» устройства — hover БЕЗ тача.
    const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const mouseOnly = window.matchMedia?.('(hover: hover)').matches && !touch;
    if (mouseOnly) return;
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: '-35% 0px -35% 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasLoop, autoplay]);

  const active = hasLoop && (autoplay || play || inView);

  useEffect(() => {
    if (!active) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    // Таймер, а не requestAnimationFrame: rAF замирает, когда вкладка не на переднем плане,
    // и петля «залипает» на первом кадре. Кадров мало (8), шаг ровный — таймер тут честнее.
    let i = 0;
    const id = window.setInterval(() => {
      i = (i + 1) % frames!.length;
      setIdx(i);
    }, 100); // ~10 кадров/сек — плавно, как гифка
    return () => window.clearInterval(id);
  }, [active, frames]);

  // Отвели взгляд — возвращаемся на первый кадр: карточка снова спокойное фото.
  useEffect(() => { if (!active) setIdx(0); }, [active]);

  const src = frames && frames.length ? frames[idx] : asset.src;
  if (failed || !src) return <span className="media-glyph"><CategoryGlyph category={category} size={38} /></span>;

  return <img ref={hostRef} src={src} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />;
}
