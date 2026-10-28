// Таблица цен для оценщика — ЧЕРНОВИК-ОРИЕНТИР (осень 2026, Симферополь), не биржа.
// sell — за сколько реально уходит б/у аппарат в хорошем состоянии: АКБ 85%+, без коробки,
// всё работает, экран родной. Женя правит цифры под свой рынок — формулы ниже трогать не нужно.
//
// parts — ценовой класс запчастей (во сколько обойдётся ремонт), см. REPAIR_COST.
// pace  — как быстро уходит: hot — за пару дней, normal — неделя, slow — может зависнуть.

export type PartsTier = 'budget' | 'mid' | 'flag' | 'top';
export type Pace = 'hot' | 'normal' | 'slow';

export type PhoneModel = {
  id: string;
  brand: 'Apple' | 'Samsung' | 'Xiaomi';
  name: string;
  /** Как модель называют без бренда («13 pro max», «s23 ultra») — для поиска. */
  short: string;
  /** Память (ГБ) → цена продажи, ₽. */
  sell: Record<number, number>;
  parts: PartsTier;
  pace: Pace;
  /** Есть ли у модели показ ёмкости АКБ в настройках (iPhone — да). */
  batteryHealth: boolean;
};

export const PRICES_UPDATED = 'октябрь 2026';

const iphone = (short: string, sell: Record<number, number>, parts: PartsTier, pace: Pace): PhoneModel => ({
  id: `iphone-${short.replace(/\s+/g, '-')}`,
  brand: 'Apple',
  name: `iPhone ${short.replace(/\b(pro|max|plus|mini|air)\b/g, w => w[0].toUpperCase() + w.slice(1))}`.replace(/\bse\b/i, 'SE'),
  short,
  sell,
  parts,
  pace,
  batteryHealth: true
});

const android = (brand: 'Samsung' | 'Xiaomi', name: string, short: string, sell: Record<number, number>, parts: PartsTier, pace: Pace): PhoneModel => ({
  id: `${brand.toLowerCase()}-${short.replace(/\s+/g, '-')}`,
  brand,
  name,
  short,
  sell,
  parts,
  pace,
  batteryHealth: false
});

