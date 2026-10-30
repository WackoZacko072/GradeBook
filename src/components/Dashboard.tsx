import React, { useState, useRef } from 'react';
import {
  Plus,
  BookOpen,
  FileText,
  Sliders,
  ChevronRight,
  GraduationCap,
  Upload,
  FilePlus,
  Sparkles,
  Presentation,
  File,
  Clock,
  Layers,
  HelpCircle,
  X,
} from 'lucide-react';
import type { ClassItem } from '../types/grade';
import type { NoteSource } from '../types/notebook';
import {
  calculateClassAverage,
  calculateOverallAverage,
  calculateCumulativeGPA,
  validateCategoryWeights,
  roundTo,
} from '../utils/gradeCalculations';
import { extractTextFromPdf } from '../utils/pdfExtractor';
import { ModalPortal } from './ModalPortal';

interface DashboardProps {
  classes: ClassItem[];
  sources?: NoteSource[];
  onSelectClass: (classId: string) => void;
  onOpenAddClass: () => void;
  onSelectSource?: (source: NoteSource) => void;
  onAddSource?: (newSource: NoteSource) => void;
  onOpenCreateSlabFromSource?: (options: {
    prompt: string;
    type: 'flashcards' | 'mcq' | 'both';
    sourceId: string;
  }) => void;
  onOpenFirebaseConfig?: () => void;
  onOpenAiAdvisor?: (prompt?: string) => void;
  viewMode?: 'grid' | 'list';
}

