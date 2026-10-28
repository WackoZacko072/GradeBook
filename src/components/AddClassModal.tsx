import React, { useState } from 'react';
import { X, BookOpen, Plus, Trash2, AlertCircle } from 'lucide-react';
import { ModalPortal } from './ModalPortal';
import type { ClassItem, Category } from '../types/grade';
import { roundTo } from '../utils/gradeCalculations';

interface AddClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddClass: (newClass: ClassItem) => void;
}

interface DraftCategory {
  id: string;
  name: string;
  weight: number;
}

export const AddClassModal: React.FC<AddClassModalProps> = ({
  isOpen,
  onClose,
  onAddClass,
}) => {
  const [className, setClassName] = useState('');
  const [credits, setCredits] = useState<number>(3);
  const [categories, setCategories] = useState<DraftCategory[]>([]);

  if (!isOpen) return null;

  const totalWeight = roundTo(
    categories.reduce((acc, c) => acc + (Number(c.weight) || 0), 0),
    2
  );
  const isCategoriesValid = categories.length === 0 || Math.abs(totalWeight - 100) < 0.001;

  const handleAddCategory = () => {
    const remaining = Math.max(0, roundTo(100 - totalWeight, 2));
    setCategories((prev) => [
      ...prev,
      {
        id: 'draft_' + Math.random().toString(36).substring(2, 9),
        name: '',
        weight: remaining,
      },
    ]);
  };

  const handleUpdateCategory = (id: string, updates: Partial<DraftCategory>) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  const handleDeleteCategory = (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = className.trim();
    if (!trimmed || !isCategoriesValid) return;

    const initialCategories: Category[] = categories.map((c, idx) => ({
      id: 'cat_' + Math.random().toString(36).substring(2, 9),
      name: c.name.trim() || `Category ${idx + 1}`,
      weight: Number(c.weight) || 0,
      assessments: [],
    }));

    const newClass: ClassItem = {
      id: 'class_' + Math.random().toString(36).substring(2, 9),
      name: trimmed,
      color: '#2563EB',
      credits: Number(credits) || 3,
      createdAt: Date.now(),
      categories: initialCategories,
    };

    onAddClass(newClass);
    setClassName('');
    setCategories([]);
    onClose();
  };

  const isFormValid = className.trim().length > 0 && isCategoriesValid;

  return (
    <ModalPortal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-2xl"
      aria-labelledby="add-class-title"
    >
      <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100 dark:border-white/10 bg-slate-50/70 dark:bg-[#252628] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-[#8ab4f8] rounded-2xl">
            <BookOpen className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h2 id="add-class-title" className="text-lg sm:text-xl font-bold text-slate-900 dark:text-[#e8eaed]" style={{ fontFamily: "'Google Sans', sans-serif" }}>
              Add New Class
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-[#9aa0a6] mt-0.5">
              Configure course name and weighted grading categories
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          className="p-2 text-slate-400 dark:text-[#9aa0a6] hover:text-slate-600 dark:hover:text-[#e8eaed] hover:bg-slate-100 dark:hover:bg-[#202123] rounded-full transition-colors cursor-pointer google-btn-press"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-7 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-3">
              <label htmlFor="class-name-input" className="block text-xs font-semibold text-slate-700 dark:text-[#e8eaed] uppercase tracking-wider mb-2">
                Class Name
              </label>
              <input
                id="class-name-input"
                type="text"
                autoFocus
                required
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="e.g. Pre-Calculus 12"
                className="w-full px-4 py-3 bg-slate-100 dark:bg-[#131314] border border-transparent focus:border-blue-500 dark:focus:border-blue-400 rounded-xl text-slate-900 dark:text-[#e8eaed] placeholder-slate-400 dark:placeholder-[#5f6368] focus:outline-none text-sm min-h-[44px] transition-all"
              />
            </div>
            <div>
              <label htmlFor="class-credits-input" className="block text-xs font-semibold text-slate-700 dark:text-[#e8eaed] uppercase tracking-wider mb-2" title="Credit hours for GPA calculation">
                Credits
              </label>
              <input
                id="class-credits-input"
                type="number"
                min="0.5"
                max="10"
                step="0.5"
                value={credits}
                onChange={(e) => setCredits(parseFloat(e.target.value) || 3)}
                className="w-full px-3 py-3 bg-slate-100 dark:bg-[#131314] border border-transparent focus:border-blue-500 dark:focus:border-blue-400 rounded-xl text-slate-900 dark:text-[#e8eaed] focus:outline-none text-sm min-h-[44px] transition-all"
              />
            </div>
          </div>

          {/* Grading Categories Setup */}
          <div className="p-4 bg-slate-50 dark:bg-[#0f0f10] rounded-xl border border-slate-200 dark:border-[#26282a] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-[#e8eaed] uppercase tracking-wider">
                Grading Categories
              </span>
              {categories.length > 0 && (
                <span className={`text-xs font-bold ${isCategoriesValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  Total: {totalWeight.toFixed(1)}% {isCategoriesValid ? '✓ (100%)' : '⚠️ (Must = 100%)'}
                </span>
              )}
            </div>

            {!isCategoriesValid && (
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 rounded-lg text-rose-700 dark:text-rose-300 text-xs flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>
                  Category weights must total exactly 100% (currently {totalWeight.toFixed(1)}% —{' '}
                  {totalWeight > 100 ? `${(totalWeight - 100).toFixed(1)}% over` : `${(100 - totalWeight).toFixed(1)}% remaining`}).
                </span>
              </div>
            )}

            {categories.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {categories.map((cat, idx) => (
                  <div key={cat.id} className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 dark:text-[#9aa0a6] font-semibold w-4">{idx + 1}.</span>
                    <input
                      type="text"
                      value={cat.name}
                      onChange={(e) => handleUpdateCategory(cat.id, { name: e.target.value })}
                      placeholder="Category name"
                      className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-[#18191b] border border-slate-200 dark:border-[#26282a] text-slate-900 dark:text-[#e8eaed] rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 min-h-[36px]"
                    />
                    <div className="relative w-20">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="any"
                        value={cat.weight}
                        onChange={(e) => handleUpdateCategory(cat.id, { weight: parseFloat(e.target.value) || 0 })}
                        className="w-full pr-5 pl-2 py-1.5 text-xs font-bold text-right bg-white dark:bg-[#18191b] border border-slate-200 dark:border-[#26282a] text-slate-900 dark:text-[#e8eaed] rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 min-h-[36px]"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 dark:text-[#9aa0a6] font-bold pointer-events-none">%</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="p-1.5 text-slate-400 dark:text-[#9aa0a6] hover:text-rose-600 dark:hover:text-rose-400 rounded-md google-btn-press"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={handleAddCategory}
              className="w-full py-2 text-xs font-semibold text-blue-600 dark:text-[#8ab4f8] bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer google-btn-press"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Category</span>
            </button>
          </div>

        </div>

        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-white/10 bg-slate-50/70 dark:bg-[#252628] flex items-center justify-end gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-xs sm:text-sm font-semibold text-slate-600 dark:text-[#c4c7c5] hover:text-slate-800 dark:hover:text-[#e8eaed] hover:bg-slate-200/60 dark:hover:bg-[#28292a] rounded-xl transition-colors cursor-pointer google-btn-press"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!isFormValid}
            className="px-6 py-2.5 text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-all shadow-sm cursor-pointer min-h-[44px] google-btn-press"
          >
            Create Class
          </button>
        </div>
      </form>
    </ModalPortal>
  );
};
