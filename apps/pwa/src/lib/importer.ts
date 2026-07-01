import type { Category, Condition, DraftItem, Grade, Item } from '../types';

const categories: Category[] = ['Смартфон', 'Ноутбук', 'Консоль', 'Фото', 'Аудио', 'Комплектующие', 'Другое'];
const conditions: Condition[] = ['Идеальное', 'Хорошее', 'Есть следы', 'На запчасти'];
const grades: Grade[] = ['A', 'B', 'C', 'D', 'Repair'];

export function emptyDraft(): DraftItem {
  return {
    title: '',
    price: '',
    category: 'Ноутбук',
    condition: 'Хорошее',
    grade: 'B',
    status: 'available',
    dealMode: 'free',
    description: '',
    defects: '',
    kit: '',
    battery: '',
    city: '',
    contact: '',
    sourceUrl: '',
    media: [],
    reservedUntil: ''
  };
}

export function parseImport(rawValue: string): Partial<DraftItem> {
  const raw = cleanText(rawValue);
  const sourceUrl = extractSupportedLink(raw);
  const text = sourceUrl ? raw.replace(sourceUrl, ' ') : raw;
  const lines = text
    .split('\n')
    .map(line => normalizeSpace(line.replace(/[•●▪️✅🔥⭐️]/gu, '')))
    .filter(Boolean);

  const titleLine = findTitleLine(lines, sourceUrl);
  const price = parsePrice(raw);
  const contact = parseContact(raw);
  const category = detectCategory(raw);
  const condition = detectCondition(raw);
  const grade = detectGrade(raw, condition);
  const city = detectCity(raw);
  const battery = parseBattery(raw);
  const kit = parseKit(lines);

  return {
    title: titleLine || titleFromUrl(sourceUrl),
    price,
    category,
    condition,
    grade,
    city,
    contact,
    sourceUrl,
    battery,
    kit,
    description: buildDescription(lines, titleLine, contact)
  };
}

const brandWords = [
  'iphone', 'айфон', 'samsung', 'galaxy', 'xiaomi', 'redmi', 'poco', 'realme', 'honor', 'huawei', 'oppo', 'vivo', 'tecno',
  'macbook', 'imac', 'ipad', 'airpods', 'thinkpad', 'asus', 'acer', 'lenovo', 'hp', 'dell', 'msi',
  'playstation', 'ps5', 'ps4', 'xbox', 'nintendo', 'switch', 'steam',
  'sony', 'canon', 'nikon', 'fujifilm', 'gopro', 'dji', 'marshall', 'jbl'
];

function hashtag(value: string): string {
  return '#' + value.toLowerCase().replace(/[^a-zа-яё0-9]+/gi, '');
}

function hashtagsFor(item: { title: string; category: Category; city: string }): string {
  const tags: string[] = ['#бушка'];
  const lower = (item.title || '').toLowerCase();
  const brand = brandWords.find(word => lower.includes(word));
  if (brand) tags.push(hashtag(brand));
  if (item.category && item.category !== 'Другое') tags.push(hashtag(item.category));
  if (item.city) tags.push(hashtag(item.city));
  return Array.from(new Set(tags)).join(' ');
}

// Clean, scannable Telegram post — labelled fields (no flea-market emoji spam),
// honest defects line, and hashtags so the post is findable in channels/search.
export function createTelegramText(item: Item) {
  const body = [
    item.title,
    item.price ? `Цена: ${item.price}` : 'Цена договорная',
    `Состояние: ${item.condition} · грейд ${item.grade}`,
    item.battery ? `Батарея: ${item.battery}` : '',
    item.kit ? `Комплект: ${item.kit}` : '',
    `Честно о минусах: ${item.defects || 'нет'}`,
    item.description ? `\n${item.description}` : '',
    item.city ? `\nГород: ${item.city}` : '',
    item.contact ? `Связь: ${item.contact}` : '',
    item.sourceUrl ? `Источник: ${item.sourceUrl}` : ''
  ].filter(Boolean).join('\n');
  const tags = hashtagsFor(item);
  return tags ? `${body}\n\n${tags}` : body;
}

