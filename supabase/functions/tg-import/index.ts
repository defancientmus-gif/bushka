// tg-import — серверный «перенос из Телеграма» для БУ.шки.
//
// Зачем сервер: пост Телеграма живёт на серверах телеги (t.me / telesco.pe),
// оттуда браузер напрямую ничего не возьмёт — CORS закрыт. Эта функция ходит
// на публичный embed поста и отдаёт клиенту чистые данные + байты медиа с CORS.
//
// Два режима (оба GET, чтобы работали и в <img>/<video>, и в fetch):
//   ?url=<https://t.me/CHANNEL/ID>  → JSON { ok, text, channel, images[], video, poster }
//   ?media=<https://…telesco.pe/…>  → сами байты фото/видео с заголовками CORS (прокси)
//
// Безопасность: тянем ТОЛЬКО публичные адреса Телеграма (белый список хостов) —
// это не открытый прокси, SSRF закрыт. Ключи/секреты не нужны: контент публичный.

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
};

// Хосты, куда функции РАЗРЕШЕНО ходить в режиме прокси медиа.
const MEDIA_HOSTS = [/(^|\.)telesco\.pe$/i, /(^|\.)telegram-cdn\.org$/i, /(^|\.)cdn-telegram\.org$/i, /(^|\.)telegram\.org$/i];
const MAX_BYTES = 30 * 1024 * 1024;

// Безопасно собрать символ по коду (в т.ч. эмодзи вне BMP).
function cp(code: number): string {
  try {
    return String.fromCodePoint(code);
  } catch {
    return '';
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'content-type': 'application/json; charset=utf-8' },
  });
}

// Разбираем ссылку на пост: t.me/CHANNEL/ID (и вариант t.me/s/CHANNEL/ID).
function tgLink(raw: string): { channel: string; id: string; embed: string } | null {
  const m = String(raw || '').match(/https?:\/\/t\.me\/(?:s\/)?([A-Za-z0-9_]+)\/(\d+)/i);
  if (!m) return null;
  return { channel: m[1], id: m[2], embed: `https://t.me/${m[1]}/${m[2]}?embed=1&mode=tme` };
}

function decodeEntities(s: string): string {
  return s
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    // fromCodePoint (не fromCharCode) — иначе астральные эмодзи (📋🔋💰) рвутся на суррогаты.
    .replace(/&#(\d+);/g, (_m, d: string) => cp(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, h: string) => cp(parseInt(h, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

// Внутренность блока текста поста → человеческий текст (эмодзи целы, переносы целы,
// служебный номер поста #233 и реакции «❤1» выкинуты).
function cleanPostText(html: string): string {
  const m = html.match(/tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>\s*(?:<div class="tgme_widget_message_(?:footer|bubble)|<\/div>\s*<a|$)/);
  const inner = m ? m[1] : '';
  const text = decodeEntities(inner);
  const out: string[] = [];
  for (const rawLine of text.split('\n')) {
    const l = rawLine.replace(/ /g, ' ').replace(/[ \t]+$/,'').trim();
    if (!l) { out.push(''); continue; }
    if (/^#\d+$/.test(l)) continue;                                  // служебный номер поста
    if (l.length <= 4 && /^[❤️👍🔥😁🥰👏💯➕🤔🎉😍👌\d\s]+$/u.test(l)) continue; // реакции-счётчики
    out.push(l);
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function extractMedia(html: string): { images: string[]; video: string | null; poster: string | null } {
  const images: string[] = [];
  const photoRe = /tgme_widget_message_photo_wrap[^>]*background-image:url\('([^']+)'\)/gi;
  let pm: RegExpExecArray | null;
  while ((pm = photoRe.exec(html))) images.push(pm[1]);
  const vm = html.match(/<video[^>]+src="([^"]+)"/i);
  const video = vm ? vm[1] : null;
  const tm = html.match(/tgme_widget_message_video_thumb"[^>]*background-image:url\('([^']+)'\)/i);
  const poster = tm ? tm[1] : null;
  return { images: Array.from(new Set(images)), video, poster };
}

export function parsePost(html: string) {
  const text = cleanPostText(html);
  const media = extractMedia(html);
  const owner = html.match(/tgme_widget_message_owner_name"[^>]*href="https:\/\/t\.me\/([A-Za-z0-9_]+)"/i);
  return { text, channel: owner ? owner[1] : null, ...media };
}

function allowedMediaHost(u: string): boolean {
  try {
    return MEDIA_HOSTS.some(re => re.test(new URL(u).hostname));
  } catch {
    return false;
  }
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  const url = new URL(req.url);

  // ── Режим прокси медиа ──
  const mediaUrl = url.searchParams.get('media');
  if (mediaUrl) {
    if (!allowedMediaHost(mediaUrl)) return json({ ok: false, error: 'host not allowed' }, 403);
    try {
      const r = await fetch(mediaUrl, { headers: { 'user-agent': UA } });
      if (!r.ok) return json({ ok: false, error: `media ${r.status}` }, 502);
      const buf = await r.arrayBuffer();
      if (buf.byteLength > MAX_BYTES) return json({ ok: false, error: 'too big' }, 413);
      return new Response(buf, {
        headers: {
          ...CORS,
          'content-type': r.headers.get('content-type') || 'application/octet-stream',
          'cache-control': 'public, max-age=86400',
        },
      });
    } catch {
      return json({ ok: false, error: 'media fetch failed' }, 502);
    }
  }

  // ── Режим разбора поста ──
  let src = url.searchParams.get('url') || '';
  if (!src && req.method === 'POST') {
    src = await req.json().then((b) => b?.url || '').catch(() => '');
  }
  const link = tgLink(src);
  if (!link) return json({ ok: false, error: 'not a telegram post link' }, 400);

  try {
    const r = await fetch(link.embed, {
      headers: {
        'user-agent': UA,
        'accept': 'text/html,application/xhtml+xml',
        'accept-language': 'ru,en;q=0.8',
        'referer': `https://t.me/${link.channel}`,
      },
    });
    if (!r.ok) return json({ ok: false, error: `telegram ${r.status}` }, 502);
    const html = await r.text();
    // Телега отдаёт виджет-ошибку, когда пост удалён/закрыт/не существует.
    if (/tgme_widget_message_error/.test(html) && !/tgme_widget_message_text/.test(html)) {
      return json({ ok: false, error: 'post unavailable' }, 404);
    }
    const post = parsePost(html);
    if (!post.text && !post.images.length && !post.video) {
      return json({ ok: false, error: 'empty or private post' }, 404);
    }
    return json({
      ok: true,
      source: src,
      channel: post.channel || link.channel,
      text: post.text,
      images: post.images,
      video: post.video,
      poster: post.poster,
    });
  } catch {
    return json({ ok: false, error: 'fetch failed' }, 502);
  }
});
