#!/usr/bin/env python3
from html import unescape
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from json import dumps, loads
from re import S
import re
from urllib.parse import parse_qs, quote, urlparse, urlunparse
from urllib.request import Request, urlopen


PORT = 8765


def compact(value):
    return re.sub(r"\s+", " ", str(value or "")).strip()


def unique(values):
    result = []
    for value in values:
        if value and value not in result:
            result.append(value)
    return result


def normalize_telegram_url(raw_url):
    parsed = urlparse(raw_url if raw_url.startswith("http") else f"https://{raw_url}")
    if parsed.netloc not in {"t.me", "telegram.me"}:
        raise ValueError("Only Telegram links are supported")

    parts = [part for part in parsed.path.split("/") if part]
    if parts and parts[0] == "s":
        parts = parts[1:]

    if len(parts) < 2:
        raise ValueError("Telegram post id is missing")

    channel = parts[0]
    post_id = parts[1]
    if channel == "c":
        raise ValueError("Private Telegram links are not supported")

    return {
        "url": f"https://t.me/s/{channel}/{post_id}",
        "channel": channel,
        "post_id": post_id,
        "post_key": f"{channel}/{post_id}",
    }


def normalize_avito_url(raw_url):
    parsed = urlparse(raw_url if raw_url.startswith("http") else f"https://{raw_url}")
    host = parsed.netloc.lower()
    if not (host.endswith("avito.ru") or host == "avito.onelink.me"):
        raise ValueError("Only Avito links are supported")
    return safe_request_url(raw_url if raw_url.startswith("http") else f"https://{raw_url}")


def safe_request_url(raw_url):
    parsed = urlparse(raw_url)
    host = parsed.netloc.encode("idna").decode("ascii")
    path = quote(parsed.path, safe="/:%")
    query = quote(parsed.query, safe="=&?/:+,%")
    return urlunparse((parsed.scheme, host, path, "", query, ""))


def category_from_avito_path(path):
    lower = path.lower()
    if "noutbuk" in lower or "kompyuter" in lower:
        return "Ноутбук"
    if "telefon" in lower or "smartfon" in lower:
        return "Смартфон"
    if "igrovye_pristavki" in lower or "konsol" in lower:
        return "Консоль"
    if "fototehnika" in lower or "foto" in lower:
        return "Фото"
    if "audio" in lower or "naushniki" in lower:
        return "Аудио"
    return "Другое"


def title_from_avito_url(raw_url):
    parsed = urlparse(raw_url if raw_url.startswith("http") else f"https://{raw_url}")
    parts = [part for part in parsed.path.split("/") if part]
    slug = parts[-1] if parts else ""
    slug = re.sub(r"[_-]\d{6,}$", "", slug)
    slug = re.sub(r"[_-]+", " ", slug)
    slug = unescape(slug)
    words = [word.upper() if re.fullmatch(r"(i\d|m\d|ssd|gb|tb|ram|rtx|gtx)", word, flags=re.I) else word.capitalize() for word in slug.split()]
    return " ".join(words).strip()


def fallback_avito(raw_url, error=""):
    display_url = raw_url if raw_url.startswith("http") else f"https://{raw_url}"
    parsed = urlparse(display_url)
    title = title_from_avito_url(display_url)
    return {
        "source": "avito",
        "sourceUrl": display_url,
        "title": title,
        "text": "",
        "price": "",
        "contact": display_url,
        "category": category_from_avito_path(parsed.path),
        "images": [],
        "media": [],
        "partial": True,
        "error": error,
    }


def text_from_html(value):
    value = re.sub(r"<br\s*/?>", "\n", value, flags=re.I)
    value = re.sub(r"</p\s*>", "\n", value, flags=re.I)
    value = re.sub(r"<[^>]+>", " ", value)
    value = unescape(value)
    value = re.sub(r"[ \t]+", " ", value)
    value = re.sub(r"\n\s+", "\n", value)
    return value.strip()


def attrs_from_tag(tag):
    return {
        key.lower(): unescape(value)
        for key, value in re.findall(r'([a-zA-Z_:.-]+)\s*=\s*["\'](.*?)["\']', tag, flags=S)
    }


def meta_content(html, name):
    for tag in re.findall(r"<meta\b[^>]*>", html, flags=S | re.I):
        attrs = attrs_from_tag(tag)
        if attrs.get("property") == name or attrs.get("name") == name:
            return compact(attrs.get("content", ""))
    return ""


