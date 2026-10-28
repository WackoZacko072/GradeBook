import React, { useState } from 'react';
import { X, BookOpen, Plus, Trash2, AlertCircle } from 'lucide-react';
import type { ClassItem, Category } from '../types/grade';
import { roundTo } from '../utils/gradeCalculations';

interface AddClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddClass: (newClass: ClassItem) => void;
}

const PRESET_CLASSES = [
  'Pre-Calculus 12',
  'Economics 12',
  'Physics 12',
  'AP Chemistry',
  'English Literature 12',
  'World History',
  'Computer Science',
  'Biology 12',
  'Psychology',
];

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
  const [template, setTemplate] = useState<'standard' | 'simple' | 'custom' | 'empty'>('standard');
  const [customCategories, setCustomCategories] = useState<DraftCategory[]>([
    { id: '1', name: 'Tests', weight: 40 },
    { id: '2', name: 'Assignments', weight: 30 },
    { id: '3', name: 'Quizzes', weight: 30 },
  ]);

  if (!isOpen) return null;

  const customTotal = roundTo(
    customCategories.reduce((acc, c) => acc + (Number(c.weight) || 0), 0),
    2
  );
  const isCustomValid = Math.abs(customTotal - 100) < 0.001;

  const handleAddCustomCategory = () => {
    const remaining = Math.max(0, roundTo(100 - customTotal, 2));
    setCustomCategories((prev) => [
      ...prev,
      {
        id: 'draft_' + Math.random().toString(36).substring(2, 9),
        name: `Category ${prev.length + 1}`,
        weight: remaining,
      },
    ]);
  };

  const handleUpdateCustomCategory = (id: string, updates: Partial<DraftCategory>) => {
    setCustomCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  const handleDeleteCustomCategory = (id: string) => {
    setCustomCategories((prev) => prev.filter((c) => c.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = className.trim();
    if (!trimmed) return;

    let initialCategories: Category[] = [];

    if (template === 'standard') {
      initialCategories = [
        {
          id: 'cat_' + Math.random().toString(36).substring(2, 9),
          name: 'Tests',
          weight: 40,
          assessments: [],
        },
        {
          id: 'cat_' + Math.random().toString(36).substring(2, 9),
          name: 'Assignments',
          weight: 30,
          assessments: [],
        },
        {
          id: 'cat_' + Math.random().toString(36).substring(2, 9),
          name: 'Quizzes',
          weight: 15,
          assessments: [],
        },
        {
          id: 'cat_' + Math.random().toString(36).substring(2, 9),
          name: 'Final Exam',
          weight: 15,
          assessments: [],
        },
      ];
    } else if (template === 'simple') {
      initialCategories = [
        {
          id: 'cat_' + Math.random().toString(36).substring(2, 9),
          name: 'Coursework',
          weight: 70,
          assessments: [],
        },
        {
          id: 'cat_' + Math.random().toString(36).substring(2, 9),
          name: 'Exams',
          weight: 30,
          assessments: [],
        },
      ];
    } else if (template === 'custom') {
      if (!isCustomValid) return;
      initialCategories = customCategories.map((c) => ({
        id: 'cat_' + Math.random().toString(36).substring(2, 9),
        name: c.name.trim() || 'Category',
        weight: Number(c.weight) || 0,
        assessments: [],
      }));
    } else if (template === 'empty') {
      initialCategories = [];
    }

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
    setTemplate('standard');
    onClose();
  };

  const isFormValid = className.trim().length > 0 && (template !== 'custom' || isCustomValid);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-class-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md transition-opacity animate-in fade-in duration-150"
    >
      <div className="w-full max-w-lg bg-white dark:bg-[#1e1f20] rounded-3xl shadow-2xl border border-slate-200/50 dark:border-white/10 p-6 sm:p-7 transform transition-all animate-fade-scale max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-[#8ab4f8] rounded-2xl">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 id="add-class-title" className="text-lg font-semibold text-slate-900 dark:text-[#e8eaed]" style={{ fontFamily: "'Google Sans', sans-serif" }}>
                Add New Class
              </h2>
              <p className="text-xs text-slate-500 dark:text-[#9aa0a6]">
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

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
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

          <div>
            <span className="block text-xs font-semibold text-slate-700 dark:text-[#e8eaed] uppercase tracking-wider mb-2">
              Quick Course Suggestions
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
              {PRESET_CLASSES.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setClassName(preset)}
                  className="px-3 py-1.5 text-xs font-medium rounded-full bg-slate-100 dark:bg-[#131314] hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 dark:hover:text-[#8ab4f8] text-slate-600 dark:text-[#c4c7c5] transition-colors cursor-pointer google-btn-press"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="block text-xs font-semibold text-slate-700 dark:text-[#e8eaed] uppercase tracking-wider mb-2">
              Initial Category Setup
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setTemplate('standard')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer google-btn-press ${
                  template === 'standard'
                    ? 'border-blue-600 dark:border-[#8ab4f8] bg-blue-50/50 dark:bg-blue-950/40 ring-1 ring-blue-600 dark:ring-[#8ab4f8]'
                    : 'border-slate-200 dark:border-[#26282a] hover:border-slate-300 dark:hover:border-[#5f6368] bg-white dark:bg-[#0f0f10]'
                }`}
              >
                <div className="text-xs font-semibold text-slate-900 dark:text-[#e8eaed]">
                  Standard
                </div>
                <p className="text-[11px] text-slate-500 dark:text-[#9aa0a6] mt-1 leading-tight">
                  40% / 30% / 15% / 15%
                </p>
              </button>

              <button
                type="button"
                onClick={() => setTemplate('simple')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer google-btn-press ${
                  template === 'simple'
                    ? 'border-blue-600 dark:border-[#8ab4f8] bg-blue-50/50 dark:bg-blue-950/40 ring-1 ring-blue-600 dark:ring-[#8ab4f8]'
                    : 'border-slate-200 dark:border-[#26282a] hover:border-slate-300 dark:hover:border-[#5f6368] bg-white dark:bg-[#0f0f10]'
                }`}
              >
                <div className="text-xs font-bold text-slate-900 dark:text-[#e8eaed]">
                  Simple
                </div>
                <p className="text-[11px] text-slate-500 dark:text-[#9aa0a6] mt-1 leading-tight">
                  70% / 30%
                </p>
              </button>

              <button
                type="button"
                onClick={() => setTemplate('custom')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer google-btn-press ${
                  template === 'custom'
                    ? 'border-blue-600 dark:border-[#8ab4f8] bg-blue-50/50 dark:bg-blue-950/40 ring-1 ring-blue-600 dark:ring-[#8ab4f8]'
                    : 'border-slate-200 dark:border-[#26282a] hover:border-slate-300 dark:hover:border-[#5f6368] bg-white dark:bg-[#0f0f10]'
                }`}
              >
                <div className="text-xs font-bold text-slate-900 dark:text-[#e8eaed]">
                  Custom
                </div>
                <p className="text-[11px] text-slate-500 dark:text-[#9aa0a6] mt-1 leading-tight">
                  Set own weights
                </p>
              </button>

              <button
                type="button"
                onClick={() => setTemplate('empty')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer google-btn-press ${
                  template === 'empty'
                    ? 'border-blue-600 dark:border-[#8ab4f8] bg-blue-50/50 dark:bg-blue-950/40 ring-1 ring-blue-600 dark:ring-[#8ab4f8]'
                    : 'border-slate-200 dark:border-[#26282a] hover:border-slate-300 dark:hover:border-[#5f6368] bg-white dark:bg-[#0f0f10]'
                }`}
              >
                <div className="text-xs font-bold text-slate-900 dark:text-[#e8eaed]">
                  Blank
                </div>
                <p className="text-[11px] text-slate-500 dark:text-[#9aa0a6] mt-1 leading-tight">
                  Start from scratch
                </p>
              </button>
            </div>
          </div>

          {/* Custom Categories Setup when template === 'custom' */}
          {template === 'custom' && (
            <div className="p-4 bg-slate-50 dark:bg-[#0f0f10] rounded-xl border border-slate-200 dark:border-[#26282a] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-[#e8eaed]">Custom Categories</span>
                <span className={`text-xs font-bold ${isCustomValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  Total: {customTotal.toFixed(1)}% {isCustomValid ? '✓ (100%)' : '⚠️ (Must = 100%)'}
                </span>
              </div>

              {!isCustomValid && (
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 rounded-lg text-rose-700 dark:text-rose-300 text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>
                    Category weights must total exactly 100% (currently {customTotal.toFixed(1)}% —{' '}
                    {customTotal > 100 ? `${(customTotal - 100).toFixed(1)}% over` : `${(100 - customTotal).toFixed(1)}% remaining`}).
                  </span>
                </div>
              )}

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {customCategories.map((cat, idx) => (
                  <div key={cat.id} className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 dark:text-[#9aa0a6] font-semibold w-4">{idx + 1}.</span>
                    <input
                      type="text"
                      value={cat.name}
                      onChange={(e) => handleUpdateCustomCategory(cat.id, { name: e.target.value })}
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
                        onChange={(e) => handleUpdateCustomCategory(cat.id, { weight: parseFloat(e.target.value) || 0 })}
                        className="w-full pr-5 pl-2 py-1.5 text-xs font-bold text-right bg-white dark:bg-[#18191b] border border-slate-200 dark:border-[#26282a] text-slate-900 dark:text-[#e8eaed] rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600 min-h-[36px]"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 dark:text-[#9aa0a6] font-bold pointer-events-none">%</span>
                    </div>
                    {customCategories.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomCategory(cat.id)}
                        className="p-1.5 text-slate-400 dark:text-[#9aa0a6] hover:text-rose-600 dark:hover:text-rose-400 rounded-md google-btn-press"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAddCustomCategory}
                className="w-full py-2 text-xs font-semibold text-blue-600 dark:text-[#8ab4f8] bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition-colors flex items-center justify-center gap-1.5 google-btn-press"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Category</span>
              </button>
            </div>
          )}

          <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 text-sm font-medium text-slate-700 dark:text-[#c4c7c5] hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors cursor-pointer min-h-[44px] google-btn-press"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isFormValid}
              className="w-full sm:w-auto px-6 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-full transition-all shadow-sm cursor-pointer min-h-[44px] google-btn-press"
            >
              Create Class
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
