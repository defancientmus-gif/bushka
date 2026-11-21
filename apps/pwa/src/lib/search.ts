// Умный поиск БУ.шки. Работает на устройстве: мгновенно, без сети и без ключей.
// Человек пишет, как говорит у прилавка — «айфон 13 до 30к симф», «fqajy 13», «плойка на запчасти» —
// поиск сам понимает цену, город, состояние, чинит раскладку и опечатки и говорит, что понял.
// Словари ниже — это правила. Их можно дотачивать (в том числе нейросетью), сам поиск от неё не зависит.

import type { Category, Condition, DeliveryKind, Item } from '../types';
import { toNum } from './money';
import { cityFromWord, cityKey } from './crimea';

// ---------- Слова ----------

function norm(text: string): string {
  return String(text || '').toLowerCase().replace(/ё/g, 'е');
}

const RU_END = /(?:иями|ями|ами|ого|его|ому|ему|ыми|ими|ией|ов|ев|ей|ой|ий|ый|ая|яя|ое|ее|ые|ие|ах|ях|ом|ем|ам|ям|ию|ью|а|я|ы|и|у|ю|е|о|ь)$/;

/** Грубая основа русского слова: «наушники» и «наушников» → одно слово. */
function stem(word: string): string {
  if (word.length < 5 || !/^[а-я]+$/.test(word)) return word;
  const base = word.replace(RU_END, '');
  return base.length >= 3 ? base : word;
}

const TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n',
  о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y',
  ь: '', э: 'e', ю: 'yu', я: 'ya'
};

function translit(word: string): string {
  let out = '';
  for (const ch of word) out += TRANSLIT[ch] ?? ch;
  return out;
}

/** «с23», «а52», «пс5», «х1» — модель, набранная русскими буквами. */
function modelToLatin(word: string): string {
  return translit(word.replace(/х/g, 'x'));
}

/** Текст → слова. «13pro» и «256гб» режем, «s23», «ps5», «m1» оставляем целыми — это модель. */
function split(text: string): string[] {
  const prepared = norm(text)
    .replace(/(^|[^a-zа-я0-9])(?:ps|пс)\s*([1-5])(?![a-zа-я0-9])/g, '$1playstation $2 ')
    .replace(/(\d+)\s*(?:гб|gb|гиг[а-я]*)(?![a-zа-я0-9])/g, '$1 ')
    .replace(/(\d+)\s*(?:тб|tb)(?![a-zа-я0-9])/g, '$1tb ');
  const out: string[] = [];
  for (const match of prepared.matchAll(/[a-zа-я0-9]+/g)) {
    const word = match[0];
    const parts = word.match(/[a-zа-я]+|\d+/g) || [word];
    if (parts.length > 1 && parts.every(part => /\d/.test(part) || part.length >= 3)) out.push(...parts);
    else out.push(word);
  }
  return out;
}