// Avito description — no contact (Avito hides/blocks contacts in the text).
export function createAvitoText(item: Item) {
  return [
    item.description,
    '',
    `Состояние: ${item.condition} (грейд ${item.grade})`,
    item.battery ? `Батарея: ${item.battery}` : '',
    item.kit ? `Комплект: ${item.kit}` : '',
    item.defects ? `Нюансы: ${item.defects}` : ''
  ].filter(line => line !== '').join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function cleanText(value: string) {
  return String(value || '')
    .replace(/[\u200b-\u200d\ufeff\u2060]/g, '')
    .replace(/[“”«»]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\r/g, '\n')
    .trim();
}

export function normalizeSpace(value: string) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

export function supportedCategories() {
  return categories;
}

export function supportedConditions() {
  return conditions;
}

export function supportedGrades() {
  return grades;
}

function extractSupportedLink(value: string) {
  const match = value.match(/(?:https?:\/\/)?(?:(?:t\.me|telegram\.me|avito\.onelink\.me)\/|(?:[\w-]+\.)*avito\.ru\/)[^\s<>"'`]+/i);
  return match ? cleanLink(match[0]) : '';
}

function cleanLink(value: string) {
  return String(value || '').trim().replace(/^[<(]+/, '').replace(/[>)\].,;!?]+$/g, '');
}

function findTitleLine(lines: string[], sourceUrl: string) {
  return lines.find(line => {
    const lower = line.toLowerCase();
    return line.length > 3
      && line !== sourceUrl
      && !/^https?:\/\//i.test(line)
      && !/@[a-z0-9_]{3,}/i.test(line)
      && !/^\+?\d[\d\s()/-]{7,}$/.test(line)
      && !/(цена|руб|₽|контакт|писать|телеграм|telegram|avito|авито)/i.test(lower);
  }) || '';
}

function parsePrice(value: string) {
  const match = value.match(/(?:^|[^\d])(\d{1,3}(?:[ \u00a0.,]\d{3})+|\d{4,9})\s*(?:₽|р\b|руб\.?|rub\b)/i)
    || value.match(/(?:цена|стоимость|price)\D{0,16}(\d{1,3}(?:[ \u00a0.,]\d{3})+|\d{4,9})/i);
  if (!match) return '';
  const amount = match[1].replace(/[^\d]/g, '');
  if (!amount || Number(amount) < 1000) return '';
  return `${Number(amount).toLocaleString('ru-RU')} ₽`;
}

function parseContact(value: string) {
  const match = value.match(/@[a-zA-Z0-9_]{3,}|(?:\+7|8)[\s( -]*\d{3}[\s) -]*\d{3}[\s-]*\d{2}[\s-]*\d{2}|https?:\/\/t\.me\/\S+/i);
  if (!match) return '';
  const contact = normalizeSpace(match[0]);
  if (/t\.me\//i.test(contact)) {
    return `@${contact.split('/').filter(Boolean).pop()}`;
  }
  return contact;
}

function detectCategory(value: string): Category {
  const lower = value.toLowerCase();
  if (/(iphone|айфон|samsung|pixel|xiaomi|смартфон|телефон)/i.test(lower)) return 'Смартфон';
  if (/(macbook|thinkpad|ноут|laptop|air|probook|xps|компьютер)/i.test(lower)) return 'Ноутбук';
  if (/(playstation|ps5|ps4|xbox|switch|консол)/i.test(lower)) return 'Консоль';
  if (/(sony|canon|nikon|fujifilm|камера|объектив|фото)/i.test(lower)) return 'Фото';
  if (/(airpods|наушник|колонка|audio|акустик)/i.test(lower)) return 'Аудио';
  if (/(ssd|hdd|видеокарт|rtx|gtx|процессор|память|комплектующ)/i.test(lower)) return 'Комплектующие';
  return 'Другое';
}

function detectCondition(value: string): Condition {
  // Drop negated defect mentions ("без царапин", "нет сколов") before matching.
  const lower = value.toLowerCase().replace(/(?:без|нет|ни одной?)\s+(?:единой\s+)?[а-яё]+/g, ' ');
  if (/(запчаст|не включ|разбит|утоплен|repair|под восстанов)/.test(lower)) return 'На запчасти';
  if (/(скол|трещ|царап|коц|дефект|потерт|следы)/.test(lower)) return 'Есть следы';
  if (/(нов(?:ый|ая|ое|ые|ье)|идеал|отличн|как новый|like new)/.test(lower)) return 'Идеальное';
  return 'Хорошее';
}

function detectGrade(value: string, condition: Condition): Grade {
  // 1) Явный грейд от продавца перебивает всё: «грейд A», «grade B».
  //    (Раньше ловили одинокие буквы a/c/d по всему тексту — и грейд скакал от случайных слов.)
  const explicit = value.match(/(?:грейд|grade)\s*([a-dA-D])(?![a-zа-яё])/i);
  if (explicit) return explicit[1].toUpperCase() as Grade;
  // 2) Иначе грейд — честная проекция состояния. Единый принцип, без магии букв.
  if (/(repair|запчаст|восстанов|под ремонт)/i.test(value) || condition === 'На запчасти') return 'Repair';
  if (condition === 'Идеальное') return 'A';
  if (condition === 'Есть следы') return 'C';
  return 'B'; // Хорошее
}

function detectCity(value: string) {
  // \b does not work with Cyrillic (it is ASCII-only in JS), so use explicit
  // non-letter boundaries instead.
  const match = value.match(/(?:^|[^а-яёa-z-])(Москва|Симферополь|Севастополь|Краснодар|Ростов(?:-на-Дону)?|СПб|Санкт-Петербург|Казань|Екатеринбург|Новосибирск|Нижний Новгород|Воронеж|Самара|Уфа|Пермь|Челябинск|Омск|Волгоград|Сочи|Тюмень|Ижевск|Барнаул|Иркутск|Хабаровск|Владивосток|Ялта|Керчь|Евпатория)(?=[^а-яёa-z-]|$)/i);
  return match ? match[1] : '';
}

function parseBattery(value: string) {
  const match = value.match(/(?:батаре[яийю]\w*|акб|аккумулятор\w*|health|ёмкость|емкость)\D{0,12}(\d{2,3})\s*%/i)
    || value.match(/(\d{2,3})\s*%\s*(?:акб|батаре|аккум|health)/i);
  if (!match) return '';
  const percent = Number(match[1]);
  return percent > 0 && percent <= 100 ? `${percent}%` : '';
}

function parseKit(lines: string[]) {
  for (const line of lines) {
    const match = line.match(/(?:комплект|в комплекте|комплектация)\s*[:\-—]?\s*(.{3,80})/i);
    if (match && !/^(полный|весь)\s*$/i.test(match[1].trim())) {
      return match[1].trim().replace(/[.;]+$/, '');
    }
    if (/полный комплект/i.test(line)) return 'Полный комплект';
  }
  return '';
}

function buildDescription(lines: string[], titleLine: string, contact: string) {
  // Ведущие эмодзи/символы снимаем только для проверки — в самом тексте они остаются.
  const bare = (line: string) => line.replace(/^[^\p{L}\d]+/u, '').trim();
  return lines
    .filter(line => line !== titleLine)
    .filter(line => !contact || !line.includes(contact))
    .filter(line => !/(цена|₽|руб\.?)/i.test(line))
    .filter(line => !/^(?:батаре|акб|аккумулятор|комплект|в комплекте|комплектация)/i.test(bare(line)))
    .filter(line => !/^[^:]{1,24}:\s*$/.test(bare(line))) // «Память:» без значения — выкидываем
    .join('\n') // каждое поле — с новой строки: структурно, а не в кашу через точку
    .replace(/\n{2,}/g, '\n')
    .trim()
    .slice(0, 700);
}

function titleFromUrl(url: string) {
  if (!url) return '';
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    if (!/avito\.ru$/i.test(parsed.hostname) && !parsed.hostname.endsWith('.avito.ru')) return '';
    const parts = parsed.pathname.split('/').filter(Boolean);
    const slug = parts[parts.length - 1] || '';
    return slug
      .replace(/[_-]\d{6,}$/g, '')
      .replace(/[_-]+/g, ' ')
      .split(' ')
      .map(word => (/^(i\d|m\d|ssd|gb|tb|ram|rtx|gtx)$/i.test(word) ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1)))
      .join(' ')
      .trim();
  } catch {
    return '';
  }
}
