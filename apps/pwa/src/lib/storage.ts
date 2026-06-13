import type { Item, Profile } from '../types';
import { defaultProfile } from '../data/seed';

const itemsKey = 'bushka:pwa:items:v1';
const profileKey = 'bushka:pwa:profile:v1';
const favoritesKey = 'bushka:pwa:favorites:v1';

export const MAX_ITEMS = 120;

export type SaveResult = 'ok' | 'degraded' | 'failed';

export function loadItems(): Item[] {
  try {
    const value = window.localStorage.getItem(itemsKey);
    if (!value) return [];
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as Item[]) : [];
  } catch {
    return [];
  }
}

/**
 * Persists items, degrading gracefully when localStorage is full.
 * Photos are stored as base64 data URLs and can exceed the ~5MB quota, so we
 * progressively shed media instead of letting setItem throw and break the UI.
 */
export function saveItems(items: Item[]): SaveResult {
  const trimmed = items.slice(0, MAX_ITEMS);
  const attempts: Array<{ data: Item[]; result: SaveResult }> = [
    { data: trimmed, result: 'ok' },
    { data: trimmed.map(item => ({ ...item, media: item.media.slice(0, 1) })), result: 'degraded' },
    { data: trimmed.map(item => ({ ...item, media: [] })), result: 'degraded' }
  ];

  for (const attempt of attempts) {
    try {
      window.localStorage.setItem(itemsKey, JSON.stringify(attempt.data));
      return attempt.result;
    } catch {
      // try the next, lighter payload
    }
  }
  return 'failed';
}

export function loadProfile(): Profile {
  try {
    const value = window.localStorage.getItem(profileKey);
    return value ? { ...defaultProfile, ...(JSON.parse(value) as Partial<Profile>) } : defaultProfile;
  } catch {
    return defaultProfile;
  }
}

export function saveProfile(profile: Profile) {
  try {
    window.localStorage.setItem(profileKey, JSON.stringify(profile));
  } catch {
    // non-critical: profile stays in memory for this session
  }
}

export function loadFavorites(): string[] {
  try {
    const value = window.localStorage.getItem(favoritesKey);
    if (!value) return [];
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

export function saveFavorites(ids: string[]) {
  try {
    window.localStorage.setItem(favoritesKey, JSON.stringify(ids));
  } catch {
    // non-critical
  }
}