// Одно понятие — много написаний. Слева то, как храним; справа то, как пишут люди.
const GROUPS: Array<[string, string[]]> = [
  ['iphone', ['айфон', 'айф', 'афон', 'ифон', 'айфончик', 'iphon', 'ipone', 'айфо', 'iphone']],
  ['samsung', ['самсунг', 'самс', 'самсунг', 'samsung']],
  ['galaxy', ['галакси', 'галактика', 'galaxy']],
  ['xiaomi', ['сяоми', 'ксиоми', 'ксяоми', 'сиоми', 'шаоми', 'xiaomi']],
  ['redmi', ['редми', 'redmi']],
  ['poco', ['поко', 'покофон', 'poco']],
  ['honor', ['хонор', 'honor']],
  ['huawei', ['хуавей', 'хуавэй', 'huawei']],
  ['realme', ['реалми', 'рилми', 'realme']],
  ['tecno', ['техно', 'текно', 'tecno']],
  ['infinix', ['инфиникс', 'infinix']],
  ['pixel', ['пиксель', 'пиксел', 'pixel']],
  ['oppo', ['оппо', 'oppo']],
  ['vivo', ['виво', 'vivo']],
  ['nokia', ['нокиа', 'нокия', 'nokia']],
  ['oneplus', ['ванплюс', 'oneplus']],
  ['apple', ['эпл', 'эппл', 'апл', 'apple']],
  ['macbook', ['макбук', 'макбуг', 'macbook']],
  ['mac', ['мак', 'mac']],
  ['imac', ['аймак', 'imac']],
  ['ipad', ['айпад', 'айпэд', 'ipad']],
  ['airpods', ['аирподс', 'эирподс', 'аирподсы', 'эйрподс', 'airpods']],
  ['watch', ['вотч', 'воч', 'watch']],
  ['lenovo', ['леново', 'lenovo']],
  ['asus', ['асус', 'asus']],
  ['acer', ['асер', 'эйсер', 'acer']],
  ['dell', ['делл', 'dell']],
  ['hp', ['хп', 'hp']],
  ['msi', ['мси', 'msi']],
  ['thinkpad', ['синкпад', 'тинкпад', 'thinkpad']],
  ['ideapad', ['идеапад', 'айдиапад', 'ideapad']],
  ['legion', ['легион', 'legion']],
  ['surface', ['сурфейс', 'серфейс', 'surface']],
  ['microsoft', ['майкрософт', 'микрософт', 'microsoft']],
  ['playstation', ['плойка', 'плойку', 'плейстейшн', 'плейстешн', 'плэйстейшн', 'playstation']],
  ['xbox', ['иксбокс', 'хбокс', 'xbox']],
  ['switch', ['свитч', 'switch']],
  ['nintendo', ['нинтендо', 'nintendo']],
  ['sony', ['сони', 'sony']],
  ['canon', ['кэнон', 'кенон', 'canon']],
  ['nikon', ['никон', 'nikon']],
  ['fujifilm', ['фуджи', 'фуджифильм', 'fuji', 'fujifilm']],
  ['gopro', ['гопро', 'gopro']],
  ['marshall', ['маршал', 'маршалл', 'marshall']],
  ['jbl', ['джбл', 'jbl']],
  ['pro', ['про', 'прошка', 'pro']],
  ['max', ['макс', 'max']],
  ['mini', ['мини', 'mini']],
  ['plus', ['плюс', 'plus']],
  ['ultra', ['ультра', 'ultra']],
  ['air', ['эйр', 'аир', 'эир', 'air']],
  ['lite', ['лайт', 'lite']],
  ['slim', ['слим', 'slim']],
  ['rtx', ['ртх', 'rtx']],
  ['gtx', ['гтх', 'gtx']],
  ['ssd', ['ссд', 'ssd']],
  ['hdd', ['хдд', 'hdd', 'винчестер', 'винт']],
  ['ram', ['оперативка', 'оперативная', 'озу', 'ram']],
  ['ноутбук', ['ноут', 'ноутбук', 'лэптоп', 'лептоп', 'laptop', 'бук']],
  ['смартфон', ['смартфон', 'телефон', 'мобильник', 'мобильный', 'труба', 'смарт', 'phone']],
  ['планшет', ['планшет', 'планшетник', 'tablet']],
  ['компьютер', ['компьютер', 'компутер', 'комп', 'пк', 'системник', 'системный', 'моноблок', 'неттоп', 'pc']],
  ['часы', ['часы', 'час', 'часики', 'смартчасы']],
  ['консоль', ['консоль', 'приставка', 'игровая']],
  ['наушники', ['наушники', 'наушник', 'уши', 'гарнитура']],
  ['колонка', ['колонка', 'колонк', 'акустика']],
  ['камера', ['камера', 'фотоаппарат', 'фотик', 'зеркалка', 'беззеркалка']],
  ['объектив', ['объектив', 'линза']],
  ['стекло', ['стекло', 'стекл', 'стекла']],
  ['динамик', ['динамик', 'спикер']],
  ['видеокарта', ['видеокарта', 'видюха', 'видяха', 'видик', 'gpu']],
  ['процессор', ['процессор', 'проц', 'cpu']],
  ['материнка', ['материнка', 'материнская', 'мать', 'motherboard']],
  ['дисплей', ['дисплей', 'дисплея', 'дисплеи', 'диспл', 'диспле', 'экран', 'модуль', 'тачскрин', 'тач', 'матрица']],
  ['акб', ['акб', 'аккумулятор', 'батарея', 'батаре', 'батарейка', 'акум', 'аккум']],
  ['зарядка', ['зарядка', 'зарядк', 'зарядное', 'зарядн', 'сзу', 'адаптер']],
  ['шлейф', ['шлейф', 'шлейфик']],
  ['плата', ['плата', 'плат', 'материнская']],
  ['корпус', ['корпус', 'крышка', 'крышк', 'рамка']],
  ['запчасти', ['запчасть', 'запчаст', 'запчасти', 'деталь', 'детали', 'детал']],
  ['комплектующие', ['комплектующие', 'комплектующ', 'железо']],
  ['инструмент', ['инструмент', 'инструменты', 'оборудование', 'оборудован', 'расходники', 'расходник']],
  ['паяльник', ['паяльник', 'паяльная', 'паяльн']],
  ['микроскоп', ['микроскоп']],
  ['фен', ['фен', 'термофен', 'термовоздушная']],
  ['отвертка', ['отвертка', 'отвертк', 'отвертки']],
  ['мультиметр', ['мультиметр', 'тестер']],
  ['программатор', ['программатор']],
  ['чехол', ['чехол', 'чехл', 'бампер', 'кейс']]
];

const CANON = new Map<string, string>();
for (const [canon, variants] of GROUPS) {
  CANON.set(canon, canon);
  for (const variant of variants) {
    if (!CANON.has(variant)) CANON.set(variant, canon);
    const base = stem(variant);
    if (!CANON.has(base)) CANON.set(base, canon);
  }
}

