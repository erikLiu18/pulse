import { ChevronRight } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import type { Category } from '../../lib/api';

interface CategoryGridProps {
  onSelect: (category: Category) => void;
}

export default function CategoryGrid({ onSelect }: CategoryGridProps) {
  const categories = useAppStore((s) => s.categories);

  return (
    <div className="px-4 pb-4">
      <p className="text-center text-sm text-gray-400 mb-4">What did you do?</p>
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
