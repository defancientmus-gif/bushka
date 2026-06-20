export function toNum(value?: string): number {
  if (!value) return 0;
  const digits = String(value).replace(/[^\d]/g, '');
  const parsed = parseInt(digits, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function formatMoney(value: number): string {
  return `${Math.round(value).toLocaleString('ru-RU')} ₽`;
}

export type Light = 'green' | 'yellow' | 'red';

/** Lot traffic-light by margin vs cost: fat / thin / loss. Null if no cost set. */
export function marginLight(price?: string, cost?: string): Light | null {
  const c = toNum(cost);
  if (c <= 0) return null;
  const margin = toNum(price) - c;
  if (margin < 0) return 'red';
  return margin / c >= 0.12 ? 'green' : 'yellow';
}

export const lightLabel: Record<Light, string> = { green: 'жирный', yellow: 'тонко', red: 'минус' };

export function isToday(ts: number): boolean {
  const d = new Date(ts);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

/** Tidy a typed price: "14000" → "14 000 ₽". Leaves words like "договорная" alone. */
export function normalizePrice(value: string): string {
  const raw = (value || '').trim();
  if (!raw) return '';
  if (/^[\d\s., ]+$/.test(raw)) {
    const amount = toNum(raw);
    return amount > 0 ? formatMoney(amount) : raw;
  }
  return raw;
}
