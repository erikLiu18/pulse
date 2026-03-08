import { useAppStore } from '../../stores/appStore';
import type { Category } from '../../lib/api';
import clsx from 'clsx';

interface CategoryGridProps {
  onSelect: (category: Category) => void;
}

export default function CategoryGrid({ onSelect }: CategoryGridProps) {
  const categories = useAppStore((s) => s.categories);

  return (
    <div className="px-4 pb-4">
      <p className="text-center text-sm text-gray-400 mb-4">What did you do?</p>
      <div className="grid grid-cols-3 gap-3 justify-items-center">
        {categories.map((cat, i) => (
          <button
            key={cat.id}
            onClick={() => onSelect(cat)}
            className={clsx(
              'flex flex-col items-center justify-center',
              'w-20 h-20 rounded-2xl',
              'transition-all duration-150 active:scale-93',
              'shadow-sm hover:shadow-md',
              // second row: if 5 items, items 3&4 should be in a centered row
              // We handle centering via col-start for 2-item second row
              categories.length === 5 && i === 3 && 'col-start-1 justify-self-end mr-1',
              categories.length === 5 && i === 4 && 'col-start-2 justify-self-start ml-1',
            )}
            style={{
              backgroundColor: `${cat.color}18`,
              color: cat.color,
            }}
          >
            <span className="text-2xl mb-1">{cat.icon}</span>
            <span className="text-xs font-medium truncate max-w-[72px]">
              {cat.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
