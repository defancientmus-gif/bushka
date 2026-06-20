import { formatMoney } from './money';
import { pluralize } from './format';

function timeGreeting(hour: number): string {
  if (hour < 6) return 'Доброй ночи';
  if (hour < 12) return 'Доброе утро';
  if (hour < 18) return 'Добрый день';
  return 'Добрый вечер';
}

export type PulseInput = {
  name: string;
  todayMargin: number;
  todayCount: number;
  streak: number;
  staleCount: number;
  greenCount: number;
  inStock: number;
};

// "Пульс дня" — the product greets warmly and DECIDES what matters now
// (DNA: решает, а не сообщает). One glance → you know how the day stands.
export function buildPulse(d: PulseInput): { greet: string; lead: string; hint: string } {
  const named = d.name && d.name.trim() && d.name !== 'Вы' ? `, ${d.name.trim()}` : '';
  const greet = `${timeGreeting(new Date().getHours())}${named}`;

  const lead = d.todayMargin > 0
    ? `Сегодня в кармане ${formatMoney(d.todayMargin)}`
    : 'Сегодня сделок ещё нет — давай первую';

  let hint: string;
  if (d.staleCount > 0) {
    hint = `${d.staleCount} ${pluralize(d.staleCount, 'аппарат заскучал', 'аппарата заскучали', 'аппаратов заскучали')} — подвинь цену, оживи кэш`;
  } else if (d.streak >= 2) {
    hint = `Серия ${d.streak} ${pluralize(d.streak, 'день', 'дня', 'дней')} — не урони сегодня`;
  } else if (d.greenCount > 0) {
    hint = `${d.greenCount} ${pluralize(d.greenCount, 'жирный лот ждёт', 'жирных лота ждут', 'жирных лотов ждут')} покупателя`;
  } else if (d.inStock > 0) {
    hint = `В товаре ${formatMoney(d.inStock)} — пусть работают`;
  } else {
    hint = 'Сфоткал — выставил. Время не ждёт';
  }

  return { greet, lead, hint };
}
