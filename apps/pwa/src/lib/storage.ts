import type { Item, Profile } from '../types';
import { defaultProfile } from '../data/seed';

const itemsKey = 'bushka:pwa:items:v1';
const profileKey = 'bushka:pwa:profile:v1';

export function loadItems(): Item[] {
  try {
    const value = window.localStorage.getItem(itemsKey);
    return value ? JSON.parse(value) as Item[] : [];
  } catch {
    return [];
  }
}

export function saveItems(items: Item[]) {
  window.localStorage.setItem(itemsKey, JSON.stringify(items.slice(0, 80)));
}

export function loadProfile(): Profile {
  try {
    const value = window.localStorage.getItem(profileKey);
    return value ? { ...defaultProfile, ...JSON.parse(value) as Profile } : defaultProfile;
  } catch {
    return defaultProfile;
  }
}

export function saveProfile(profile: Profile) {
  window.localStorage.setItem(profileKey, JSON.stringify(profile));
}
