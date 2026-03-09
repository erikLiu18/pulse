import { useState, useEffect, useMemo } from 'react';
import { X, Square, Plus } from 'lucide-react';
import type { Entry } from '../../lib/api';
import { api } from '../../lib/api';
import { useAppStore } from '../../stores/appStore';
import { format } from 'date-fns';

interface Props {
  entries: Entry[];
  onRefresh: () => void;
  onAddEntry?: (startTime: string) => void;
}

const PX_PER_15 = 12;
const PX_PER_HOUR = PX_PER_15 * 4;
const LABEL_W = 40;
const BLOCK_L = 48;
const GUTTER_W = LABEL_W; // same width as time labels

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
  const parsed = entries.map(e => ({
    entry: e,
    start: parseTime(e.start_time!),
    end: parseTime(e.start_time!) + (e.duration_minutes || 15),
    duration: e.duration_minutes || 15,
  }));

  // Sort: by start time first, then longer duration first (so longer entries get lane 0)
  parsed.sort((a, b) => a.start - b.start || b.duration - a.duration);

  // Assign lanes — longer entries naturally get earlier (left) lanes
  const lanes: number[] = [];
  const assignments: { entry: Entry; lane: number; start: number; end: number }[] = [];

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
    assignments.push({ entry: p.entry, lane: assignedLane, start: p.start, end: p.end });
  }

  // For overlapping groups that start at the same time, re-sort lanes so longest is lane 0
  // Group by overlapping clusters and reassign lanes within each cluster
  const visited = new Set<number>();
  for (let i = 0; i < assignments.length; i++) {
    if (visited.has(i)) continue;
    // Find all entries overlapping with this one (transitively)
    const cluster: number[] = [i];
    visited.add(i);
    let idx = 0;
    while (idx < cluster.length) {
      const ci = cluster[idx];
      for (let j = 0; j < assignments.length; j++) {
        if (visited.has(j)) continue;
        if (assignments[j].start < assignments[ci].end && assignments[j].end > assignments[ci].start) {
          cluster.push(j);
          visited.add(j);
        }
      }
      idx++;
    }
    if (cluster.length <= 1) continue;

    // Sort cluster entries by duration descending, then reassign lanes 0, 1, 2...
    const clusterEntries = cluster.map(ci => ({ idx: ci, dur: assignments[ci].end - assignments[ci].start }));
    clusterEntries.sort((a, b) => b.dur - a.dur);

    // Reassign lanes within this cluster: longest gets lowest lane
    const usedLanes: { end: number }[] = [];
    for (const ce of clusterEntries) {
      const a = assignments[ce.idx];
      let lane = -1;
      for (let l = 0; l < usedLanes.length; l++) {
        if (a.start >= usedLanes[l].end) {
          lane = l;
          usedLanes[l].end = a.end;
          break;
        }
      }
      if (lane === -1) {
        lane = usedLanes.length;
        usedLanes.push({ end: a.end });
      }
      a.lane = lane;
    }
  }

  // Compute totalLanes (max concurrent) for each entry
  const result: LaneEntry[] = assignments.map(a => {
    let maxConcurrent = 1;
    for (const other of assignments) {
      if (other.entry.id === a.entry.id) continue;
      if (other.start < a.end && other.end > a.start) maxConcurrent++;
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

export default function Timeline({ entries, onRefresh, onAddEntry }: Props) {
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

  const [hoverSlot, setHoverSlot] = useState<number | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [popupPos, setPopupPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const scheduled = entries
    .filter((e) => e.start_time)
    .sort((a, b) => a.start_time!.localeCompare(b.start_time!));
  const unscheduled = entries.filter((e) => !e.start_time);

  // Build a set of occupied 15-min slots for deciding hover placement
  const occupiedSlots = useMemo(() => {
    const slots = new Set<number>();
    for (const e of scheduled) {
      const start = parseTime(e.start_time!);
      const dur = e.duration_minutes || 15;
      const numSlots = Math.ceil(dur / 15);
      for (let s = 0; s < numSlots; s++) {
        slots.add(Math.floor(start / 15) + s);
      }
    }
    return slots;
  }, [scheduled]);

  const isSlotOccupied = (minutes: number) => occupiedSlots.has(Math.floor(minutes / 15));

  // Mouse handler for the full timeline area (handles both gutter and block area)
  const handleTimelineMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const minutes = Math.floor(y / PX_PER_15) * 15;
    if (minutes >= 0 && minutes < 1440) {
      setHoverSlot(minutes);
    }
  };

  const handleTimelineMouseLeave = () => {
    setHoverSlot(null);
  };

  // Click on gutter or empty block area → add entry
  const handleGutterClick = (slot: number) => {
    if (onAddEntry) onAddEntry(fmtTime(slot));
  };

  const handleBlockAreaClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-entry]')) return;
    if (hoverSlot === null || !onAddEntry) return;
    if (!isSlotOccupied(hoverSlot)) {
      onAddEntry(fmtTime(hoverSlot));
    }
  };

  if (entries.length === 0 && !isToday) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="text-3xl mb-2">🌤️</div>
        <p className="text-gray-400 text-sm">No entries for this day.</p>
      </div>
    );
  }

  const totalHeight = 24 * PX_PER_HOUR;
  const hourLabels: { label: string; top: number }[] = [];
  for (let h = 0; h <= 24; h++) {
    hourLabels.push({ label: fmtTime(h * 60), top: h * PX_PER_HOUR });
  }

  const handleDelete = async (id: number) => {
    await api.deleteEntry(id);
    onRefresh();
  };

  const handleFinish = async (id: number) => {
    await api.finishEntry(id);
    onRefresh();
  };

  const currentTimeTop = (currentMinutes / 15) * PX_PER_15;
  const laneEntries = assignLanes(scheduled);

  return (
    <div className="flex flex-col">
      <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 160px)' }}>
        <div
          className="relative"
          style={{ height: totalHeight }}
          onMouseMove={handleTimelineMouseMove}
          onMouseLeave={handleTimelineMouseLeave}
        >
          {/* Hour gridlines and labels */}
          {hourLabels.map(({ label, top }) => (
            <div key={label} className="absolute left-0 right-0" style={{ top }}>
              <span
                className="absolute text-[10px] text-gray-400 font-mono select-none"
                style={{ width: LABEL_W, textAlign: 'right', top: -6 }}
              >
                {label}
              </span>
              <div
                className="absolute border-t border-gray-200"
                style={{ left: BLOCK_L, right: 0 }}
              />
            </div>
          ))}

          {/* Gutter: clickable strip for adding entries in occupied time slots */}
          {hoverSlot !== null && isSlotOccupied(hoverSlot) && onAddEntry && (
            <div
              className="absolute cursor-pointer z-10 rounded-sm bg-blue-50 hover:bg-blue-100 border border-blue-200/60 transition-colors flex items-center justify-center gap-0.5"
              style={{
                left: 0,
                width: GUTTER_W,
                top: (hoverSlot / 15) * PX_PER_15,
                height: PX_PER_15,
              }}
              onClick={() => handleGutterClick(hoverSlot)}
              title={`Add task at ${fmtTime(hoverSlot)}`}
            >
              <Plus size={8} className="text-blue-400" />
            </div>
          )}

          {/* Block area */}
          <div
            className="absolute"
            style={{ left: BLOCK_L, right: 4, top: 0, bottom: 0 }}
            onClick={handleBlockAreaClick}
          >
            {/* Hover highlight — only on empty (unoccupied) slots */}
            {hoverSlot !== null && !isSlotOccupied(hoverSlot) && (
              <div
                className="absolute left-0 right-0 bg-gray-100/60 border border-dashed border-gray-300/40 rounded-sm pointer-events-none z-10"
                style={{
                  top: (hoverSlot / 15) * PX_PER_15,
                  height: PX_PER_15,
                }}
              >
                <span className="absolute left-2 top-0 text-[9px] text-gray-400 font-mono leading-[12px]">
                  + {fmtTime(hoverSlot)}
                </span>
              </div>
            )}

            {/* Entry blocks */}
            {laneEntries.map(({ entry, lane, totalLanes }) => {
              const startMin = parseTime(entry.start_time!);
              const isActive = !!entry.is_active;
              const duration = isActive
                ? Math.max(currentMinutes - startMin, 15)
                : (entry.duration_minutes || 15);
              const top = (startMin / 15) * PX_PER_15;
              const minHeight = isActive ? 48 : PX_PER_15;
              const height = Math.max((duration / 15) * PX_PER_15, minHeight);
              const color = entry.category_color || '#3B82F6';
              const endTime = isActive ? 'now' : fmtTime(startMin + duration);
              const canFitText = height >= 20;
              const canFitSubline = height >= 36;
              const leftPercent = (lane / totalLanes) * 100;
              const widthPercent = 100 / totalLanes - 0.5;

              return (
                <div
                  key={entry.id}
                  data-entry
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedEntry(selectedEntry?.id === entry.id ? null : entry);
                    setPopupPos({ x: e.clientX, y: e.clientY });
                  }}
                  className={`absolute group rounded-md shadow-sm border overflow-hidden cursor-pointer transition-shadow hover:shadow-md ${isActive ? 'ring-2 ring-offset-1' : ''}`}
                  style={{
                    top, height,
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
                          onClick={(e) => { e.stopPropagation(); handleFinish(entry.id); }}
                          className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500 text-white text-[10px] font-semibold hover:bg-red-600 transition-colors"
                        >
                          <Square size={8} /> Finish
                        </button>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(entry.id); }}
                          className="shrink-0 p-0.5 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center h-full px-1.5 gap-1">
                      <span className="text-xs">{entry.subcategory_icon || entry.category_icon}</span>
                      <span className="text-[11px] font-semibold truncate" style={{ color }}>
                        {entry.subcategory_name || ''}
                      </span>
                      {isActive ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleFinish(entry.id); }}
                          className="ml-auto shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500 text-white text-[10px] font-semibold hover:bg-red-600 transition-colors"
                        >
                          <Square size={8} /> Finish
                        </button>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(entry.id); }}
                          className="ml-auto shrink-0 p-0.5 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                        >
                          <X size={10} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Entry detail popup */}
          {selectedEntry && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setSelectedEntry(null)} />
              <div
                className="fixed z-40 bg-white rounded-xl shadow-xl border border-gray-200 p-3 max-w-xs"
                style={{
                  left: Math.min(popupPos.x, window.innerWidth - 260),
                  top: Math.min(popupPos.y + 10, window.innerHeight - 200),
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{selectedEntry.subcategory_icon || selectedEntry.category_icon}</span>
                  <span className="text-sm font-semibold text-gray-800">
                    {selectedEntry.subcategory_name || 'Entry'}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mb-1">
                  {selectedEntry.start_time?.slice(0, 5)} – {fmtTime(parseTime(selectedEntry.start_time!) + selectedEntry.duration_minutes)} · {fmtDuration(selectedEntry.duration_minutes)}
                </div>
                {selectedEntry.note && (
                  <div className="text-xs text-gray-600 bg-gray-50 rounded-lg px-2.5 py-2 mt-2">
                    {selectedEntry.note}
                  </div>
                )}
                {selectedEntry.tags && (() => {
                  let tags: string[] = [];
                  try { tags = typeof selectedEntry.tags === 'string' ? JSON.parse(selectedEntry.tags) : selectedEntry.tags; } catch {}
                  return Array.isArray(tags) && tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {tags.map((tag: string, i: number) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{tag}</span>
                      ))}
                    </div>
                  ) : null;
                })()}
                {onAddEntry && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEntry(null);
                      onAddEntry(selectedEntry.start_time!);
                    }}
                    className="mt-2 w-full text-xs text-blue-500 font-medium py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors flex items-center justify-center gap-1"
                  >
                    <Plus size={12} />
                    Add parallel task at this time
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const id = selectedEntry.id;
                    setSelectedEntry(null);
                    handleDelete(id);
                  }}
                  className="mt-1 w-full text-xs text-red-400 font-medium py-1.5 rounded-lg hover:bg-red-50 transition-colors flex items-center justify-center gap-1"
                >
                  <X size={12} />
                  Delete entry
                </button>
              </div>
            </>
          )}

          {/* Current time indicator */}
          {isToday && (
            <div className="absolute pointer-events-none z-20" style={{ top: currentTimeTop, left: LABEL_W - 3, right: 0 }}>
              <div className="relative flex items-center">
                <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                <div className="flex-1 h-[2px] bg-red-500" style={{ marginLeft: -1 }} />
              </div>
            </div>
          )}

          {/* Empty state */}
          {entries.length === 0 && isToday && (
            <div
              className="absolute flex items-center justify-center pointer-events-none"
              style={{ top: currentTimeTop - 30, left: BLOCK_L, right: 0, height: 60 }}
            >
              <span className="text-sm text-gray-300 bg-white/80 px-3 py-1 rounded-full">
                Click timeline to start tracking
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Unscheduled entries */}
      {unscheduled.length > 0 && (
        <div className="mt-3 pt-2 border-t border-dashed border-gray-200">
          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1.5 px-1">Unscheduled</p>
          <div className="flex flex-col gap-1.5">
            {unscheduled.map((entry) => {
              const color = entry.category_color || '#3B82F6';
              return (
                <div
                  key={entry.id}
                  className="group relative rounded-md shadow-sm border pl-3 pr-2 py-1.5 flex items-center gap-1.5"
                  style={{ backgroundColor: tint(color, 0.88), borderColor: tint(color, 0.6), borderLeftWidth: 3, borderLeftColor: color }}
                >
                  <span className="text-sm">{entry.subcategory_icon || entry.category_icon}</span>
                  <span className="text-xs font-semibold truncate" style={{ color }}>{entry.subcategory_name || 'Entry'}</span>
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
