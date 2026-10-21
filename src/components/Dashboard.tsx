import React, { useState } from 'react';
import {
  Search,
  Plus,
  BookOpen,
  FileText,
  Sliders,
  ChevronRight,
  Sparkles,
  HelpCircle,
  X,
  ShieldCheck,
  HeartHandshake,
} from 'lucide-react';
import type { ClassItem } from '../types/grade';
import { calculateClassAverage, calculateOverallAverage } from '../utils/gradeCalculations';

interface DashboardProps {
  classes: ClassItem[];
  onSelectClass: (classId: string) => void;
  onOpenAddClass: () => void;
  onLoadDemoData: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  classes,
  onSelectClass,
  onOpenAddClass,
  onLoadDemoData,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showCalculationInfo, setShowCalculationInfo] = useState(false);

  // Overall calculations across all classes
  const overallCalc = calculateOverallAverage(classes);

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

  // Filter classes by search
  const filteredClasses = classes.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* 1. Header Title & Top Add Class Button */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1 select-none">
            Your Personal Gradebook
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            A clearer view of your grades.
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            All your classes. One place to keep track.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenAddClass}
          className="self-start sm:self-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer min-h-[42px]"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add class</span>
        </button>
      </div>

      {/* 2. Hero Banner & Stat Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Large Blue Hero Card (2 cols) */}
        <div className="lg:col-span-2 bg-gradient-to-r from-[#2052DE] via-[#2563EB] to-[#1D4ED8] text-white rounded-3xl p-7 sm:p-8 relative overflow-hidden flex flex-col justify-between shadow-xs min-h-[220px]">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-start justify-between gap-6 relative z-10">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-200">
                Overall Average
              </span>

              <div className="mt-2 flex items-baseline">
                <span className="text-5xl sm:text-6xl font-extrabold tracking-tight">
                  {classes.length > 0 ? overallCalc.overallAverage.toFixed(1) : '100.0'}
                </span>
                <span className="text-3xl sm:text-4xl font-bold text-blue-200 ml-0.5">%</span>
              </div>

              <p className="text-xs text-blue-100/90 font-medium mt-1.5">
                Across {classes.length} {classes.length === 1 ? 'class' : 'classes'}, equally weighted
              </p>
            </div>

            {/* Circular icon graphic matching screenshot */}
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-white/20 flex items-center justify-center bg-white/10 flex-shrink-0 shadow-inner">
              <BookOpen className="w-10 h-10 text-white stroke-[2]" />
            </div>
          </div>

          {/* Bottom pill */}
          <div className="relative z-10 mt-5">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-xs text-white text-xs font-medium border border-white/10 select-none">
              <Sparkles className="w-3.5 h-3.5 text-blue-200" />
              <span>The big picture, made simple</span>
            </div>
          </div>
        </div>

        {/* Right Two Stacked Stat Cards (1 col) */}
        <div className="lg:col-span-1 flex flex-col sm:flex-row lg:flex-col gap-4">
          {/* Stat Card 1: Classes */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex items-center justify-between flex-1">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 border border-blue-100">
                <BookOpen className="w-5 h-5 stroke-[2]" />
              </div>
              <div>
                <div className="text-2xl font-extrabold text-slate-900 tracking-tight leading-none">
                  {classes.length}
                </div>
                <div className="text-xs text-slate-500 font-medium mt-1">Classes</div>
              </div>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">On your radar</span>
          </div>

          {/* Stat Card 2: Graded Items */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex items-center justify-between flex-1">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 border border-blue-100">
                <FileText className="w-5 h-5 stroke-[2]" />
              </div>
              <div>
                <div className="text-2xl font-extrabold text-slate-900 tracking-tight leading-none">
                  {totalGradedItems}
                </div>
                <div className="text-xs text-slate-500 font-medium mt-1">Graded items</div>
              </div>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">Every score counts</span>
          </div>
        </div>
      </div>

      {/* 3. Your Classes Section */}
      <div className="space-y-4">
        {/* Section Header with Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Your classes</h2>
            <span className="px-2 py-0.5 text-xs font-bold bg-slate-100 text-slate-500 rounded-lg">
              {classes.length}
            </span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Find a class..."
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-white border border-slate-200 rounded-xl placeholder-slate-400 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 transition-all min-h-[36px]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Classes Grid */}
        {filteredClasses.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-slate-200/80 shadow-2xs">
            <div className="w-12 h-12 mx-auto rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
              <BookOpen className="w-6 h-6" />
            </div>
            {searchQuery ? (
              <>
                <h3 className="text-base font-bold text-slate-900">No classes match "{searchQuery}"</h3>
                <p className="text-xs text-slate-500 mt-1">Try another search term or clear the filter.</p>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="mt-3 px-3.5 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg cursor-pointer"
                >
                  Clear filter
                </button>
              </>
            ) : (
              <>
                <h3 className="text-base font-bold text-slate-900">No Classes Added Yet</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Create your first class to track weighted categories, or load demo classes to test calculations.
                </p>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={onOpenAddClass}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    Add First Class
                  </button>
                  <button
                    type="button"
                    onClick={onLoadDemoData}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    Load Sample Data
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredClasses.map((item) => {
              const classCalc = calculateClassAverage(item);
              const gradedCount = item.categories.reduce(
                (sum, cat) =>
                  sum + cat.assessments.filter((a) => a.score !== null && a.score !== undefined && !isNaN(a.score)).length,
                0
              );

              // Distinct category palette matching the screenshot (blue, teal, indigo)
              const accentColor = item.color || '#2563EB';

              return (
                <div
                  key={item.id}
                  onClick={() => onSelectClass(item.id)}
                  className="group bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-blue-300 transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    {/* Top row: Icon and settings/sliders */}
                    <div className="flex items-center justify-between">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center"
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
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      >
                        <Sliders className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Class Name & Subtitle */}
                    <h3 className="font-bold text-base text-slate-900 group-hover:text-blue-600 transition-colors mt-3 line-clamp-1">
                      {item.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {item.categories.length} {item.categories.length === 1 ? 'category' : 'categories'} • {gradedCount} graded {gradedCount === 1 ? 'item' : 'items'}
                    </p>

                    {/* Grade Score and Class Average label */}
                    <div className="mt-4 flex items-baseline justify-between">
                      <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
                        {classCalc.average.toFixed(1)}
                        <span className="text-xl font-bold text-slate-700 ml-0.5">%</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium text-right leading-tight">
                        Class<br />average
                      </div>
                    </div>

                    {/* Multi-segment Category Progress Bar */}
                    <div className="w-full h-1.5 bg-slate-100 rounded-full flex gap-1 overflow-hidden mt-3">
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
                            className="h-full rounded-full transition-all"
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Bottom Row */}
                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-medium">
                      {classCalc.isWeightValid ? (
                        'Weights total 100%'
                      ) : (
                        <span className="text-rose-600 font-bold">
                          Weights: {classCalc.totalWeight.toFixed(0)}%
                        </span>
                      )}
                    </span>
                    <span className="text-blue-600 font-semibold group-hover:underline flex items-center gap-0.5">
                      View class <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Bottom Info: How your grades are calculated */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => setShowCalculationInfo(!showCalculationInfo)}
          className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1.5 cursor-pointer select-none transition-colors"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>How your grades are calculated</span>
          <ChevronRight className={`w-3 h-3 transition-transform ${showCalculationInfo ? 'rotate-90' : ''}`} />
        </button>

        {showCalculationInfo && (
          <div className="mt-3 p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs text-xs text-slate-600 space-y-2 animate-in fade-in duration-150">
            <h4 className="font-bold text-slate-900">Calculation Transparency:</h4>
            <ul className="list-disc list-inside space-y-1 text-slate-500">
              <li>
                <strong>Category Average:</strong> Each graded assessment within a category contributes equally as a percentage. Ungraded assessments are excluded from calculations.
              </li>
              <li>
                <strong>Empty Categories:</strong> A category with no graded assessments automatically counts as 100% for the class average.
              </li>
              <li>
                <strong>Weighted Class Average:</strong> Sum of each category's average multiplied by its percentage weight. Category weights must total exactly 100%.
              </li>
              <li>
                <strong>Overall Average:</strong> Calculated with equal weighting across all enrolled classes.
              </li>
            </ul>
          </div>
        )}
      </div>

      {/* 5. Minimal Footer matching screenshot */}
      <footer className="pt-8 pb-4 border-t border-slate-200/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
          <span>Your grades. Your private space.</span>
        </div>
        <div className="flex items-center gap-1.5">
          <HeartHandshake className="w-3.5 h-3.5 text-slate-400" />
          <span>Keep going. You've got this.</span>
        </div>
      </footer>
    </div>
  );
};
