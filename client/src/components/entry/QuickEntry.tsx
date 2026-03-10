import { useState, useCallback, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { X } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { api } from '../../lib/api';
import type { Category, Subcategory, Entry } from '../../lib/api';
import CategoryGrid from './CategoryGrid';
import SubcategoryDrawer from './SubcategoryDrawer';
import DurationStepper from './DurationStepper';
import clsx from 'clsx';

interface QuickEntryProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  entries?: Entry[];
  prefilledStartTime?: string | null;
}

type Step = 1 | 2 | 3;

/** Find the first available gap in the timeline, returning an "HH:mm" string. */
function findFirstGap(entries: Entry[]): string {
  const DAY_START = 6 * 60; // 06:00 in minutes

  // Parse existing entries into sorted [start, end] minute ranges
  const ranges = entries
    .filter((e) => e.start_time)
    .map((e) => {
      const [h, m] = e.start_time!.split(':').map(Number);
      const start = h * 60 + m;
      return { start, end: start + (e.duration_minutes || 0) };
    })
    .sort((a, b) => a.start - b.start);

  // Walk from DAY_START, looking for a 15-min gap
  let cursor = DAY_START;
  for (const r of ranges) {
    if (cursor + 15 <= r.start) {
      // Found a gap before this entry
      break;
    }
    // Move cursor past this entry if it overlaps
    if (r.end > cursor) {
      cursor = r.end;
    }
  }

  // Snap to 15-min boundary
  cursor = Math.ceil(cursor / 15) * 15;

  const hh = String(Math.floor(cursor / 60)).padStart(2, '0');
  const mm = String(cursor % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

/** Fallback: round current time down to nearest 15 min */
function roundedNow(): string {
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  const rounded = Math.floor(mins / 15) * 15;
  const hh = String(Math.floor(rounded / 60)).padStart(2, '0');
  const mm = String(rounded % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

export default function QuickEntry({ isOpen, onClose, onSaved, entries = [], prefilledStartTime }: QuickEntryProps) {
  const [step, setStep] = useState<Step>(1);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<Subcategory | null>(null);
  const [saving, setSaving] = useState(false);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');

  const activeProfileId = useAppStore((s) => s.activeProfileId);
  const selectedDate = useAppStore((s) => s.selectedDate);

  const startTime = useMemo(() => {
    if (prefilledStartTime) return prefilledStartTime;
    if (entries.length > 0) {
      return findFirstGap(entries);
    }
    return roundedNow();
  }, [entries, prefilledStartTime]);

  // Reset state when sheet opens
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedCategory(null);
      setSelectedSubcategory(null);
      setSaving(false);
      setDirection('forward');
    }
  }, [isOpen]);

  const goToStep = useCallback((next: Step, dir: 'forward' | 'back') => {
    setDirection(dir);
    setStep(next);
  }, []);

  const handleCategorySelect = useCallback(
    (cat: Category) => {
      setSelectedCategory(cat);
      goToStep(2, 'forward');
    },
    [goToStep],
  );

  const handleSubcategorySelect = useCallback(
    (sub: Subcategory) => {
      setSelectedSubcategory(sub);
      goToStep(3, 'forward');
    },
    [goToStep],
  );

  const handleSave = useCallback(
    async (duration: number, tags: string[], note: string, customStartTime: string) => {
      if (!selectedSubcategory) return;
      setSaving(true);
      try {
        await api.createEntry({
          profile_id: activeProfileId,
          subcategory_id: selectedSubcategory.id,
          date: selectedDate,
          start_time: customStartTime,
          duration_minutes: duration,
          tags: tags.length > 0 ? tags : undefined,
          note: note.trim() || undefined,
        });
        onSaved();
        onClose();
      } catch (err) {
        console.error('Failed to save entry:', err);
      } finally {
        setSaving(false);
      }
    },
    [selectedSubcategory, activeProfileId, selectedDate, onSaved, onClose],
  );

  const handleStartNow = useCallback(
    async (tags: string[], note: string, startTime: string) => {
      if (!selectedSubcategory) return;
      setSaving(true);
      try {
        await api.startEntry({
          profile_id: activeProfileId,
          subcategory_id: selectedSubcategory.id,
          date: selectedDate,
          start_time: startTime,
          tags: tags.length > 0 ? tags : undefined,
          note: note.trim() || undefined,
        });
        onSaved();
        onClose();
      } catch (err) {
        console.error('Failed to start entry:', err);
      } finally {
        setSaving(false);
      }
    },
    [selectedSubcategory, activeProfileId, selectedDate, onSaved, onClose],
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={clsx(
          'relative w-full max-w-lg mx-4 bg-white rounded-3xl',
          'shadow-2xl max-h-[85vh] overflow-y-auto',
          'animate-slide-up',
        )}
      >
        {/* Header with close button */}
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <div className="w-8" /> {/* spacer */}
          <div className="w-10 h-1 rounded-full bg-gray-300" />
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 mb-4">
          {([1, 2, 3] as Step[]).map((s) => (
            <div
              key={s}
              className={clsx(
                'h-1.5 rounded-full transition-all duration-300',
                step === s ? 'w-6 bg-gray-700' : 'w-1.5 bg-gray-300',
              )}
            />
          ))}
        </div>

        {/* Step content */}
        <div
          key={step}
          className={clsx(
            direction === 'forward' ? 'animate-step-forward' : 'animate-step-back',
          )}
        >
          {step === 1 && <CategoryGrid onSelect={handleCategorySelect} />}
          {step === 2 && selectedCategory && (
            <SubcategoryDrawer
              category={selectedCategory}
              onSelect={handleSubcategorySelect}
              onBack={() => goToStep(1, 'back')}
            />
          )}
          {step === 3 && selectedCategory && selectedSubcategory && (
            <DurationStepper
              category={selectedCategory}
              subcategory={selectedSubcategory}
              startTime={startTime}
              onSave={handleSave}
              onStartNow={handleStartNow}
              onBack={() => goToStep(2, 'back')}
              saving={saving}
            />
          )}
        </div>
      </div>
    </div>
  );
}
