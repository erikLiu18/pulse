import { useEffect, useState, useCallback } from 'react';
import { startOfWeek, endOfWeek, format } from 'date-fns';
import { useAppStore } from '../stores/appStore';
import { api } from '../lib/api';
import WeekSelector from '../components/analytics/WeekSelector';
import ProfileToggle from '../components/analytics/ProfileToggle';
import WeeklyChart from '../components/analytics/WeeklyChart';
import CategoryLeaderboard from '../components/analytics/CategoryLeaderboard';
import ComparisonView from '../components/analytics/ComparisonView';

interface DailyCategory {
  date: string;
  category_id: number;
  category_name: string;
  color: string;
  total_minutes: number;
}

interface CategoryTotal {
  id: number;
  name: string;
  color: string;
  icon: string;
  total_minutes: number;
}

interface WeeklyStatsResponse {
  daily: DailyCategory[];
  totals: CategoryTotal[];
  taskMinutes?: number;
  wallClockMinutes?: number;
  parallelMinutes?: number;
  multiplier?: number;
}

export default function AnalyticsPage() {
  const { profiles, categories } = useAppStore();
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );
  const [profileSelection, setProfileSelection] = useState<number | 'combined'>(1);
  const [dailyData, setDailyData] = useState<DailyCategory[]>([]);
  const [totals, setTotals] = useState<CategoryTotal[]>([]);
  const [profile1Totals, setProfile1Totals] = useState<CategoryTotal[]>([]);
  const [profile2Totals, setProfile2Totals] = useState<CategoryTotal[]>([]);
  const [taskMinutes, setTaskMinutes] = useState(0);
  const [wallClockMinutes, setWallClockMinutes] = useState(0);
  const [parallelMinutes, setParallelMinutes] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [loading, setLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const startDate = format(weekStart, 'yyyy-MM-dd');
      const endDate = format(weekEnd, 'yyyy-MM-dd');

      if (profileSelection === 'combined') {
        // Fetch for all profiles separately
        const results = await Promise.all(
          profiles.map((p) => api.getWeeklyStats(p.id, startDate, endDate) as Promise<WeeklyStatsResponse>),
        );

        // Store individual profile totals for comparison view
        if (results.length >= 2) {
          setProfile1Totals(results[0].totals);
          setProfile2Totals(results[1].totals);
        } else if (results.length === 1) {
          setProfile1Totals(results[0].totals);
          setProfile2Totals([]);
        }

        // Also merge for any shared state (keeping backward compat)
        const mergedDaily: Map<string, DailyCategory> = new Map();
        results.forEach((r) => {
          r.daily.forEach((d) => {
            const key = `${d.date}-${d.category_id}`;
            const existing = mergedDaily.get(key);
            if (existing) {
              existing.total_minutes += d.total_minutes;
            } else {
              mergedDaily.set(key, { ...d });
            }
          });
        });

        const mergedTotals: Map<number, CategoryTotal> = new Map();
        results.forEach((r) => {
          r.totals.forEach((t) => {
            const existing = mergedTotals.get(t.id);
            if (existing) {
              existing.total_minutes += t.total_minutes;
            } else {
              mergedTotals.set(t.id, { ...t });
            }
          });
        });

        setDailyData(Array.from(mergedDaily.values()));
        setTotals(Array.from(mergedTotals.values()));
      } else {
        const data: WeeklyStatsResponse = await api.getWeeklyStats(
          profileSelection,
          startDate,
          endDate,
        );
        setDailyData(data.daily);
        setTotals(data.totals);
        setProfile1Totals([]);
        setProfile2Totals([]);
        setTaskMinutes(data.taskMinutes ?? 0);
        setWallClockMinutes(data.wallClockMinutes ?? 0);
        setParallelMinutes(data.parallelMinutes ?? 0);
        setMultiplier(data.multiplier ?? 1);
      }
    } catch (err) {
      console.error('Failed to fetch weekly stats:', err);
      setDailyData([]);
      setTotals([]);
      setProfile1Totals([]);
      setProfile2Totals([]);
    } finally {
      setLoading(false);
    }
  }, [weekStart, profileSelection, profiles]);

  useEffect(() => {
    if (profiles.length > 0) {
      fetchStats();
    }
  }, [fetchStats, profiles]);

  const categoryDefs = categories.map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
  }));

  return (
    <div className="flex flex-col pb-24">
      <WeekSelector weekStart={weekStart} onChange={setWeekStart} />
      <ProfileToggle value={profileSelection} onSelect={setProfileSelection} />

      {loading ? (
        <div className="px-4 space-y-3 mt-2">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 animate-pulse">
            <div className="h-4 w-32 bg-gray-200 rounded mb-4" />
            <div className="h-48 bg-gray-100 rounded-xl" />
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 animate-pulse">
            <div className="h-4 w-36 bg-gray-200 rounded mb-4" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-8 bg-gray-100 rounded" />
              ))}
            </div>
          </div>
        </div>
      ) : profileSelection === 'combined' ? (
        <ComparisonView
          profile1Totals={profile1Totals}
          profile2Totals={profile2Totals}
          profiles={profiles}
          categories={categoryDefs}
        />
      ) : (
        <>
          <WeeklyChart
            weekStart={weekStart}
            dailyData={dailyData}
            categories={categoryDefs}
          />
          <CategoryLeaderboard totals={totals} />
          {parallelMinutes > 0 && (
            <div className="px-4 py-2">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Parallel Tasking</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-gray-900">{(taskMinutes / 60).toFixed(1)}h</p>
                    <p className="text-[10px] text-gray-500">Task Hours</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-gray-900">{(wallClockMinutes / 60).toFixed(1)}h</p>
                    <p className="text-[10px] text-gray-500">Wall Clock</p>
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-3 text-center">
                    <p className="text-lg font-bold text-emerald-600">{multiplier}x</p>
                    <p className="text-[10px] text-gray-500">Multiplier</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
