import { useState, useEffect } from 'react';
import { X, Square } from 'lucide-react';
import type { Entry } from '../../lib/api';
import { api } from '../../lib/api';
import { useAppStore } from '../../stores/appStore';
import { format } from 'date-fns';

interface Props {
  entries: Entry[];
  onRefresh: () => void;
}

// Compact: 12px per 15 min = 48px per hour. Full 24h = 1152px (fits ~nicely in viewport)
const PX_PER_15 = 12;
const PX_PER_HOUR = PX_PER_15 * 4; // 48px
const LABEL_W = 40; // time label width
const BLOCK_L = 48; // block left offset

function parseTime(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function fmtTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function fmtDuration(mins: number): string {
  if (mins >= 60) {
    const h = mins / 60;
    return `${h % 1 === 0 ? h : h.toFixed(1)}h`;
  }
  return `${mins}m`;
}

interface LaneEntry {
  entry: Entry;
  lane: number;
  totalLanes: number;
}

function assignLanes(entries: Entry[]): LaneEntry[] {
  if (entries.length === 0) return [];

  // Parse entries into {entry, start, end} and sort by start
  const parsed = entries.map(e => ({
    entry: e,
    start: parseTime(e.start_time!),
    end: parseTime(e.start_time!) + (e.duration_minutes || 15),
  })).sort((a, b) => a.start - b.start);

  // Assign lanes using a greedy algorithm
  // lanes[i] = end time of the last entry in lane i
  const lanes: number[] = [];
  const assignments: { entry: Entry; lane: number }[] = [];

  for (const p of parsed) {
    let assignedLane = -1;
    for (let i = 0; i < lanes.length; i++) {
      if (p.start >= lanes[i]) {
        assignedLane = i;
        lanes[i] = p.end;
        break;
      }
    }
    if (assignedLane === -1) {
      assignedLane = lanes.length;
      lanes.push(p.end);
    }
    assignments.push({ entry: p.entry, lane: assignedLane });
  }

  // For each entry, count how many entries overlap with it to determine totalLanes
  const result: LaneEntry[] = assignments.map(a => {
    const aStart = parseTime(a.entry.start_time!);
    const aEnd = aStart + (a.entry.duration_minutes || 15);

    let maxConcurrent = 1;
    for (const other of assignments) {
      if (other.entry.id === a.entry.id) continue;
      const oStart = parseTime(other.entry.start_time!);
      const oEnd = oStart + (other.entry.duration_minutes || 15);
      if (oStart < aEnd && oEnd > aStart) {
        maxConcurrent++;
      }
    }

    return { entry: a.entry, lane: a.lane, totalLanes: maxConcurrent };
  });

  return result;
}

function tint(hex: string, amount = 0.85): string {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const blend = (ch: number) => Math.round(ch + (255 - ch) * amount);
  return `rgb(${blend(r)}, ${blend(g)}, ${blend(b)})`;
}

export default function Timeline({ entries, onRefresh }: Props) {
  const selectedDate = useAppStore((s) => s.selectedDate);
  const isToday = selectedDate === format(new Date(), 'yyyy-MM-dd');

  const [currentMinutes, setCurrentMinutes] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  useEffect(() => {
    if (!isToday) return;
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentMinutes(now.getHours() * 60 + now.getMinutes());
    }, 60_000);
    return () => clearInterval(interval);
  }, [isToday]);

  const scheduled = entries
    .filter((e) => e.start_time)
    .sort((a, b) => a.start_time!.localeCompare(b.start_time!));
  const unscheduled = entries.filter((e) => !e.start_time);

  if (entries.length === 0 && !isToday) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="text-3xl mb-2">🌤️</div>
        <p className="text-gray-400 text-sm">
          No entries for this day.
        </p>
      </div>
    );
  }

  // Always show full 24 hours
  const rangeStartMin = 0;
  const rangeEndMin = 1440;
  const totalHeight = 24 * PX_PER_HOUR; // 1152px

  // Hour labels every hour
  const hourLabels: { label: string; top: number; isMajor: boolean }[] = [];
  for (let h = 0; h <= 24; h++) {
    hourLabels.push({
      label: fmtTime(h * 60),
      top: h * PX_PER_HOUR,
      isMajor: true, // Show label every hour
    });
  }

  const handleDelete = async (id: number) => {
    await api.deleteEntry(id);
    onRefresh();
  };

  const handleFinish = async (id: number) => {
    await api.finishEntry(id);
    onRefresh();
  };

  // Current time position
  const currentTimeTop = (currentMinutes / 15) * PX_PER_15;

  return (
    <div className="flex flex-col">
      <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 160px)' }}>
        <div className="relative" style={{ height: totalHeight }}>
          {/* Hour gridlines and labels */}
          {hourLabels.map(({ label, top, isMajor }) => (
            <div key={label} className="absolute left-0 right-0" style={{ top }}>
              {isMajor && (
                <span
                  className="absolute text-[10px] text-gray-400 font-mono select-none"
                  style={{ width: LABEL_W, textAlign: 'right', top: -6 }}
                >
                  {label}
                </span>
              )}
              <div
                className={`absolute ${isMajor ? 'border-t border-gray-200' : 'border-t border-gray-50'}`}
                style={{ left: BLOCK_L, right: 0 }}
              />
            </div>
          ))}

          {/* Block area — entry blocks with lane layout for parallel tasks */}
          <div className="absolute" style={{ left: BLOCK_L, right: 4, top: 0, bottom: 0 }}>
            {assignLanes(scheduled).map(({ entry, lane, totalLanes }) => {
              const startMin = parseTime(entry.start_time!);
              const isActive = !!entry.is_active;
              const duration = isActive
                ? Math.max(currentMinutes - startMin, 15)
                : (entry.duration_minutes || 15);
              const top = (startMin / 15) * PX_PER_15;
              // Active entries get minimum 48px height so Finish button is always visible
              const minHeight = isActive ? 48 : PX_PER_15;
              const height = Math.max((duration / 15) * PX_PER_15, minHeight);
              const color = entry.category_color || '#3B82F6';
              const endTime = isActive ? 'now' : fmtTime(startMin + duration);

              // Determine what fits in the block
              const canFitText = height >= 20;
              const canFitSubline = height >= 36;

              // Lane-based positioning
              const leftPercent = (lane / totalLanes) * 100;
              const widthPercent = 100 / totalLanes - 0.5;

              return (
                <div
                  key={entry.id}
                  className={`absolute group rounded-md shadow-sm border overflow-hidden cursor-default transition-shadow hover:shadow-md ${isActive ? 'ring-2 ring-offset-1' : ''}`}
                  style={{
                    top,
                    height,
                    left: `${leftPercent}%`,
                    width: `${widthPercent}%`,
                    backgroundColor: tint(color, 0.82),
                    borderColor: tint(color, 0.55),
                    borderLeftWidth: 3,
                    borderLeftColor: color,
                    ...(isActive ? { boxShadow: `0 0 0 2px ${color}` } : {}),
                  }}
                >
                  {canFitText ? (
                    <div className="flex items-start h-full px-2 py-1 gap-1.5 min-w-0">
                      <div className="flex-1 min-w-0 flex flex-col justify-center h-full">
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="text-sm shrink-0">{entry.subcategory_icon || entry.category_icon}</span>
                          <span className="text-[13px] font-semibold truncate" style={{ color }}>
                            {entry.subcategory_name || 'Entry'}
                          </span>
                          {isActive && (
                            <span className="shrink-0 text-[9px] font-bold px-1 py-0.5 rounded bg-green-100 text-green-700">
                              LIVE
                            </span>
                          )}
                          <span className="ml-auto shrink-0 text-[11px] font-semibold" style={{ color }}>
                            {fmtDuration(duration)}
                          </span>
                        </div>
                        {canFitSubline && (
                          <span className="text-[11px] mt-0.5 opacity-50" style={{ color }}>
                            {entry.start_time!.slice(0, 5)} – {endTime}
                          </span>
                        )}
                      </div>

                      {isActive ? (
                        <button
                          onClick={() => handleFinish(entry.id)}
                          className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500 text-white text-[10px] font-semibold hover:bg-red-600 transition-colors"
                        >
                          <Square size={8} />
                          Finish
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="shrink-0 p-0.5 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  ) : (
                    /* Very short block — icon + finish if active */
                    <div className="flex items-center h-full px-1.5 gap-1">
                      <span className="text-xs">{entry.subcategory_icon || entry.category_icon}</span>
                      <span className="text-[11px] font-semibold truncate" style={{ color }}>
                        {entry.subcategory_name || ''}
                      </span>
                      {isActive && (
                        <button
                          onClick={() => handleFinish(entry.id)}
                          className="ml-auto shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500 text-white text-[10px] font-semibold hover:bg-red-600 transition-colors"
                        >
                          <Square size={8} />
                          Finish
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Current time indicator */}
          {isToday && (
            <div
              className="absolute pointer-events-none z-20"
              style={{ top: currentTimeTop, left: LABEL_W - 3, right: 0 }}
            >
              <div className="relative flex items-center">
                <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                <div className="flex-1 h-[2px] bg-red-500" style={{ marginLeft: -1 }} />
              </div>
            </div>
          )}

          {/* Empty state overlay for today with no entries */}
          {entries.length === 0 && isToday && (
            <div
              className="absolute flex items-center justify-center pointer-events-none"
              style={{ top: currentTimeTop - 30, left: BLOCK_L, right: 0, height: 60 }}
            >
              <span className="text-sm text-gray-300 bg-white/80 px-3 py-1 rounded-full">
                Tap + to start tracking
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Unscheduled entries */}
      {unscheduled.length > 0 && (
        <div className="mt-3 pt-2 border-t border-dashed border-gray-200">
          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1.5 px-1">
            Unscheduled
          </p>
          <div className="flex flex-col gap-1.5">
            {unscheduled.map((entry) => {
              const color = entry.category_color || '#3B82F6';
              return (
                <div
                  key={entry.id}
                  className="group relative rounded-md shadow-sm border pl-3 pr-2 py-1.5 flex items-center gap-1.5"
                  style={{
                    backgroundColor: tint(color, 0.88),
                    borderColor: tint(color, 0.6),
                    borderLeftWidth: 3,
                    borderLeftColor: color,
                  }}
                >
                  <span className="text-sm">{entry.subcategory_icon || entry.category_icon}</span>
                  <span className="text-xs font-semibold truncate" style={{ color }}>
                    {entry.subcategory_name || 'Entry'}
                  </span>
                  {entry.duration_minutes > 0 && (
                    <span className="ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ backgroundColor: tint(color, 0.65), color }}>
                      {fmtDuration(entry.duration_minutes)}
                    </span>
                  )}
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="shrink-0 p-0.5 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                  >
                    <X size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
