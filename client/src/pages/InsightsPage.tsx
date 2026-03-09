import { useState, useEffect, useMemo } from 'react';
import { startOfWeek, endOfWeek, format, addWeeks, subWeeks, eachDayOfInterval } from 'date-fns';
import { Terminal, ChevronLeft, ChevronRight, Copy, Check, BarChart3 } from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import { api } from '../lib/api';

export default function InsightsPage() {
  const { activeProfileId, profiles } = useAppStore();
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );
  const [copied, setCopied] = useState(false);
  const [weeklyData, setWeeklyData] = useState<{ daily: any[]; totals: any[] } | null>(null);
  const [entryCount, setEntryCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const startDate = format(weekStart, 'yyyy-MM-dd');
  const endDate = format(weekEnd, 'yyyy-MM-dd');

  const activeProfile = profiles.find((p) => p.id === activeProfileId);
  const weekLabel = format(weekStart, 'MMM d') + ' – ' + format(weekEnd, 'MMM d');

  // Fetch weekly stats
  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      setLoading(true);
      try {
        const stats = await api.getWeeklyStats(activeProfileId, startDate, endDate);
        if (!cancelled) setWeeklyData(stats);

        // Count entries for each day
        const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
        let total = 0;
        for (const day of days) {
          const entries = await api.getEntries(activeProfileId, format(day, 'yyyy-MM-dd'));
          if (!cancelled) total += entries.length;
        }
        if (!cancelled) setEntryCount(total);
      } catch {
        if (!cancelled) {
          setWeeklyData(null);
          setEntryCount(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, [activeProfileId, startDate, endDate]);

  const totalHours = useMemo(() => {
    if (!weeklyData?.totals) return 0;
    const mins = weeklyData.totals.reduce((sum: number, t: any) => sum + t.total_minutes, 0);
    return +(mins / 60).toFixed(1);
  }, [weeklyData]);

  const topCategory = useMemo(() => {
    if (!weeklyData?.totals) return null;
    const filtered = weeklyData.totals.filter((t: any) => t.total_minutes > 0 && t.name !== 'Unlabeled');
    return filtered.length > 0 ? filtered[0] : null;
  }, [weeklyData]);

  const daysTracked = useMemo(() => {
    if (!weeklyData?.daily) return 0;
    const uniqueDays = new Set(weeklyData.daily.map((d: any) => d.date));
    return uniqueDays.size;
  }, [weeklyData]);

  const apiUrl = `http://localhost:3001/api/stats/weekly?profile_id=${activeProfileId}&start_date=${startDate}&end_date=${endDate}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(apiUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col pb-24">
      {/* Week Selector */}
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={() => setWeekStart((w) => subWeeks(w, 1))}
          className="p-2 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors"
        >
          <ChevronLeft size={20} className="text-gray-600" />
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-900">Week of {format(weekStart, 'MMM d')}</p>
          <p className="text-xs text-gray-500">{weekLabel}</p>
        </div>
        <button
          onClick={() => setWeekStart((w) => addWeeks(w, 1))}
          className="p-2 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition-colors"
        >
          <ChevronRight size={20} className="text-gray-600" />
        </button>
      </div>

      {/* Profile indicator */}
      {activeProfile && (
        <div className="px-4 mb-4">
          <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 rounded-lg px-2.5 py-1">
            <span>{activeProfile.avatar}</span>
            <span>{activeProfile.name}</span>
          </span>
        </div>
      )}

      <div className="px-4 space-y-4">
        {/* Info card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex">
            <div className="w-1 shrink-0 bg-gradient-to-b from-emerald-500 to-teal-500" />
            <div className="flex-1 p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center">
                  <Terminal size={16} className="text-emerald-600" />
                </div>
                <h3 className="font-semibold text-gray-900 text-sm">CLI-Powered Insights</h3>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed mb-2">
                Weekly insights are generated through your Claude Code sessions.
              </p>
              <p className="text-sm text-gray-500 leading-relaxed">
                Ask Claude: <span className="font-medium text-gray-700">"Analyze my Pulse data for this week"</span> and it will pull your time data and give you personalized insights.
              </p>
            </div>
          </div>
        </div>

        {/* Weekly stats summary */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={16} className="text-blue-500" />
            <h3 className="font-semibold text-gray-900 text-sm">This Week's Data</h3>
          </div>

          {loading ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-4 w-32 bg-gray-100 rounded" />
              <div className="h-4 w-48 bg-gray-100 rounded" />
              <div className="h-4 w-40 bg-gray-100 rounded" />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-gray-900">{entryCount}</p>
                <p className="text-xs text-gray-500">Entries</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-gray-900">{totalHours}h</p>
                <p className="text-xs text-gray-500">Tracked</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-gray-900">{daysTracked}</p>
                <p className="text-xs text-gray-500">Days</p>
              </div>
            </div>
          )}

          {!loading && topCategory && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                Top category: <span className="font-medium text-gray-700">{topCategory.icon} {topCategory.name}</span>
                <span className="text-gray-400"> — {+(topCategory.total_minutes / 60).toFixed(1)}h</span>
              </p>
            </div>
          )}
        </div>

        {/* API URL for Claude */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-semibold text-gray-900 text-sm mb-2">Data Export</h3>
          <p className="text-xs text-gray-500 mb-3">API endpoint for this week's data:</p>
          <div className="flex items-stretch gap-2">
            <code className="flex-1 text-xs bg-gray-50 text-gray-600 rounded-lg px-3 py-2 break-all leading-relaxed border border-gray-100">
              {apiUrl}
            </code>
            <button
              onClick={handleCopy}
              className="shrink-0 flex items-center justify-center w-10 rounded-lg bg-gray-50 border border-gray-100 hover:bg-gray-100 active:bg-gray-200 transition-colors"
            >
              {copied ? (
                <Check size={14} className="text-emerald-500" />
              ) : (
                <Copy size={14} className="text-gray-400" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
