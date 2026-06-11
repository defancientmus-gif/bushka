import type { View } from '../types';
import { BoxIcon, PlusIcon, UserIcon } from './icons';

type Tab = { id: View; label: string; Icon: typeof BoxIcon };

const tabs: Tab[] = [
  { id: 'feed', label: 'Склад', Icon: BoxIcon },
  { id: 'create', label: 'Создать', Icon: PlusIcon },
  { id: 'profile', label: 'Профиль', Icon: UserIcon }
];

export function TabBar({ view, onChange }: { view: View; onChange: (view: View) => void }) {
  const index = Math.max(0, tabs.findIndex(tab => tab.id === view));
  return (
    <nav className="tabbar" aria-label="Навигация">
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
