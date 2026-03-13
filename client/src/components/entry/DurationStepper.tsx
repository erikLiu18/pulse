import { useState, useMemo } from 'react';
import { ChevronLeft, Clock, ArrowRight, Play } from 'lucide-react';
import type { Category, Subcategory } from '../../lib/api';
import clsx from 'clsx';

interface DurationStepperProps {
  category: Category;
  subcategory: Subcategory;
  startTime: string;
  initialDuration?: number | null;
  onSave: (duration: number, note: string, startTime: string) => void;
  onStartNow?: (note: string, startTime: string) => void;
  onBack: () => void;
  saving: boolean;
}

function formatDuration(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

/** Parse "HH:mm" to total minutes from midnight */
function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** Convert total minutes from midnight to "HH:mm" */
function minutesToTime(mins: number): string {
  const clamped = ((mins % 1440) + 1440) % 1440;
  const hh = String(Math.floor(clamped / 60)).padStart(2, '0');
  const mm = String(clamped % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

/** Format "HH:mm" for display as "9:00 AM" style */
function formatTime12h(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
}

// Generate time slots for the select dropdowns (every 15 min)
const TIME_SLOTS = Array.from({ length: 96 }, (_, i) => {
  const mins = i * 15;
  return {
    value: minutesToTime(mins),
    label: formatTime12h(minutesToTime(mins)),
    minutes: mins,
  };
});

// Quick duration presets
const DURATION_PRESETS = [15, 30, 45, 60, 90, 120, 180, 240, 360, 480];

export default function DurationStepper({
  category,
  subcategory,
  startTime: initialStartTime,
  initialDuration,
  onSave,
  onStartNow,
  onBack,
  saving,
}: DurationStepperProps) {
  const [startTime, setStartTime] = useState(initialStartTime);
  const [endTime, setEndTime] = useState(() =>
    minutesToTime(timeToMinutes(initialStartTime) + (initialDuration || 30))
  );
  const [note, setNote] = useState('');

  const duration = useMemo(() => {
    let diff = timeToMinutes(endTime) - timeToMinutes(startTime);
    if (diff <= 0) diff += 1440; // crosses midnight
    return diff;
  }, [startTime, endTime]);

  const handleStartTimeChange = (time: string) => {
    setStartTime(time);
    // Auto-adjust end time to keep at least 15 min
    const startMins = timeToMinutes(time);
    const endMins = timeToMinutes(endTime);
    let diff = endMins - startMins;
    if (diff <= 0) diff += 1440;
    if (diff < 15) {
      setEndTime(minutesToTime(startMins + 30));
    }
  };

  const handleEndTimeChange = (time: string) => {
    setEndTime(time);
  };

  const handlePresetDuration = (mins: number) => {
    setEndTime(minutesToTime(timeToMinutes(startTime) + mins));
  };


  return (
    <div className="px-4 pb-4 animate-slide-in">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={onBack}
          className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-500" />
        </button>
        <span className="text-xl">{subcategory.icon}</span>
        <span className="font-semibold text-gray-700">{subcategory.name}</span>
      </div>

      {/* Time range selector */}
      <div className="bg-gray-50 rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Clock className="w-3.5 h-3.5" />
            <span>Time Range</span>
          </div>
        </div>

        {/* Start / End time select dropdowns */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1">
            <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1 block">Start</label>
            <select
              value={startTime}
              onChange={(e) => handleStartTimeChange(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              {TIME_SLOTS.map(slot => (
                <option key={slot.value} value={slot.value}>{slot.label}</option>
              ))}
            </select>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-300 shrink-0 mt-5" />
          <div className="flex-1">
            <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1 block">End</label>
            <select
              value={endTime}
              onChange={(e) => handleEndTimeChange(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              {TIME_SLOTS.map(slot => (
                <option key={slot.value} value={slot.value}>{slot.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Duration + category badge */}
        <div className="flex items-center justify-center mb-3">
          <span
            className="text-sm font-bold px-2.5 py-0.5 rounded-full"
            style={{ backgroundColor: `${category.color}18`, color: category.color }}
          >
            {formatDuration(duration)}
          </span>
          {timeToMinutes(endTime) < timeToMinutes(startTime) && (
            <span className="text-[10px] text-amber-500 font-medium ml-1">↪ next day</span>
          )}
        </div>

        {/* Quick duration presets — always visible */}
        <div className="mt-3">
          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-2">Quick Duration</p>
          <div className="flex flex-wrap gap-1.5">
            {DURATION_PRESETS.map((mins) => (
              <button
                key={mins}
                onClick={() => handlePresetDuration(mins)}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  duration === mins
                    ? 'text-white shadow-sm'
                    : 'bg-white text-gray-600 hover:bg-gray-100',
                )}
                style={duration === mins ? { backgroundColor: category.color } : undefined}
              >
                {formatDuration(mins)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Note */}
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Add a note..."
        rows={2}
        className="w-full px-3 py-2 text-sm rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-200 placeholder-gray-300 resize-none mb-4"
      />

      {/* Action buttons */}
      <div className="flex gap-2">
        {onStartNow && (
          <button
            onClick={() => onStartNow(note, startTime)}
            disabled={saving}
            className={clsx(
              'flex-1 py-3.5 rounded-2xl text-white font-semibold text-base',
              'transition-all duration-150 active:scale-[0.98]',
              'shadow-md hover:shadow-lg flex items-center justify-center gap-2',
              saving && 'opacity-70 cursor-not-allowed',
            )}
            style={{ backgroundColor: '#10B981' }}
          >
            <Play className="w-4 h-4" />
            {saving ? 'Starting...' : `Start @ ${formatTime12h(startTime)}`}
          </button>
        )}
        <button
          onClick={() => onSave(duration, note, startTime)}
          disabled={saving}
          className={clsx(
            'flex-1 py-3.5 rounded-2xl text-white font-semibold text-base',
            'transition-all duration-150 active:scale-[0.98]',
            'shadow-md hover:shadow-lg',
            saving && 'opacity-70 cursor-not-allowed',
          )}
          style={{ backgroundColor: category.color }}
        >
          {saving ? 'Saving...' : `Save ${formatTime12h(startTime)} \u2192 ${formatTime12h(endTime)}${timeToMinutes(endTime) < timeToMinutes(startTime) ? ' +1d' : ''}`}
        </button>
      </div>
    </div>
  );
}
