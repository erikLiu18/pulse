import { useEffect, useState } from 'react';
import { Home, BarChart3, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import { useAppStore } from './stores/appStore';
import { api } from './lib/api';
import TodayPage from './pages/TodayPage';

type Tab = 'today' | 'analytics' | 'insights';

const tabs: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: 'today', label: 'Today', icon: Home },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'insights', label: 'Insights', icon: Sparkles },
];

export default function App() {
  const { profiles, activeProfileId, setProfiles, setActiveProfile, setCategories } = useAppStore();
  const [activeTab, setActiveTab] = useState<Tab>('today');

  useEffect(() => {
    api.getProfiles().then(setProfiles);
    api.getCategories().then(setCategories);
  }, []);

  const activeProfile = profiles.find(p => p.id === activeProfileId);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 bg-white shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">Pulse</h1>
        <div className="flex gap-2">
          {profiles.map(p => (
            <button
              key={p.id}
              onClick={() => setActiveProfile(p.id)}
              className={clsx(
                'w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all',
                p.id === activeProfileId
                  ? 'ring-2 ring-blue-500 bg-blue-50 scale-110'
                  : 'bg-gray-100 hover:bg-gray-200',
              )}
            >
              {p.avatar}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full">
        {activeTab === 'today' && <TodayPage />}
        {activeTab === 'analytics' && (
          <p className="text-gray-400 text-center mt-16 text-sm">Analytics coming soon</p>
        )}
        {activeTab === 'insights' && (
          <p className="text-gray-400 text-center mt-16 text-sm">Insights coming soon</p>
        )}
      </main>

      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 z-40">
        <div className="max-w-lg mx-auto flex">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={clsx(
                'flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors',
                activeTab === id ? 'text-blue-500' : 'text-gray-400 hover:text-gray-500',
              )}
            >
              <Icon size={20} />
              {label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
