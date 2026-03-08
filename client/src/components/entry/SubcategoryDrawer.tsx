import { ChevronLeft } from 'lucide-react';
import type { Category, Subcategory } from '../../lib/api';
import clsx from 'clsx';

interface SubcategoryDrawerProps {
  category: Category;
  onSelect: (subcategory: Subcategory) => void;
  onBack: () => void;
}

export default function SubcategoryDrawer({
  category,
  onSelect,
  onBack,
}: SubcategoryDrawerProps) {
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
        <span className="text-xl">{category.icon}</span>
        <span className="font-semibold text-gray-700">{category.name}</span>
      </div>

      {/* Subcategory chips */}
      <div className="flex flex-wrap gap-2">
        {category.subcategories.map((sub) => (
          <button
            key={sub.id}
            onClick={() => onSelect(sub)}
            className={clsx(
              'flex items-center gap-1.5 px-4 py-2',
              'rounded-full transition-all duration-150',
              'active:scale-95 shadow-sm hover:shadow-md',
            )}
            style={{
              backgroundColor: `${category.color}12`,
              color: category.color,
            }}
          >
            <span className="text-base">{sub.icon}</span>
            <span className="text-sm font-medium">{sub.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
