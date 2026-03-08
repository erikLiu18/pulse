import { useState, useCallback, useEffect } from 'react';
import { roundToNearestMinutes, format } from 'date-fns';
import { useAppStore } from '../../stores/appStore';
import { api } from '../../lib/api';
import type { Category, Subcategory } from '../../lib/api';
import CategoryGrid from './CategoryGrid';
import SubcategoryDrawer from './SubcategoryDrawer';
import DurationStepper from './DurationStepper';
import clsx from 'clsx';

interface QuickEntryProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

type Step = 1 | 2 | 3;

export default function QuickEntry({ isOpen, onClose, onSaved }: QuickEntryProps) {
  const [step, setStep] = useState<Step>(1);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<Subcategory | null>(null);
  const [saving, setSaving] = useState(false);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');

  const activeProfileId = useAppStore((s) => s.activeProfileId);
  const selectedDate = useAppStore((s) => s.selectedDate);

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
    async (duration: number, tags: string[], note: string) => {
      if (!selectedSubcategory) return;
      setSaving(true);
      try {
        const rounded = roundToNearestMinutes(new Date(), {
          nearestTo: 15,
          roundingMethod: 'floor',
        });
        const startTime = format(rounded, 'HH:mm');

        await api.createEntry({
          profile_id: activeProfileId,
          subcategory_id: selectedSubcategory.id,
          date: selectedDate,
          start_time: startTime,
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 animate-fade-in"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={clsx(
          'relative w-full max-w-lg bg-white rounded-t-3xl',
          'shadow-2xl max-h-[70vh] overflow-y-auto',
          'animate-slide-up',
        )}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
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
              onSave={handleSave}
              onBack={() => goToStep(2, 'back')}
              saving={saving}
            />
          )}
        </div>
      </div>
    </div>
  );
}
