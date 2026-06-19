import {
  loadFavorites,
  loadItems,
  loadProfile,
  loadTxns,
  saveFavorites,
  saveItems,
  saveProfile,
  saveTxns
} from './storage';
import { APP_VERSION } from './version';

/** Download the whole local cabinet (items, profile, money, favorites) as one file. */
export function downloadBackup() {
  const data = {
    app: 'bushka',
    version: APP_VERSION,
    savedAt: new Date().toISOString(),
    items: loadItems(),
    profile: loadProfile(),
    txns: loadTxns(),
    favorites: loadFavorites()
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'bushka-sklad.json';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function importBackup(file: File): Promise<boolean> {
  try {
    const data = JSON.parse(await file.text());
    if (data.app && data.app !== 'bushka') return false;
    if (Array.isArray(data.items)) saveItems(data.items);
    if (data.profile && typeof data.profile === 'object') saveProfile(data.profile);
    if (Array.isArray(data.txns)) saveTxns(data.txns);
    if (Array.isArray(data.favorites)) saveFavorites(data.favorites);
    return true;
  } catch {
    return false;
  }
}