export const Dashboard: React.FC<DashboardProps> = ({
  classes,
  sources = [],
  onSelectClass,
  onOpenAddClass,
  onSelectSource,
  onAddSource,
  onOpenCreateSlabFromSource,
  onOpenFirebaseConfig: _onOpenFirebaseConfig,
  onOpenAiAdvisor: _onOpenAiAdvisor,
  viewMode = 'grid',
}) => {
  // File upload & Create Note states for AI Notes and Lecture Summarizer on Gradebook page
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingSource, setIsUploadingSource] = useState(false);
  const [isCreateNoteOpen, setIsCreateNoteOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteClassId, setNoteClassId] = useState<string>('');
  const [noteType, setNoteType] = useState<'text' | 'slides'>('text');

  const countWords = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleUploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || !onAddSource) return;
    setIsUploadingSource(true);
    let lastAdded: NoteSource | null = null;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        let extractedText = '';
        const lowerName = file.name.toLowerCase();
        const isPdf = lowerName.endsWith('.pdf') || file.type === 'application/pdf';
        const isSlides =
          lowerName.includes('slide') ||
          lowerName.includes('lecture') ||
          lowerName.endsWith('.ppt') ||
          lowerName.endsWith('.pptx');

        if (isPdf) {
          extractedText = await extractTextFromPdf(file);
        } else {
          extractedText = await file.text();
          extractedText = extractedText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' ').trim();
        }

        if (extractedText && extractedText.trim().length > 0) {
          const defaultClass = classes[0];
          const newSource: NoteSource = {
            id: `source_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
            name: file.name,
            type: isSlides ? 'slides' : isPdf ? 'pdf' : 'file',
            content: extractedText,
            fileSize: formatFileSize(file.size),
            classId: defaultClass?.id,
            className: defaultClass?.name,
            extractedWordCount: countWords(extractedText),
            addedAt: Date.now(),
            lastOpenedAt: Date.now(),
          };
          onAddSource(newSource);
          lastAdded = newSource;
        }
      } catch (err) {
        console.error('Error extracting uploaded source:', err);
      }
    }

    setIsUploadingSource(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // Automatically direct user to the AI Summarizer for the newly uploaded document
    if (lastAdded && onSelectSource) {
      onSelectSource(lastAdded);
    }
  };

  const handleCreateQuickNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim() || !onAddSource) return;

    const targetClass = classes.find((c) => c.id === noteClassId);
    const newSource: NoteSource = {
      id: `source_note_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name:
        noteTitle.trim() ||
        (noteType === 'slides' ? 'Lecture Slides Outline' : 'Class Lecture Notes'),
      type: noteType,
      content: noteContent.trim(),
      fileSize: `${(noteContent.length / 1024).toFixed(1)} KB`,
      classId: targetClass?.id,
      className: targetClass?.name,
      extractedWordCount: countWords(noteContent),
      addedAt: Date.now(),
      lastOpenedAt: Date.now(),
    };

    onAddSource(newSource);
    setNoteTitle('');
    setNoteContent('');
    setIsCreateNoteOpen(false);

    if (onSelectSource) {
      onSelectSource(newSource);
    }
  };

  // Sort sources by lastOpenedAt (or addedAt) descending for "Recently Opened Sources"
  const recentSources = [...sources].sort(
    (a, b) => (b.lastOpenedAt || b.addedAt || 0) - (a.lastOpenedAt || a.addedAt || 0)
  );
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

      {/* 3. Recently Opened Sources — AI Notes & Lecture Summarizer (Under Your Classes) */}
      <div className="space-y-4 pt-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.txt,.docx,.doc,.md,.rtf,.csv,.json"
          onChange={(e) => handleUploadFiles(e.target.files)}
          className="hidden"
        />

        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-[#e8eaed] tracking-tight">
                Recently opened sources
              </h2>
              <span className="px-2 py-0.5 text-xs font-bold bg-blue-50 dark:bg-[#8ab4f8]/15 text-blue-600 dark:text-[#8ab4f8] rounded-lg flex items-center gap-1 border border-blue-200/60 dark:border-[#8ab4f8]/30">
                <Sparkles className="w-3 h-3" />
                <span>AI Notes & Lecture Summarizer</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-[#9aa0a6]">
              Click any PDF, lecture slides, or notes to generate concise summaries, extract concepts & definitions, create flashcards, or ask questions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              disabled={isUploadingSource}
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer google-btn-press"
            >
              <Upload className="w-3.5 h-3.5 stroke-[2.3]" />
              <span>{isUploadingSource ? 'Extracting...' : 'Upload Slides / PDF'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setNoteClassId(classes[0]?.id || '');
                setIsCreateNoteOpen(true);
              }}
              className="px-3.5 py-2 bg-white dark:bg-[#18191b] hover:bg-slate-50 dark:hover:bg-[#202123] text-slate-700 dark:text-[#e8eaed] border border-slate-200/90 dark:border-[#26282a] text-xs font-semibold rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer google-btn-press"
            >
              <FilePlus className="w-3.5 h-3.5" />
              <span>Paste Lecture Notes</span>
            </button>
          </div>
        </div>

        {/* Recently Opened Sources Content */}
        {recentSources.length === 0 ? (
          <div className="bg-white dark:bg-[#18191b] rounded-3xl border border-slate-200/80 dark:border-[#26282a] p-6 sm:p-8 shadow-2xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex items-start gap-4 max-w-2xl">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-[#8ab4f8]/15 text-blue-600 dark:text-[#8ab4f8] flex items-center justify-center flex-shrink-0 border border-blue-100 dark:border-[#8ab4f8]/30">
                <Sparkles className="w-6 h-6 stroke-[2]" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-[#e8eaed]">
                  AI Notes & Lecture Summarizer
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-[#9aa0a6] leading-relaxed">
                  Upload lecture slides, PDFs, or course notes to automatically generate concise summaries, extract important concepts, identify key definitions, create flashcards & quizzes, and ask questions about your documents.
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-semibold text-slate-600 dark:text-[#c4c7c5]">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#202123]">• Concise Summaries</span>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#202123]">• Important Concepts</span>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#202123]">• Key Definitions</span>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#202123]">• AI Flashcards & Quizzes</span>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#202123]">• Document Q&A</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto flex-shrink-0">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 sm:flex-initial px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer google-btn-press"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Lecture PDF / Slides</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setNoteClassId(classes[0]?.id || '');
                  setIsCreateNoteOpen(true);
                }}
                className="flex-1 sm:flex-initial px-4 py-2.5 bg-slate-100 dark:bg-[#202123] hover:bg-slate-200 dark:hover:bg-[#26282a] text-slate-700 dark:text-[#e8eaed] text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer google-btn-press"
              >
                <FilePlus className="w-4 h-4" />
                <span>Add Lecture Notes</span>
              </button>
            </div>
          </div>
        ) : (
          <div
            className="w-full gap-4 sm:gap-5"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
            }}
          >
            {recentSources.slice(0, 6).map((source) => {
              const matchedClass = classes.find((c) => c.id === source.classId);
              const words = source.extractedWordCount || countWords(source.content);
              const lowerName = source.name.toLowerCase();
              const isSlides =
                source.type === 'slides' ||
                lowerName.includes('slide') ||
                lowerName.includes('lecture');
              const isPdf = !isSlides && (source.type === 'pdf' || lowerName.endsWith('.pdf'));

              const badgeLabel = isSlides
                ? 'Lecture Slides'
                : isPdf
                ? 'PDF Document'
                : source.type === 'text'
                ? 'Study Notes'
                : 'Course File';

              const badgeColors = isSlides
                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/40'
                : isPdf
                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200/60 dark:border-rose-800/40'
                : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-[#8ab4f8] border-blue-200/60 dark:border-blue-800/40';

              return (
                <div
                  key={source.id}
                  onClick={() => onSelectSource?.(source)}
                  className="group bg-white dark:bg-[#18191b] rounded-2xl p-5 border border-slate-200/80 dark:border-[#26282a] shadow-2xs hover:border-blue-300 dark:hover:border-[#8ab4f8] cursor-pointer flex flex-col justify-between google-card min-w-0 transition-all"
                >
                  <div className="space-y-3">
                    {/* Top row: Type badge + Recently opened indicator */}
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${badgeColors}`}
                      >
                        {isSlides ? (
                          <Presentation className="w-3.5 h-3.5 stroke-[2.2]" />
                        ) : isPdf ? (
                          <FileText className="w-3.5 h-3.5 stroke-[2.2]" />
                        ) : (
                          <File className="w-3.5 h-3.5 stroke-[2.2]" />
                        )}
                        <span>{badgeLabel}</span>
                      </span>

                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 dark:text-[#80868b] font-medium">
                        <Clock className="w-3 h-3" />
                        <span>
                          {new Date(source.lastOpenedAt || source.addedAt).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </span>
                    </div>

                    {/* Source Title & Class Pill */}
                    <div>
                      <h3
                        className="font-bold text-base text-slate-900 dark:text-[#e8eaed] group-hover:text-blue-600 dark:group-hover:text-[#8ab4f8] transition-colors line-clamp-1"
                        title={source.name}
                      >
                        {source.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 dark:text-[#9aa0a6] mt-1">
                        {(matchedClass || source.className) && (
                          <>
                            <span className="inline-flex items-center gap-1.5 font-semibold text-slate-600 dark:text-[#c4c7c5]">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: matchedClass?.color || '#2563EB' }}
                              />
                              <span>{matchedClass?.name || source.className}</span>
                            </span>
                            <span>•</span>
                          </>
                        )}
                        <span>{words.toLocaleString()} words</span>
                        {source.fileSize && (
                          <>
                            <span>•</span>
                            <span>{source.fileSize}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Summary Preview Snippet */}
                    <p className="text-xs text-slate-500 dark:text-[#9aa0a6] line-clamp-2 leading-relaxed">
                      {source.aiSummary
                        ? source.aiSummary.conciseSummary
                        : source.content.slice(0, 140)}
                    </p>
                  </div>

                  {/* Bottom Row: Quick Flashcard / Quiz Trigger + Open Summarizer CTA */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#26282a] flex items-center justify-between gap-2 text-[11px]">
                    <div className="flex items-center gap-1.5">
                      {onOpenCreateSlabFromSource && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenCreateSlabFromSource({
                                prompt: `Create active recall flashcards from "${source.name}"`,
                                type: 'flashcards',
                                sourceId: source.id,
                              });
                            }}
                            title="Generate Flashcards from this source"
                            className="px-2 py-1 rounded-lg bg-violet-50 dark:bg-violet-950/40 hover:bg-violet-100 dark:hover:bg-violet-900/50 text-violet-700 dark:text-[#c58af9] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Layers className="w-3 h-3" />
                            <span>Cards</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenCreateSlabFromSource({
                                prompt: `Create a practice multiple-choice quiz from "${source.name}"`,
                                type: 'mcq',
                                sourceId: source.id,
                              });
                            }}
                            title="Generate Practice Quiz from this source"
                            className="px-2 py-1 rounded-lg bg-blue-50 dark:bg-[#8ab4f8]/15 hover:bg-blue-100 dark:hover:bg-[#8ab4f8]/25 text-blue-700 dark:text-[#8ab4f8] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <HelpCircle className="w-3 h-3" />
                            <span>Quiz</span>
                          </button>
                        </>
                      )}
                    </div>

                    <span className="font-bold text-blue-600 dark:text-[#8ab4f8] group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{source.aiSummary ? 'View Summary' : 'AI Summarize'}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal to Paste Lecture Notes / Slides directly from Gradebook Dashboard */}
      <ModalPortal
        isOpen={isCreateNoteOpen}
        onClose={() => setIsCreateNoteOpen(false)}
        maxWidth="max-w-2xl"
      >
        <div className="p-5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between bg-slate-50/70 dark:bg-white/5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-[#8ab4f8] flex items-center justify-center">
              <Sparkles className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-[#e8eaed]">
                Add Lecture Notes or Slides for AI Summarization
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#9aa0a6]">
                Paste lecture slides text or class notes to generate summaries, concepts, definitions & flashcards
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsCreateNoteOpen(false)}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-[#e8eaed] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleCreateQuickNote} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-[#e8eaed] mb-1.5">
                  Source Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNoteType('text')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      noteType === 'text'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-50 dark:bg-[#0f0f10] text-slate-700 dark:text-[#c4c7c5] border-slate-200 dark:border-[#26282a]'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Lecture Notes</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNoteType('slides')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      noteType === 'slides'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-50 dark:bg-[#0f0f10] text-slate-700 dark:text-[#c4c7c5] border-slate-200 dark:border-[#26282a]'
                    }`}
                  >
                    <Presentation className="w-3.5 h-3.5" />
                    <span>Lecture Slides</span>
                  </button>
                </div>
              </div>

              {classes.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-[#e8eaed] mb-1.5">
                    Assign to Class
                  </label>
                  <select
                    value={noteClassId}
                    onChange={(e) => setNoteClassId(e.target.value)}
                    className="w-full text-xs sm:text-sm p-2.5 bg-slate-50 dark:bg-[#0f0f10] border border-slate-200 dark:border-[#26282a] rounded-xl text-slate-900 dark:text-[#e8eaed] focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">General / Unassigned</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-[#e8eaed] mb-1.5">
                Title
              </label>
              <input
                type="text"
                required
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="e.g. Week 4 Lecture Slides: Cellular Respiration & ATP Synthesis"
                className="w-full text-sm p-3 bg-slate-50 dark:bg-[#0f0f10] border border-slate-200 dark:border-[#26282a] rounded-xl text-slate-900 dark:text-[#e8eaed] focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-[#e8eaed] mb-1.5">
                Content
              </label>
              <textarea
                required
                rows={8}
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Paste your lecture slides text, textbook excerpt, or study notes here..."
                className="w-full text-sm p-3 bg-slate-50 dark:bg-[#0f0f10] border border-slate-200 dark:border-[#26282a] rounded-xl text-slate-900 dark:text-[#e8eaed] focus:outline-hidden focus:ring-2 focus:ring-blue-500 leading-relaxed font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-100 dark:border-[#26282a] bg-slate-50/70 dark:bg-[#252628]">
            <button
              type="button"
              onClick={() => setIsCreateNoteOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-[#c4c7c5] rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer google-btn-press"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Save & Summarize with AI</span>
            </button>
          </div>
        </form>
      </ModalPortal>
    </div>
  );
};
