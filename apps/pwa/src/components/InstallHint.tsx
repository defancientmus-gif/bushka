import { useState } from 'react';
import { useInstall } from '../lib/hooks';
import { CloseIcon } from './icons';

const KEY = 'bushka:pwa:install-hint';

export function InstallHint() {
  const { canInstall, isStandalone, isIOS, promptInstall } = useInstall();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return window.localStorage.getItem(KEY) === '1';
    } catch {
      return false;
    }
  });

  // Already installed, dismissed, or a desktop browser with no install path → stay quiet.
  if (isStandalone || dismissed || (!canInstall && !isIOS)) return null;

  function close() {
    setDismissed(true);
    try {
      window.localStorage.setItem(KEY, '1');
    } catch {
      // ignore
    }
  }

  async function install() {
    await promptInstall();
    close();
  }

  return (
    <div className="install-hint">
      <div className="install-text">
        <strong>Поставь на телефон</strong>
        <small>{isIOS ? 'Поделиться → «На экран „Домой"» — откроется как приложение' : 'Будет как обычное приложение, работает офлайн'}</small>
      </div>
      {canInstall && <button type="button" className="solid-btn" onClick={install}>Установить</button>}
      <button type="button" className="icon-btn" onClick={close} aria-label="Скрыть"><CloseIcon size={16} /></button>
    </div>
  );
}
