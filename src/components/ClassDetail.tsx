import React, { useState } from 'react';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Sparkles,
  Info,
  Sliders,
  AlertTriangle,
} from 'lucide-react';
import type { ClassItem, Category, Assessment } from '../types/grade';
import {
  calculateClassAverage,
  calculateCategoryAverage,
  equalizeCategoryWeights,
  getLetterGrade,
  roundTo,
} from '../utils/gradeCalculations';
import { DEFAULT_CATEGORY_SUGGESTIONS } from '../utils/sampleData';
import { ConfirmModal } from './ConfirmModal';
import { ManageWeightsModal } from './ManageWeightsModal';

interface ClassDetailProps {
  classItem: ClassItem;
  onBack: () => void;
  onUpdateClass: (updated: ClassItem) => void;
  onDeleteClass?: (id: string) => void;
  onOpenAiAdvisor?: (prompt?: string) => void;
}

export const ClassDetail: React.FC<ClassDetailProps> = ({
  classItem,
  onBack,
  onUpdateClass,
  onDeleteClass,
  onOpenAiAdvisor,
}) => {
  // Inline editing for Class Name
  const [isEditingClassName, setIsEditingClassName] = useState(false);
  const [classNameInput, setClassNameInput] = useState(classItem.name);
  const [isConfirmDeleteClassOpen, setIsConfirmDeleteClassOpen] = useState(false);

  // Keep classNameInput strictly in sync when viewing/switching classes to prevent accidental renaming
  React.useEffect(() => {
    setClassNameInput(classItem.name);
    setIsEditingClassName(false);
  }, [classItem.id, classItem.name]);

  // New category custom input
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [showAddCategoryInput, setShowAddCategoryInput] = useState(false);

  // Manage Weights modal state
  const [isManageWeightsOpen, setIsManageWeightsOpen] = useState(false);

  // Confirm delete category modal state
  const [categoryToDelete, setCategoryToDelete] = useState<{ id: string; name: string } | null>(null);

  // Calculations
  const classCalc = calculateClassAverage(classItem);
  const letterGradeInfo = getLetterGrade(classCalc.average);

  // Save class name
  const handleSaveClassName = () => {
    if (classNameInput.trim()) {
      onUpdateClass({ ...classItem, name: classNameInput.trim() });
    }
    setIsEditingClassName(false);
  };

  // Add category without modifying existing category weights
  const handleAddCategory = (categoryName: string) => {
    const trimmed = categoryName.trim();
    if (!trimmed) return;

    const currentTotal = classItem.categories.reduce((acc, c) => acc + (Number(c.weight) || 0), 0);
    const remaining = Math.max(0, roundTo(100 - currentTotal, 2));

    const newCategory: Category = {
      id: 'cat_' + Math.random().toString(36).substring(2, 9),
      name: trimmed,
      weight: remaining,
      assessments: [],
    };

    onUpdateClass({
      ...classItem,
      categories: [...classItem.categories, newCategory],
    });
    setCustomCategoryName('');
    setShowAddCategoryInput(false);
  };

  // Update a single category's weight directly (strictly NO auto-rebalance)
  const handleWeightChange = (categoryId: string, rawValue: string) => {
    const parsed = rawValue === '' ? 0 : parseFloat(rawValue);
    if (isNaN(parsed)) return;

    const updatedCategories = classItem.categories.map((c) =>
      c.id === categoryId ? { ...c, weight: Math.max(0, parsed) } : c
    );
    onUpdateClass({ ...classItem, categories: updatedCategories });
  };

  // Equalize weights evenly across categories (only on explicit user request)
  const handleEqualizeWeights = () => {
    const updated = equalizeCategoryWeights(classItem.categories);
    onUpdateClass({ ...classItem, categories: updated });
  };

  // Delete category (does not auto-rebalance remaining weights)
  const confirmDeleteCategory = () => {
    if (!categoryToDelete) return;
    const updatedCategories = classItem.categories.filter((c) => c.id !== categoryToDelete.id);
    onUpdateClass({ ...classItem, categories: updatedCategories });
    setCategoryToDelete(null);
  };

  // Rename category
  const handleRenameCategory = (categoryId: string, newName: string) => {
    const updated = classItem.categories.map((c) =>
      c.id === categoryId ? { ...c, name: newName.trim() || c.name } : c
    );
    onUpdateClass({ ...classItem, categories: updated });
  };

  // Reorder categories
  const handleMoveCategory = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= classItem.categories.length) return;

    const list = [...classItem.categories];
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;
    onUpdateClass({ ...classItem, categories: list });
  };

  // Add assessment to category
  const handleAddAssessment = (categoryId: string) => {
    const category = classItem.categories.find((c) => c.id === categoryId);
    if (!category) return;

    const newIndex = category.assessments.length + 1;
    const newAssessment: Assessment = {
      id: 'ass_' + Math.random().toString(36).substring(2, 9),
      name: `${category.name.replace(/s$/, '')} #${newIndex}`,
      score: null, // Starts blank / ungraded -> won't count as zero!
      mode: 'percentage',
    };

    const updated = classItem.categories.map((c) =>
      c.id === categoryId ? { ...c, assessments: [...c.assessments, newAssessment] } : c
    );
    onUpdateClass({ ...classItem, categories: updated });
  };

  // Update assessment score / name / mode
  const handleUpdateAssessment = (
    categoryId: string,
    assessmentId: string,
    updates: Partial<Assessment>
  ) => {
    const updated = classItem.categories.map((c) => {
      if (c.id !== categoryId) return c;
      const newAssessments = c.assessments.map((a) => {
        if (a.id !== assessmentId) return a;
        return { ...a, ...updates };
      });
      return { ...c, assessments: newAssessments };
    });
    onUpdateClass({ ...classItem, categories: updated });
  };

  // Delete assessment
  const handleDeleteAssessment = (categoryId: string, assessmentId: string) => {
    const updated = classItem.categories.map((c) => {
      if (c.id !== categoryId) return c;
      return {
        ...c,
        assessments: c.assessments.filter((a) => a.id !== assessmentId),
      };
    });
    onUpdateClass({ ...classItem, categories: updated });
  };

  // Reset assessment grade (set score back to null without removing assessment)
  const handleResetAssessmentScore = (categoryId: string, assessmentId: string) => {
    handleUpdateAssessment(categoryId, assessmentId, {
      score: null,
      earnedScore: undefined,
      maxScore: undefined,
    });
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-scale select-none">
      {/* Back button and Navigation bar */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-slate-600 dark:text-[#c4c7c5] hover:text-slate-900 dark:hover:text-white bg-white dark:bg-[#18191b] hover:bg-slate-100 dark:hover:bg-[#26282a] border border-slate-200/80 dark:border-[#26282a] rounded-xl transition-all cursor-pointer shadow-2xs min-h-[44px] google-btn-press"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>All Classes</span>
        </button>

        <span className="text-xs text-slate-400 dark:text-[#80868b] font-medium">
          Auto-saves in real-time
        </span>
      </div>

      {/* Class Overview Hero Card */}
      <section className="bg-white dark:bg-[#18191b] rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200/80 dark:border-[#26282a] relative overflow-hidden transition-colors">
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex-1">
            {/* Editable Class Name */}
            <div className="flex items-center gap-3">
              {isEditingClassName ? (
                <div className="flex items-center gap-2 w-full max-w-md">
                  <input
                    type="text"
                    value={classNameInput}
                    onChange={(e) => setClassNameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveClassName();
                      if (e.key === 'Escape') setIsEditingClassName(false);
                    }}
                    autoFocus
                    className="w-full px-3.5 py-2 text-2xl font-bold bg-slate-50 dark:bg-[#242526] border border-blue-500 dark:border-[#8ab4f8] rounded-xl text-slate-900 dark:text-[#e8eaed] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleSaveClassName}
                    className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-[#26282a] rounded-xl cursor-pointer"
                  >
                    <Check className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingClassName(false)}
                    className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-[#26282a] rounded-xl cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 group">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-[#e8eaed] tracking-tight">
                    {classItem.name}
                  </h1>
                  <button
                    type="button"
                    onClick={() => {
                      setClassNameInput(classItem.name);
                      setIsEditingClassName(true);
                    }}
                    title="Rename Class"
                    className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-[#8ab4f8] hover:bg-blue-50 dark:hover:bg-[#26282a] rounded-lg transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-500 dark:text-[#c4c7c5] mt-1 font-medium">
              Current Overall Course Grade
            </p>

            <div className="mt-3 flex items-baseline gap-4 flex-wrap">
              <div className="text-5xl sm:text-6xl font-extrabold text-slate-900 dark:text-[#e8eaed] tracking-tight">
                {classCalc.average.toFixed(2)}
                <span className="text-3xl sm:text-4xl text-blue-600 dark:text-[#8ab4f8] font-semibold">%</span>
              </div>
              <div className={`px-3 py-1 text-sm font-bold rounded-xl border ${letterGradeInfo.badgeBg} dark:bg-[#26282a] dark:text-[#e8eaed] dark:border-[#444746]`}>
                Grade: {letterGradeInfo.letter}
              </div>
              {classCalc.isDefault100 && (
                <span className="text-xs px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-[#8ab4f8]/15 text-blue-700 dark:text-[#8ab4f8] font-medium border border-blue-200/60 dark:border-[#8ab4f8]/30">
                  Default 100% (No graded tasks yet)
                </span>
              )}
            </div>
          </div>


          <div className="flex items-center gap-2 flex-wrap">
            {/* Ask Gemini Button */}
            <button
              type="button"
              onClick={() =>
                onOpenAiAdvisor?.(
                  `Give me an academic strategy for ${classItem.name}. My current grade is ${classCalc.average.toFixed(1)}% (${letterGradeInfo.letter}). Calculate what score I need on my upcoming assessments to hit my target of ${classItem.targetGrade || 90}%, and tell me which assignments have the highest leverage.`
                )
              }
              title="Ask Gemini about this course"
              className="px-3.5 sm:px-4 py-2.5 text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer min-h-[44px] google-btn-press"
            >
              <Sparkles className="w-4 h-4 text-white stroke-[2.2]" />
              <span>Ask Gemini</span>
            </button>

            <button
              type="button"
              onClick={() => setIsManageWeightsOpen(true)}
              title="Configure categories and weights"
              className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 dark:text-[#c4c7c5] bg-slate-100 hover:bg-slate-200 dark:bg-[#26282a] dark:hover:bg-[#444746] rounded-xl transition-all flex items-center gap-2 cursor-pointer min-h-[44px] google-btn-press"
            >
              <Sliders className="w-4 h-4 text-slate-500 dark:text-[#80868b]" />
              <span>Configure Weights</span>
            </button>

            {onDeleteClass && (
              <button
                type="button"
                onClick={() => setIsConfirmDeleteClassOpen(true)}
                title="Delete this class"
                className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-all cursor-pointer min-h-[44px] google-btn-press"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Visual Weighted Progress & Contribution Breakdown */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-[#26282a] space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-[#c4c7c5] font-medium">
            <span>Class Grade Meter</span>
            <span>{classCalc.average.toFixed(2)}%</span>
          </div>

          <div className="w-full h-3 bg-slate-100 dark:bg-[#26282a] rounded-full overflow-hidden flex">
            {classItem.categories.map((cat, idx) => {
              const calc = classCalc.categoryCalculations[cat.id];
              const contribution = calc ? calc.contribution : 0;
              const blueShades = [
                'bg-blue-600 dark:bg-[#8ab4f8]',
                'bg-blue-500 dark:bg-[#78a9f7]',
                'bg-sky-500 dark:bg-[#6ba2f5]',
                'bg-indigo-500 dark:bg-[#c58af9]',
                'bg-cyan-600 dark:bg-[#81c995]',
                'bg-blue-400 dark:bg-[#5b95f2]',
              ];
              const colorClass = blueShades[idx % blueShades.length];

              return (
                <div
                  key={cat.id}
                  title={`${cat.name}: contributes ${contribution.toFixed(2)}% (Weight: ${cat.weight}%, Avg: ${calc?.average.toFixed(2)}%)`}
                  className={`h-full ${colorClass} transition-all duration-300 relative border-r border-white/30 dark:border-black/30 last:border-r-0`}
                  style={{ width: `${Math.min(100, Math.max(0, contribution))}%` }}
                />
              );
            })}
          </div>

          {/* Contribution legend chips */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-500 dark:text-[#9aa0a6]">
            <span className="font-semibold text-slate-600 dark:text-[#c4c7c5]">Breakdown:</span>
            {classItem.categories.map((cat, idx) => {
              const calc = classCalc.categoryCalculations[cat.id];
              const contribution = calc ? calc.contribution : 0;
              const blueShades = [
                'bg-blue-600 dark:bg-[#8ab4f8]',
                'bg-blue-500 dark:bg-[#78a9f7]',
                'bg-sky-500 dark:bg-[#6ba2f5]',
                'bg-indigo-500 dark:bg-[#c58af9]',
                'bg-cyan-600 dark:bg-[#81c995]',
                'bg-blue-400 dark:bg-[#5b95f2]',
              ];
              const dotColor = blueShades[idx % blueShades.length];

              return (
                <div
                  key={cat.id}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-50 dark:bg-[#26282a] border border-slate-200/60 dark:border-[#444746]"
                >
                  <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                  <span className="font-medium text-slate-800 dark:text-[#e8eaed]">{cat.name}:</span>
                  <span className="text-slate-500 dark:text-[#9aa0a6]">+{contribution.toFixed(2)}%</span>
                  {calc?.isDefault100 && (
                    <span className="text-[9px] text-blue-600 dark:text-[#8ab4f8] font-semibold">(100%)</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* STRICT WEIGHT VALIDATION ERROR BANNER */}
      {!classCalc.isWeightValid && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-900 dark:text-rose-200 animate-slide-up">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 rounded-xl flex-shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-rose-900 dark:text-rose-100">
                Category Weights Must Total Exactly 100%
              </h3>
              <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
                {classCalc.weightError || 'The sum of all category weights must equal 100% for accurate grade calculations.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsManageWeightsOpen(true)}
            className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all cursor-pointer shadow-sm shadow-rose-200 dark:shadow-none flex-shrink-0 google-btn-press"
          >
            Adjust Weights
          </button>
        </div>
      )}

      {/* Add Grading Category Section */}
      <div className="bg-blue-50/60 dark:bg-[#18191b] rounded-2xl p-4 sm:p-5 border border-blue-200/60 dark:border-[#26282a] transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900 dark:text-[#8ab4f8] uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-[#8ab4f8]" />
              Add Grading Category
            </div>
            <p className="text-xs text-blue-700/80 dark:text-[#c4c7c5] mt-0.5">
              Customize categories for this course (weights must total 100%).
            </p>
          </div>


          {!showAddCategoryInput ? (
            <button
              type="button"
              onClick={() => setShowAddCategoryInput(true)}
              className="px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-sm shadow-blue-500/20 flex items-center justify-center gap-1.5 cursor-pointer min-h-[40px]"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Custom Category</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customCategoryName}
                onChange={(e) => setCustomCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddCategory(customCategoryName);
                  if (e.key === 'Escape') setShowAddCategoryInput(false);
                }}
                placeholder="Category Name..."
                autoFocus
                className="px-3 py-1.5 text-xs bg-white border border-blue-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[38px]"
              />
              <button
                type="button"
                onClick={() => handleAddCategory(customCategoryName)}
                className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 cursor-pointer min-h-[38px]"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setShowAddCategoryInput(false)}
                className="p-2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Suggestion Chips */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {DEFAULT_CATEGORY_SUGGESTIONS.map((suggestion) => {
            const alreadyExists = classItem.categories.some(
              (c) => c.name.toLowerCase() === suggestion.toLowerCase()
            );
            return (
              <button
                key={suggestion}
                type="button"
                disabled={alreadyExists}
                onClick={() => handleAddCategory(suggestion)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer flex items-center gap-1 min-h-[32px] ${
                  alreadyExists
                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                    : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-600 hover:text-white hover:border-blue-600 shadow-2xs'
                }`}
              >
                <Plus className="w-3 h-3 stroke-[2.5]" />
                {suggestion}
              </button>
            );
          })}
        </div>
      </div>

      {/* Weighted Grading Categories List */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-[#e8eaed] tracking-tight">
            Grading Categories ({classItem.categories.length})
          </h2>
          <span className="text-xs text-slate-500 dark:text-[#80868b] font-medium">
            Category weights must sum to 100%
          </span>
        </div>

        {classItem.categories.length === 0 ? (
          <div className="bg-white dark:bg-[#18191b] rounded-2xl p-8 text-center border border-slate-200/80 dark:border-[#26282a]">
            <p className="text-sm font-semibold text-slate-800 dark:text-[#e8eaed]">No grading categories defined.</p>
            <p className="text-xs text-slate-500 dark:text-[#9aa0a6] mt-1">
              Add categories like Tests, Quizzes, or Assignments above.
            </p>
          </div>
        ) : (
          classItem.categories.map((category, catIndex) => {
            const catCalc = classCalc.categoryCalculations[category.id] || calculateCategoryAverage(category);

            return (
              <CategoryCard
                key={category.id}
                category={category}
                catIndex={catIndex}
                totalCategories={classItem.categories.length}
                catCalc={catCalc}
                onWeightChange={(val) => handleWeightChange(category.id, val)}
                onRenameCategory={(newName) => handleRenameCategory(category.id, newName)}
                onDeleteCategory={() => setCategoryToDelete({ id: category.id, name: category.name })}
                onMoveCategory={(dir) => handleMoveCategory(catIndex, dir)}
                onAddAssessment={() => handleAddAssessment(category.id)}
                onUpdateAssessment={(assId, updates) =>
                  handleUpdateAssessment(category.id, assId, updates)
                }
                onDeleteAssessment={(assId) => handleDeleteAssessment(category.id, assId)}
                onResetAssessmentScore={(assId) => handleResetAssessmentScore(category.id, assId)}
              />
            );
          })
        )}
      </div>

      {/* Total Weight Status Bar at bottom */}
      <div className="bg-white dark:bg-[#18191b] rounded-2xl p-5 border border-slate-200/80 dark:border-[#26282a] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-slate-900 dark:text-[#e8eaed]">
              Total Category Weight:
            </span>
            <span
              className={`text-sm font-extrabold px-2 py-0.5 rounded-md border ${
                classCalc.isWeightValid
                  ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60'
                  : 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800/60'
              }`}
            >
              {roundTo(classCalc.totalWeight, 2).toFixed(1)}%
            </span>
            {classCalc.isWeightValid ? (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <Check className="w-3.5 h-3.5 stroke-[3]" /> Exactly 100%
              </span>
            ) : (
              <span className="text-xs text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {classCalc.totalWeight < 100
                  ? `Short by ${(100 - classCalc.totalWeight).toFixed(1)}%`
                  : `Over by ${(classCalc.totalWeight - 100).toFixed(1)}%`}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 dark:text-[#80868b] mt-1">
            {classCalc.isWeightValid
              ? 'All category weights total exactly 100%.'
              : 'Category weights must equal 100% before class averages are finalized.'}
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleEqualizeWeights}
            className="flex-1 sm:flex-initial px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-[#c4c7c5] bg-slate-100 hover:bg-slate-200 dark:bg-[#26282a] dark:hover:bg-[#444746] rounded-xl transition-colors cursor-pointer min-h-[40px] google-btn-press"
          >
            Equalize Weights
          </button>
          <button
            type="button"
            onClick={() => setIsManageWeightsOpen(true)}
            className="flex-1 sm:flex-initial px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors cursor-pointer min-h-[40px] google-btn-press"
          >
            Configure Weights
          </button>
        </div>
      </div>

      {/* Manage Weights Modal */}
      <ManageWeightsModal
        isOpen={isManageWeightsOpen}
        onClose={() => setIsManageWeightsOpen(false)}
        categories={classItem.categories}
        onSaveCategories={(updated) => {
          onUpdateClass({ ...classItem, categories: updated });
        }}
      />

      {/* Confirm Delete Category Modal */}
      <ConfirmModal
        isOpen={!!categoryToDelete}
        title={`Delete Category "${categoryToDelete?.name}"?`}
        message={`Are you sure you want to delete this category? All its assessments will be removed. Category weights will need to equal 100%.`}
        confirmLabel="Delete Category"
        onConfirm={confirmDeleteCategory}
        onCancel={() => setCategoryToDelete(null)}
      />

      {/* Confirm Delete Class Modal */}
      {onDeleteClass && (
        <ConfirmModal
          isOpen={isConfirmDeleteClassOpen}
          title={`Delete "${classItem.name}"?`}
          message={`Are you sure you want to permanently delete this class and all its grading categories? This action cannot be undone.`}
          confirmLabel="Delete Class"
          onConfirm={() => {
            onDeleteClass(classItem.id);
            setIsConfirmDeleteClassOpen(false);
          }}
          onCancel={() => setIsConfirmDeleteClassOpen(false)}
        />
      )}
    </div>
  );
};

// Subcomponent: Individual Category Card
interface CategoryCardProps {
  category: Category;
  catIndex: number;
  totalCategories: number;
  catCalc: ReturnType<typeof calculateCategoryAverage>;
  onWeightChange: (val: string) => void;
  onRenameCategory: (newName: string) => void;
  onDeleteCategory: () => void;
  onMoveCategory: (dir: 'up' | 'down') => void;
  onAddAssessment: () => void;
  onUpdateAssessment: (assId: string, updates: Partial<Assessment>) => void;
  onDeleteAssessment: (assId: string) => void;
  onResetAssessmentScore: (assId: string) => void;
}

const CategoryCard: React.FC<CategoryCardProps> = ({
  category,
  catIndex,
  totalCategories,
  catCalc,
  onWeightChange,
  onRenameCategory,
  onDeleteCategory,
  onMoveCategory,
  onAddAssessment,
  onUpdateAssessment,
  onDeleteAssessment,
  onResetAssessmentScore,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(category.name);

  const saveName = () => {
    if (nameInput.trim()) {
      onRenameCategory(nameInput.trim());
    }
    setIsEditingName(false);
  };

  return (
    <div className="bg-white dark:bg-[#18191b] rounded-2xl border border-slate-200/80 dark:border-[#26282a] shadow-xs overflow-hidden transition-all google-card">
      {/* Category Header */}
      <div className="p-4 sm:p-5 bg-slate-50/60 dark:bg-[#242526] border-b border-slate-100 dark:border-[#26282a] flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Name and Reorder */}
        <div className="flex items-center gap-2.5 flex-1">
          {/* Reorder Buttons */}
          <div className="flex flex-col gap-0.5 text-slate-400 dark:text-[#80868b]">
            <button
              type="button"
              disabled={catIndex === 0}
              onClick={() => onMoveCategory('up')}
              title="Move category up"
              className="p-1 hover:text-slate-800 dark:hover:text-[#e8eaed] disabled:opacity-20 cursor-pointer"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={catIndex === totalCategories - 1}
              onClick={() => onMoveCategory('down')}
              title="Move category down"
              className="p-1 hover:text-slate-800 dark:hover:text-[#e8eaed] disabled:opacity-20 cursor-pointer"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {isEditingName ? (
            <div className="flex items-center gap-1.5 flex-1 max-w-xs">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveName();
                  if (e.key === 'Escape') setIsEditingName(false);
                }}
                autoFocus
                className="w-full px-2.5 py-1 text-sm bg-white dark:bg-[#0f0f10] border border-blue-500 dark:border-[#8ab4f8] rounded-lg text-slate-900 dark:text-[#e8eaed] focus:outline-none"
              />
              <button
                type="button"
                onClick={saveName}
                className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-[#26282a] rounded-lg cursor-pointer"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsEditingName(false)}
                className="p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-[#26282a] rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-[#e8eaed]">
                {category.name}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setNameInput(category.name);
                  setIsEditingName(true);
                }}
                title="Rename category"
                className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-[#8ab4f8] rounded-md cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Empty / 100% Badge */}
          {catCalc.isDefault100 ? (
            <span
              title="Category has no graded assessments entered yet, so its calculated average automatically defaults to 100%."
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 dark:bg-[#8ab4f8]/15 text-blue-700 dark:text-[#8ab4f8] border border-blue-200/80 dark:border-[#8ab4f8]/30"
            >
              <Info className="w-3 h-3 text-blue-500 dark:text-[#8ab4f8]" />
              No grades yet (100%)
            </span>
          ) : (
            <span className="text-xs text-slate-500 dark:text-[#9aa0a6] font-medium">
              {catCalc.gradedCount} graded of {catCalc.totalCount}
            </span>
          )}
        </div>

        {/* Right side: Weight input, Average, and Delete */}
        <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap justify-between md:justify-end">
          {/* Weight percentage input */}
          <div className="flex items-center gap-2">
            <label htmlFor={`weight-input-${category.id}`} className="text-xs font-semibold text-slate-600 dark:text-[#c4c7c5]">
              Weight:
            </label>
            <div className="relative">
              <input
                id={`weight-input-${category.id}`}
                type="number"
                min="0"
                max="100"
                step="any"
                inputMode="decimal"
                value={category.weight}
                onChange={(e) => onWeightChange(e.target.value)}
                className="w-20 pl-2.5 pr-6 py-1.5 text-sm font-bold text-right bg-white dark:bg-[#0f0f10] border border-slate-200 dark:border-[#26282a] rounded-xl text-slate-900 dark:text-[#e8eaed] focus:outline-none focus:ring-2 focus:ring-blue-600 dark:focus:ring-[#8ab4f8] min-h-[38px]"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 dark:text-[#80868b] pointer-events-none">
                %
              </span>
            </div>
          </div>

          {/* Category calculated average */}
          <div className="text-right min-w-[90px]">
            <div className="text-xs text-slate-400 dark:text-[#80868b] font-medium">Average</div>
            <div className="text-lg font-extrabold text-slate-900 dark:text-[#e8eaed] tracking-tight">
              {catCalc.average.toFixed(2)}
              <span className="text-sm text-blue-600 dark:text-[#8ab4f8] font-semibold">%</span>
            </div>
          </div>

          {/* Delete Category Button */}
          <button
            type="button"
            onClick={onDeleteCategory}
            title="Delete Category"
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer min-h-[38px] google-btn-press"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Assessments list inside this category */}
      <div className="p-4 sm:p-5 space-y-3">
        {category.assessments.length === 0 ? (
          <div className="py-6 px-4 bg-slate-50/50 dark:bg-[#242526] rounded-xl text-center border border-dashed border-slate-200 dark:border-[#26282a]">
            <p className="text-xs font-medium text-slate-500 dark:text-[#9aa0a6]">
              No assessments in this category yet.
            </p>
            <p className="text-[11px] text-blue-600 dark:text-[#8ab4f8] mt-0.5">
              Category average is automatically 100% until grades are added.
            </p>
            <button
              type="button"
              onClick={onAddAssessment}
              className="mt-3 px-3.5 py-1.5 text-xs font-semibold text-blue-600 dark:text-[#8ab4f8] bg-blue-50 dark:bg-[#8ab4f8]/15 hover:bg-blue-100 dark:hover:bg-[#8ab4f8]/25 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 google-btn-press"
            >
              <Plus className="w-3.5 h-3.5" />
              Add First Assessment
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {category.assessments.map((assessment, assIndex) => (
              <AssessmentRow
                key={assessment.id}
                assessment={assessment}
                assIndex={assIndex}
                onUpdate={(updates) => onUpdateAssessment(assessment.id, updates)}
                onDelete={() => onDeleteAssessment(assessment.id)}
                onReset={() => onResetAssessmentScore(assessment.id)}
              />
            ))}
          </div>
        )}

        {/* Add Assessment Button */}
        {category.assessments.length > 0 && (
          <div className="pt-2 flex justify-start">
            <button
              type="button"
              onClick={onAddAssessment}
              className="px-3.5 py-2 text-xs font-semibold text-blue-600 dark:text-[#8ab4f8] hover:text-blue-700 bg-blue-50/80 dark:bg-[#8ab4f8]/15 hover:bg-blue-100 dark:hover:bg-[#8ab4f8]/25 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer min-h-[40px] google-btn-press"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Add Assessment to {category.name}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Subcomponent: Individual Assessment Row
interface AssessmentRowProps {
  assessment: Assessment;
  assIndex: number;
  onUpdate: (updates: Partial<Assessment>) => void;
  onDelete: () => void;
  onReset: () => void;
}

const AssessmentRow: React.FC<AssessmentRowProps> = ({
  assessment,
  assIndex,
  onUpdate,
  onDelete,
  onReset,
}) => {
  const isPointsMode = assessment.mode === 'points';

  // Points inputs handler
  const handlePointsEarnedChange = (valStr: string) => {
    const earned = valStr === '' ? undefined : parseFloat(valStr);
    const max = assessment.maxScore ?? 100;
    if (earned === undefined) {
      onUpdate({ earnedScore: undefined, score: null });
    } else {
      const calcPercentage = max > 0 ? roundTo((earned / max) * 100, 2) : 0;
      onUpdate({ earnedScore: earned, maxScore: max, score: calcPercentage });
    }
  };

  const handlePointsMaxChange = (valStr: string) => {
    const max = valStr === '' ? 100 : parseFloat(valStr);
    const earned = assessment.earnedScore;
    if (earned === undefined) {
      onUpdate({ maxScore: max });
    } else {
      const calcPercentage = max > 0 ? roundTo((earned / max) * 100, 2) : 0;
      onUpdate({ maxScore: max, score: calcPercentage });
    }
  };

  // Direct percentage input handler
  const handlePercentageChange = (valStr: string) => {
    if (valStr === '') {
      onUpdate({ score: null, earnedScore: undefined, maxScore: undefined });
    } else {
      const parsed = parseFloat(valStr);
      if (!isNaN(parsed)) {
        const clamped = Math.max(0, Math.min(100, parsed));
        onUpdate({ score: clamped });
      }
    }
  };

  const isGraded = assessment.score !== null && assessment.score !== undefined;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 sm:px-4 sm:py-3 bg-white dark:bg-[#242526] rounded-xl border border-slate-200/70 dark:border-[#26282a] hover:border-blue-300 dark:hover:border-blue-500/40 hover:shadow-2xs transition-all">
      {/* Title Input */}
      <div className="flex items-center gap-2 flex-1">
        <span className="text-xs font-semibold text-slate-300 dark:text-[#5f6368] w-5 text-right select-none">
          {assIndex + 1}.
        </span>
        <input
          type="text"
          value={assessment.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="Assessment title..."
          className="w-full text-sm font-semibold text-slate-900 dark:text-[#e8eaed] bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-[#5f6368] focus:border-blue-600 dark:focus:border-[#8ab4f8] focus:outline-none transition-colors py-1"
        />
      </div>

      {/* Grade input area */}
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap justify-between sm:justify-end pt-1 sm:pt-0">
        {/* Points vs Percentage toggle */}
        <button
          type="button"
          onClick={() =>
            onUpdate({
              mode: isPointsMode ? 'percentage' : 'points',
              maxScore: assessment.maxScore || 100,
            })
          }
          title="Toggle between Percentage and Points earned"
          className="px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-lg border border-slate-200 dark:border-[#26282a] text-slate-600 dark:text-[#c4c7c5] hover:text-blue-600 dark:hover:text-[#8ab4f8] hover:bg-blue-50 dark:hover:bg-[#202123] transition-colors cursor-pointer select-none min-h-[38px] min-w-[38px] flex items-center justify-center"
        >
          {isPointsMode ? 'Pts' : '%'}
        </button>

        {/* Input fields */}
        {isPointsMode ? (
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              placeholder="Pts"
              value={assessment.earnedScore !== undefined ? assessment.earnedScore : ''}
              onChange={(e) => handlePointsEarnedChange(e.target.value)}
              className="w-16 px-2 py-1.5 text-sm font-bold text-right text-slate-900 dark:text-[#e8eaed] bg-slate-50 dark:bg-[#0f0f10] border border-slate-200 dark:border-[#26282a] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 dark:focus:ring-[#8ab4f8] min-h-[38px]"
            />
            <span className="text-xs font-bold text-slate-400 dark:text-[#9aa0a6]">/</span>
            <input
              type="number"
              min="1"
              step="any"
              inputMode="decimal"
              placeholder="Total"
              value={assessment.maxScore !== undefined ? assessment.maxScore : 100}
              onChange={(e) => handlePointsMaxChange(e.target.value)}
              className="w-16 px-2 py-1.5 text-sm font-bold text-right text-slate-900 dark:text-[#e8eaed] bg-slate-50 dark:bg-[#0f0f10] border border-slate-200 dark:border-[#26282a] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 dark:focus:ring-[#8ab4f8] min-h-[38px]"
            />
          </div>
        ) : (
          <div className="relative">
            <input
              type="number"
              min="0"
              max="100"
              step="any"
              inputMode="decimal"
              placeholder="Grade"
              value={assessment.score !== null && assessment.score !== undefined ? assessment.score : ''}
              onChange={(e) => handlePercentageChange(e.target.value)}
              className="w-24 pl-2.5 pr-6 py-1.5 text-sm font-bold text-right text-slate-900 dark:text-[#e8eaed] bg-slate-50 dark:bg-[#0f0f10] border border-slate-200 dark:border-[#26282a] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 dark:focus:ring-[#8ab4f8] min-h-[38px]"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 dark:text-[#9aa0a6] pointer-events-none">
              %
            </span>
          </div>
        )}

        {/* Calculated percentage badge */}
        <div className="min-w-[65px] text-right">
          {isGraded ? (
            <span className="text-xs font-bold text-blue-700 dark:text-[#8ab4f8] bg-blue-50 dark:bg-blue-950/40 px-2 py-1 rounded-md border border-blue-200/60 dark:border-blue-800/40 inline-block">
              {assessment.score?.toFixed(1)}%
            </span>
          ) : (
            <span className="text-[11px] font-medium text-slate-400 dark:text-[#9aa0a6] italic">
              Ungraded
            </span>
          )}
        </div>

        {/* Reset score button (only if graded) */}
        {isGraded && (
          <button
            type="button"
            onClick={onReset}
            title="Reset grade to blank/ungraded"
            className="p-2 text-slate-400 dark:text-[#9aa0a6] hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-lg transition-colors cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Delete assessment */}
        <button
          type="button"
          onClick={onDelete}
          title="Delete assessment"
          className="p-2 text-slate-400 dark:text-[#9aa0a6] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
