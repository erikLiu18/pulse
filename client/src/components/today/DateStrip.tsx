import { useMemo, useState } from 'react';
import {
  startOfWeek,
  addDays,
  addWeeks,
  format,
  isToday,
  isSameDay,
  parse,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { useAppStore } from '../../stores/appStore';

export default function DateStrip() {
  const { selectedDate, setSelectedDate } = useAppStore();
  const selected = parse(selectedDate, 'yyyy-MM-dd', new Date());

  const [weekOffset, setWeekOffset] = useState(0);

  const days = useMemo(() => {
    const base = addWeeks(
      startOfWeek(new Date(), { weekStartsOn: 1 }),
      weekOffset,
    );
    return Array.from({ length: 7 }, (_, i) => addDays(base, i));
  }, [weekOffset]);

  return (
    <div className="flex items-center gap-1 px-2 py-3">
      <button
        onClick={() => setWeekOffset((o) => o - 1)}
        className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 shrink-0"
      >
        <ChevronLeft size={18} />
      </button>

      <div className="flex flex-1 justify-around">
        {days.map((day) => {
          const today = isToday(day);
          const active = isSameDay(day, selected);
          return (
            <button
              key={day.toISOString()}
              onClick={() => setSelectedDate(format(day, 'yyyy-MM-dd'))}
              className="flex flex-col items-center gap-1"
            >
              <span
                className={clsx(
                  'text-xs font-medium',
                  today && !active ? 'text-blue-500' : 'text-gray-400',
                  active && 'text-blue-600',
                )}
              >
                {format(day, 'EEE')}
              </span>
              <span
                className={clsx(
                  'w-9 h-9 flex items-center justify-center rounded-full text-sm font-semibold transition-all',
                  today && active && 'bg-blue-500 text-white',
                  today && !active && 'bg-blue-100 text-blue-600',
                  !today && active && 'ring-2 ring-blue-500 text-blue-600',
                  !today && !active && 'text-gray-700 hover:bg-gray-100',
                )}
              >
                {format(day, 'd')}
              </span>
            </button>
          );
        })}
      </div>

      <button
        onClick={() => setWeekOffset((o) => o + 1)}
        className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 shrink-0"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
