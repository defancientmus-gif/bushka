import { useCallback, useEffect, useRef, useState } from 'react';
import type { DraftItem, Item, View } from './types';
import { StoreProvider } from './lib/store';
import { useOnline } from './lib/hooks';
import { TabBar } from './components/TabBar';
import { Toast } from './components/Toast';
import { ExportSheet } from './components/ExportSheet';
import { WifiOffIcon } from './components/icons';
import { InstallHint } from './components/InstallHint';
import { APP_TAG, APP_VERSION } from './lib/version';
import { MarketView } from './views/MarketView';
import { CreateView } from './views/CreateView';
import { ProfileView } from './views/ProfileView';
import { LegalView } from './views/LegalView';
import { AppraiseView } from './views/AppraiseView';
import { CookieBanner } from './components/CookieBanner';
import { SiteFooter } from './components/SiteFooter';

// Адреса-ссылки без роутера: #privacy… — документы (слоем поверх, черновик формы не теряется),
// #ocenka — оценщик. Ссылку можно дать человеку или повесить QR.
const isLegalHash = (hash: string) => hash.startsWith('#privacy');
const initialView = (): View => (window.location.hash === '#ocenka' ? 'appraise' : 'market');

export function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}

function Shell() {
  const [view, setView] = useState<View>(initialView);
  const [exportItem, setExportItem] = useState<Item | null>(null);
  const [editing, setEditing] = useState<Item | null>(null);
  const [prefill, setPrefill] = useState<{ key: number; draft: Partial<DraftItem> } | null>(null);
  const [legal, setLegal] = useState<string | null>(() => (isLegalHash(window.location.hash) ? window.location.hash : null));
  const legalFromApp = useRef(false);
  const online = useOnline();

  useEffect(() => {
    const onHash = () => {
      const hash = window.location.hash;
      if (isLegalHash(hash)) {
        legalFromApp.current = true;
        setLegal(hash);
      } else {
        setLegal(null);
        if (hash === '#ocenka') setView('appraise');
      }
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const clearHash = useCallback(() => {
    if (window.location.hash) history.replaceState(null, '', window.location.pathname + window.location.search);
  }, []);

  const closeLegal = useCallback(() => {
    // Пришли по ссылке внутри приложения — шаг назад (браузерная «назад» тоже работает); иначе просто закрываем.
    if (legalFromApp.current) {
      legalFromApp.current = false;
      history.back();
    } else {
      clearHash();
      setLegal(null);
    }
  }, [clearHash]);

  const changeView = useCallback((next: View) => {
    if (next === 'create') {
      setEditing(null);
      setPrefill(null);
    }
    legalFromApp.current = false;
    setLegal(null);
    clearHash();
    setView(next);
  }, [clearHash]);

  const sellFromAppraisal = useCallback((draft: Partial<DraftItem>) => {
    setEditing(null);
    setPrefill({ key: Date.now(), draft });
    clearHash();
    setView('create');
  }, [clearHash]);

  const startEdit = useCallback((item: Item) => {
    setEditing(item);
    setView('create');
  }, []);

  const finishCreate = useCallback(() => {
    setEditing(null);
    setPrefill(null);
    setView('profile');
  }, []);

  // Land at the top whenever the screen changes — no half-scrolled views.
  useEffect(() => {
    if (!legal) window.scrollTo({ top: 0 });
  }, [view, legal]);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">бу</span>
          <span className="brand-name">БУ.шка</span>
          <span className="build-badge" title={`БУ.шка ${APP_VERSION} · бета · ${APP_TAG}`}>{APP_TAG}</span>
        </div>
        {!online && (
          <span className="offline-flag">
            <WifiOffIcon size={15} />
            офлайн
          </span>
        )}
      </header>

      <InstallHint />

      <main className="screen" hidden={legal != null} key={view === 'create' ? `create-${editing?.id ?? prefill?.key ?? 'new'}` : view}>
        {view === 'market' && <MarketView onExport={setExportItem} />}
        {view === 'create' && <CreateView editItem={editing} prefill={prefill?.draft} onExport={setExportItem} onCreated={finishCreate} />}
        {view === 'profile' && <ProfileView onExport={setExportItem} onEdit={startEdit} onAppraise={() => changeView('appraise')} />}
        {view === 'appraise' && <AppraiseView onSell={sellFromAppraisal} onBack={() => changeView('profile')} />}
      </main>

      {legal != null && (
        <main className="screen">
          <LegalView anchor={legal} onBack={closeLegal} />
        </main>
      )}

      <SiteFooter />

      <TabBar view={legal != null ? null : view} onChange={changeView} />
      <CookieBanner />

      {exportItem && <ExportSheet item={exportItem} onClose={() => setExportItem(null)} />}
      <Toast />
    </div>
  );
}