/** Слово в том виде, в каком оно лежит в указателе. */
function canon(word: string): string {
  if (/\d/.test(word) && /[а-я]/.test(word)) return modelToLatin(word);
  return CANON.get(word) ?? CANON.get(stem(word)) ?? stem(word);
}

// Слово-понятие → полка. «Телефон» находит iPhone, даже если слова «телефон» в объявлении нет.
const CONCEPT: Record<string, Category> = {
  смартфон: 'Смартфон',
  планшет: 'Планшет',
  ноутбук: 'Ноутбук',
  компьютер: 'Компьютер',
  часы: 'Часы',
  консоль: 'Консоль',
  наушники: 'Аудио',
  колонка: 'Аудио',
  камера: 'Фото',
  объектив: 'Фото',
  комплектующие: 'Комплектующие',
  запчасти: 'Запчасти',
  инструмент: 'Инструмент'
};

// Приметы полки в самом тексте — на случай, если продавец выбрал не ту категорию.
const SIGNS: Partial<Record<Category, string[]>> = {
  Смартфон: ['iphone', 'galaxy', 'redmi', 'poco', 'pixel', 'смартфон'],
  Планшет: ['ipad', 'планшет', 'tab', 'pad'],
  Ноутбук: ['macbook', 'thinkpad', 'ноутбук'],
  Компьютер: ['imac', 'компьютер'],
  Часы: ['watch', 'часы'],
  Консоль: ['playstation', 'xbox', 'switch', 'nintendo', 'консоль'],
  Аудио: ['airpods', 'наушники', 'колонка', 'marshall', 'jbl'],
  Фото: ['камера', 'объектив', 'canon', 'nikon', 'fujifilm', 'gopro'],
  Комплектующие: ['видеокарта', 'процессор', 'материнка', 'ssd', 'hdd', 'ram', 'rtx', 'gtx'],
  Запчасти: ['дисплей', 'шлейф', 'плата', 'корпус', 'стекло', 'динамик', 'запчасти'],
  Инструмент: ['паяльник', 'микроскоп', 'фен', 'отвертка', 'мультиметр', 'программатор', 'инструмент']
};

// Марка — это и её линейки: «леново» находит ThinkPad, «эпл» — айфоны, макбуки и аирподсы.
const FAMILY: Record<string, string[]> = {
  apple: ['iphone', 'ipad', 'macbook', 'mac', 'imac', 'airpods'],
  samsung: ['galaxy'],
  xiaomi: ['redmi', 'poco'],
  lenovo: ['thinkpad', 'ideapad', 'legion'],
  sony: ['playstation'],
  microsoft: ['xbox', 'surface'],
  nintendo: ['switch']
};

// Внутри одной полки вещи разные: наушники и колонка обе «Аудио». Если на витрине есть
// настоящие наушники, колонку по слову «наушники» не подсовываем.
const KIND: Record<string, string[]> = {
  наушники: ['наушники', 'airpods', 'buds', 'freebuds', 'earbuds', 'headphones'],
  колонка: ['колонка', 'emberton', 'boombox', 'charge', 'flip', 'speaker', 'soundbar', 'саундбар'],
  объектив: ['объектив', 'lens']
};

// С этих слов начинается объявление о детали, инструменте или мелочи — а не о самой вещи.
const PART_HEAD = new Set([
  'дисплей', 'шлейф', 'плата', 'корпус', 'стекло', 'динамик', 'запчасти', 'акб', 'зарядка', 'чехол', 'кабель',
  'пленка', 'коробка', 'ремешок', 'паяльник', 'микроскоп', 'фен', 'отвертка', 'мультиметр', 'программатор', 'инструмент'
]);
const PART_SHELVES = new Set<Category>(['Запчасти', 'Инструмент']);

// Примета → полка: «иксбокса нет» — покажем, что есть из консолей.
const SIGN_SHELF = new Map<string, Category>();
for (const [shelf, signs] of Object.entries(SIGNS) as Array<[Category, string[]]>) {
  for (const sign of signs) if (!SIGN_SHELF.has(sign)) SIGN_SHELF.set(sign, shelf);
}

const STOP = new Set([
  'в', 'на', 'с', 'и', 'для', 'по', 'из', 'от', 'до', 'за', 'или', 'б', 'у', 'бу', 'куплю', 'купить', 'ищу', 'нужен',
  'нужна', 'нужно', 'нужны', 'продам', 'хочу', 'цена', 'ценой', 'рублей', 'руб', 'рубл', 'тысяч', 'тыс', 'крым', 'крыму',
  'город', 'г', 'есть', 'ли', 'где', 'какой', 'мне', 'а', 'не', 'шт', 'the',
  // «Покажи всё до 20 000» — это просьба о порядке, а не название вещи: искать «все»
  // среди товаров бессмысленно, из-за этого витрина молчала при живых товарах в цену.
  'все', 'всё', 'вся', 'покажи', 'показать', 'выведи', 'найди'
]);

// ---------- Опечатки ----------

