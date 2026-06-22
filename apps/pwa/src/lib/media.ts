import type { MediaAsset } from '../types';
import { uid } from './id';
import { putVideo } from './videostore';

// Храним компактно: карточке и галерее хватает ~900px, а память браузера
// (localStorage) не резиновая — большие фото её переполняют и не сохраняются.
const MAX_DIMENSION = 900;
const JPEG_QUALITY = 0.72;

export async function filesToMedia(files: FileList | File[], limit = 8): Promise<MediaAsset[]> {
  const chosen = Array.from(files).slice(0, limit);
  return Promise.all(chosen.map(fileToMedia));
}

/** Pull direct image links out of pasted text (best-effort, CORS permitting). */
export function extractImageUrls(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s"'<>]+\.(?:jpe?g|png|webp|gif)(?:\?[^\s"'<>]*)?/gi) || [];
  return Array.from(new Set(matches)).slice(0, 8);
}

export async function urlToMedia(url: string): Promise<MediaAsset | null> {
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) return null;
    const blob = await response.blob();
    if (!blob.type.startsWith('image/')) return null;
    const [asset] = await filesToMedia([new File([blob], 'image', { type: blob.type })]);
    return asset ?? null;
  } catch {
    return null;
  }
}

const POSTER_WIDTH = 640;     // ширина кадра-постера (для миниатюры/фолбэка)
const POSTER_QUALITY = 0.72;
const MAX_VIDEO_BYTES = 80 * 1024 * 1024; // 80 МБ — выше уже не короткий ролик

/** Короткое видео (.mov/.mp4) → как «гифка» в Телеграме: сам ролик кладём
 *  в IndexedDB и потом крутим немым <video loop> (плавно, без потери качества).
 *  Дополнительно вытаскиваем один НЕ чёрный кадр-постер (обложка/фолбэк). */
export async function videoToAsset(file: File): Promise<MediaAsset | null> {
  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  try {
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.src = url;

    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const ok = () => { if (!settled) { settled = true; resolve(); } };
      const bad = () => { if (!settled) { settled = true; reject(new Error('meta')); } };
      video.onloadedmetadata = ok;
      video.onerror = bad;
      window.setTimeout(bad, 3500); // не зависаем, если метаданные не пришли
    });

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const full = video.duration && isFinite(video.duration) ? video.duration : 3;
    if (!vw || !vh) return null;

    const scale = Math.min(1, POSTER_WIDTH / vw);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(vw * scale) || vw;
    canvas.height = Math.round(vh * scale) || vh;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Берём несколько кадров и выбираем самый светлый — чтобы обложка не была чёрной.
    let best = '';
    let bestScore = -1;
    const grab = () => {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const score = frameBrightness(ctx, canvas.width, canvas.height);
      if (score > bestScore) {
        bestScore = score;
        best = canvas.toDataURL('image/jpeg', POSTER_QUALITY);
      }
    };
    for (const p of [0.18, 0.4, 0.6, 0.82]) {
      await seekVideo(video, Math.min(p * full, Math.max(0, full - 0.05)));
      grab();
    }
    // Если всё тёмное (перемотка не сработала / чёрное начало) — добываем кадр проигрыванием.
    if (bestScore < 16) {
      try {
        await video.play();
        await new Promise(r => window.setTimeout(r, 500));
        grab();
        video.pause();
      } catch {
        /* автоплей мог не дать — оставляем что есть */
      }
    }
    if (!best) return null;

    const id = uid('vid');
    if (file.size <= MAX_VIDEO_BYTES) await putVideo(id, file); // сам ролик в IndexedDB
    return { id, kind: 'video', name: file.name, src: best };
  } catch {
    return null;
  } finally {
    video.removeAttribute('src');
    URL.revokeObjectURL(url);
  }
}

/** Средняя яркость кадра (0..255) — чтобы отсеять чёрные кадры под обложку. */
function frameBrightness(ctx: CanvasRenderingContext2D, w: number, h: number): number {
  try {
    const step = 8;
    const data = ctx.getImageData(0, 0, w, h).data;
    let sum = 0;
    let n = 0;
    for (let i = 0; i < data.length; i += 4 * step) {
      sum += (data[i] + data[i + 1] + data[i + 2]) / 3;
      n++;
    }
    return n ? sum / n : 0;
  } catch {
    return 0; // tainted canvas и т.п. — не роняем
  }
}

function seekVideo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise(resolve => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      video.removeEventListener('seeked', finish);
      resolve(); // 'seeked' значит кадр готов к отрисовке (без rAF — он тихнет в фоне)
    };
    video.addEventListener('seeked', finish);
    try {
      video.currentTime = time;
    } catch {
      finish();
    }
    window.setTimeout(finish, 400); // страховка, если 'seeked' не придёт
  });
}

function fileToMedia(file: File): Promise<MediaAsset> {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => {
      const source = String(reader.result || '');
      const image = new Image();
      image.onload = () => {
        const scale = Math.min(1, MAX_DIMENSION / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(image.width * scale) || image.width;
        canvas.height = Math.round(image.height * scale) || image.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ id: uid('img'), kind: 'image', name: file.name, src: source });
          return;
        }
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve({ id: uid('img'), kind: 'image', name: file.name, src: canvas.toDataURL('image/jpeg', JPEG_QUALITY) });
      };
      image.onerror = () => resolve({ id: uid('img'), kind: 'image', name: file.name, src: source });
      image.src = source;
    };
    reader.onerror = () => resolve({ id: uid('img'), kind: 'image', name: file.name, src: '' });
    reader.readAsDataURL(file);
  });
}
