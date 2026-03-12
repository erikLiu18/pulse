import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import { api } from '../lib/api';
import type { Category } from '../lib/api';
import EmojiPicker from '../components/shared/EmojiPicker';

const categoryDescriptions: Record<string, string> = {
  Professional: 'Work-related activities — deep focus, meetings, email, planning, learning, and admin tasks',
  People: 'Time spent with others — partner, family, friends, networking, and community involvement',
  Growth: 'Personal development — reading, side projects, courses, writing/reflection, and fitness',
  Vital: 'Essential life maintenance — sleep, meals, hygiene, commute, chores, and health appointments',
  Leisure: 'Rest and recreation — gaming, social media, TV/movies, music, outdoors, and hobbies',
  Planning: 'Life planning and logistics — travel, finances, and future preparation',
};

export default function GuidePage() {
  const { categories, setCategories } = useAppStore();
  const [addingSubFor, setAddingSubFor] = useState<number | null>(null);
  const [newSubName, setNewSubName] = useState('');
  const [newSubIcon, setNewSubIcon] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#6366f1');
  const [newCatIcon, setNewCatIcon] = useState('');

  const visibleCategories = categories.filter(cat => cat.name !== 'Unlabeled');

  async function refreshCategories() {
    const cats = await api.getCategories();
    setCategories(cats);
  }

  async function handleDeleteSubcategory(subId: number, subName: string) {
    if (!window.confirm(`Delete subcategory "${subName}"?`)) return;
    await api.deleteSubcategory(subId);
    await refreshCategories();
  }

  async function handleAddSubcategory(categoryId: number) {
    if (!newSubName.trim() || !newSubIcon.trim()) return;
    await api.createSubcategory({ category_id: categoryId, name: newSubName.trim(), icon: newSubIcon.trim() });
    setAddingSubFor(null);
    setNewSubName('');
    setNewSubIcon('');
    await refreshCategories();
  }

  async function handleDeleteCategory(cat: Category) {
    if (!window.confirm(`Delete category "${cat.name}" and all its subcategories?`)) return;
    await api.deleteCategory(cat.id);
    await refreshCategories();
  }

  async function handleAddCategory() {
    if (!newCatName.trim() || !newCatIcon.trim()) return;
    await api.createCategory({ name: newCatName.trim(), color: newCatColor, icon: newCatIcon.trim() });
    setAddingCategory(false);
    setNewCatName('');
    setNewCatColor('#6366f1');
    setNewCatIcon('');
    await refreshCategories();
  }

  return (
    <div className="px-4 py-6 pb-24 space-y-8">
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Categories</h2>
        <div className="space-y-3">
          {visibleCategories.map(cat => (
            <div
              key={cat.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
            >
              <div className="p-4" style={{ borderLeft: `4px solid ${cat.color}` }}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">{cat.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">{cat.name}</h3>
                      <button
                        onClick={() => handleDeleteCategory(cat)}
                        className="text-xs text-red-400 hover:text-red-600 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {categoryDescriptions[cat.name] || 'Custom category'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 mt-3 ml-9">
                  {cat.subcategories.map(sub => (
                    <span
                      key={sub.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-full text-xs text-gray-700 group"
                    >
                      <span>{sub.icon}</span>
                      {sub.name}
                      <button
                        onClick={() => handleDeleteSubcategory(sub.id, sub.name)}
                        className="ml-0.5 text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}

                  {addingSubFor === cat.id ? (
                    <div className="flex items-center gap-1.5">
                      <EmojiPicker value={newSubIcon} onChange={setNewSubIcon} color={cat.color} />
                      <input
                        type="text"
                        placeholder="Name"
                        value={newSubName}
                        onChange={e => setNewSubName(e.target.value)}
                        className="w-24 px-2 py-1 border border-gray-200 rounded-md text-sm"
                        onKeyDown={e => e.key === 'Enter' && handleAddSubcategory(cat.id)}
                      />
                      <button
                        onClick={() => handleAddSubcategory(cat.id)}
                        className="px-2 py-1 bg-blue-500 text-white text-xs rounded-md hover:bg-blue-600"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => { setAddingSubFor(null); setNewSubName(''); setNewSubIcon(''); }}
                        className="px-2 py-1 text-gray-400 text-xs hover:text-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingSubFor(cat.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 border border-dashed border-gray-300 rounded-full text-xs text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-colors"
                    >
                      <Plus size={12} />
                      Add
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Add new category */}
          {addingCategory ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
              <h3 className="font-medium text-gray-900">New Category</h3>
              <div className="flex flex-wrap gap-2">
                <EmojiPicker value={newCatIcon} onChange={setNewCatIcon} color={newCatColor} />
                <input
                  type="text"
                  placeholder="Category name"
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  className="flex-1 min-w-[120px] px-3 py-1.5 border border-gray-200 rounded-md text-sm"
                />
                <input
                  type="color"
                  value={newCatColor}
                  onChange={e => setNewCatColor(e.target.value)}
                  className="w-10 h-8 border border-gray-200 rounded-md cursor-pointer"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddCategory}
                  className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600"
                >
                  Create
                </button>
                <button
                  onClick={() => { setAddingCategory(false); setNewCatName(''); setNewCatIcon(''); }}
                  className="px-3 py-1.5 text-gray-400 text-sm hover:text-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingCategory(true)}
              className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={16} />
              Add new category
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
