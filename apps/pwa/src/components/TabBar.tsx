import type { View } from '../types';
import { GridIcon, PlusIcon, UserIcon } from './icons';
import { APP_TAG } from '../lib/version';

type Tab = { id: View; label: string; Icon: typeof GridIcon };

const tabs: Tab[] = [
  { id: 'market', label: 'Рынок', Icon: GridIcon },
  { id: 'create', label: 'Создать', Icon: PlusIcon },
  { id: 'profile', label: 'Профиль', Icon: UserIcon }
];

export function TabBar({ view, onChange }: { view: View; onChange: (view: View) => void }) {
  const index = Math.max(0, tabs.findIndex(tab => tab.id === view));
  return (
    <nav className="tabbar" aria-label="Навигация">
      <div className="sidebar-brand">
        <span className="brand-mark">бу</span>
        <span className="brand-name">БУ.шка</span>
        <span className="build-badge">{APP_TAG}</span>
      </div>
      <div className="tabbar-inner">
        <span className="tab-indicator" style={{ transform: `translateX(${index * 100}%)` }} aria-hidden="true" />
        {tabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            className={`tab ${view === id ? 'active' : ''}`}
            aria-current={view === id ? 'page' : undefined}
            onClick={() => onChange(id)}
          >
            <Icon size={22} />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
