import { useEffect, useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import { api } from '../lib/api';
import type { Entry, DailyStat } from '../lib/api';
import DateStrip from '../components/today/DateStrip';
import DailyRing from '../components/today/DailyRing';
import Timeline from '../components/today/Timeline';
import QuickEntry from '../components/entry/QuickEntry';

export default function TodayPage() {
  const { activeProfileId, selectedDate } = useAppStore();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [stats, setStats] = useState<DailyStat[]>([]);
  const [showQuickEntry, setShowQuickEntry] = useState(false);

  const fetchData = useCallback(() => {
    if (!activeProfileId) return;
    api.getEntries(activeProfileId, selectedDate).then(setEntries);
    api.getDailyStats(activeProfileId, selectedDate).then(setStats);
  }, [activeProfileId, selectedDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="flex flex-col pb-24">
      <DateStrip />

      <div className="px-4">
        <DailyRing stats={stats} />
      </div>

      <div className="px-4 mt-2">
        <Timeline entries={entries} onRefresh={fetchData} />
      </div>

      <button
        onClick={() => setShowQuickEntry(true)}
        className="fixed bottom-20 right-5 md:bottom-8 md:right-8 w-14 h-14 rounded-full bg-blue-500 text-white shadow-lg
          flex items-center justify-center hover:bg-blue-600 active:scale-95 transition-all z-50"
      >
        <Plus size={28} />
      </button>

      <QuickEntry
        isOpen={showQuickEntry}
        onClose={() => setShowQuickEntry(false)}
        onSaved={fetchData}
        entries={entries}
      />
    </div>
  );
}