/** Расстояние Дамерау—Левенштейна с обрывом: лишняя, пропущенная, не та буква, две перепутаны. */
function distance(a: string, b: string, limit: number): number {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  const rows = a.length + 1;
  const cols = b.length + 1;
  let prev2: number[] = [];
  let prev = Array.from({ length: cols }, (_, j) => j);
  for (let i = 1; i < rows; i += 1) {
    const cur = [i];
    let best = i;
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let value = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) value = Math.min(value, prev2[j - 2] + 1);
      cur.push(value);
      if (value < best) best = value;
    }
    if (best > limit) return limit + 1;
    prev2 = prev;
    prev = cur;
  }
  return prev[cols - 1];
}

function typoLimit(word: string): number {
  if (/\d/.test(word) || word.length < 4) return 0;
  return word.length >= 8 ? 2 : 1;
}

function near(a: string, b: string): boolean {
  const limit = Math.min(typoLimit(a), typoLimit(b));
  return limit > 0 && distance(a, b, limit) <= limit;
}

// ---------- Раскладка ----------

const EN = "qwertyuiop[]asdfghjkl;'zxcvbnm,.`";
const RU = 'йцукенгшщзхъфывапролджэячсмитьбюё';
const TO_RU = new Map<string, string>();
const TO_EN = new Map<string, string>();
for (let i = 0; i < EN.length; i += 1) {
  TO_RU.set(EN[i], RU[i]);
  TO_EN.set(RU[i], EN[i]);
}

function swap(word: string, table: Map<string, string>): string {
  let out = '';
  for (const ch of word.toLowerCase()) out += table.get(ch) ?? ch;
  return out;
}

// ---------- Указатель товара ----------

type Indexed = { title: Set<string>; rest: Set<string>; titleList: string[]; restList: string[]; city: string; price: number };

const cache = new WeakMap<Item, Indexed>();

function indexOf(item: Item): Indexed {
  const hit = cache.get(item);
  if (hit) return hit;
  const titleList = split(item.title).map(canon);
  const restList = split([item.description, item.defects, item.kit, item.category, item.condition, item.sellerName].join(' ')).map(canon);
  const made: Indexed = {
    title: new Set(titleList),
    rest: new Set(restList),
    titleList: [...new Set(titleList)],
    restList: [...new Set(restList)],
    city: cityKey(item.city),
    price: toNum(item.price)
  };
  cache.set(item, made);
  return made;
}

function vocabulary(items: Item[]): Set<string> {
  const words = new Set<string>(CANON.keys());
  for (const item of items) {
    const ix = indexOf(item);
    for (const word of ix.titleList) words.add(word);
    for (const word of ix.restList) words.add(word);
  }
  return words;
}

// ---------- Что понял из фразы ----------

export type Chip = { id: string; label: string; start: number; end: number };

type Word = { key: string; forms: string[]; concept?: Category; numeric: boolean };

export type Understood = {
  query: string; // запрос после починки раскладки
  fixed: boolean;
  words: Word[];
  priceMin: number;
  priceMax: number;
  city: string;
  condition: Condition | '';
  delivery: DeliveryKind | '';
  cheapFirst: boolean;
  chips: Chip[];
};

function rub(value: number): string {
  return `${Math.round(value).toLocaleString('ru-RU')} ₽`;
}

const NUM = '(\\d{1,3}(?:[ .,]\\d{3})+|\\d+(?:[.,]\\d)?)';
const THOUSAND = '(?:\\s*(к|k|тыс\\.?|тысяч[аи]?|т\\.?р\\.?)(?![a-zа-я0-9]))?';
const CURRENCY = '(?:\\s*(₽|р\\.?|руб[а-я]*\\.?)(?![a-zа-я0-9]))?';
const AMOUNT = `${NUM}${THOUSAND}${CURRENCY}`;

function amount(digits: string, thousand: string | undefined, keyword: boolean): number {
  const grouped = /[ .,]\d{3}/.test(digits);
  let value = grouped ? Number(digits.replace(/[ .,]/g, '')) : parseFloat(digits.replace(',', '.'));
  if (thousand) value *= 1000;
  else if (keyword && value < 1000) value *= 1000; // «до 30» у прилавка — это до тридцати тысяч
  return Number.isFinite(value) ? Math.round(value) : 0;
}

