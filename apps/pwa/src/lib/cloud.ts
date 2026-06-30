import { supabase } from './supabase';
import type { Item } from '../types';

// Local-first: облако — помощник, а не костыль. Каждый вызов отказоустойчив —
// если двор не готов / офлайн / VPN скачет, тихо возвращаемся к локальным данным.

let session: Promise<string | null> | null = null;

/** Анонимный вход: устройство = личность, без экрана логина. Это owner товаров. */
export function ensureSession(): Promise<string | null> {
  if (!session) {
    session = (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) return data.session.user.id;
        const { data: anon, error } = await supabase.auth.signInAnonymously();
        if (error) return null;
        return anon.user?.id ?? null;
      } catch {
        return null;
      }
    })();
  }
  return session;
}

/** Выставить/обновить товар в общей витрине (весь item как jsonb). */
export async function pushListing(item: Item): Promise<void> {
  try {
    const uid = await ensureSession();
    if (!uid) return;
    await supabase.from('listings').upsert({
      id: item.id,
      owner: uid,
      status: item.status,
      data: item,
      updated_at: new Date().toISOString()
    });
  } catch {
    // двор не готов / нет сети — не падаем, товар уже сохранён локально
  }
}

/** Убрать товар из общей витрины. */
export async function removeListing(id: string): Promise<void> {
  try {
    await ensureSession();
    await supabase.from('listings').delete().eq('id', id);
  } catch {
    // ignore
  }
}

/** Витрина: чужие живые лоты из облака. null = не достали (офлайн/двор не готов). */
export async function fetchMarket(): Promise<Item[] | null> {
  try {
    const { data, error } = await supabase
      .from('listings')
      .select('data')
      .neq('status', 'sold')
      .order('updated_at', { ascending: false })
      .limit(500);
    if (error || !data) return null;
    return data.map(row => row.data as Item);
  } catch {
    return null;
  }
}
