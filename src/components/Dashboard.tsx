import React from 'react';
import {
  Plus,
  BookOpen,
  FileText,
  Sliders,
  ChevronRight,
  GraduationCap,
} from 'lucide-react';
import type { ClassItem } from '../types/grade';
import {
  calculateClassAverage,
  calculateOverallAverage,
  calculateCumulativeGPA,
  validateCategoryWeights,
  roundTo,
} from '../utils/gradeCalculations';

interface DashboardProps {
  classes: ClassItem[];
  onSelectClass: (classId: string) => void;
  onOpenAddClass: () => void;
  onOpenFirebaseConfig?: () => void;
  onOpenAiAdvisor?: (prompt?: string) => void;
  viewMode?: 'grid' | 'list';
}

export const Dashboard: React.FC<DashboardProps> = ({
  classes,
  onSelectClass,
  onOpenAddClass,
  onOpenFirebaseConfig: _onOpenFirebaseConfig,
  onOpenAiAdvisor: _onOpenAiAdvisor,
  viewMode = 'grid',
}) => {
  // Overall calculations across all classes
  const overallCalc = calculateOverallAverage(classes);
  const gpaInfo = calculateCumulativeGPA(classes);

  // Total graded items across all classes
  const totalGradedItems = classes.reduce((sum, c) => {
    return (
      sum +
      c.categories.reduce((catSum, cat) => {
        return (
          catSum +
          cat.assessments.filter((a) => a.score !== null && a.score !== undefined && !isNaN(a.score)).length
        );
      }, 0)
    );
  }, 0);

  return (
    <div className="space-y-8 animate-fade-scale select-none">
      {/* 1. Hero Banner & Stat Cards Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-5 w-full">
        {/* Large Blue Hero Card (2 cols on xl) */}
        <div className="xl:col-span-2 min-w-0 bg-gradient-to-r from-[#2052DE] via-[#2563EB] to-[#1D4ED8] dark:from-[#1e3a8a] dark:via-[#2563eb] dark:to-[#1e40af] text-white rounded-3xl p-5 sm:p-7 lg:p-8 relative overflow-hidden flex flex-col justify-between shadow-xs min-h-[200px] sm:min-h-[220px] google-card">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-start justify-between gap-4 sm:gap-6 relative z-10">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-blue-200">
                Overall Average
              </span>

              <div className="mt-2 flex items-baseline flex-wrap">
                <span className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight">
                  {classes.length > 0 ? overallCalc.overallAverage.toFixed(1) : '--'}
                </span>
                {classes.length > 0 && (
                  <span className="text-2xl sm:text-3xl lg:text-4xl font-bold text-blue-200 ml-0.5">%</span>
                )}
              </div>

              <p className="text-xs text-blue-100/90 font-medium mt-1.5 line-clamp-2">
                {classes.length > 0
                  ? `Across ${classes.length} ${classes.length === 1 ? 'class' : 'classes'}, equally weighted`
                  : 'Add your classes to begin calculating your overall weighted GPA'}
              </p>
            </div>

            {/* Circular icon graphic */}
            <div className="w-14 h-14 sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-full border-2 sm:border-3 border-white/20 flex items-center justify-center bg-white/10 flex-shrink-0 shadow-inner">
              <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-white stroke-[2]" />
            </div>
          </div>

          {/* Bottom pill */}
          <div className="relative z-10 mt-5">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/20 backdrop-blur-xs text-white text-xs font-bold border border-white/25 select-none shadow-2xs">
                <GraduationCap className="w-3.5 h-3.5 text-white" />
                <span>GPA: {classes.length > 0 ? `${gpaInfo.gpa.toFixed(2)} / ${gpaInfo.maxGpa.toFixed(1)}` : '--'}</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-xs text-white text-xs font-medium border border-white/10 select-none">
                <span>Letter: {classes.length > 0 ? overallCalc.letterGrade : '--'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Stacked Stat Cards (1 col on xl, 2 cols on sm/md/lg) */}
        <div className="xl:col-span-1 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-4 min-w-0">
          {/* Stat Card 1: Classes */}
          <div className="bg-white dark:bg-[#18191b] rounded-2xl border border-slate-200/80 dark:border-[#26282a] p-5 shadow-2xs flex items-center justify-between flex-1 google-card transition-colors">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-[#8ab4f8]/15 text-blue-600 dark:text-[#8ab4f8] flex items-center justify-center flex-shrink-0 border border-blue-100 dark:border-[#8ab4f8]/30">
                <BookOpen className="w-5 h-5 stroke-[2]" />
              </div>
              <div>
                <div className="text-2xl font-extrabold text-slate-900 dark:text-[#e8eaed] tracking-tight leading-none">
                  {classes.length}
                </div>
                <div className="text-xs text-slate-500 dark:text-[#9aa0a6] font-medium mt-1">Enrolled Classes</div>
              </div>
            </div>
            <span className="text-[11px] text-slate-400 dark:text-[#80868b] font-medium">On your radar</span>
          </div>

          {/* Stat Card 2: Graded Items */}
          <div className="bg-white dark:bg-[#18191b] rounded-2xl border border-slate-200/80 dark:border-[#26282a] p-5 shadow-2xs flex items-center justify-between flex-1 google-card transition-colors">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-[#8ab4f8]/15 text-blue-600 dark:text-[#8ab4f8] flex items-center justify-center flex-shrink-0 border border-blue-100 dark:border-[#8ab4f8]/30">
                <FileText className="w-5 h-5 stroke-[2]" />
              </div>
              <div>
                <div className="text-2xl font-extrabold text-slate-900 dark:text-[#e8eaed] tracking-tight leading-none">
                  {totalGradedItems}
                </div>
                <div className="text-xs text-slate-500 dark:text-[#9aa0a6] font-medium mt-1">Graded items</div>
              </div>
            </div>
            <span className="text-[11px] text-slate-400 dark:text-[#80868b] font-medium">Every score counts</span>
          </div>
        </div>
      </div>

      {/* 2. Your Classes Section */}
      <div className="space-y-4">
        {/* Section Header with Add Class Button (Find a class search bar removed) */}
        {classes.length > 0 && (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-[#e8eaed] tracking-tight">Your classes</h2>
              <span className="px-2 py-0.5 text-xs font-bold bg-slate-100 dark:bg-[#26282a] text-slate-600 dark:text-[#c4c7c5] rounded-lg">
                {classes.length}
              </span>
            </div>

            <button
              type="button"
              onClick={onOpenAddClass}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer google-btn-press"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add class</span>
            </button>
          </div>
        )}

        {/* Classes Content */}
        {classes.length === 0 ? (
          /* Clean Empty State without mock clutter */
          <div className="bg-white dark:bg-[#18191b] rounded-3xl border border-slate-200/80 dark:border-[#26282a] p-8 sm:p-12 text-center shadow-2xs transition-colors">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-50 dark:bg-[#8ab4f8]/15 text-blue-600 dark:text-[#8ab4f8] flex items-center justify-center mb-4">
              <BookOpen className="w-8 h-8 stroke-[2]" />
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-[#e8eaed] tracking-tight">
              Your Gradebook is Clean & Ready
            </h3>
            <p className="text-sm text-slate-500 dark:text-[#c4c7c5] mt-2 max-w-md mx-auto leading-relaxed">
              You start with zero classes. Add your current courses to set up custom category weights, track assignments, and calculate exactly what you need on finals.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={onOpenAddClass}
                className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer google-btn-press"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Add Your First Class</span>
              </button>
            </div>

            {/* Quick 3-Step Guide */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-10 pt-8 border-t border-slate-100 dark:border-[#26282a] text-left">
              <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-[#202123] border border-slate-100 dark:border-[#26282a]">
                <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-[#8ab4f8]/20 text-blue-700 dark:text-[#8ab4f8] font-bold text-xs flex items-center justify-center mb-2">
                  1
                </div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-[#e8eaed]">Add Courses</h4>
                <p className="text-[11px] text-slate-500 dark:text-[#9aa0a6] mt-1">Name your classes and choose custom theme colors.</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-[#202123] border border-slate-100 dark:border-[#26282a]">
                <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-[#8ab4f8]/20 text-blue-700 dark:text-[#8ab4f8] font-bold text-xs flex items-center justify-center mb-2">
                  2
                </div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-[#e8eaed]">Set Category Weights</h4>
                <p className="text-[11px] text-slate-500 dark:text-[#9aa0a6] mt-1">Configure Homework, Exams, Quizzes to total 100%.</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-[#202123] border border-slate-100 dark:border-[#26282a]">
                <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-[#8ab4f8]/20 text-blue-700 dark:text-[#8ab4f8] font-bold text-xs flex items-center justify-center mb-2">
                  3
                </div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-[#e8eaed]">Track & Predict</h4>
                <p className="text-[11px] text-slate-500 dark:text-[#9aa0a6] mt-1">Log points or percentages and calculate your target score.</p>
              </div>
            </div>
          </div>
        ) : viewMode === 'list' ? (
          /* Class List Layout (Table Rows) */
          <div className="bg-white dark:bg-[#18191b] rounded-2xl border border-slate-200/80 dark:border-[#26282a] overflow-hidden shadow-2xs divide-y divide-slate-100 dark:divide-[#26282a]">
            {classes.map((item) => {
              const classCalc = calculateClassAverage(item);
              const weightCheck = validateCategoryWeights(item.categories);
              const gradedCount = item.categories.reduce(
                (sum, cat) =>
                  sum + cat.assessments.filter((a) => a.score !== null && a.score !== undefined && !isNaN(a.score)).length,
                0
              );
              const accentColor = item.color || '#2563EB';
              const targetDiff = item.targetGrade !== undefined ? roundTo(classCalc.average - item.targetGrade, 1) : null;

              return (
                <div
                  key={item.id}
                  onClick={() => onSelectClass(item.id)}
                  className="px-4 py-3.5 sm:px-5 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-[#202123] cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span
                      className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full flex-shrink-0 shadow-2xs group-hover:scale-110 transition-transform"
                      style={{ backgroundColor: accentColor }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-[#e8eaed] truncate group-hover:text-blue-600 dark:group-hover:text-[#8ab4f8]">
                          {item.name}
                        </h3>
                        {item.code && (
                          <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#26282a] text-slate-600 dark:text-[#9aa0a6] font-medium">
                            {item.code}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-[#9aa0a6] mt-0.5">
                        <span>
                          {item.categories.length} {item.categories.length === 1 ? 'category' : 'categories'}
                        </span>
                        <span>•</span>
                        <span>{gradedCount} graded</span>
                        <span>•</span>
                        <span>{item.credits ?? 3.0} credits</span>
                        {item.targetGrade !== undefined && (
                          <>
                            <span>•</span>
                            <span>Target: {item.targetGrade}%</span>
                          </>
                        )}
                        {!weightCheck.isValid && (
                          <>
                            <span>•</span>
                            <span className="text-amber-600 dark:text-amber-400 font-semibold">
                              Weights {weightCheck.totalWeight}%
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0 pl-7 sm:pl-0">
                    {targetDiff !== null && (
                      <span
                        className={`text-xs font-semibold ${
                          targetDiff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {targetDiff >= 0 ? `+${targetDiff}% vs target` : `${targetDiff}% vs target`}
                      </span>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-[#e8eaed]">
                        {classCalc.average.toFixed(1)}%
                      </span>
                      <span className="text-xs font-extrabold px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-[#8ab4f8]">
                        {classCalc.letterGrade}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-[#8ab4f8] group-hover:translate-x-0.5 transition-all ml-1" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Class Cards Dynamic Auto-Fit Grid (Adapts to available container width without clipping) */
          <div
            className="w-full gap-4 sm:gap-5"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
            }}
          >
            {classes.map((item) => {
              const classCalc = calculateClassAverage(item);
              const gradedCount = item.categories.reduce(
                (sum, cat) =>
                  sum + cat.assessments.filter((a) => a.score !== null && a.score !== undefined && !isNaN(a.score)).length,
                0
              );

              const accentColor = item.color || '#2563EB';

              return (
                <div
                  key={item.id}
                  onClick={() => onSelectClass(item.id)}
                  className="group bg-white dark:bg-[#18191b] rounded-2xl p-5 border border-slate-200/80 dark:border-[#26282a] shadow-2xs hover:border-blue-300 dark:hover:border-[#8ab4f8] cursor-pointer flex flex-col justify-between google-card min-w-0"
                >
                  <div>
                    {/* Top row: Icon and settings/sliders */}
                    <div className="flex items-center justify-between">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105"
                        style={{
                          backgroundColor: `${accentColor}18`,
                          color: accentColor,
                        }}
                      >
                        <BookOpen className="w-5 h-5 stroke-[2]" />
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectClass(item.id);
                        }}
                        title="Configure Class"
                        className="p-1.5 text-slate-400 dark:text-[#80868b] hover:text-slate-700 dark:hover:text-[#e8eaed] hover:bg-slate-100 dark:hover:bg-[#26282a] rounded-lg transition-colors cursor-pointer"
                      >
                        <Sliders className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Class Name & Subtitle */}
                    <h3 className="font-bold text-base text-slate-900 dark:text-[#e8eaed] group-hover:text-blue-600 dark:group-hover:text-[#8ab4f8] transition-colors mt-3 line-clamp-1">
                      {item.name}
                    </h3>
                    <p className="text-xs text-slate-400 dark:text-[#9aa0a6] mt-0.5">
                      {item.categories.length} {item.categories.length === 1 ? 'category' : 'categories'} • {gradedCount} graded {gradedCount === 1 ? 'item' : 'items'}
                    </p>

                    {/* Grade Score and Class Average label */}
                    <div className="mt-4 flex items-baseline justify-between">
                      <div className="text-3xl font-extrabold text-slate-900 dark:text-[#e8eaed] tracking-tight">
                        {classCalc.average.toFixed(1)}
                        <span className="text-xl font-bold text-slate-700 dark:text-[#9aa0a6] ml-0.5">%</span>
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-[#80868b] font-medium text-right leading-tight">
                        Class<br />average
                      </div>
                    </div>

                    {/* Multi-segment Category Progress Bar */}
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-[#26282a] rounded-full flex gap-1 overflow-hidden mt-3">
                      {item.categories.map((cat, idx) => {
                        const totalCatWeights = classCalc.totalWeight > 0 ? classCalc.totalWeight : 100;
                        const share = (cat.weight / totalCatWeights) * 100;
                        return (
                          <div
                            key={cat.id || idx}
                            title={`${cat.name} (${cat.weight}%)`}
                            style={{
                              width: `${Math.max(4, share)}%`,
                              backgroundColor: accentColor,
                              opacity: 0.85 - idx * 0.12,
                            }}
                            className="h-full rounded-full transition-all duration-500"
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Bottom Row */}
                  <div className="mt-5 pt-3 border-t border-slate-100 dark:border-[#26282a] flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 dark:text-[#80868b] font-medium">
                      {classCalc.isWeightValid ? (
                        'Weights total 100%'
                      ) : (
                        <span className="text-rose-600 dark:text-[#f28b82] font-bold">
                          Weights: {classCalc.totalWeight.toFixed(0)}%
                        </span>
                      )}
                    </span>
                    <span className="font-semibold text-blue-600 dark:text-[#8ab4f8] group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                      Open <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