function fixLayout(query: string, known: Set<string>): string {
  const isKnown = (text: string, loose: boolean): boolean => {
    const words = split(text);
    if (!words.length) return false;
    return words.every(word => {
      if (/^\d+$/.test(word) || STOP.has(word) || cityFromWord(word)) return true;
      const key = canon(word);
      if (known.has(key) || known.has(translit(key))) return true;
      if (!loose) return false;
      for (const other of known) if (other.startsWith(key) && key.length >= 3) return true;
      for (const other of known) if (near(key, other)) return true;
      return false;
    });
  };
  let slipped = false; // хоть одно длинное слово оказалось набрано не в той раскладке
  const parts = query.split(/(\s+)/).map(part => {
    if (!part.trim() || /\d/.test(part.replace(/[^\d]/g, '')) && !/[a-zа-яё]/i.test(part)) return part;
    const letters = part.replace(/[^a-zа-яё]/gi, '');
    if (letters.length < 3) return part;
    if (isKnown(part, true)) return part;
    const toRu = /[a-z]/i.test(part) && !/[а-яё]/i.test(part);
    const candidate = toRu ? swap(part, TO_RU) : swap(part, TO_EN);
    if (!isKnown(candidate, false)) return part;
    if (toRu) slipped = true;
    return candidate;
  });
  if (!slipped) return parts.join('');
  // Раскладку забыли на всей фразе — значит, и короткое рядом набрано так же:
  // «yf» — это «на», «lj» — «до», «30r» — «30к». Сами по себе их не трогаем: «hp» и «lg» — марки.
  return parts.map(part => {
    if (!/^[\da-z]{1,4}$/i.test(part) || !/[a-z]/i.test(part)) return part;
    const candidate = swap(part, TO_RU);
    return STOP.has(candidate) || /^\d+[кр]$/.test(candidate) ? candidate : part;
  }).join('');
}

export function understand(rawQuery: string, items: Item[]): Understood {
  const known = vocabulary(items);
  const fixedQuery = fixLayout(rawQuery, known);
  const query = fixedQuery;
  let rest = norm(query);

  // Короткое слово в чужой раскладке само по себе не чинится: «hp» и «lg» — марки.
  // Но рядом с числом-ценой это почти всегда «до» или «на» («lj 20000»), а не марка —
  // иначе вкладка чужой раскладки у цены молча даёт пустую витрину.
  // Чиним только служебные слова, чтобы «lg 30000» остался маркой с ценой.
  if (/(?:^|\s)[a-z]{2,4}\s+\d/i.test(rest)) {
    const duty = new Set(['на', 'до', 'от', 'за', 'по', 'из', 'с', 'в', 'и', 'или', 'для']);
    rest = split(rest).map(word => {
      if (!/^[a-z]{2,4}$/i.test(word)) return word;
      const russian = swap(word, TO_RU);
      return duty.has(russian) ? russian : word;
    }).join(' ');
  }

  const chips: Chip[] = [];
  const out: Understood = {
    query, fixed: norm(fixedQuery) !== norm(rawQuery), words: [], priceMin: 0, priceMax: 0, city: '', condition: '', delivery: '', cheapFirst: false, chips
  };

  // Вырезаем понятый кусок: дальше его не разбираем, а в плашке помним, откуда он.
  const take = (re: RegExp, use: (match: RegExpExecArray) => { id: string; label: string } | null) => {
    const match = re.exec(rest);
    if (!match) return;
    const chip = use(match);
    if (!chip) return;
    const start = match.index;
    const end = start + match[0].length;
    chips.push({ ...chip, start, end });
    rest = rest.slice(0, start) + ' '.repeat(end - start) + rest.slice(end);
  };

  // Цена. Порядок важен: сначала вилка, потом «до», «от», «около», потом голое «30к».
  take(new RegExp(`(?:^|\\s)от\\s*${AMOUNT}\\s*до\\s*${AMOUNT}`), match => {
    const low = amount(match[1], match[2] || match[5], true);
    const high = amount(match[4], match[5], true);
    if (!low || !high || high < low) return null;
    out.priceMin = low;
    out.priceMax = high;
    return { id: 'price', label: `${Math.round(low).toLocaleString('ru-RU')}–${rub(high)}` };
  });
  if (!out.priceMax) {
    take(new RegExp(`(?:^|\\s)(?:до|дешевле|не\\s+дороже|максимум|бюджет(?:\\s+до)?|в\\s+пределах)\\s*${AMOUNT}`), match => {
      const value = amount(match[1], match[2], true);
      if (!value) return null;
      out.priceMax = value;
      return { id: 'price', label: `до ${rub(value)}` };
    });
  }
  if (!out.priceMin) {
    take(new RegExp(`(?:^|\\s)(?:от|дороже|не\\s+дешевле|минимум)\\s*${AMOUNT}`), match => {
      const value = amount(match[1], match[2], true);
      if (!value) return null;
      out.priceMin = value;
      return { id: 'price-min', label: `от ${rub(value)}` };
    });
  }
  if (!out.priceMax && !out.priceMin) {
    take(new RegExp(`(?:^|\\s)(?:за|около|примерно|где-то|в\\s+районе)\\s*${AMOUNT}`), match => {
      const value = amount(match[1], match[2], true);
      if (!value) return null;
      out.priceMin = Math.round(value * 0.8);
      out.priceMax = Math.round(value * 1.15);
      return { id: 'price', label: `около ${rub(value)}` };
    });
  }
  if (!out.priceMax && !out.priceMin) {
    take(new RegExp(`(?:^|\\s)${NUM}(?:\\s*(к|k|тыс\\.?|тысяч[аи]?|т\\.?р\\.?)(?![a-zа-я0-9])|\\s*(₽|р\\.?|руб[а-я]*\\.?)(?![a-zа-я0-9]))`), match => {
      const value = amount(match[1], match[2], false);
      if (value < 500) return null;
      out.priceMax = value;
      return { id: 'price', label: `до ${rub(value)}` };
    });
  }

  // Состояние. «На запчасти» разбираем раньше полок, иначе «запчасти» станет категорией.
  take(/(?:на|под)\s+запчаст[а-я]*|под\s+восстановлен[а-я]*|под\s+ремонт|не\s+включа[а-я]*|не\s+работа[а-я]*|разбит[а-я]*|бит[а-я]{2,3}(?![а-я])|утопл[а-я]*|донор[а-я]*|нерабоч[а-я]*/, () => {
    out.condition = 'На запчасти';
    return { id: 'condition', label: 'на запчасти' };
  });
  if (!out.condition) {
    take(/как\s+нов[а-я]+|идеал[а-я]*|отличн[а-я]*\s+состояни[а-я]*|без\s+царапин/, () => {
      out.condition = 'Идеальное';
      return { id: 'condition', label: 'идеальное' };
    });
  }

  // Получение.
  take(/с\s+доставк[а-я]*|доставк[а-я]*|отправк[а-я]*|почтой|сдэк[а-я]*|cdek/, () => {
    out.delivery = 'delivery';
    return { id: 'delivery', label: 'с доставкой' };
  });
  if (!out.delivery) {
    take(/самовывоз[а-я]*/, () => {
      out.delivery = 'pickup';
      return { id: 'delivery', label: 'самовывоз' };
    });
  }

  // «Подешевле» — не слово для поиска, а просьба о порядке.
  take(/недорог[а-я]*|подешевле|дешев[а-я]*|бюджетн[а-я]*|выгодн[а-я]*/, () => {
    out.cheapFirst = true;
    return { id: 'cheap', label: 'сначала дешевле' };
  });

  // Город: сначала Крым по словарю, потом города, которые есть у товаров на витрине.
  const itemCities = new Map<string, string>();
  for (const item of items) {
    const name = indexOf(item).city;
    if (name) itemCities.set(canon(norm(name).replace(/[^a-zа-я]/g, '')), name);
  }
  for (const match of rest.matchAll(/(?:(?:^|\s)(?:в|из|г\.?|город)\s+)?([а-я]{3,}(?:-[а-я]+)*)/g)) {
    const word = match[1];
    const city = cityFromWord(word) || itemCities.get(canon(word)) || '';
    if (!city) continue;
    const start = match.index ?? 0;
    const end = start + match[0].length;
    out.city = city;
    chips.push({ id: 'city', label: city, start, end });
    rest = rest.slice(0, start) + ' '.repeat(end - start) + rest.slice(end);
    break;
  }

  // Остальное — слова для поиска.
  const mapKeys = [...CANON.keys()];
  for (const raw of split(rest)) {
    if (STOP.has(raw)) continue;
    const numeric = /^\d+$/.test(raw);
    let key = canon(raw);
    // Опечатка в известном слове: «айфлн» → iphone, «самсунк» → samsung.
    if (!numeric && !CANON.has(raw) && !CANON.has(stem(raw)) && !known.has(key)) {
      const guess = mapKeys.find(candidate => candidate[0] === raw[0] && near(raw, candidate));
      if (guess) key = CANON.get(guess) as string;
    }
    const forms = new Set<string>([key]);
    // Слова нет в словаре — пробуем и латиницей: «леново» найдёт Lenovo.
    if (/[а-я]/.test(key) && !/\d/.test(raw)) {
      forms.add(translit(raw));
      forms.add(translit(key));
    }
    for (const member of FAMILY[key] || []) forms.add(member);
    out.words.push({ key, forms: [...forms].filter(Boolean), concept: CONCEPT[key], numeric });
  }

  chips.sort((a, b) => a.start - b.start);
  return out;
}

