export function toNum(value?: string): number {
  if (!value) return 0;
  const digits = String(value).replace(/[^\d]/g, '');
  const parsed = parseInt(digits, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function formatMoney(value: number): string {
  return `${Math.round(value).toLocaleString('ru-RU')} ₽`;
}
