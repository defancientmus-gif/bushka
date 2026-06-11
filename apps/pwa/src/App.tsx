import { useCallback, useState } from 'react';
import type { Item, View } from './types';
import { StoreProvider } from './lib/store';
import { useOnline } from './lib/hooks';
import { FlowLines } from './components/FlowLines';
import { TabBar } from './components/TabBar';
import { Toast } from './components/Toast';
import { ExportSheet } from './components/ExportSheet';
import { WifiOffIcon } from './components/icons';
import { FeedView } from './views/FeedView';
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
  const [view, setView] = useState<View>('feed');
  const [exportItem, setExportItem] = useState<Item | null>(null);
  const online = useOnline();

  const changeView = useCallback((next: View) => {
    setView(prev => (prev === next ? prev : next));
  }, []);

  return (
    <div className="app">
      <FlowLines />

      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">бу</span>
          <span className="brand-name">БУ.шка</span>
        </div>
        {!online && (
          <span className="offline-flag">
            <WifiOffIcon size={15} />
            офлайн
          </span>
        )}
      </header>

      <main className="screen" key={view}>
        {view === 'feed' && <FeedView onExport={setExportItem} />}
        {view === 'create' && <CreateView onExport={setExportItem} onCreated={() => changeView('feed')} />}
        {view === 'profile' && <ProfileView />}
      </main>

      <TabBar view={view} onChange={changeView} />

      {exportItem && <ExportSheet item={exportItem} onClose={() => setExportItem(null)} />}
      <Toast />
    </div>
  );
}
