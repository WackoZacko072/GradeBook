import React, { useState, useEffect } from 'react';
import { X, Sliders, Plus, Trash2, ArrowUp, ArrowDown, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { Category } from '../types/grade';
import { roundTo, equalizeCategoryWeights } from '../utils/gradeCalculations';

interface ManageWeightsModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onSaveCategories: (updatedCategories: Category[]) => void;
}

export const ManageWeightsModal: React.FC<ManageWeightsModalProps> = ({
  isOpen,
  onClose,
  categories,
  onSaveCategories,
}) => {
  const [draftCategories, setDraftCategories] = useState<Category[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDraftCategories(JSON.parse(JSON.stringify(categories)));
      setValidationError(null);
    }
  }, [isOpen, categories]);

  if (!isOpen) return null;

  const totalWeight = roundTo(
    draftCategories.reduce((acc, c) => acc + (Number(c.weight) || 0), 0),
    2
  );
  const isValid = Math.abs(totalWeight - 100) < 0.001;

  const handleUpdateName = (id: string, name: string) => {
    setDraftCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, name } : c))
    );
  };

  const handleUpdateWeight = (id: string, rawVal: string) => {
    const parsed = rawVal === '' ? 0 : parseFloat(rawVal);
    setDraftCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, weight: Math.max(0, parsed) } : c))
    );
  };

  const handleAddCategory = () => {
    const remaining = Math.max(0, roundTo(100 - totalWeight, 2));
    const newCat: Category = {
      id: 'cat_' + Math.random().toString(36).substring(2, 9),
      name: `Category ${draftCategories.length + 1}`,
      weight: remaining,
      assessments: [],
    };
    setDraftCategories((prev) => [...prev, newCat]);
  };

  const handleDeleteCategory = (id: string) => {
    setDraftCategories((prev) => prev.filter((c) => c.id !== id));
  };

  const handleMoveCategory = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= draftCategories.length) return;
    const list = [...draftCategories];
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;
    setDraftCategories(list);
  };

  const handleEqualize = () => {
    setDraftCategories(equalizeCategoryWeights(draftCategories));
    setValidationError(null);
  };

  const handleSave = () => {
    if (!isValid) {
      if (totalWeight < 100) {
        setValidationError(`Category weights must total exactly 100%. Currently ${totalWeight.toFixed(1)}% (${(100 - totalWeight).toFixed(1)}% remaining).`);
      } else {
        setValidationError(`Category weights must total exactly 100%. Currently ${totalWeight.toFixed(1)}% (${(totalWeight - 100).toFixed(1)}% over).`);
      }
      return;
    }

    onSaveCategories(draftCategories);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="manage-weights-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
    >
      <div className="w-full max-w-xl bg-white dark:bg-[#282a2c] rounded-2xl shadow-xl border border-slate-100 dark:border-[#3c4043] p-6 transform transition-all animate-fade-scale max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-[#3c4043] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-[#8ab4f8] rounded-xl">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 id="manage-weights-title" className="text-lg font-bold text-slate-900 dark:text-[#e8eaed]">
                Configure Categories & Weights
              </h2>
              <p className="text-xs text-slate-500 dark:text-[#9aa0a6]">
                Category weights must total exactly 100%
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 text-slate-400 dark:text-[#9aa0a6] hover:text-slate-600 dark:hover:text-[#e8eaed] hover:bg-slate-100 dark:hover:bg-[#303134] rounded-xl transition-colors cursor-pointer google-btn-press"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {/* Status Banner */}
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs font-semibold ${
              isValid
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800/40'
            }`}
          >
            <div className="flex items-center gap-2">
              {isValid ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
              )}
              <span>
                {isValid
                  ? 'Weights total exactly 100.0%'
                  : totalWeight < 100
                  ? `Total: ${totalWeight.toFixed(1)}% — Needs ${(100 - totalWeight).toFixed(1)}% more to reach 100%`
                  : `Total: ${totalWeight.toFixed(1)}% — Over by ${(totalWeight - 100).toFixed(1)}% (Must equal 100%)`}
              </span>
            </div>

            <button
              type="button"
              onClick={handleEqualize}
              className="px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-[#e8eaed] bg-white dark:bg-[#1e1f20] hover:bg-slate-50 dark:hover:bg-[#303134] border border-slate-200 dark:border-[#3c4043] rounded-lg transition-colors cursor-pointer google-btn-press"
            >
              Split Equally
            </button>
          </div>

          {validationError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Categories List */}
          <div className="space-y-2.5">
            {draftCategories.map((cat, idx) => (
              <div
                key={cat.id}
                className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-[#1e1f20] border border-slate-200 dark:border-[#3c4043] rounded-xl"
              >
                {/* Reorder Buttons */}
                <div className="flex flex-col gap-0.5 text-slate-400 dark:text-[#9aa0a6]">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => handleMoveCategory(idx, 'up')}
                    className="p-0.5 hover:text-slate-800 dark:hover:text-[#e8eaed] disabled:opacity-20 cursor-pointer"
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === draftCategories.length - 1}
                    onClick={() => handleMoveCategory(idx, 'down')}
                    className="p-0.5 hover:text-slate-800 dark:hover:text-[#e8eaed] disabled:opacity-20 cursor-pointer"
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>
                </div>

                {/* Name */}
                <input
                  type="text"
                  value={cat.name}
                  onChange={(e) => handleUpdateName(cat.id, e.target.value)}
                  placeholder="Category Name"
                  className="flex-1 px-3 py-2 text-sm bg-white dark:bg-[#282a2c] border border-slate-200 dark:border-[#3c4043] rounded-lg text-slate-900 dark:text-[#e8eaed] focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 min-h-[38px]"
                />

                {/* Weight Input */}
                <div className="relative w-24">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="any"
                    value={cat.weight}
                    onChange={(e) => handleUpdateWeight(cat.id, e.target.value)}
                    className="w-full pl-2.5 pr-7 py-2 text-sm font-bold text-right bg-white dark:bg-[#282a2c] border border-slate-200 dark:border-[#3c4043] rounded-lg text-slate-900 dark:text-[#e8eaed] focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 min-h-[38px]"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 dark:text-[#9aa0a6] pointer-events-none">
                    %
                  </span>
                </div>

                {/* Delete button */}
                <button
                  type="button"
                  onClick={() => handleDeleteCategory(cat.id)}
                  title="Remove category"
                  className="p-2 text-slate-400 dark:text-[#9aa0a6] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg cursor-pointer google-btn-press"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Add Category Button */}
          <button
            type="button"
            onClick={handleAddCategory}
            className="w-full py-2.5 text-xs font-semibold text-blue-600 dark:text-[#8ab4f8] bg-blue-50/80 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[40px] google-btn-press"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add New Category</span>
          </button>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 dark:border-[#3c4043] flex flex-col-reverse sm:flex-row items-center justify-between gap-3 flex-shrink-0">
          <span className="text-xs text-slate-400 dark:text-[#9aa0a6]">
            Changes only apply once weights total 100%.
          </span>
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-[#c4c7c5] bg-slate-100 dark:bg-[#303134] hover:bg-slate-200 dark:hover:bg-[#3c4043] rounded-xl transition-colors cursor-pointer min-h-[44px] google-btn-press"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!isValid}
              onClick={handleSave}
              className="flex-1 sm:flex-initial px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-all shadow-sm shadow-blue-500/20 cursor-pointer min-h-[44px] google-btn-press"
            >
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
