import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { DraftItem, Item, ItemStatus, Profile, Txn, TxnKind } from '../types';
import { defaultProfile, seedItems } from '../data/seed';
import {
  loadFavorites,
  loadItems,
  loadProfile,
  loadTxns,
  saveFavorites,
  saveItems,
  saveProfile as persistProfile,
  saveTxns,
  type SaveResult
} from './storage';
import { uid } from './id';
import { statusLabels } from './labels';
import { reserveTimeFromNow } from './format';
import { batteryLabel, formatMoney, normalizePrice, toNum } from './money';
import { delVideo } from './videostore';
import { pushListing, removeListing, resyncOwnListings } from './cloud';

type StoreValue = {
  profile: Profile;
  items: Item[];
  seed: Item[];
  favorites: string[];
  txns: Txn[];
  toast: string;
  showToast: (message: string) => void;
  updateProfile: (patch: Partial<Profile>) => void;
  saveProfile: () => void;
  addItem: (draft: DraftItem, sellerName: string) => boolean;
  updateItem: (id: string, draft: DraftItem) => boolean;
  updateStatus: (id: string, status: ItemStatus) => void;
  addQueue: (item: Item) => void;
  deleteItem: (id: string) => void;
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  addTxn: (kind: TxnKind, amount: number, note: string) => void;
  deleteTxn: (id: string) => void;
};

const StoreContext = createContext<StoreValue | null>(null);

let toastTimer = 0;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile>(() => loadProfile());
  const [items, setItems] = useState<Item[]>(() => loadItems());
  const [favorites, setFavorites] = useState<string[]>(() => loadFavorites());
  const [txns, setTxns] = useState<Txn[]>(() => loadTxns());
  const [toast, setToast] = useState('');

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => setToast(''), 1900);
  }, []);

  // Одноразовая зачистка приватности: перезалить свои товары уже без закупки/источника,
  // перетереть строки, что улетели в облако до защиты. Раз на устройство, фоном.
  useEffect(() => {
    const KEY = 'bushka:pwa:privacy-resync:v1';
    try {
      if (localStorage.getItem(KEY) || !items.length) return;
      void resyncOwnListings(items).finally(() => {
        try { localStorage.setItem(KEY, '1'); } catch { /* ignore */ }
      });
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = useCallback((next: Item[]) => {
    setItems(next);
    const result: SaveResult = saveItems(next);
    if (result === 'degraded') showToast('Память почти полна — фото урезаны');
    else if (result === 'failed') showToast('Не удалось сохранить локально');
  }, [showToast]);

  const updateProfile = useCallback((patch: Partial<Profile>) => {
    setProfile(current => ({ ...current, ...patch }));
  }, []);

  const saveProfile = useCallback(() => {
    setProfile(current => {
      persistProfile(current);
      return current;
    });
    showToast('Профиль сохранён');
  }, [showToast]);

  const cleanDraft = useCallback((draft: DraftItem) => ({
    ...draft,
    title: draft.title.trim(),
    price: normalizePrice(draft.price),
    battery: batteryLabel(draft.battery),
    description: draft.description.trim()
  }), []);

  const addItem = useCallback((draft: DraftItem, sellerName: string): boolean => {
    if (!draft.title.trim()) {
      showToast('Нужно название');
      return false;
    }
    if (!draft.contact.trim()) {
      showToast('Нужен контакт');
      return false;
    }
    const now = Date.now();
    const item: Item = {
      ...cleanDraft(draft),
      id: uid('item'),
      sellerName: sellerName || defaultProfile.name,
      queueCount: 0,
      createdAt: now,
      updatedAt: now
    };
    persist([item, ...items]);
    void pushListing(item); // в общую витрину (фоном, local-first)
    showToast('Товар в складе');
    return true;
  }, [items, persist, showToast, cleanDraft]);

  const updateItem = useCallback((id: string, draft: DraftItem): boolean => {
    if (!draft.title.trim()) {
      showToast('Нужно название');
      return false;
    }
    if (!draft.contact.trim()) {
      showToast('Нужен контакт');
      return false;
    }
    const updated = items.map(item => (
      item.id === id ? { ...item, ...cleanDraft(draft), updatedAt: Date.now() } : item
    ));
    persist(updated);
    const changed = updated.find(item => item.id === id);
    if (changed) void pushListing(changed);
    showToast('Изменения сохранены');
    return true;
  }, [items, persist, showToast, cleanDraft]);

  const updateStatus = useCallback((id: string, status: ItemStatus) => {
    const target = items.find(item => item.id === id);
    const updated = items.map(item => (
      item.id === id
        ? {
            ...item,
            status,
            reservedUntil: status === 'reserved' ? (item.reservedUntil || reserveTimeFromNow()) : '',
            updatedAt: Date.now()
          }
        : item
    ));
    persist(updated);
    const changed = updated.find(item => item.id === id);
    if (changed) void pushListing(changed); // витрина видит новый статус (sold уходит)
    if (status === 'sold' && target && toNum(target.costPrice) > 0) {
      const margin = toNum(target.price) - toNum(target.costPrice);
      showToast(margin >= 0 ? `Продано · прибыль +${formatMoney(margin)}` : `Продано · ${formatMoney(margin)}`);
    } else {
      showToast(statusLabels[status]);
    }
  }, [items, persist, showToast]);

  const addQueue = useCallback((item: Item) => {
    if (item.id.startsWith('seed-')) {
      showToast('Запрос отправлен');
      return;
    }
    persist(items.map(current => (
      current.id === item.id
        ? { ...current, queueCount: current.queueCount + 1, updatedAt: Date.now() }
        : current
    )));
    showToast('Запрос отправлен — бронь после подтверждения');
  }, [items, persist, showToast]);

  const deleteItem = useCallback((id: string) => {
    const gone = items.find(item => item.id === id);
    gone?.media.forEach(asset => { if (asset.kind === 'video') void delVideo(asset.id); });
    void removeListing(id); // убрать из общей витрины
    persist(items.filter(item => item.id !== id));
    showToast('Удалено');
  }, [items, persist, showToast]);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites(current => {
      const next = current.includes(id) ? current.filter(value => value !== id) : [id, ...current];
      saveFavorites(next);
      return next;
    });
  }, []);

  const isFavorite = useCallback((id: string) => favorites.includes(id), [favorites]);

  const addTxn = useCallback((kind: TxnKind, amount: number, note: string) => {
    if (!amount || amount <= 0) {
      showToast('Введите сумму');
      return;
    }
    setTxns(current => {
      const next = [{ id: uid('txn'), kind, amount, note: note.trim(), createdAt: Date.now() }, ...current];
      saveTxns(next);
      return next;
    });
    showToast(kind === 'income' ? 'Доход записан' : 'Расход записан');
  }, [showToast]);

  const deleteTxn = useCallback((id: string) => {
    setTxns(current => {
      const next = current.filter(txn => txn.id !== id);
      saveTxns(next);
      return next;
    });
  }, []);

  const value = useMemo<StoreValue>(() => ({
    profile,
    items,
    seed: seedItems,
    favorites,
    txns,
    toast,
    showToast,
    updateProfile,
    saveProfile,
    addItem,
    updateItem,
    updateStatus,
    addQueue,
    deleteItem,
    toggleFavorite,
    isFavorite,
    addTxn,
    deleteTxn
  }), [profile, items, favorites, txns, toast, showToast, updateProfile, saveProfile, addItem, updateItem, updateStatus, addQueue, deleteItem, toggleFavorite, isFavorite, addTxn, deleteTxn]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