/** Убрать из запроса то, что стояло за плашкой. */
export function dropChip(query: string, chip: Chip): string {
  return (query.slice(0, chip.start) + ' ' + query.slice(chip.end)).replace(/\s+/g, ' ').trim();
}

// ---------- Подбор ----------

function hasSign(ix: Indexed, category: Category): boolean {
  const signs = SIGNS[category];
  return !!signs && signs.some(sign => ix.title.has(sign));
}

/** Насколько слово запроса сидит в товаре: 0 — нет, больше — лучше. Заголовок весит втрое. */
function wordScore(word: Word, item: Item, ix: Indexed): number {
  let best = 0;
  for (const form of word.forms) {
    if (ix.title.has(form)) return 3;
    if (ix.rest.has(form)) best = Math.max(best, 1);
  }
  const kind = KIND[word.key];
  if (kind && kind.some(sign => ix.title.has(sign))) return 2.2;
  if (word.concept) {
    if (item.category === word.concept) best = Math.max(best, 1.5);
    else if (hasSign(ix, word.concept)) best = Math.max(best, 1.2);
  }
  if (best || word.numeric) return best;
  for (const form of word.forms) {
    if (form.length < 3 || /\d/.test(form)) continue;
    for (const other of ix.titleList) {
      if (other.startsWith(form)) best = Math.max(best, 2.4);
      else if (near(form, other)) best = Math.max(best, 1.8);
    }
    if (best) continue;
    for (const other of ix.restList) {
      if (other.startsWith(form)) best = Math.max(best, 0.8);
      else if (near(form, other)) best = Math.max(best, 0.6);
    }
  }
  return best;
}

