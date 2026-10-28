import { LEGAL_HASH, OPERATOR, REQUISITES, resetCookieChoice } from '../lib/legal';

/** Подвал с реквизитами продавца-оператора — на каждом экране (ЗоЗПП ст. 9, 152-ФЗ ст. 18.1). */
export function SiteFooter() {
  return (
    <footer className="site-foot">
      <p className="site-req">
        {OPERATOR} · ИНН {REQUISITES.inn} · ОГРНИП {REQUISITES.ogrnip}
        <br />
        г. {REQUISITES.city} · {REQUISITES.email}
      </p>
      <p className="site-links">
        <a href={LEGAL_HASH.policy}>Политика конфиденциальности</a>
        <button type="button" onClick={resetCookieChoice}>Настройки cookie</button>
      </p>
    </footer>
  );
}
