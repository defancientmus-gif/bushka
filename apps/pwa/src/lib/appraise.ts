import { PHONES, REPAIR_COST, TARGET_MARGIN, type PhoneModel } from '../data/phonePrices';

// Оценщик «в карман»: модель + состояние → вилка «берём → продаём» и честное «почему так».
// Только правила и таблица — без ИИ и без сети: работает на рынке даже без интернета.

export type Look = 'mint' | 'good' | 'worn' | 'rough';
export type Defect = 'screen' | 'back' | 'battery' | 'camera' | 'faceid' | 'aftermarket' | 'water' | 'locked';

export const lookLabels: Record<Look, string> = {
  mint: 'Как новый',
  good: 'Хорошее',
  worn: 'Потёртости',
  rough: 'Битый корпус'
};
export const lookOrder: Look[] = ['mint', 'good', 'worn', 'rough'];
const LOOK_FACTOR: Record<Look, number> = { mint: 1.06, good: 1, worn: 0.9, rough: 0.78 };

export const defectLabels: Record<Defect, string> = {
  screen: 'Разбит экран',
  back: 'Разбита крышка',
  battery: 'АКБ под замену',
  camera: 'Не работает камера',
  faceid: 'Нет Face ID / Touch ID',
  aftermarket: 'Экран не родной',
  water: 'Был в воде',
  locked: 'Блокировка iCloud / Google'
};
export const defectOrder: Defect[] = ['screen', 'back', 'battery', 'camera', 'faceid', 'aftermarket', 'water', 'locked'];

export type AppraiseInput = {
  model: PhoneModel;
  storage: number;
  look: Look;
  /** Ёмкость АКБ, % (null — не знаем). */
  battery: number | null;
  box: boolean;
  defects: Defect[];
};

export type Reason = { text: string; delta: number };

export type Appraisal = {
  /** Берём: от и до. До — потолок, выше не поднимаемся. */
  buyLow: number;
  buyHigh: number;
  /** Продаём: вилка после ремонта. */
  sellLow: number;
  sellHigh: number;
  repairs: number;
  /** Навар, если взяли по верхней границе и продали по середине вилки, за вычетом ремонта. */
  profit: number;
  partsOnly: boolean;
  reasons: Reason[];
  /** Что сказать продавцу — коротко, по делу, без давления. */
  pitch: string;
};

const round500 = (value: number) => Math.max(0, Math.round(value / 500) * 500);
const round100 = (value: number) => Math.round(value / 100) * 100;
const floor500 = (value: number) => Math.max(0, Math.floor(value / 500) * 500);

/** Цена за выбранную память; нет такой в таблице — ближайшая из имеющихся. */
export function sellBase(model: PhoneModel, storage: number): number {
  if (model.sell[storage]) return model.sell[storage];
  const sizes = storageOptions(model);
  const nearest = sizes.reduce((best, size) => (Math.abs(size - storage) < Math.abs(best - storage) ? size : best), sizes[0]);
  return model.sell[nearest];
}

export function storageOptions(model: PhoneModel): number[] {
  return Object.keys(model.sell).map(Number).sort((a, b) => a - b);
}

export function storageLabel(gb: number): string {
  return gb >= 1024 ? `${gb / 1024} ТБ` : `${gb} ГБ`;
}

