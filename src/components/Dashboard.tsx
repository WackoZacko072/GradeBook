import React, { useState } from 'react';
import {
  Search,
  Plus,
  BookOpen,
  FileText,
  Sliders,
  ChevronRight,
  HelpCircle,
  X,
  ShieldCheck,
  HeartHandshake,
  GraduationCap,
} from 'lucide-react';
import type { ClassItem } from '../types/grade';
import {
  calculateClassAverage,
  calculateOverallAverage,
  calculateCumulativeGPA,
} from '../utils/gradeCalculations';
import { useAuth } from '../context/AuthContext';

interface DashboardProps {
  classes: ClassItem[];
  onSelectClass: (classId: string) => void;
  onOpenAddClass: () => void;
  onOpenFirebaseConfig?: () => void;
  onOpenAiAdvisor?: (prompt?: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  classes,
  onSelectClass,
  onOpenAddClass,
  onOpenFirebaseConfig,
  onOpenAiAdvisor: _onOpenAiAdvisor,
}) => {
  const { user, isConfigured, signInWithGoogle } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCalculationInfo, setShowCalculationInfo] = useState(false);

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

  // Filter classes by search
  const filteredClasses = classes.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const firstName = user?.displayName
    ? user.displayName.split(' ')[0]
    : user?.email
    ? user.email.split('@')[0]
    : null;

  return (
    <div className="space-y-8 animate-fade-scale select-none">
      {/* 0. Guest Banner (if not logged in) */}
      {!user && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50/70 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200/80 dark:border-blue-800/40 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs transition-colors">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#18191b] shadow-2xs border border-blue-200/60 dark:border-blue-800/50 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.02 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-[#e8eaed]">
                Want your own private gradebook synced to the cloud?
              </h3>
              <p className="text-xs text-slate-600 dark:text-[#c4c7c5] mt-0.5">
                Sign in with Google to create your personal account, save courses securely, and access them from any device.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={isConfigured ? signInWithGoogle : onOpenFirebaseConfig}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer flex-shrink-0 self-stretch sm:self-auto justify-center google-btn-press"
          >
            <span>Sign in with Google</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 1. Header Title & Top Add Class Button */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex items-start gap-3.5 sm:gap-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-white via-slate-50 to-blue-50/40 dark:from-[#18191b] dark:via-[#18191b] dark:to-[#26282a] border border-slate-200/90 dark:border-[#26282a] p-2 sm:p-2.5 flex items-center justify-center flex-shrink-0 shadow-sm shadow-blue-500/10">
            <img
              src="/gemini-gradebook-logo.png"
              alt="Gemini Gradebook"
              className="w-full h-full object-contain filter drop-shadow-sm brightness-105"
            />
          </div>
          <div>
            <span className="block text-[11px] font-bold text-blue-600 dark:text-[#8ab4f8] uppercase tracking-widest mb-1">
              {firstName ? `${firstName}'s Gradebook` : 'Gemini Gradebook'}
            </span>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-[#e8eaed] tracking-tight">
              {firstName ? `Welcome back, ${firstName}.` : 'A clearer view of your grades.'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-[#c4c7c5] mt-1">
              {classes.length === 0
                ? 'Your gradebook is clean and ready. Add your current courses to start tracking.'
                : 'All your classes. One place to keep track.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenAddClass}
          className="self-start sm:self-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer min-h-[42px] google-btn-press"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add class</span>
        </button>
      </div>

      {/* 2. Hero Banner & Stat Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        {/* Large Blue Hero Card (2 cols) */}
        <div className="lg:col-span-2 bg-gradient-to-r from-[#2052DE] via-[#2563EB] to-[#1D4ED8] dark:from-[#1e3a8a] dark:via-[#2563eb] dark:to-[#1e40af] text-white rounded-3xl p-5 sm:p-8 relative overflow-hidden flex flex-col justify-between shadow-xs min-h-[200px] sm:min-h-[220px] google-card">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-start justify-between gap-4 sm:gap-6 relative z-10">
            <div>
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-blue-200">
                Overall Average
              </span>

              <div className="mt-2 flex items-baseline">
                <span className="text-4xl sm:text-6xl font-extrabold tracking-tight">
                  {classes.length > 0 ? overallCalc.overallAverage.toFixed(1) : '--'}
                </span>
                {classes.length > 0 && (
                  <span className="text-2xl sm:text-4xl font-bold text-blue-200 ml-0.5">%</span>
                )}
              </div>

              <p className="text-xs text-blue-100/90 font-medium mt-1.5">
                {classes.length > 0
                  ? `Across ${classes.length} ${classes.length === 1 ? 'class' : 'classes'}, equally weighted`
                  : 'Add your classes to begin calculating your overall weighted GPA'}
              </p>
            </div>

            {/* Circular icon graphic */}
            <div className="w-16 h-16 sm:w-28 sm:h-28 rounded-full border-2 sm:border-4 border-white/20 flex items-center justify-center bg-white/10 flex-shrink-0 shadow-inner">
              <BookOpen className="w-7 h-7 sm:w-10 sm:h-10 text-white stroke-[2]" />
            </div>
          </div>

          {/* Bottom pill */}
          <div className="relative z-10 mt-5">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/20 backdrop-blur-xs text-white text-xs font-bold border border-white/25 select-none shadow-2xs">
                <GraduationCap className="w-3.5 h-3.5 text-white" />
                <span>GPA: {classes.length > 0 ? `${gpaInfo.gpa.toFixed(2)} / 4.0` : '--'}</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-xs text-white text-xs font-medium border border-white/10 select-none">
                <span>Letter: {classes.length > 0 ? overallCalc.letterGrade : '--'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Two Stacked Stat Cards (1 col) */}
        <div className="lg:col-span-1 flex flex-col sm:flex-row lg:flex-col gap-4">
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

      {/* 3. Your Classes Section */}
      <div className="space-y-4">
        {/* Section Header with Search (shown only if classes exist) */}
        {classes.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-[#e8eaed] tracking-tight">Your classes</h2>
              <span className="px-2 py-0.5 text-xs font-bold bg-slate-100 dark:bg-[#26282a] text-slate-600 dark:text-[#c4c7c5] rounded-lg">
                {classes.length}
              </span>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 dark:text-[#80868b] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Find a class..."
                className="w-full pl-9 pr-8 py-1.5 text-xs bg-white dark:bg-[#18191b] border border-slate-200 dark:border-[#26282a] rounded-xl placeholder-slate-400 dark:placeholder-[#80868b] text-slate-900 dark:text-[#e8eaed] focus:outline-none focus:ring-1 focus:ring-blue-600 dark:focus:ring-[#8ab4f8] focus:border-blue-600 transition-all min-h-[36px]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
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
              {firstName ? `${firstName}'s Gradebook is Ready` : 'Your Gradebook is Clean & Ready'}
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
        ) : filteredClasses.length === 0 ? (
          /* Search Filter Empty State */
          <div className="bg-white dark:bg-[#18191b] rounded-2xl p-10 text-center border border-slate-200/80 dark:border-[#26282a] shadow-2xs">
            <div className="w-12 h-12 mx-auto rounded-xl bg-blue-50 dark:bg-[#8ab4f8]/15 text-blue-600 dark:text-[#8ab4f8] flex items-center justify-center mb-3">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-[#e8eaed]">No classes match "{searchQuery}"</h3>
            <p className="text-xs text-slate-500 dark:text-[#9aa0a6] mt-1">Try another search term or clear the filter.</p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="mt-3 px-3.5 py-1.5 text-xs font-semibold text-blue-600 dark:text-[#8ab4f8] bg-blue-50 dark:bg-[#8ab4f8]/15 hover:bg-blue-100 dark:hover:bg-[#8ab4f8]/25 rounded-lg cursor-pointer google-btn-press"
            >
              Clear filter
            </button>
          </div>
        ) : (
          /* Class Cards Grid with Google Hover Lift */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredClasses.map((item) => {
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
                  className="group bg-white dark:bg-[#18191b] rounded-2xl p-5 border border-slate-200/80 dark:border-[#26282a] shadow-2xs hover:border-blue-300 dark:hover:border-[#8ab4f8] cursor-pointer flex flex-col justify-between google-card"
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

      {/* 4. Bottom Info: How your grades are calculated */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => setShowCalculationInfo(!showCalculationInfo)}
          className="text-xs text-slate-400 dark:text-[#80868b] hover:text-slate-700 dark:hover:text-[#e8eaed] flex items-center gap-1.5 cursor-pointer select-none transition-colors"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>How your grades are calculated</span>
          <ChevronRight className={`w-3 h-3 transition-transform duration-200 ${showCalculationInfo ? 'rotate-90' : ''}`} />
        </button>

        {showCalculationInfo && (
          <div className="mt-3 p-4 bg-white dark:bg-[#18191b] rounded-2xl border border-slate-200/80 dark:border-[#26282a] shadow-2xs text-xs text-slate-600 dark:text-[#c4c7c5] space-y-2 animate-slide-up">
            <h4 className="font-bold text-slate-900 dark:text-[#e8eaed]">Calculation Transparency:</h4>
            <ul className="list-disc list-inside space-y-1 text-slate-500 dark:text-[#9aa0a6]">
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

      {/* 5. Minimal Footer */}
      <footer className="pt-8 pb-4 border-t border-slate-200/60 dark:border-[#26282a] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 dark:text-[#80868b]">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-400 dark:text-[#8ab4f8]" />
          <span>Your grades. Your private space.</span>
        </div>
        <div className="flex items-center gap-1.5">
          <HeartHandshake className="w-3.5 h-3.5 text-slate-400 dark:text-[#f28b82]" />
          <span>Keep going. You've got this.</span>
        </div>
      </footer>
    </div>
  );
};
