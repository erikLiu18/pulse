import { Trash2 } from 'lucide-react';
import type { Entry } from '../../lib/api';
import { api } from '../../lib/api';

interface Props {
  entry: Entry;
  onRefresh: () => void;
}

export default function EntryCard({ entry, onRefresh }: Props) {
  const tags = entry.tags ? entry.tags.split(',').filter(Boolean) : [];
  const durationLabel =
    entry.duration_minutes != null && entry.duration_minutes > 0
      ? entry.duration_minutes >= 60
        ? `${(entry.duration_minutes / 60).toFixed(1).replace(/\.0$/, '')}h`
        : `${entry.duration_minutes}m`
      : null;

  const handleDelete = async () => {
    await api.deleteEntry(entry.id);
    onRefresh();
  };

  return (
    <div
      className="group relative bg-white rounded-xl shadow-sm border border-gray-100 pl-5 pr-3 py-3 flex items-start gap-3"
      style={{ borderLeftWidth: 4, borderLeftColor: entry.category_color || '#D1D5DB' }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-base">{entry.subcategory_icon || entry.category_icon}</span>
          <span className="font-medium text-sm text-gray-900 truncate">
            {entry.subcategory_name || 'Entry'}
          </span>
          {durationLabel && (
            <span className="ml-auto shrink-0 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {durationLabel}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 mt-1">
          {entry.category_name && (
            <span className="text-xs text-gray-400">{entry.category_name}</span>
          )}
          {entry.start_time && (
            <span className="text-xs text-gray-400">
              {entry.start_time.slice(0, 5)}
            </span>
          )}
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                style={{
                  backgroundColor: (entry.category_color || '#3B82F6') + '18',
                  color: entry.category_color || '#3B82F6',
                }}
              >
                {tag.trim()}
              </span>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={handleDelete}
        className="shrink-0 p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors
          opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}