export function appraise(input: AppraiseInput): Appraisal {
  const { model, look, box, defects } = input;
  const base = sellBase(model, input.storage);
  const has = (defect: Defect) => defects.includes(defect);
  const reasons: Reason[] = [];

  // Блокировка — это не «нет», это другой товар: донор на запчасти.
  if (has('locked')) {
    const sellParts = round500(base * 0.22);
    const buyHigh = floor500(base * 0.12);
    return {
      buyLow: floor500(buyHigh * 0.85),
      buyHigh,
      sellLow: floor500(sellParts * 0.9),
      sellHigh: round500(sellParts * 1.1),
      repairs: 0,
      profit: sellParts - buyHigh,
      partsOnly: true,
      reasons: [{ text: 'Блокировка — берём только как донор на запчасти', delta: buyHigh - base }],
      pitch: `Аппарат с блокировкой берём только на запчасти — могу дать ${fmt(buyHigh)}.`
    };
  }

  let sell = base;
  const lookDelta = round100(base * (LOOK_FACTOR[look] - 1));
  if (lookDelta) reasons.push({ text: `Корпус: ${lookLabels[look].toLowerCase()}`, delta: lookDelta });
  sell += lookDelta;

  if (box) {
    const boxDelta = round100(base * 0.03);
    reasons.push({ text: 'Есть коробка — покупателю спокойнее', delta: boxDelta });
    sell += boxDelta;
  }

  // Ремонт до продажного вида — считаем деньгами, а не процентами.
  let repairs = 0;
  const repair = (kind: keyof typeof REPAIR_COST, text: string) => {
    const cost = REPAIR_COST[kind][model.parts];
    repairs += cost;
    reasons.push({ text, delta: -cost });
  };
  if (has('screen')) repair('screen', 'Замена экрана');
  if (has('back')) repair('back', 'Замена задней крышки');
  if (has('camera')) repair('camera', 'Ремонт камеры');

  const battery = input.battery;
  const batteryDead = has('battery') || (battery != null && battery < 80);
  if (batteryDead) {
    repair('battery', battery != null && battery < 80 ? `АКБ ${battery}% — под замену` : 'Замена АКБ');
    if (model.batteryHealth) {
      // iPhone после замены пишет «неизвестная деталь» — покупатель это видит.
      const tag = -round100(base * 0.03);
      reasons.push({ text: 'После замены АКБ iPhone покажет «неоригинальная деталь»', delta: tag });
      sell += tag;
    }
  } else if (battery != null) {
    const factor = battery >= 90 ? 0.02 : battery >= 85 ? 0 : -0.04;
    const delta = round100(base * factor);
    if (delta) reasons.push({ text: `АКБ ${battery}%`, delta });
    sell += delta;
  }

  // То, что не чинится разумно, — снижает цену продажи навсегда.
  const penalty = (factor: number, text: string) => {
    const delta = -round100(base * factor);
    reasons.push({ text, delta });
    sell += delta;
  };
  if (has('faceid')) penalty(0.25, 'Без Face ID / Touch ID — берут неохотно');
  if (has('aftermarket') && !has('screen')) penalty(0.12, 'Не родной экран — минус в глазах покупателя');
  if (has('water')) penalty(0.35, 'Был в воде — риск скрытых поломок');

  sell = Math.max(round500(base * 0.2), sell);
  const sellLow = floor500(sell * 0.96);
  const sellHigh = round500(sell * 1.04);
  const sellMid = (sellLow + sellHigh) / 2;

  const margin = TARGET_MARGIN[model.pace];
  const buyHigh = floor500((sellMid - repairs) * (1 - margin));
  const buyLow = floor500(buyHigh * 0.88);
  const profit = Math.round(sellMid - repairs - buyHigh);

  const mainIssue = reasons.filter(reason => reason.delta < 0).sort((a, b) => a.delta - b.delta)[0];
  const pitch = mainIssue
    ? `Могу дать ${num(buyLow)}–${fmt(buyHigh)}: ${mainIssue.text.toLowerCase()}. Деньги сразу.`
    : `Аппарат хороший — дам ${fmt(buyHigh)}, деньги сразу.`;

  return { buyLow, buyHigh, sellLow, sellHigh, repairs, profit, partsOnly: false, reasons, pitch };
}

function num(value: number): string {
  return Math.round(value).toLocaleString('ru-RU');
}

function fmt(value: number): string {
  return `${num(value)} ₽`;
}

/** Модели нет в таблице — не «нет», а оценка от цены, которую человек знает сам. */
export function customModel(name: string, sellPrice: number): PhoneModel {
  return {
    id: 'custom',
    brand: 'Apple',
    name: name.trim() || 'Телефон',
    short: '',
    sell: { 0: sellPrice },
    parts: sellPrice >= 60000 ? 'top' : sellPrice >= 30000 ? 'flag' : sellPrice >= 15000 ? 'mid' : 'budget',
    pace: 'normal',
    batteryHealth: /iphone|айфон/i.test(name)
  };
}

// ---------- Распознавание строки «13 про макс 256 акб 86 разбит экран» ----------

