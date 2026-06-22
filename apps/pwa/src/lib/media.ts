import type { MediaAsset } from '../types';
import { uid } from './id';

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

const CLIP_FRAMES = 10;       // кадров в петле
const CLIP_SECONDS = 2.6;     // длина куска, из которого берём кадры
const CLIP_WIDTH = 300;       // ширина кадра (мельче — легче в памяти)
const CLIP_QUALITY = 0.58;

/** Короткое видео (.mov/.mp4) → немая петля кадров, как гифка в Телеграме.
 *  Целиком видео не храним (тяжело для браузера) — нарезаем лёгкие кадры.
 *  Декод делает браузер продавца; если кодек не отдаёт кадры — вернём null. */
export async function videoToClip(file: File): Promise<MediaAsset | null> {
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
    const full = video.duration && isFinite(video.duration) ? video.duration : CLIP_SECONDS;
    if (!vw || !vh) return null;

    const span = Math.min(CLIP_SECONDS, full);
    const scale = Math.min(1, CLIP_WIDTH / vw);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(vw * scale) || vw;
    canvas.height = Math.round(vh * scale) || vh;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const frames: string[] = [];
    for (let i = 0; i < CLIP_FRAMES; i++) {
      const t = (span * i) / (CLIP_FRAMES - 1);
      await seekVideo(video, Math.min(t, Math.max(0, full - 0.05)));
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const frame = canvas.toDataURL('image/jpeg', CLIP_QUALITY);
      if (frame.length > 64) frames.push(frame);
    }
    if (frames.length < 2) return null;
    return { id: uid('clip'), kind: 'video', name: file.name, src: frames[0], frames };
  } catch {
    return null;
  } finally {
    video.removeAttribute('src');
    URL.revokeObjectURL(url);
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
