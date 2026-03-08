import { useState } from 'react';
import { ChevronLeft, Plus } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { api } from '../../lib/api';
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
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const setCategories = useAppStore((s) => s.setCategories);

  const handleCreate = async () => {
    const name = newName.trim();
    const icon = newIcon.trim() || '📌';
    if (!name) {
      setError('Name is required');
      return;
    }
    setCreating(true);
    setError('');
    try {
      const newSub = await api.createSubcategory({
        category_id: category.id,
        name,
        icon,
      });
      // Refresh categories in the store
      const cats = await api.getCategories();
      setCategories(cats);
      // Select the newly created subcategory
      onSelect(newSub);
    } catch (err) {
      console.error('Failed to create subcategory:', err);
      setError('Failed to create');
    } finally {
      setCreating(false);
    }
  };

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

        {/* Add new button */}
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className={clsx(
              'flex items-center gap-1.5 px-4 py-2',
              'rounded-full transition-all duration-150',
              'active:scale-95 border-2 border-dashed border-gray-200',
              'text-gray-400 hover:text-gray-600 hover:border-gray-300',
            )}
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">Add new</span>
          </button>
        )}
      </div>

      {/* Inline creation form */}
      {showForm && (
        <div className="mt-4 p-3 rounded-2xl bg-gray-50 border border-gray-200">
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newIcon}
              onChange={(e) => setNewIcon(e.target.value)}
              placeholder="📌"
              className="w-12 px-2 py-1.5 text-center text-lg rounded-xl bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-200"
              maxLength={2}
            />
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCreate();
                }
              }}
              placeholder="Subcategory name"
              autoFocus
              className="flex-1 px-3 py-1.5 text-sm rounded-xl bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-200 placeholder-gray-300"
            />
          </div>
          {error && <p className="text-xs text-red-400 mb-2">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowForm(false);
                setNewName('');
                setNewIcon('');
                setError('');
              }}
              className="flex-1 py-1.5 text-sm rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex-1 py-1.5 text-sm rounded-xl text-white font-medium transition-colors"
              style={{ backgroundColor: category.color }}
            >
              {creating ? 'Adding...' : 'Add'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
