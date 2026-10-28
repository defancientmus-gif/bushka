import { useEffect, useState } from 'react';
import { LEGAL_HASH, loadCookieChoice, saveCookieChoice, type CookieChoice } from '../lib/legal';

/** Cookie без навязывания: две равные кнопки, одно нажатие на любой выбор, ничего не перекрывает.
 *  Нужное хранилище работает всегда; «Разрешить» включает только необязательное (его пока нет). */
export function CookieBanner() {
  const [choice, setChoice] = useState<CookieChoice | null>(() => loadCookieChoice());

  useEffect(() => {
    const sync = () => setChoice(loadCookieChoice());
    window.addEventListener('bushka:cookies', sync);
    return () => window.removeEventListener('bushka:cookies', sync);
  }, []);

  if (choice) return null;

  return (
    <aside className="cookie-banner" role="region" aria-label="Cookie">
      <p>
        Без рекламных и следящих cookie. Браузер хранит только нужное для работы: склад, тему, вход.{' '}
        <a href={LEGAL_HASH.cookies}>Подробнее</a>
      </p>
      <div className="cookie-actions">
        <button type="button" className="ghost-btn grow" onClick={() => saveCookieChoice('necessary')}>Только нужные</button>
        <button type="button" className="ghost-btn grow" onClick={() => saveCookieChoice('all')}>Разрешить все</button>
      </div>
    </aside>
  );
}
