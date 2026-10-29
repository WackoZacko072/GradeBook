import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  RotateCcw,
  GraduationCap,
  Check,
  AlertCircle,
} from 'lucide-react';
import { ModalPortal } from './ModalPortal';
import type { GradeScaleEntry } from '../types/grade';
import {
  getGradingScale,
  saveGradingScale,
  DEFAULT_GRADING_SCALE,
  getLetterBadgeStyle,
} from '../utils/gradeCalculations';

interface GradingScaleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GradingScaleModal: React.FC<GradingScaleModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [entries, setEntries] = useState<GradeScaleEntry[]>(() => getGradingScale());
  const [error, setError] = useState<string | null>(null);
  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEntries(getGradingScale());
      setError(null);
      setSavedToast(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleUpdateEntry = (
    id: string,
    field: 'letter' | 'minPercentage' | 'gpaPoints',
    value: string
  ) => {
    setError(null);
    setEntries((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        if (field === 'letter') {
          return { ...item, letter: value };
        }
        const parsed = value === '' ? 0 : parseFloat(value);
        if (field === 'minPercentage') {
          return { ...item, minPercentage: isNaN(parsed) ? 0 : Math.max(0, Math.min(100, parsed)) };
        }
        return { ...item, gpaPoints: isNaN(parsed) ? 0 : Math.max(0, parsed) };
      })
    );
  };

  const handleAddRow = () => {
    setError(null);
    setEntries((prev) => [
      ...prev,
      {
        id: 'scale_' + Math.random().toString(36).substring(2, 9),
        letter: '',
        minPercentage: 50,
        gpaPoints: 1.0,
      },
    ]);
  };

  const handleDeleteRow = (id: string) => {
    if (entries.length <= 1) return;
    setError(null);
    setEntries((prev) => prev.filter((item) => item.id !== id));
  };

  const handleReset = () => {
    setError(null);
    setEntries([...DEFAULT_GRADING_SCALE]);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = entries.filter((item) => item.letter.trim().length > 0);
    if (cleaned.length === 0) {
      setError('Please enter at least one letter grade.');
      return;
    }

    const saved = saveGradingScale(cleaned);
    setEntries(saved);
    setSavedToast(true);
    setTimeout(() => {
      setSavedToast(false);
      onClose();
    }, 350);
  };

  return (
    <ModalPortal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-2xl"
      aria-labelledby="grading-scale-title"
    >
      {/* Modal Header */}
      <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100 dark:border-white/10 bg-slate-50/70 dark:bg-[#252628] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-[#8ab4f8] rounded-2xl">
            <GraduationCap className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h2
              id="grading-scale-title"
              className="text-lg sm:text-xl font-bold text-slate-900 dark:text-[#e8eaed]"
              style={{ fontFamily: "'Google Sans', sans-serif" }}
            >
              Grading Scale & GPA
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-[#9aa0a6] mt-0.5">
              Customize letter grades, minimum percentages, and GPA points
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

      {/* Form Body */}
      <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Column Headers */}
          <div className="grid grid-cols-12 gap-2.5 px-2 text-[11px] font-bold text-slate-400 dark:text-[#9aa0a6] uppercase tracking-wider">
            <div className="col-span-4">Letter Grade</div>
            <div className="col-span-4">Minimum %</div>
            <div className="col-span-3">GPA Points</div>
            <div className="col-span-1 text-right" />
          </div>

          {/* Grade Rows */}
          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
            {entries.map((entry) => {
              const badgeStyle = getLetterBadgeStyle(entry.letter || 'A');
              return (
                <div
                  key={entry.id}
                  className="grid grid-cols-12 gap-2.5 items-center p-2.5 bg-slate-50 dark:bg-[#131314] border border-slate-200/80 dark:border-[#26282a] rounded-xl transition-colors"
                >
                  {/* Letter Input */}
                  <div className="col-span-4 flex items-center gap-2">
                    <span
                      className={`hidden sm:inline-flex items-center justify-center min-w-[32px] h-7 px-1.5 text-xs font-extrabold rounded-lg border ${badgeStyle.badgeBg} dark:bg-[#202123] dark:text-[#e8eaed] dark:border-[#3c4043]`}
                    >
                      {entry.letter.trim() || '—'}
                    </span>
                    <input
                      type="text"
                      value={entry.letter}
                      onChange={(e) => handleUpdateEntry(entry.id, 'letter', e.target.value)}
                      placeholder="e.g. A"
                      aria-label="Letter grade"
                      className="w-full px-3 py-1.5 text-xs sm:text-sm font-bold bg-white dark:bg-[#18191b] border border-slate-200 dark:border-[#26282a] rounded-lg text-slate-900 dark:text-[#e8eaed] focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 min-h-[38px]"
                    />
                  </div>

                  {/* Minimum Percentage Input */}
                  <div className="col-span-4 relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="any"
                      value={entry.minPercentage}
                      onChange={(e) => handleUpdateEntry(entry.id, 'minPercentage', e.target.value)}
                      aria-label={`Minimum percentage for ${entry.letter}`}
                      className="w-full pl-3 pr-7 py-1.5 text-xs sm:text-sm font-bold text-right bg-white dark:bg-[#18191b] border border-slate-200 dark:border-[#26282a] rounded-lg text-slate-900 dark:text-[#e8eaed] focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 min-h-[38px]"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 dark:text-[#9aa0a6] pointer-events-none">
                      %
                    </span>
                  </div>

                  {/* GPA Points Input */}
                  <div className="col-span-3 relative">
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.01"
                      value={entry.gpaPoints}
                      onChange={(e) => handleUpdateEntry(entry.id, 'gpaPoints', e.target.value)}
                      aria-label={`GPA points for ${entry.letter}`}
                      className="w-full px-3 py-1.5 text-xs sm:text-sm font-bold text-right bg-white dark:bg-[#18191b] border border-slate-200 dark:border-[#26282a] rounded-lg text-slate-900 dark:text-[#e8eaed] focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 min-h-[38px]"
                    />
                  </div>

                  {/* Delete Row Button */}
                  <div className="col-span-1 flex justify-end">
                    <button
                      type="button"
                      disabled={entries.length <= 1}
                      onClick={() => handleDeleteRow(entry.id)}
                      title="Remove grade row"
                      aria-label={`Remove ${entry.letter} row`}
                      className="p-1.5 text-slate-400 dark:text-[#9aa0a6] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer google-btn-press"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Grade Row Button */}
          <button
            type="button"
            onClick={handleAddRow}
            className="w-full py-2.5 text-xs font-semibold text-blue-600 dark:text-[#8ab4f8] bg-blue-50/80 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[40px] google-btn-press"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Grade</span>
          </button>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-white/10 bg-slate-50/70 dark:bg-[#252628] flex flex-col-reverse sm:flex-row items-center justify-between gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="w-full sm:w-auto px-3.5 py-2 text-xs font-semibold text-slate-500 dark:text-[#9aa0a6] hover:text-slate-800 dark:hover:text-[#e8eaed] hover:bg-slate-200/60 dark:hover:bg-[#28292a] rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer google-btn-press"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Default</span>
          </button>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-5 py-2.5 text-xs sm:text-sm font-semibold text-slate-600 dark:text-[#c4c7c5] hover:text-slate-800 dark:hover:text-[#e8eaed] hover:bg-slate-200/60 dark:hover:bg-[#28292a] rounded-xl transition-colors cursor-pointer google-btn-press"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 sm:flex-initial px-6 py-2.5 text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px] google-btn-press"
            >
              {savedToast ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Saved</span>
                </>
              ) : (
                <span>Save Scale</span>
              )}
            </button>
          </div>
        </div>
      </form>
    </ModalPortal>
  );
};
