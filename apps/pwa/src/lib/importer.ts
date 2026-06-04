import type { Category, Condition, DraftItem, Grade } from '../types';

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
    .map(line => normalizeSpace(line.replace(/[•●▪️✅🔥⭐️]/g, '')))
    .filter(Boolean);

  const titleLine = findTitleLine(lines, sourceUrl);
  const price = parsePrice(raw);
  const contact = parseContact(raw);
  const category = detectCategory(raw);
  const condition = detectCondition(raw);
  const grade = detectGrade(raw, condition);
  const city = detectCity(raw);

  return {
    title: titleLine || titleFromUrl(sourceUrl),
    price,
    category,
    condition,
    grade,
    city,
    contact,
    sourceUrl,
    description: buildDescription(lines, titleLine, contact)
  };
}

export function createTelegramText(item: {
  title: string;
  price: string;
  condition: Condition;
  grade: Grade;
  description: string;
  defects: string;
  kit: string;
  battery: string;
  city: string;
  contact: string;
  sourceUrl: string;
}) {
  return [
    item.title,
    item.price ? `Цена: ${item.price}` : '',
    `Состояние: ${item.condition} / ${item.grade}`,
    item.battery ? `Батарея: ${item.battery}` : '',
    item.kit ? `Комплект: ${item.kit}` : '',
    item.defects ? `Дефекты: ${item.defects}` : '',
    item.description,
    item.city ? `Город: ${item.city}` : '',
    item.contact ? `Контакт: ${item.contact}` : '',
    item.sourceUrl ? `Источник: ${item.sourceUrl}` : ''
  ].filter(Boolean).join('\n');
}

export function createAvitoText(item: {
  title: string;
  condition: Condition;
  grade: Grade;
  description: string;
  defects: string;
  kit: string;
  battery: string;
  contact: string;
}) {
  return [
    item.description,
    '',
    `Состояние: ${item.condition}`,
    `Грейд: ${item.grade}`,
    item.battery ? `Батарея: ${item.battery}` : '',
    item.kit ? `Комплект: ${item.kit}` : '',
    item.defects ? `Нюансы: ${item.defects}` : '',
    '',
    item.contact ? `Связь: ${item.contact}` : ''
  ].filter(line => line !== undefined).join('\n').replace(/\n{3,}/g, '\n\n').trim();
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
  const lower = value.toLowerCase();
  if (/(новый|новая|новое|идеал|без следов|как новый)/i.test(lower)) return 'Идеальное';
  if (/(скол|трещ|царап|коц|дефект|потерт|следы)/i.test(lower)) return 'Есть следы';
  if (/(запчаст|не включ|разбит|утоплен|repair|под восстанов)/i.test(lower)) return 'На запчасти';
  return 'Хорошее';
}

function detectGrade(value: string, condition: Condition): Grade {
  const lower = value.toLowerCase();
  if (/(грейд|grade)\s*a\b|\ba\+?\b/i.test(lower) || condition === 'Идеальное') return 'A';
  if (/(грейд|grade)\s*c\b|\bc\b/i.test(lower)) return 'C';
  if (/(грейд|grade)\s*d\b|\bd\b/i.test(lower)) return 'D';
  if (/(repair|запчаст|восстанов|под ремонт)/i.test(lower) || condition === 'На запчасти') return 'Repair';
  return 'B';
}

function detectCity(value: string) {
  const match = value.match(/\b(Москва|Симферополь|Севастополь|Краснодар|Ростов|СПб|Санкт-Петербург|Казань|Екатеринбург)\b/i);
  return match ? match[0] : '';
}

function buildDescription(lines: string[], titleLine: string, contact: string) {
  return lines
    .filter(line => line !== titleLine)
    .filter(line => !contact || !line.includes(contact))
    .filter(line => !/(цена|₽|руб\.?)/i.test(line))
    .join('. ')
    .replace(/\.\s*\./g, '.')
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
