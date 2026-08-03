// Клиент «переноса из Телеграма». Вся тяжёлая работа — на Edge Function `tg-import`
// (см. supabase/functions/tg-import): она ходит на публичный пост Телеграма и отдаёт
// текст + байты медиа с CORS. Здесь — только тонкая обёртка: найти ссылку, дёрнуть
// функцию, обернуть медиа-URL в прокси. Отказоустойчиво: функция недоступна → null,
// приложение тихо падает на ручной путь.
import { SUPABASE_URL } from './supabase';

// Прямой functions-домен. Функция публичная (verify_jwt=false), поэтому НИКАКИХ ключей
// слать не надо — и, наоборот, нельзя: publishable-ключ не JWT, шлюз Supabase давится
// на заголовке Authorization и отдаёт 404. Поэтому запрос голый.
const FN = SUPABASE_URL.replace('.supabase.co', '.functions.supabase.co') + '/tg-import';

export type TgPost = {
  text: string;
  channel?: string;
  images: string[];
  video: string | null;
  poster: string | null;
};

// Различаем «пост удалён/закрыт» (телега ответила, но поста нет) и «функция/сеть молчит».
export type TgResult = { ok: true; post: TgPost } | { ok: false; reason: 'unavailable' | 'down' | 'asleep' };

/** Первая ссылка на пост Телеграма в тексте (t.me/CHANNEL/ID), или null. */
export function findTelegramLink(text: string): string | null {
  const m = String(text || '').match(/https?:\/\/t\.me\/(?:s\/)?[A-Za-z0-9_]+\/\d+/i);
  return m ? m[0] : null;
}

/** Оборачиваем медиа-адрес телеги в прокси функции — чтобы браузер смог забрать байты. */
export function tgProxy(rawUrl: string): string {
  return `${FN}?media=${encodeURIComponent(rawUrl)}`;
}

/** Тянем пост через функцию. reason: 'unavailable' — пост удалён/закрыт; 'down' — функция/сеть молчит. */
export async function fetchTelegramPost(link: string): Promise<TgResult> {
  try {
    const response = await fetch(`${FN}?url=${encodeURIComponent(link)}`, { headers: { accept: 'application/json' } });
    if (response.ok) {
      const data = await response.json();
      if (data?.ok) {
        return {
          ok: true,
          post: {
            text: data.text || '',
            channel: data.channel || undefined,
            images: Array.isArray(data.images) ? data.images : [],
            video: data.video || null,
            poster: data.poster || null,
          },
        };
      }
    }
    // 540 — бесплатный Supabase усыпил проект после простоя. Это НЕ «пост удалён»:
    // пользователю надо сказать правду, иначе он думает, что объявление битое.
    if (response.status === 540 || response.status === 503) return { ok: false, reason: 'asleep' };
    // Функция ответила, но поста нет (404 — удалён/закрыт/приватный). Всё прочее — «молчит».
    return { ok: false, reason: response.status === 404 || response.status === 400 ? 'unavailable' : 'down' };
  } catch {
    return { ok: false, reason: 'down' };
  }
}
