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

const PIXELS_PER_15MIN = 20;
const PIXELS_PER_HOUR = PIXELS_PER_15MIN * 4; // 80px
const TIME_LABEL_WIDTH = 52; // px
const BLOCK_LEFT = 60; // px

/** Parse "HH:mm" into total minutes from midnight */
function parseTime(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/** Format minutes from midnight back to "HH:mm" */
function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Format duration for display */
function formatDuration(mins: number): string {
  if (mins >= 60) {
    const h = mins / 60;
    return `${h % 1 === 0 ? h : h.toFixed(1)}h`;
  }
  return `${mins}m`;
}

/** Lighten a hex color to a tint (mix with white) */
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

  // Current time state (updates every minute)
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

  // Separate scheduled vs unscheduled entries
  const scheduled = entries
    .filter((e) => e.start_time)
    .sort((a, b) => a.start_time!.localeCompare(b.start_time!));
  const unscheduled = entries.filter((e) => !e.start_time);

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="text-4xl mb-3">🌤️</div>
        <p className="text-gray-400 text-sm">
          No entries yet today. Tap <span className="font-semibold text-blue-500">+</span> to start tracking!
        </p>
      </div>
    );
  }

  // Determine time range
  let rangeStartMin = 6 * 60; // default 06:00
  let rangeEndMin = 22 * 60; // default 22:00

  if (scheduled.length > 0) {
    const firstStart = parseTime(scheduled[0].start_time!);
    const lastEntry = scheduled[scheduled.length - 1];
    const lastEnd = parseTime(lastEntry.start_time!) + (lastEntry.duration_minutes || 15);

    // Floor to previous hour, ceil to next hour, with 1h buffer
    rangeStartMin = Math.floor(firstStart / 60) * 60;
    rangeEndMin = Math.ceil(lastEnd / 60) * 60;
    // Ensure at least some padding
    if (rangeEndMin - rangeStartMin < 120) rangeEndMin = rangeStartMin + 120;
  }

  const totalMinutes = rangeEndMin - rangeStartMin;
  const totalHeight = (totalMinutes / 15) * PIXELS_PER_15MIN;

  // Generate hour labels
  const hourLabels: { label: string; top: number }[] = [];
  for (let m = rangeStartMin; m <= rangeEndMin; m += 60) {
    hourLabels.push({
      label: formatTime(m),
      top: ((m - rangeStartMin) / 15) * PIXELS_PER_15MIN,
    });
  }

  // Extend range to include current time if today
  if (isToday) {
    if (currentMinutes < rangeStartMin) rangeStartMin = Math.floor(currentMinutes / 60) * 60;
    if (currentMinutes > rangeEndMin) rangeEndMin = Math.ceil((currentMinutes + 30) / 60) * 60;
  }

  const handleDelete = async (id: number) => {
    await api.deleteEntry(id);
    onRefresh();
  };

  const handleFinish = async (id: number) => {
    await api.finishEntry(id);
    onRefresh();
  };

  return (
    <div className="flex flex-col">
      {/* Scrollable timeline */}
      <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
        <div className="relative" style={{ height: totalHeight, minHeight: 200 }}>
          {/* Hour gridlines and labels */}
          {hourLabels.map(({ label, top }) => (
            <div key={label} className="absolute left-0 right-0" style={{ top }}>
              <span
                className="absolute text-[11px] text-gray-400 font-mono select-none"
                style={{ width: TIME_LABEL_WIDTH, textAlign: 'right', top: -7 }}
              >
                {label}
              </span>
              <div
                className="absolute border-t border-gray-100"
                style={{ left: BLOCK_LEFT, right: 0 }}
              />
            </div>
          ))}

          {/* Entry blocks */}
          {scheduled.map((entry) => {
            const startMin = parseTime(entry.start_time!);
            const isActive = !!entry.is_active;
            // Active entries extend to current time
            const duration = isActive
              ? Math.max(currentMinutes - startMin, 15)
              : (entry.duration_minutes || 15);
            const top = ((startMin - rangeStartMin) / 15) * PIXELS_PER_15MIN;
            const height = Math.max((duration / 15) * PIXELS_PER_15MIN, PIXELS_PER_15MIN);
            const color = entry.category_color || '#3B82F6';
            const isShort = duration <= 15;
            const endTime = isActive ? 'now' : formatTime(startMin + duration);

            return (
              <div
                key={entry.id}
                className={`absolute group rounded-lg shadow-sm border overflow-hidden cursor-default transition-shadow hover:shadow-md ${isActive ? 'ring-2 ring-offset-1 animate-pulse' : ''}`}
                style={{
                  top,
                  height,
                  left: BLOCK_LEFT,
                  right: 8,
                  backgroundColor: tint(color, 0.82),
                  borderColor: tint(color, 0.55),
                  borderLeftWidth: 4,
                  borderLeftColor: color,
                  ...(isActive ? { ringColor: color } : {}),
                }}
              >
                <div className="flex items-start h-full px-2.5 py-1.5 gap-2 min-w-0">
                  <div className="flex-1 min-w-0 flex flex-col justify-center h-full">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-sm shrink-0">{entry.subcategory_icon || entry.category_icon}</span>
                      <span className="text-xs font-semibold truncate" style={{ color }}>
                        {entry.subcategory_name || 'Entry'}
                      </span>
                      {isActive && (
                        <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
                          LIVE
                        </span>
                      )}
                      <span className="ml-auto shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ backgroundColor: tint(color, 0.65), color }}>
                        {formatDuration(duration)}
                      </span>
                    </div>
                    {!isShort && (
                      <span className="text-[10px] mt-0.5 opacity-60" style={{ color }}>
                        {entry.start_time!.slice(0, 5)} – {endTime}
                      </span>
                    )}
                  </div>

                  {/* Finish button for active entries */}
                  {isActive ? (
                    <button
                      onClick={() => handleFinish(entry.id)}
                      className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500 text-white text-[11px] font-semibold hover:bg-red-600 transition-colors"
                    >
                      <Square size={10} />
                      Finish
                    </button>
                  ) : (
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="shrink-0 p-0.5 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Current time indicator */}
          {isToday && currentMinutes >= rangeStartMin && currentMinutes <= rangeEndMin && (
            <div
              className="absolute pointer-events-none"
              style={{
                top: ((currentMinutes - rangeStartMin) / 15) * PIXELS_PER_15MIN,
                left: TIME_LABEL_WIDTH - 4,
                right: 0,
                zIndex: 20,
              }}
            >
              <div className="relative flex items-center">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                <div className="flex-1 h-[2px] bg-red-500" style={{ marginLeft: -1 }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Unscheduled entries */}
      {unscheduled.length > 0 && (
        <div className="mt-4 pt-3 border-t border-dashed border-gray-200">
          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-2 px-1">
            Unscheduled
          </p>
          <div className="flex flex-col gap-2">
            {unscheduled.map((entry) => {
              const color = entry.category_color || '#3B82F6';
              return (
                <div
                  key={entry.id}
                  className="group relative rounded-lg shadow-sm border pl-4 pr-2 py-2 flex items-center gap-2"
                  style={{
                    backgroundColor: tint(color, 0.88),
                    borderColor: tint(color, 0.6),
                    borderLeftWidth: 4,
                    borderLeftColor: color,
                  }}
                >
                  <span className="text-sm">{entry.subcategory_icon || entry.category_icon}</span>
                  <span className="text-xs font-semibold truncate" style={{ color }}>
                    {entry.subcategory_name || 'Entry'}
                  </span>
                  {entry.duration_minutes > 0 && (
                    <span className="ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ backgroundColor: tint(color, 0.65), color }}>
                      {formatDuration(entry.duration_minutes)}
                    </span>
                  )}
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="shrink-0 p-0.5 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                  >
                    <X size={13} />
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
