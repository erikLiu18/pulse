import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { api } from '../../lib/api';
import type { Entry } from '../../lib/api';

interface CategoryTotal {
  id: number;
  name: string;
  color: string;
  icon: string;
  total_minutes: number;
}

interface CategoryLeaderboardProps {
  totals: CategoryTotal[];
  profileId: number | 'combined';
  startDate: string;
  endDate: string;
}

function formatTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

interface SubBreakdown {
  name: string;
  icon: string;
  minutes: number;
}

export default function CategoryLeaderboard({ totals, profileId, startDate, endDate }: CategoryLeaderboardProps) {
  const { categories, profiles } = useAppStore();
  const [expandedCats, setExpandedCats] = useState<Set<number>>(new Set());
  const [subBreakdowns, setSubBreakdowns] = useState<Map<number, SubBreakdown[]>>(new Map());

  const sorted = [...totals]
    .sort((a, b) => b.total_minutes - a.total_minutes);
  const grandTotal = sorted.reduce((sum, c) => sum + c.total_minutes, 0);

  const toggleCat = (catId: number) => {
    setExpandedCats(prev => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  // Fetch subcategory breakdown for newly expanded categories
  useEffect(() => {
    for (const catId of expandedCats) {
      if (subBreakdowns.has(catId)) continue; // already fetched
      fetchSubsForCategory(catId);
    }
  }, [expandedCats]);

  async function fetchSubsForCategory(catId: number) {
      const cat = categories.find(c => c.id === catId);
      if (!cat) return;
      const subIds = new Set(cat.subcategories.map(s => s.id));

      // Fetch entries for the date range (for all relevant profiles)
      const profileIds = profileId === 'combined'
        ? profiles.map(p => p.id)
        : [profileId];

      const subMap = new Map<number, SubBreakdown>();

      for (const pid of profileIds) {
        // Fetch entries day by day for the week
        const start = new Date(startDate);
        const end = new Date(endDate);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().slice(0, 10);
          try {
            const entries: Entry[] = await api.getEntries(pid, dateStr);
            entries.forEach(e => {
              if (subIds.has(e.subcategory_id)) {
                const existing = subMap.get(e.subcategory_id);
                if (existing) {
                  existing.minutes += e.duration_minutes;
                } else {
                  subMap.set(e.subcategory_id, {
                    name: e.subcategory_name || 'Unknown',
                    icon: e.subcategory_icon || '📌',
                    minutes: e.duration_minutes,
                  });
                }
              }
            });
          } catch { /* skip */ }
        }
      }

      setSubBreakdowns(prev => new Map(prev).set(catId, Array.from(subMap.values()).sort((a, b) => b.minutes - a.minutes)));
  }

  if (sorted.length === 0 || grandTotal === 0) {
    return (
      <div className="px-4 py-2">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <p className="text-gray-300 text-sm text-center">No data for this week</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-2">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Category Summary</h3>
        <div className="space-y-2">
          {sorted.map((cat) => {
            const pct = grandTotal > 0 ? (cat.total_minutes / grandTotal) * 100 : 0;
            const isExpanded = expandedCats.has(cat.id);
            const catDef = categories.find(c => c.id === cat.id);
            const hasSubcategories = catDef && catDef.subcategories.length > 0;
            const subs = subBreakdowns.get(cat.id) || [];

            return (
              <div key={cat.id}>
                <button
                  className="w-full text-left"
                  onClick={() => hasSubcategories && toggleCat(cat.id)}
                >
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="text-lg leading-none">{cat.icon}</span>
                    <span className="text-sm text-gray-700 flex-1">{cat.name}</span>
                    <span className="text-sm font-bold text-gray-900">
                      {formatTime(cat.total_minutes)}
                    </span>
                    <span className="text-xs text-gray-400 w-10 text-right">
                      {Math.round(pct)}%
                    </span>
                    {hasSubcategories && (
                      isExpanded
                        ? <ChevronUp size={14} className="text-gray-400" />
                        : <ChevronDown size={14} className="text-gray-400" />
                    )}
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: cat.color,
                      }}
                    />
                  </div>
                </button>

                {/* Expanded subcategory breakdown */}
                {isExpanded && subs.length > 0 && (
                  <div className="ml-8 mr-2 mt-2 mb-1 space-y-1.5">
                    {subs.map((sub, i) => {
                      const subPct = cat.total_minutes > 0 ? (sub.minutes / cat.total_minutes) * 100 : 0;
                      return (
                        <div key={i}>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm">{sub.icon}</span>
                            <span className="text-xs text-gray-600 flex-1">{sub.name}</span>
                            <span className="text-xs font-semibold text-gray-700">{formatTime(sub.minutes)}</span>
                            <span className="text-[10px] text-gray-400 w-8 text-right">{Math.round(subPct)}%</span>
                          </div>
                          <div className="h-1 rounded-full bg-gray-50 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${subPct}%`,
                                backgroundColor: cat.color,
                                opacity: 0.6,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {isExpanded && subs.length === 0 && (
                  <div className="ml-8 mt-1 mb-1">
                    <span className="text-[10px] text-gray-300">Loading...</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Total</span>
          <span className="text-sm font-bold text-gray-900">{formatTime(grandTotal)}</span>
        </div>
      </div>
    </div>
  );
}
