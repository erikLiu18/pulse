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
  const [taskMinutes, setTaskMinutes] = useState(0);
  const [wallClockMinutes, setWallClockMinutes] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [showQuickEntry, setShowQuickEntry] = useState(false);
  const [prefilledStartTime, setPrefilledStartTime] = useState<string | null>(null);
  const [prefilledDuration, setPrefilledDuration] = useState<number | null>(null);

  const handleAddFromTimeline = (startTime: string, durationMinutes?: number) => {
    setPrefilledStartTime(startTime);
    setPrefilledDuration(durationMinutes ?? null);
    setShowQuickEntry(true);
  };

  const fetchData = useCallback(() => {
    if (!activeProfileId) return;
    api.getEntries(activeProfileId, selectedDate).then(setEntries);
    api.getDailyStats(activeProfileId, selectedDate).then((data: any) => {
      if (Array.isArray(data)) {
        setStats(data);
      } else {
        setStats(data.categories || []);
        setTaskMinutes(data.taskMinutes || 0);
        setWallClockMinutes(data.wallClockMinutes || 0);
        setMultiplier(data.multiplier || 1);
      }
    });
  }, [activeProfileId, selectedDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 60s when there's an active entry
  useEffect(() => {
    const hasActive = entries.some((e) => e.is_active);
    if (!hasActive) return;
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, [entries, fetchData]);

  return (
    <div className="flex flex-col pb-24">
      <DateStrip />

      {/* Desktop: side-by-side layout. Mobile: stacked */}
      <div className="flex flex-col md:flex-row md:gap-4 md:px-4">
        {/* Pie chart — compact, sticky on desktop */}
        <div className="px-4 md:px-0 md:sticky md:top-0 md:self-start md:w-72 md:shrink-0">
          <DailyRing stats={stats} taskMinutes={taskMinutes} wallClockMinutes={wallClockMinutes} multiplier={multiplier} />
        </div>

        {/* Timeline — takes remaining space */}
        <div className="px-4 md:px-0 md:flex-1 mt-2 md:mt-0">
          <Timeline entries={entries} onRefresh={fetchData} onAddEntry={handleAddFromTimeline} />
        </div>
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
        onClose={() => {
          setShowQuickEntry(false);
          setPrefilledStartTime(null);
          setPrefilledDuration(null);
        }}
        onSaved={fetchData}
        entries={entries}
        prefilledStartTime={prefilledStartTime}
        prefilledDuration={prefilledDuration}
      />
    </div>
  );
}
