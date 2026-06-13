import type { MediaAsset } from '../types';

export const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

/** Turn stored base64 photos back into real File objects for the Web Share API. */
export async function mediaToFiles(media: MediaAsset[]): Promise<File[]> {
  const files: File[] = [];
  for (const asset of media) {
    if (!asset.src) continue;
    try {
      const response = await fetch(asset.src);
      const blob = await response.blob();
      const type = blob.type || 'image/jpeg';
      const ext = (type.split('/')[1] || 'jpg').split('+')[0];
      const base = (asset.name || 'photo').replace(/\.[^./\\]+$/, '');
      files.push(new File([blob], `${base}.${ext}`, { type }));
    } catch {
      // skip an unreadable asset rather than failing the whole share
    }
  }
  return files;
}

export function canShareFiles(files: File[]): boolean {
  if (!files.length) return false;
  try {
    return typeof navigator.canShare === 'function' && navigator.canShare({ files });
  } catch {
    return false;
  }
}

export type ShareResult = 'shared-files' | 'shared-text' | 'cancelled' | 'unsupported' | 'error';

export async function shareItem(opts: { title: string; text: string; files: File[] }): Promise<ShareResult> {
  if (!canShare) return 'unsupported';
  const { title, text, files } = opts;
  try {
    if (canShareFiles(files)) {
      await navigator.share({ title, text, files });
      return 'shared-files';
    }
    await navigator.share({ title, text });
    return 'shared-text';
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return 'cancelled';
    return 'error';
  }
}

export function downloadMedia(media: MediaAsset[]) {
  media.forEach((asset, index) => {
    if (!asset.src) return;
    const link = document.createElement('a');
    link.href = asset.src;
    link.download = asset.name || `bushka-${index + 1}.jpg`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  });
}
