// Закон РФ на сайте: реквизиты оператора, согласие на обработку ПД (152-ФЗ), выбор cookie.
// Реквизиты — МЕТКИ-ЗАГЛУШКИ. Настоящие данные Женя вписывает сам, их не выдумываем.

export const REQUISITES = {
  name: '{ИП_ФИО}',
  inn: '{ИНН}',
  ogrnip: '{ОГРНИП}',
  email: '{EMAIL}',
  city: 'Симферополь'
} as const;

/** Полное имя оператора для текстов: «ИП {ИП_ФИО}». */
export const OPERATOR = `ИП ${REQUISITES.name}`;

/** Редакция политики. Меняем дату — старые согласия считаются данными к прошлой редакции. */
export const POLICY_VERSION = '2026-10-28';
export const POLICY_DATE_LABEL = '28 октября 2026 г.';

/** Адреса разделов страницы «Документы» (hash-ссылки — открываются в любом месте приложения). */
export const LEGAL_HASH = {
  policy: '#privacy',
  consent: '#privacy-consent',
  publish: '#privacy-publish',
  cookies: '#privacy-cookies'
} as const;

const pdKey = 'bushka:legal:pd:v1';
const cookieKey = 'bushka:legal:cookies:v1';

export type PdConsent = { at: number; version: string };

export function loadPdConsent(): PdConsent | null {
  try {
    const raw = window.localStorage.getItem(pdKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PdConsent;
    return typeof parsed?.at === 'number' ? parsed : null;
  } catch {
    return null;
  }
}

/** Есть ли действующее согласие: без него объявления не уходят в общую витрину. */
export function hasPdConsent(): boolean {
  return loadPdConsent() != null;
}

export function savePdConsent(): PdConsent {
  const consent: PdConsent = { at: Date.now(), version: POLICY_VERSION };
  try {
    window.localStorage.setItem(pdKey, JSON.stringify(consent));
  } catch {
    // память переполнена — согласие живёт до перезагрузки, витрина всё равно получит товар
  }
  return consent;
}

export function clearPdConsent() {
  try {
    window.localStorage.removeItem(pdKey);
  } catch {
    // ignore
  }
}

// Cookie: обязательное хранилище (склад, тема, вход) работает всегда — без него приложения нет.
// «Необязательные» (аналитика, если когда-нибудь появится) — ТОЛЬКО после явного «Разрешить».
export type CookieChoice = 'all' | 'necessary';

export function loadCookieChoice(): CookieChoice | null {
  try {
    const value = window.localStorage.getItem(cookieKey);
    return value === 'all' || value === 'necessary' ? value : null;
  } catch {
    return null;
  }
}

export function saveCookieChoice(choice: CookieChoice) {
  try {
    window.localStorage.setItem(cookieKey, choice);
  } catch {
    // ignore — баннер просто покажется ещё раз
  }
  window.dispatchEvent(new Event('bushka:cookies'));
}

export function resetCookieChoice() {
  try {
    window.localStorage.removeItem(cookieKey);
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event('bushka:cookies'));
}

/** Сюда смотрит любая будущая аналитика/пиксель, прежде чем включиться. */
export function optionalCookiesAllowed(): boolean {
  return loadCookieChoice() === 'all';
}

export function formatConsentDate(ts: number): string {
  return new Date(ts).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}