/** Объявление о детали, инструменте или мелочи к вещи, а не о самой вещи. */
function isPart(item: Item, ix: Indexed): boolean {
  return PART_SHELVES.has(item.category) || ix.titleList.slice(0, 2).some(word => PART_HEAD.has(word));
}

type Relax = { city?: boolean; price?: boolean; condition?: boolean; delivery?: boolean };

function fits(item: Item, ix: Indexed, u: Understood, relax: Relax): boolean {
  if (u.city && !relax.city && ix.city !== u.city) return false;
  if (!relax.price) {
    if (u.priceMax && (!ix.price || ix.price > u.priceMax)) return false;
    if (u.priceMin && ix.price < u.priceMin) return false;
  }
  if (u.condition && !relax.condition) {
    const repair = item.condition === 'На запчасти' || item.grade === 'Repair';
    if (u.condition === 'На запчасти' ? !repair : item.condition !== u.condition) return false;
  }
  if (u.delivery && !relax.delivery && !(item.delivery || []).includes(u.delivery)) return false;
  return true;
}

export type SearchResult = {
  items: Item[];
  understood: Understood;
  /** Строка-объяснение: что поиск сделал сам. Пусто — ничего особенного. */
  note: string;
  /** Порядок уже по смыслу — сортировку «сначала новые» поверх не накладывать. */
  ranked: boolean;
};

export function smartSearch(items: Item[], rawQuery: string): SearchResult {
  const understood = understand(rawQuery, items);
  const { words } = understood;
  const hasLimits = !!(understood.city || understood.priceMax || understood.priceMin || understood.condition || understood.delivery);
  const fixedNote = understood.fixed ? `Понял как «${understood.query.trim()}»` : '';

  if (!words.length && !hasLimits) {
    return { items, understood, note: fixedNote, ranked: false };
  }

  type Scored = { item: Item; ix: Indexed; score: number; hits: number };
  const table = items.map(item => {
    const ix = indexOf(item);
    return { item, ix, values: words.map(word => wordScore(word, item, ix)) };
  });
  // Разновидность внутри полки: есть настоящие наушники — колонку по слову «наушники» убираем.
  words.forEach((word, at) => {
    if (!KIND[word.key] || !table.some(row => row.values[at] >= 2)) return;
    for (const row of table) if (row.values[at] < 2) row.values[at] = 0;
  });
  const scored: Scored[] = table.map(({ item, ix, values }) => {
    let score = values.reduce((sum, value) => sum + value, 0);
    const hits = values.filter(value => value > 0).length;
    // При равном смысле выше тот, у кого есть фото и кто свежее: такие объявления живее.
    if (item.media.length) score += 0.15;
    score += Math.max(0, 0.1 - (Date.now() - item.createdAt) / 86400000 / 300);
    return { item, ix, score, hits };
  });

  const byScore = (a: Scored, b: Scored) => b.score - a.score;
  let exact = words.length ? scored.filter(row => row.hits === words.length).sort(byScore) : scored;
  // Спросили вещь («айфон 13»), а не деталь — дисплей и чехол к ней не подмешиваем,
  // если сама вещь на витрине есть. Иначе на «айфон до 30к» первым вылезает экран за 9 500.
  const wantsPart = words.some(word => (word.concept && PART_SHELVES.has(word.concept)) || word.forms.some(form => PART_HEAD.has(form)));
  if (words.length) {
    // И наоборот: спросили «дисплей айфон 13» — телефон, у которого «менялся экран», не подмешиваем.
    const same = exact.filter(row => isPart(row.item, row.ix) === wantsPart);
    if (same.length) exact = same;
  }
  const pick = (rows: Scored[], relax: Relax) => rows.filter(row => fits(row.item, row.ix, understood, relax));
  const done = (rows: Scored[], note: string, keepOrder = false): SearchResult => ({
    items: rows.map(row => row.item),
    understood,
    note: [fixedNote, note].filter(Boolean).join(' · '),
    ranked: words.length > 0 || keepOrder
  });

  let found = pick(exact, {});
  if (found.length) return done(found, '');

  // По смыслу нашли, но мешает одно из условий. Не говорим «ничего нет» — показываем ближайшее и называем, что ослабили.
  if (exact.length) {
    if (understood.city) {
      found = pick(exact, { city: true });
      if (found.length) return done(found, `${understood.city}: такого нет. Показываю весь Крым`);
    }
    if (understood.priceMax || understood.priceMin) {
      found = pick(exact, { price: true });
      if (found.length) {
        const target = understood.priceMax || understood.priceMin;
        found.sort((a, b) => Math.abs(a.ix.price - target) - Math.abs(b.ix.price - target));
        return done(found, 'В эту цену нет. Показываю ближайшие по цене', true);
      }
    }
    if (understood.delivery) {
      found = pick(exact, { delivery: true });
      if (found.length) return done(found, 'С таким получением нет. Показываю все');
    }
    found = pick(exact, { city: true, price: true, condition: true, delivery: true });
    if (found.length) return done(found, 'Точно под условия нет. Показываю похожее');
  }

  // Ни один товар не собрал все слова — берём те, где совпала хотя бы половина и есть слово, а не только цифра.
  if (words.length >= 2) {
    const need = Math.ceil(words.length / 2);
    const loose = scored
      .filter(row => row.hits >= need && row.score >= 1.5 && (!wantsPart || isPart(row.item, row.ix)))
      .sort((a, b) => b.hits - a.hits || b.score - a.score);
    const fit = pick(loose, {});
    if (fit.length) return done(fit, 'Точно такого нет. Показываю похожее');
    const any = pick(loose, { city: true, price: true, condition: true, delivery: true });
    if (any.length) return done(any, 'Точно такого нет. Показываю похожее');
  }

  // Именно такой вещи нет, но понятно, с какой она полки: «иксбокса нет» — покажем консоли.
  const shelves = new Set<Category>();
  for (const word of words) for (const form of word.forms) {
    const shelf = SIGN_SHELF.get(form);
    if (shelf) shelves.add(shelf);
  }
  if (shelves.size) {
    const alike = scored.filter(row => shelves.has(row.item.category)).sort(byScore);
    const fit = pick(alike, {});
    if (fit.length) return done(fit, 'Точно такого нет. Показываю похожее');
  }

  return done([], '');
}

