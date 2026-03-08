import { useState } from 'react';
import { ChevronLeft, Minus, Plus, X } from 'lucide-react';
import type { Category, Subcategory } from '../../lib/api';
import clsx from 'clsx';

interface DurationStepperProps {
  category: Category;
  subcategory: Subcategory;
  onSave: (duration: number, tags: string[], note: string) => void;
  onBack: () => void;
  saving: boolean;
}

function formatDuration(mins: number): string {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function DurationStepper({
  category,
  subcategory,
  onSave,
  onBack,
  saving,
}: DurationStepperProps) {
  const [duration, setDuration] = useState(30);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [note, setNote] = useState('');

  const decrement = () => setDuration((d) => Math.max(15, d - 15));
  const increment = () => setDuration((d) => Math.min(480, d + 15));

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  return (
    <div className="px-4 pb-4 animate-slide-in">
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <button
          onClick={onBack}
          className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-500" />
        </button>
        <span className="text-xl">{subcategory.icon}</span>
        <span className="font-semibold text-gray-700">{subcategory.name}</span>
      </div>

      {/* Duration stepper */}
      <div className="flex items-center justify-center gap-6 mb-6">
        <button
          onClick={decrement}
          disabled={duration <= 15}
          className={clsx(
            'w-11 h-11 rounded-full flex items-center justify-center',
            'transition-all duration-150 active:scale-90',
            duration <= 15 ? 'bg-gray-100 text-gray-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
          )}
        >
          <Minus className="w-5 h-5" />
        </button>

        <span
          className="text-4xl font-bold min-w-[120px] text-center"
          style={{ color: category.color }}
        >
          {formatDuration(duration)}
        </span>

        <button
          onClick={increment}
          disabled={duration >= 480}
          className={clsx(
            'w-11 h-11 rounded-full flex items-center justify-center',
            'transition-all duration-150 active:scale-90',
            duration >= 480 ? 'bg-gray-100 text-gray-300' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
          )}
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Tags */}
      <div className="mb-3">
        <div className="flex flex-wrap gap-1.5 mb-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600"
            >
              {tag}
              <button onClick={() => removeTag(tag)} className="hover:text-gray-900">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <input
          type="text"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addTag();
            }
          }}
          placeholder="Add tags (press Enter)"
          className="w-full px-3 py-2 text-sm rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-200 placeholder-gray-300"
        />
      </div>

      {/* Note */}
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Add a note..."
        rows={2}
        className="w-full px-3 py-2 text-sm rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-200 placeholder-gray-300 resize-none mb-4"
      />

      {/* Save button */}
      <button
        onClick={() => onSave(duration, tags, note)}
        disabled={saving}
        className={clsx(
          'w-full py-3.5 rounded-2xl text-white font-semibold text-base',
          'transition-all duration-150 active:scale-[0.98]',
          'shadow-md hover:shadow-lg',
          saving && 'opacity-70 cursor-not-allowed',
        )}
        style={{ backgroundColor: category.color }}
      >
        {saving ? 'Saving...' : 'Save Entry'}
      </button>
    </div>
  );
}
