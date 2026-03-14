import { useEffect } from 'react';
import { useAppStore } from './stores/appStore';
import { api } from './lib/api';
import Shell from './components/layout/Shell';
import TodayPage from './pages/TodayPage';
import AnalyticsPage from './pages/AnalyticsPage';
import InsightsPage from './pages/InsightsPage';
import GuidePage from './pages/GuidePage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  const { setProfiles, setCategories } = useAppStore();

  useEffect(() => {
    api.getProfiles().then(setProfiles);
    api.getCategories().then(setCategories);
  }, []);

  return (
    <Shell>
      {(activeTab) => (
        <>
          {activeTab === 'today' && <TodayPage />}
          {activeTab === 'analytics' && <AnalyticsPage />}
          {activeTab === 'insights' && <InsightsPage />}
          {activeTab === 'guide' && <GuidePage />}
          {activeTab === 'settings' && <SettingsPage />}
        </>
      )}
    </Shell>
  );
}
