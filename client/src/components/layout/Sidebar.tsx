import { Home, BarChart3, Sparkles, BookOpen, Settings } from 'lucide-react';
import clsx from 'clsx';
import { useAppStore } from '../../stores/appStore';
import type { Tab } from './BottomNav';

const navItems: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: 'today', label: 'Today', icon: Home },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'insights', label: 'Insights', icon: Sparkles },
  { id: 'guide', label: 'Guide', icon: BookOpen },
  { id: 'settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const { profiles, activeProfileId, setActiveProfile } = useAppStore();

  return (
    <aside className="hidden md:flex md:flex-col md:w-16 md:fixed md:inset-y-0 md:left-0 bg-white border-r border-gray-100 z-40">
      {/* Logo */}
      <div className="flex items-center justify-center py-4">
        <span className="text-lg font-bold text-gray-900">P</span>
      </div>

      {/* Navigation — icon only */}
      <nav className="flex-1 flex flex-col items-center gap-1 px-2">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={clsx(
              'w-10 h-10 flex items-center justify-center rounded-lg transition-colors',
              activeTab === id
                ? 'bg-blue-50 text-blue-600'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50',
            )}
            title={label}
          >
            <Icon size={20} />
          </button>
        ))}
      </nav>

      {/* Profile switcher */}
      <div className="flex flex-col items-center gap-1.5 pb-3 border-t border-gray-100 pt-3 px-2">
        {profiles.map(p => (
          <button
            key={p.id}
            onClick={() => setActiveProfile(p.id)}
            className={clsx(
              'w-9 h-9 rounded-full flex items-center justify-center text-base transition-all',
              p.id === activeProfileId
                ? 'ring-2 ring-blue-500 bg-blue-50 scale-110'
                : 'bg-gray-100 hover:bg-gray-200',
            )}
            title={p.name}
          >
            {p.avatar}
          </button>
        ))}
      </div>
    </aside>
  );
}
