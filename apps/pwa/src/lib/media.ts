import type { MediaAsset } from '../types';
import { uid } from './id';

const MAX_DIMENSION = 1200;
const JPEG_QUALITY = 0.82;

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