const SYNONYMS: Array<[RegExp, string]> = [
  [/айфон|айфоне|iphone|ифон/g, 'iphone'],
  [/самсунг|samsung|galaxy|галакси/g, 'samsung'],
  [/сяоми|ксиоми|шаоми/g, 'xiaomi'],
  [/редми/g, 'redmi'],
  [/про(?=\s|$|\d)/g, 'pro'],
  [/макс/g, 'max'],
  [/мини/g, 'mini'],
  [/плюс|\+/g, ' plus'],
  [/эйр|аир/g, 'air'],
  [/ультра/g, 'ultra'],
  [/ноут/g, 'note'],
  [/промакс/g, 'pro max']
];

export function normalizeQuery(raw: string): string {
  let s = ` ${raw.toLowerCase().replace(/ё/g, 'е')} `;
  s = s.replace(/promax|промакс/g, 'pro max');
  for (const [re, to] of SYNONYMS) s = s.replace(re, to);
  // «13pro» → «13 pro», «s23ultra» → «s23 ultra»
  s = s.replace(/(\d)(pro|max|mini|plus|air|ultra)/g, '$1 $2');
  return s.replace(/[^a-z0-9а-я%]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Модели, которые подходят под строку, — лучшие первыми. */
export function findModels(raw: string, limit = 5): PhoneModel[] {
  const q = ` ${normalizeQuery(raw)} `;
  if (q.trim().length < 1) return [];
  const scored = PHONES.map(model => {
    const keys = [model.short, model.name.toLowerCase()];
    let score = 0;
    for (const key of keys) {
      const k = normalizeQuery(key);
      if (q.includes(` ${k} `)) score = Math.max(score, 100 + k.length);
      // Недопечатанное «16 pr» — это уже про «16 Pro», а не про «16».
      else if (` ${k}`.startsWith(q.trimEnd())) score = Math.max(score, 100 + q.trim().length);
    }
    return { model, score };
  }).filter(entry => entry.score > 0);
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(entry => entry.model);
}

export type ParsedPhone = {
  model: PhoneModel | null;
  storage: number | null;
  battery: number | null;
  defects: Defect[];
  box: boolean;
  look: Look | null;
};

const LOOK_WORDS: Array<[Look, RegExp]> = [
  ['mint', /как нов|идеал|без царапин/],
  ['rough', /бит\w* корпус|корпус бит|вмятин|погнут/],
  ['worn', /потерт|царапин|следы|поцарап|затерт/]
];

const DEFECT_WORDS: Array<[Defect, RegExp]> = [
  ['locked', /icloud|айклауд|заблок|блокир|google акк|frp/],
  ['water', /в воде|утоп|влаг|окисл/],
  ['faceid', /face ?id|фейс|touch ?id|тач ?ид/],
  ['aftermarket', /не родн|копия экран|экран копия|менял[и]? экран|замен[её]н экран/],
  ['screen', /разбит\w* экран|экран разбит|трещин\w* (на )?экран|экран в трещин|битый экран/],
  ['back', /крышк|задн\w* стекл/],
  ['camera', /камер\w* не|не работает камер/],
  ['battery', /акб под замену|батаре\w* под замену|сервис акб|требуется обслуживание/]
];

/** Разбирает свободную строку продавца: модель, память, АКБ, дефекты, коробка. */
export function parsePhone(raw: string): ParsedPhone {
  const text = raw.toLowerCase().replace(/ё/g, 'е');
  const model = findModels(raw, 1)[0] ?? null;

  let storage: number | null = null;
  const tb = text.match(/(\d)\s*(tb|тб|терабайт)/);
  if (tb) storage = Number(tb[1]) * 1024;
  if (!storage) {
    for (const match of text.matchAll(/(\d{2,4})\s*(gb|гб|г\b)?/g)) {
      const value = Number(match[1]);
      if ([64, 128, 256, 512].includes(value)) {
        storage = value;
        break;
      }
    }
  }

  let battery: number | null = null;
  const bat = text.match(/(?:акб|батаре\w*|battery|емкост\w*|износ)\D{0,4}(\d{2,3})\s*%?/) ?? text.match(/(\d{2,3})\s*%/);
  if (bat) {
    const value = Number(bat[1]);
    if (value >= 50 && value <= 100) battery = value;
  }

  const defects = DEFECT_WORDS.filter(([, re]) => re.test(text)).map(([defect]) => defect);
  const box = /коробк|короб\b|полный комплект|комплект полн/.test(text);
  const look = LOOK_WORDS.find(([, re]) => re.test(text))?.[0] ?? null;
  return { model, storage, battery, defects, box, look };
}