export const PHONES: PhoneModel[] = [
  iphone('se 2022', { 64: 11000, 128: 13000, 256: 14500 }, 'budget', 'normal'),
  iphone('11', { 64: 13000, 128: 15000, 256: 17000 }, 'budget', 'normal'),
  iphone('11 pro', { 64: 16000, 256: 18500, 512: 20000 }, 'mid', 'normal'),
  iphone('11 pro max', { 64: 19000, 256: 21500, 512: 23000 }, 'mid', 'normal'),
  iphone('12 mini', { 64: 14000, 128: 16000, 256: 18000 }, 'mid', 'slow'),
  iphone('12', { 64: 17000, 128: 19500, 256: 22000 }, 'mid', 'normal'),
  iphone('12 pro', { 128: 24000, 256: 26500, 512: 28500 }, 'mid', 'normal'),
  iphone('12 pro max', { 128: 28000, 256: 31000, 512: 33000 }, 'mid', 'normal'),
  iphone('13 mini', { 128: 24000, 256: 27000, 512: 29000 }, 'mid', 'slow'),
  iphone('13', { 128: 28000, 256: 31500, 512: 34000 }, 'mid', 'hot'),
  iphone('13 pro', { 128: 35000, 256: 38500, 512: 41000, 1024: 43000 }, 'flag', 'hot'),
  iphone('13 pro max', { 128: 40000, 256: 44000, 512: 47000, 1024: 49000 }, 'flag', 'hot'),
  iphone('14', { 128: 34000, 256: 38000, 512: 41000 }, 'flag', 'hot'),
  iphone('14 plus', { 128: 37000, 256: 41000, 512: 44000 }, 'flag', 'normal'),
  iphone('14 pro', { 128: 45000, 256: 49000, 512: 52000, 1024: 55000 }, 'flag', 'hot'),
  iphone('14 pro max', { 128: 52000, 256: 56000, 512: 60000, 1024: 63000 }, 'flag', 'hot'),
  iphone('15', { 128: 45000, 256: 50000, 512: 54000 }, 'flag', 'hot'),
  iphone('15 plus', { 128: 49000, 256: 54000, 512: 58000 }, 'flag', 'normal'),
  iphone('15 pro', { 128: 58000, 256: 63000, 512: 68000, 1024: 72000 }, 'top', 'hot'),
  iphone('15 pro max', { 256: 72000, 512: 78000, 1024: 83000 }, 'top', 'hot'),
  iphone('16e', { 128: 42000, 256: 47000, 512: 52000 }, 'flag', 'normal'),
  iphone('16', { 128: 56000, 256: 62000, 512: 67000 }, 'flag', 'hot'),
  iphone('16 plus', { 128: 61000, 256: 67000, 512: 72000 }, 'flag', 'normal'),
  iphone('16 pro', { 128: 72000, 256: 78000, 512: 84000, 1024: 90000 }, 'top', 'hot'),
  iphone('16 pro max', { 256: 88000, 512: 95000, 1024: 102000 }, 'top', 'hot'),
  iphone('17', { 256: 72000, 512: 80000 }, 'flag', 'hot'),
  iphone('17 air', { 256: 78000, 512: 86000, 1024: 94000 }, 'top', 'normal'),
  iphone('17 pro', { 256: 95000, 512: 105000, 1024: 115000 }, 'top', 'hot'),
  iphone('17 pro max', { 256: 108000, 512: 118000, 1024: 128000, 2048: 140000 }, 'top', 'hot'),

  android('Samsung', 'Galaxy A54', 'a54', { 128: 14000, 256: 16000 }, 'budget', 'slow'),
  android('Samsung', 'Galaxy A55', 'a55', { 128: 18000, 256: 20000 }, 'budget', 'normal'),
  android('Samsung', 'Galaxy S22', 's22', { 128: 19000, 256: 21000 }, 'mid', 'slow'),
  android('Samsung', 'Galaxy S23', 's23', { 128: 27000, 256: 30000 }, 'flag', 'normal'),
  android('Samsung', 'Galaxy S23 Ultra', 's23 ultra', { 256: 42000, 512: 46000 }, 'top', 'normal'),
  android('Samsung', 'Galaxy S24', 's24', { 128: 37000, 256: 41000 }, 'flag', 'normal'),
  android('Samsung', 'Galaxy S24 Ultra', 's24 ultra', { 256: 62000, 512: 68000 }, 'top', 'normal'),
  android('Samsung', 'Galaxy S25', 's25', { 128: 50000, 256: 55000 }, 'flag', 'normal'),
  android('Samsung', 'Galaxy S25 Ultra', 's25 ultra', { 256: 80000, 512: 88000 }, 'top', 'normal'),
  android('Xiaomi', 'Redmi Note 12', 'redmi note 12', { 128: 9000, 256: 10500 }, 'budget', 'slow'),
  android('Xiaomi', 'Redmi Note 13 Pro', 'redmi note 13 pro', { 256: 15000, 512: 17000 }, 'budget', 'normal'),
  android('Xiaomi', 'Xiaomi 13T', '13t', { 256: 24000, 512: 27000 }, 'mid', 'slow'),
  android('Xiaomi', 'Xiaomi 14T', '14t', { 256: 33000, 512: 36000 }, 'mid', 'normal')
];

/** Во сколько обойдётся ремонт до продажного вида, ₽ (качественные запчасти + работа). */
export const REPAIR_COST: Record<'screen' | 'battery' | 'back' | 'camera', Record<PartsTier, number>> = {
  screen: { budget: 3500, mid: 6000, flag: 11000, top: 18000 },
  battery: { budget: 1800, mid: 2500, flag: 3500, top: 4500 },
  back: { budget: 1500, mid: 2500, flag: 4000, top: 6000 },
  camera: { budget: 2500, mid: 4000, flag: 7000, top: 10000 }
};

/** Сколько навара закладываем от цены продажи: ходовой отдаём быстрее — можно брать тоньше. */
export const TARGET_MARGIN: Record<Pace, number> = { hot: 0.15, normal: 0.2, slow: 0.25 };
