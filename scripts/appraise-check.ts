// Проверка разбора строки оценщика: npx tsx scripts/appraise-check.ts
import { appraise, parsePhone } from '../apps/pwa/src/lib/appraise';

let ok = 0;
let n = 0;
const check = (q: string, exp: Record<string, unknown>) => {
  n++;
  const p = parsePhone(q);
  const got: Record<string, unknown> = { ...p, model: p.model?.name ?? null };
  const bad = Object.entries(exp).filter(([k, v]) => JSON.stringify(got[k]) !== JSON.stringify(v));
  if (bad.length) console.log('FAIL', q, bad, got);
  else ok++;
};

check('13 про макс 256 акб 86 разбит экран', { model: 'iPhone 13 Pro Max', storage: 256, battery: 86, defects: ['screen'] });
check('s24 ультра 512 потерт', { model: 'Galaxy S24 Ultra', storage: 512, look: 'worn' });
check('айфон 12 мини 64 без царапин коробка', { model: 'iPhone 12 Mini', storage: 64, look: 'mint', box: true });
check('15pro 1тб', { model: 'iPhone 15 Pro', storage: 1024 });
check('редми ноут 13 про 256', { model: 'Redmi Note 13 Pro', storage: 256 });
check('14 заблокирован icloud', { model: 'iPhone 14', defects: ['locked'] });
check('11 емкость 78%', { model: 'iPhone 11', battery: 78 });
check('16 pr', { model: 'iPhone 16 Pro' });

// Здравый смысл формулы: берём всегда дешевле, чем продаём, и не в минус.
const p = parsePhone('13 про 128');
for (const look of ['mint', 'good', 'worn', 'rough'] as const) {
  n++;
  const a = appraise({ model: p.model!, storage: 128, look, battery: 75, box: false, defects: ['screen', 'back'] });
  if (a.buyHigh < a.sellLow && a.buyLow > 0 && a.profit > 0) ok++;
  else console.log('FAIL formula', look, a);
}

console.log(`${ok}/${n}`);
if (ok !== n) process.exit(1);
