export function toNum(value?: string): number {
  if (!value) return 0;
  const digits = String(value).replace(/[^\d]/g, '');
  const parsed = parseInt(digits, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function formatMoney(value: number): string {
  return `${Math.round(value).toLocaleString('ru-RU')} ₽`;
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