def fetch_html(url):
    request = Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 BushkaLocalPreview/1.0",
            "Accept": "text/html,application/xhtml+xml",
            "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.6",
        },
    )
    with urlopen(request, timeout=12) as response:
        return response.read().decode("utf-8", errors="replace")


def target_telegram_message(html, post_key):
    marker = f'data-post="{post_key}"'
    index = html.find(marker)
    if index < 0:
        marker = f"data-post='{post_key}'"
        index = html.find(marker)
    if index < 0:
        return ""

    start = html.rfind('<div class="tgme_widget_message', 0, index)
    if start < 0:
        start = html.rfind("<div class='tgme_widget_message", 0, index)
    if start < 0:
        start = index

    next_candidates = [
        pos for pos in [
            html.find('<div class="tgme_widget_message_wrap', index + 1),
            html.find("<div class='tgme_widget_message_wrap", index + 1),
            html.find('<div class="tgme_widget_message ', index + 1),
            html.find("<div class='tgme_widget_message ", index + 1),
        ] if pos > index
    ]
    end = min(next_candidates) if next_candidates else len(html)
    return html[start:end]


def background_urls(tag):
    values = []
    for match in re.findall(r"background-image\s*:\s*url\((['\"]?)(.*?)\1\)", tag, flags=S | re.I):
        url = unescape(match[1]).strip()
        if url.startswith("http"):
            values.append(url)
    return values


def media_from_telegram_message(message_html):
    photos = []
    videos = []

    media_tags = re.findall(r"<[^>]+class=[\"'][^\"']*tgme_widget_message_(?:photo|video)[^\"']*[\"'][^>]*>", message_html, flags=S | re.I)
    for tag in media_tags:
        attrs = attrs_from_tag(tag)
        klass = attrs.get("class", "")
        urls = background_urls(tag)

        if "video" in klass:
            video_src = attrs.get("data-video") or attrs.get("href") or ""
            for url in urls:
                videos.append({"kind": "video", "src": url, "poster": url, "videoSrc": video_src})
        else:
            photos.extend(urls)

    direct_videos = []
    for tag in re.findall(r"<(?:video|source)\b[^>]*>", message_html, flags=S | re.I):
        attrs = attrs_from_tag(tag)
        src = attrs.get("src") or attrs.get("data-src")
        poster = attrs.get("poster")
        if src and src.startswith("http"):
            direct_videos.append({"kind": "video", "src": poster or src, "poster": poster, "videoSrc": src})

    for url in re.findall(r"https?://[^\"'\s<>]+?\.(?:mp4|webm)(?:\?[^\"'\s<>]*)?", message_html, flags=re.I):
        direct_videos.append({"kind": "video", "src": url, "videoSrc": url})

    media = [{"kind": "image", "src": url} for url in unique(photos)]
    media.extend(merge_video_media(direct_videos + videos))
    return media[:4]


def merge_video_media(items):
    merged = []
    by_key = {}
    for item in items:
        key = item.get("videoSrc") or item.get("src")
        if not key:
            continue

        existing = by_key.get(key)
        if not existing:
            existing = {"kind": "video", "src": item.get("src", ""), "poster": item.get("poster", ""), "videoSrc": item.get("videoSrc", "")}
            by_key[key] = existing
            merged.append(existing)
            continue

        poster = item.get("poster") or item.get("src")
        if poster and not re.search(r"\.(?:mp4|webm|mov)(?:\?|$)", poster, flags=re.I):
            existing["poster"] = poster
            existing["src"] = poster
        if item.get("videoSrc"):
            existing["videoSrc"] = item["videoSrc"]

    return merged


def parse_telegram(html, target):
    message_html = target_telegram_message(html, target["post_key"])
    if not message_html:
        message_html = html

    text_blocks = re.findall(r'<div class="tgme_widget_message_text[^"]*"[^>]*>(.*?)</div>', message_html, flags=S | re.I)
    text = "\n".join(text_from_html(block) for block in text_blocks).strip()

    if not text:
        text = meta_content(html, "og:description")

    title = meta_content(html, "og:title")
    title = re.sub(r"^Telegram:\s*", "", title).strip()
    media = media_from_telegram_message(message_html)

    return {
        "source": "telegram",
        "sourceUrl": target["url"],
        "title": title,
        "text": text,
        "images": [item["src"] for item in media if item.get("kind") == "image"],
        "media": media,
    }