// ---------- Цена относительно похожих ----------

const COLORS = new Set([
  'черн', 'бел', 'син', 'красн', 'зелен', 'голуб', 'розов', 'фиолетов', 'сер', 'серебрист', 'золот', 'желт', 'оранжев', 'титан',
  'black', 'white', 'blue', 'red', 'green', 'pink', 'purple', 'gray', 'grey', 'silver', 'gold', 'graphite', 'midnight',
  'starlight', 'desert', 'natural', 'space', 'titanium', 'yellow', 'orange'
]);

export type PriceHint = { percent: number; count: number };

/**
 * Группы «таких же вещей»: одинаковая модель без цвета, в одном классе состояния
 * (рабочее / на запчасти). Собираем только позиции с ценой и осмысленным названием.
 */
function alikeGroups(items: Item[]): Map<string, Item[]> {
  const groups = new Map<string, Item[]>();
  for (const item of items) {
    const ix = indexOf(item);
    if (!ix.price || ix.titleList.length < 2) continue;
    const model = ix.titleList.filter(word => !COLORS.has(word) && !STOP.has(word)).sort().join(' ');
    if (!model) continue;
    const repair = item.condition === 'На запчасти' || item.grade === 'Repair';
    const key = `${repair ? 'r' : 'w'}|${model}`;
    const list = groups.get(key);
    if (list) list.push(item);
    else groups.set(key, [item]);
  }
  return groups;
}

/** Срединная цена группы. Чётное число — среднее двух серединных. */
function midPrice(list: Item[]): number {
  const prices = list.map(item => indexOf(item).price).sort((a, b) => a - b);
  return prices.length % 2
    ? prices[(prices.length - 1) / 2]
    : (prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2;
}

/**
 * Насколько цена ниже таких же вещей на витрине. Сравниваем только одинаковые модели
 * (без цвета) в одном классе состояния, минимум три объявления — иначе молчим.
 */
export function priceHints(items: Item[]): Map<string, PriceHint> {
  const out = new Map<string, PriceHint>();
  for (const list of alikeGroups(items).values()) {
    if (list.length < 3) continue;
    const mid = midPrice(list);
    for (const item of list) {
      const percent = Math.round((indexOf(item).price - mid) / mid * 100);
      if (percent <= -5) out.set(item.id, { percent: -percent, count: list.length - 1 });
    }
  }
  return out;
}

/**
 * Подсказка продавцу: насколько его цена ВЫШЕ таких же на витрине. Молчим, если
 * дороже меньше чем на 10 % (это ещё «в рынке»), или если сравнить не с чем.
 * Порог выше покупательского нарочно: продавцу важно не «на 5 % дороже»,
 * а «тебя обойдут», и лишний шум здесь стоит дороже пропуска.
 */
export function sellerPriceHints(items: Item[]): Map<string, PriceHint> {
  const out = new Map<string, PriceHint>();
  for (const list of alikeGroups(items).values()) {
    if (list.length < 3) continue;
    const mid = midPrice(list);
    for (const item of list) {
      const percent = Math.round((indexOf(item).price - mid) / mid * 100);
      if (percent >= 10) out.set(item.id, { percent, count: list.length - 1 });
    }
  }
  return out;
}
