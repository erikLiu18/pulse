import { useState, useEffect } from 'react';
import { ChevronRight, Clock } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { api } from '../../lib/api';
import type { Category, FrequentActivity } from '../../lib/api';

interface CategoryGridProps {
  onSelect: (category: Category) => void;
  onSelectFrequent?: (activity: FrequentActivity) => void;
}

export default function CategoryGrid({ onSelect, onSelectFrequent }: CategoryGridProps) {
  const categories = useAppStore((s) => s.categories);
  const activeProfileId = useAppStore((s) => s.activeProfileId);
  const [frequentActivities, setFrequentActivities] = useState<FrequentActivity[]>([]);

  useEffect(() => {
    async function loadFrequent() {
      try {
        const activities = await api.getFrequentActivities(activeProfileId);
        setFrequentActivities(activities);
      } catch (err) {
        console.error('Failed to load frequent activities:', err);
      }
    }
    loadFrequent();
  }, [activeProfileId]);

  return (
    <div className="px-4 pb-4">
      {frequentActivities.length > 0 && (
        <div className="mb-6">
          <p className="text-center text-sm text-gray-400 mb-3 flex items-center justify-center gap-2">
            <Clock className="w-4 h-4" /> Frequently Used
          </p>
          <div className="grid grid-cols-2 gap-2">
            {frequentActivities.map((act) => (
              <button
                key={act.subcategory_id}
                onClick={() => onSelectFrequent?.(act)}
                className="flex items-center gap-2 p-3 rounded-2xl transition-all duration-150 active:scale-[0.98] shadow-sm hover:shadow-md border border-gray-100"
                style={{
                  backgroundColor: `${act.category_color}08`,
                }}
              >
                <div
                  className="w-1 h-6 rounded-full flex-shrink-0"
                  style={{ backgroundColor: act.category_color }}
                />
                <span className="text-lg">{act.subcategory_icon}</span>
                <span className="text-sm font-medium flex-1 text-left truncate text-gray-700" title={act.subcategory_name}>
                  {act.subcategory_name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="text-center text-sm text-gray-400 mb-4">All Categories</p>
      <div className="flex flex-col gap-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onSelect(cat)}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl transition-all duration-150 active:scale-[0.98] shadow-sm hover:shadow-md"
            style={{
              backgroundColor: `${cat.color}12`,
            }}
          >
            <div
              className="w-1 h-8 rounded-full flex-shrink-0"
              style={{ backgroundColor: cat.color }}
            />
            <span className="text-xl">{cat.icon}</span>
            <span className="text-sm font-semibold flex-1 text-left" style={{ color: cat.color }}>
              {cat.name}
            </span>
            <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
