import type { Entry } from '../../lib/api';
import EntryCard from './EntryCard';

interface Props {
  entries: Entry[];
  onRefresh: () => void;
}

export default function Timeline({ entries, onRefresh }: Props) {
  const sorted = [...entries].sort((a, b) => {
    if (a.start_time && b.start_time) return a.start_time.localeCompare(b.start_time);
    if (a.start_time) return -1;
    if (b.start_time) return 1;
    return a.created_at.localeCompare(b.created_at);
  });

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="text-4xl mb-3">🌤️</div>
        <p className="text-gray-400 text-sm">
          No entries yet today. Tap <span className="font-semibold text-blue-500">+</span> to start tracking!
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {sorted.map((entry) => (
        <EntryCard key={entry.id} entry={entry} onRefresh={onRefresh} />
      ))}
    </div>
  );
}
