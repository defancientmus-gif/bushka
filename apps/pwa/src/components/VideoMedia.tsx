import { useEffect, useRef, useState } from 'react';
import type { Category, MediaAsset } from '../types';
import { CategoryGlyph } from './icons';
import { getVideo } from '../lib/videostore';

/** Немое зацикленное видео (как «гифка» в Телеграме — плавно, без потери качества).
 *  Играет только когда видно на экране (IntersectionObserver) — чтобы десяток
 *  роликов на витрине не декодировались разом и не лагали.
 *  Пока ролик грузится (или его нет — например, после восстановления бэкапа без
 *  видео) показываем кадр-постер; если и его нет/битый — значок категории. */
export function VideoMedia({ asset, category }: { asset: MediaAsset; category: Category }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const vidRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let objUrl: string | null = null;
    let alive = true;
    setUrl(null);
    setFailed(false);
    getVideo(asset.id).then(blob => {
      if (alive && blob) {
        objUrl = URL.createObjectURL(blob);
        setUrl(objUrl);
      }
    }).catch(() => {});
    return () => {
      alive = false;
      if (objUrl) URL.revokeObjectURL(objUrl);
    };
  }, [asset.id]);

  useEffect(() => {
    const video = vidRef.current;
    if (!video || !url) return;
    const io = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) video.play().catch(() => {});
        else video.pause();
      }
    }, { threshold: 0.2 });
    io.observe(video);
    return () => io.disconnect();
  }, [url]);

  if (failed) return <span className="media-glyph"><CategoryGlyph category={category} size={38} /></span>;

  if (!url) {
    if (asset.src) return <img src={asset.src} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />;
    return <span className="media-glyph"><CategoryGlyph category={category} size={38} /></span>;
  }

  return (
    <video
      ref={vidRef}
      src={url}
      poster={asset.src || undefined}
      muted
      loop
      playsInline
      preload="metadata"
      onError={() => setFailed(true)}
    />
  );
}
