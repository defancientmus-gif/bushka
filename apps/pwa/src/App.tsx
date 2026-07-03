import { useCallback, useEffect, useState } from 'react';
import type { Item, View } from './types';
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

export function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}

function Shell() {
  const [view, setView] = useState<View>('market');
  const [exportItem, setExportItem] = useState<Item | null>(null);
  const [editing, setEditing] = useState<Item | null>(null);
  const online = useOnline();

  const changeView = useCallback((next: View) => {
    if (next === 'create') setEditing(null);
    setView(next);
  }, []);

  const startEdit = useCallback((item: Item) => {
    setEditing(item);
    setView('create');
  }, []);

  const finishCreate = useCallback(() => {
    setEditing(null);
    setView('profile');
  }, []);

  // Land at the top whenever the screen changes — no half-scrolled views.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [view]);

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

      <main className="screen" key={view === 'create' ? `create-${editing?.id ?? 'new'}` : view}>
        {view === 'market' && <MarketView onExport={setExportItem} />}
        {view === 'create' && <CreateView editItem={editing} onExport={setExportItem} onCreated={finishCreate} />}
        {view === 'profile' && <ProfileView onExport={setExportItem} onEdit={startEdit} />}
      </main>

      <TabBar view={view} onChange={changeView} />

      {exportItem && <ExportSheet item={exportItem} onClose={() => setExportItem(null)} />}
      <Toast />
    </div>
  );
}