def normalize_json_ld(value):
    if isinstance(value, list):
        items = []
        for entry in value:
            items.extend(normalize_json_ld(entry))
        return items
    if isinstance(value, dict):
        graph = value.get("@graph")
        items = normalize_json_ld(graph) if graph else []
        items.append(value)
        return items
    return []


def parse_price(value):
    if isinstance(value, (int, float)):
        return f"{int(value):,}".replace(",", " ") + " ₽"
    value = compact(value)
    if not value:
        return ""
    match = re.search(r"(\d{1,3}(?:[ \u00a0.,]\d{3})+|\d{4,9})", value)
    if not match:
        return ""
    amount = re.sub(r"\D", "", match.group(1))
    return f"{int(amount):,}".replace(",", " ") + " ₽" if amount else ""


def cleanup_avito_title(value):
    value = compact(value)
    value = re.sub(r"\s*\|\s*Авито\s*$", "", value, flags=re.I)
    value = re.sub(r"\s+купить\s+.*$", "", value, flags=re.I)
    value = re.sub(r"\s+—\s+объявление.*$", "", value, flags=re.I)
    return value[:90]


def avito_images_from_html(html):
    expanded = unescape(html).replace("\\/", "/").replace("\\u002F", "/")
    urls = re.findall(r"https?://[^\"'\s<>]+(?:avito|avitostatic|avito\.st)[^\"'\s<>]+", expanded, flags=re.I)
    images = []
    for url in urls:
        cleaned = url.split("\\")[0]
        if re.search(r"\.(?:jpg|jpeg|png|webp)(?:\?|$)", cleaned, flags=re.I) or "/image/" in cleaned:
            images.append(cleaned)
    og_image = meta_content(html, "og:image")
    if og_image:
        images.insert(0, og_image)
    return unique(images)[:6]


def parse_avito(html, source_url):
    title = cleanup_avito_title(meta_content(html, "og:title") or meta_content(html, "twitter:title"))
    text = meta_content(html, "og:description") or meta_content(html, "description")
    price = parse_price(meta_content(html, "product:price:amount") or meta_content(html, "price"))
    images = avito_images_from_html(html)

    for raw_json in re.findall(r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>', html, flags=S | re.I):
        try:
            for item in normalize_json_ld(loads(unescape(raw_json).strip())):
                item_type = item.get("@type", "")
                item_types = item_type if isinstance(item_type, list) else [item_type]
                if not any(str(kind).lower() in {"product", "offer"} for kind in item_types):
                    continue

                title = title or cleanup_avito_title(item.get("name"))
                text = text or compact(item.get("description"))
                item_images = item.get("image")
                if isinstance(item_images, str):
                    images.insert(0, item_images)
                elif isinstance(item_images, list):
                    images = item_images + images

                offers = item.get("offers") or {}
                if isinstance(offers, list):
                    offers = offers[0] if offers else {}
                price = price or parse_price(offers.get("price") or item.get("price"))
        except Exception:
            continue

    return {
        "source": "avito",
        "sourceUrl": source_url,
        "title": title,
        "text": compact(text)[:420],
        "price": price,
        "contact": source_url,
        "images": unique(images)[:4],
        "media": [{"kind": "image", "src": url} for url in unique(images)[:4]],
    }


class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/telegram":
            self.handle_telegram(parsed)
            return
        if parsed.path == "/api/avito":
            self.handle_avito(parsed)
            return

        super().do_GET()

    def handle_telegram(self, parsed):
        params = parse_qs(parsed.query)
        raw_url = params.get("url", [""])[0]

        try:
            target = normalize_telegram_url(raw_url)
            html = fetch_html(target["url"])
            payload = parse_telegram(html, target)
            self.write_json(200, payload)
        except Exception as error:
            self.write_json(502, {"error": str(error)})

    def handle_avito(self, parsed):
        params = parse_qs(parsed.query)
        raw_url = params.get("url", [""])[0]

        try:
            avito_url = normalize_avito_url(raw_url)
            html = fetch_html(avito_url)
            payload = parse_avito(html, avito_url)
            self.write_json(200, payload)
        except Exception as error:
            try:
                normalize_avito_url(raw_url)
                self.write_json(200, fallback_avito(raw_url, str(error)))
            except Exception:
                self.write_json(502, {"error": str(error)})

    def write_json(self, status, payload):
        body = dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print(f"БУ.шка: http://127.0.0.1:{PORT}/")
    server.serve_forever()
