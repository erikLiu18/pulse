import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, endOfWeek, addWeeks, subWeeks, isSameWeek } from 'date-fns';

interface WeekSelectorProps {
  weekStart: Date;
  onChange: (newStart: Date) => void;
}

export default function WeekSelector({ weekStart, onChange }: WeekSelectorProps) {
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const isCurrentWeek = isSameWeek(weekStart, new Date(), { weekStartsOn: 1 });

  const label =
    weekStart.getFullYear() === weekEnd.getFullYear() &&
    weekStart.getMonth() === weekEnd.getMonth()
      ? `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'd, yyyy')}`
      : weekStart.getFullYear() === weekEnd.getFullYear()
        ? `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`
        : `${format(weekStart, 'MMM d, yyyy')} – ${format(weekEnd, 'MMM d, yyyy')}`;

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <button
        onClick={() => onChange(subWeeks(weekStart, 1))}
        className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100 active:bg-gray-200 transition-colors"
      >
        <ChevronLeft size={20} className="text-gray-500" />
      </button>

      <div className="text-center">
        <p className="text-sm font-semibold text-gray-900">{label}</p>
        {isCurrentWeek && (
          <p className="text-xs text-blue-500 font-medium mt-0.5">This Week</p>
        )}
      </div>

      <button
        onClick={() => onChange(addWeeks(weekStart, 1))}
        disabled={isCurrentWeek}
        className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100 active:bg-gray-200 transition-colors disabled:opacity-30 disabled:pointer-events-none"
      >
        <ChevronRight size={20} className="text-gray-500" />
      </button>
    </div>
  );
}
