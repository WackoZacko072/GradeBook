import React from 'react';
import {
  Plus,
  Calculator,
  X,
  BookOpen,
  BookMarked,
  BookCheck,
  FileText,
  Sparkles,
} from 'lucide-react';
import type { ClassItem } from '../types/grade';
import type { NoteItem, NoteSource } from '../types/notebook';
import type { SlabItem } from '../types/slab';
import { calculateClassAverage } from '../utils/gradeCalculations';

interface SidebarProps {
  activeTab: 'gradebook' | 'notebook' | 'slab';
  onChangeTab: (tab: 'gradebook' | 'notebook' | 'slab') => void;
  classes: ClassItem[];
  notes?: NoteItem[];
  sources?: NoteSource[];
  slabs?: SlabItem[];
  selectedClassId: string | null;
  selectedNoteId?: string | null;
  selectedSlabId?: string | null;
  onSelectOverview: () => void;
  onSelectClass: (id: string) => void;
  onSelectNote?: (id: string | null) => void;
  onSelectSlab?: (id: string | null) => void;
  onOpenAddClass: () => void;
  onCreateNote?: () => void;
  onCreateSlab?: () => void;
  onOpenSlateAi?: () => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onChangeTab,
  classes,
  notes: _notes = [],
  sources = [],
  slabs = [],
  selectedClassId,
  selectedNoteId = null,
  selectedSlabId = null,
  onSelectOverview,
  onSelectClass,
  onSelectNote,
  onSelectSlab,
  onOpenAddClass,
  onCreateNote: _onCreateNote,
  onCreateSlab,
  onOpenSlateAi,
  isMobileOpen = false,
  onMobileClose,
}) => {
  const content = (
    <div className="flex flex-col justify-between h-full select-none">
      <div className="space-y-6">
        {/* Workspace section with Tab Switching */}
        <div>
          <span className="block text-[11px] font-bold text-slate-400 dark:text-[#80868b] uppercase tracking-wider px-3 mb-2">
            Workspace
          </span>

          <div className="space-y-1">
            {/* Gradebook Tab Button */}
            <button
              type="button"
              onClick={() => {
                onChangeTab('gradebook');
                onSelectOverview();
                onMobileClose?.();
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer min-h-[44px] google-btn-press ${
                activeTab === 'gradebook' && selectedClassId === null
                  ? 'bg-[#EBF2FE] dark:bg-[#8ab4f8]/15 text-[#2563EB] dark:text-[#8ab4f8] shadow-2xs font-bold'
                  : 'text-slate-700 dark:text-[#c4c7c5] hover:bg-slate-200/60 dark:hover:bg-[#353739]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-4 h-4 text-blue-600 dark:text-[#8ab4f8]" />
                <span>Gradebook</span>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-bold transition-colors ${
                  activeTab === 'gradebook' && selectedClassId === null
                    ? 'bg-blue-600 dark:bg-[#8ab4f8] text-white dark:text-[#1e1f20]'
                    : 'bg-slate-200 dark:bg-[#353739] text-slate-600 dark:text-[#9aa0a6]'
                }`}
              >
                {classes.length}
              </span>
            </button>

            {/* Notebook Tab Button */}
            <button
              type="button"
              onClick={() => {
                onChangeTab('notebook');
                onSelectNote?.(null);
                onMobileClose?.();
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer min-h-[44px] google-btn-press ${
                activeTab === 'notebook' && selectedNoteId === null
                  ? 'bg-[#EEF2FF] dark:bg-[#c58af9]/15 text-[#4F46E5] dark:text-[#c58af9] shadow-2xs font-bold'
                  : 'text-slate-700 dark:text-[#c4c7c5] hover:bg-slate-200/60 dark:hover:bg-[#353739]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <BookMarked className="w-4 h-4 text-indigo-600 dark:text-[#c58af9]" />
                <span>Notebook</span>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-bold transition-colors ${
                  activeTab === 'notebook' && selectedNoteId === null
                    ? 'bg-indigo-600 dark:bg-[#c58af9] text-white dark:text-[#1e1f20]'
                    : 'bg-slate-200 dark:bg-[#353739] text-slate-600 dark:text-[#9aa0a6]'
                }`}
              >
                {sources.length}
              </span>
            </button>

            {/* Office Tab Button (renamed from Slab) */}
            <button
              type="button"
              onClick={() => {
                onChangeTab('slab');
                onSelectSlab?.(null);
                onMobileClose?.();
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer min-h-[44px] google-btn-press ${
                activeTab === 'slab' && selectedSlabId === null
                  ? 'bg-violet-50 dark:bg-[#c58af9]/15 text-violet-700 dark:text-[#c58af9] shadow-2xs font-bold'
                  : 'text-slate-700 dark:text-[#c4c7c5] hover:bg-slate-200/60 dark:hover:bg-[#353739]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <BookCheck className="w-4 h-4 text-violet-600 dark:text-[#c58af9]" />
                <span>Office</span>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-bold transition-colors ${
                  activeTab === 'slab' && selectedSlabId === null
                    ? 'bg-violet-600 dark:bg-[#c58af9] text-white dark:text-[#1e1f20]'
                    : 'bg-slate-200 dark:bg-[#353739] text-slate-600 dark:text-[#9aa0a6]'
                }`}
              >
                {slabs.length}
              </span>
            </button>

            {/* Gemini Quick Action Button (renamed from Slate AI) */}
            <button
              type="button"
              onClick={() => {
                onOpenSlateAi?.();
                onMobileClose?.();
              }}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer min-h-[44px] text-slate-700 dark:text-[#c4c7c5] hover:bg-slate-200/60 dark:hover:bg-[#353739] group google-btn-press"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-2xs">
                  <Sparkles className="w-3 h-3 text-white stroke-[2.2]" />
                </div>
                <span className="group-hover:text-blue-700 dark:group-hover:text-[#8ab4f8] font-bold">Gemini</span>
              </div>
            </button>
          </div>
        </div>

        {/* Dynamic section: If Office active -> Your Office Sets. If Gradebook active -> Your Classes. If Notebook active -> Your Notes */}
        {activeTab === 'slab' ? (
          <div>
            <div className="flex items-center justify-between px-3 mb-2">
              <span className="text-[11px] font-bold text-slate-400 dark:text-[#80868b] uppercase tracking-wider">
                Your Office Sets
              </span>
              <button
                type="button"
                onClick={() => {
                  onCreateSlab?.();
                  onMobileClose?.();
                }}
                className="p-1 text-violet-600 dark:text-[#c58af9] hover:bg-violet-50 dark:hover:bg-[#353739] rounded-lg transition-colors cursor-pointer google-btn-press"
                title="Create new Office set"
                aria-label="Create new Office set"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              {slabs.length === 0 ? (
                <div className="px-3 py-4 text-center">
                  <p className="text-xs text-slate-400 dark:text-[#80868b]">No study sets yet.</p>
                  <button
                    type="button"
                    onClick={() => {
                      onCreateSlab?.();
                      onMobileClose?.();
                    }}
                    className="mt-2 text-xs font-bold text-violet-600 dark:text-[#c58af9] hover:underline cursor-pointer"
                  >
                    + Create with Gemini
                  </button>
                </div>
              ) : (
                slabs.map((s) => {
                  const isSelected = selectedSlabId === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        onSelectSlab?.(s.id);
                        onMobileClose?.();
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all cursor-pointer min-h-[44px] google-btn-press ${
                        isSelected
                          ? 'bg-white dark:bg-[#353739] text-violet-700 dark:text-[#c58af9] font-semibold shadow-2xs border border-slate-200/80 dark:border-[#444746]'
                          : 'text-slate-700 dark:text-[#c4c7c5] hover:bg-slate-200/60 dark:hover:bg-[#353739] font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <BookCheck className="w-4 h-4 text-violet-500 dark:text-[#c58af9] flex-shrink-0" />
                        <span className="truncate">{s.title || 'Untitled Set'}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-[#80868b] flex-shrink-0">
                        {s.flashcards.length + s.mcqs.length}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        ) : activeTab === 'gradebook' ? (
          <div>
            <div className="flex items-center justify-between px-3 mb-2">
              <span className="text-[11px] font-bold text-slate-400 dark:text-[#80868b] uppercase tracking-wider">
                Your Classes
              </span>
              <button
                type="button"
                onClick={() => {
                  onOpenAddClass();
                  onMobileClose?.();
                }}
                title="Add New Class"
                className="p-1.5 text-slate-400 dark:text-[#80868b] hover:text-slate-800 dark:hover:text-[#e8eaed] hover:bg-slate-200/80 dark:hover:bg-[#353739] rounded-lg transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center google-btn-press"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            <div className="space-y-1 max-h-[45vh] overflow-y-auto pr-1">
              {classes.length === 0 ? (
                <div className="px-3 py-3 text-center bg-slate-100/60 dark:bg-[#282a2c] rounded-xl border border-dashed border-slate-200 dark:border-[#3c4043]">
                  <p className="text-xs text-slate-500 dark:text-[#9aa0a6] font-medium">No classes yet</p>
                  <button
                    type="button"
                    onClick={() => {
                      onOpenAddClass();
                      onMobileClose?.();
                    }}
                    className="mt-2 text-xs font-bold text-blue-600 dark:text-[#8ab4f8] hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Class
                  </button>
                </div>
              ) : (
                classes.map((c) => {
                  const isSelected = selectedClassId === c.id;
                  const calc = calculateClassAverage(c);
                  const dotColor = c.color || '#2563EB';

                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        onSelectClass(c.id);
                        onMobileClose?.();
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all cursor-pointer min-h-[44px] google-btn-press ${
                        isSelected
                          ? 'bg-white dark:bg-[#353739] text-blue-700 dark:text-[#8ab4f8] font-semibold shadow-2xs border border-slate-200/80 dark:border-[#444746]'
                          : 'text-slate-700 dark:text-[#c4c7c5] hover:bg-slate-200/60 dark:hover:bg-[#353739] font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: dotColor }}
                        />
                        <span className="truncate">{c.name}</span>
                      </div>

                      <span className="text-xs font-bold text-slate-500 dark:text-[#9aa0a6] tabular-nums ml-2 flex-shrink-0">
                        {calc.average.toFixed(1)}%
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between px-3 mb-2">
              <span className="text-[11px] font-bold text-slate-400 dark:text-[#80868b] uppercase tracking-wider">
                Class Notebooks
              </span>
            </div>

            <div className="space-y-1 max-h-[45vh] overflow-y-auto pr-1">
              {sources.length === 0 ? (
                <div className="px-3 py-3 text-center bg-slate-100/60 dark:bg-[#282a2c] rounded-xl border border-dashed border-slate-200 dark:border-[#3c4043]">
                  <p className="text-xs text-slate-500 dark:text-[#9aa0a6] font-medium">No sources uploaded yet</p>
                  <p className="text-[11px] text-slate-400 dark:text-[#80868b] mt-1">Upload PDFs or paste lecture notes</p>
                </div>
              ) : (
                sources.map((s) => {
                  return (
                    <div
                      key={s.id}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all text-slate-700 dark:text-[#c4c7c5] hover:bg-slate-200/60 dark:hover:bg-[#353739]"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <FileText className="w-4 h-4 text-indigo-500 dark:text-[#c58af9] flex-shrink-0" />
                        <span className="truncate font-medium text-xs">{s.name || 'Untitled Source'}</span>
                      </div>
                      {s.className && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-[#c58af9] flex-shrink-0">
                          {s.className}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Inspiration Tag */}
      <div className="pt-4 border-t border-slate-200/60 dark:border-[#3c4043] flex items-center gap-2.5 px-2">
        <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-[#8ab4f8]/15 text-blue-600 dark:text-[#8ab4f8] flex items-center justify-center flex-shrink-0 border border-blue-100 dark:border-[#8ab4f8]/30">
          <Calculator className="w-4 h-4" />
        </div>
        <div className="leading-tight">
          <div className="text-xs font-bold text-slate-800 dark:text-[#e8eaed]">A little clarity.</div>
          <div className="text-[11px] text-slate-400 dark:text-[#80868b]">A lot less mental math.</div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Desktop Persistent Sidebar */}
      <aside className="hidden md:flex w-64 bg-[#F8FAFC] dark:bg-[#1e1f20] border-r border-slate-200/80 dark:border-[#3c4043] flex-col justify-between p-4 flex-shrink-0 min-h-[calc(100vh-65px)] transition-colors duration-250">
        {content}
      </aside>

      {/* 2. Mobile Slide-Over Drawer with Backdrop */}
      <div
        className={`fixed inset-0 z-50 md:hidden transition-all duration-300 ${
          isMobileOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Dark Backdrop */}
        <div
          className="fixed inset-0 bg-slate-900/60 dark:bg-black/60 backdrop-blur-xs transition-opacity"
          onClick={onMobileClose}
        />

        {/* Drawer Panel */}
        <div
          className={`fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-[#FAFBFD] dark:bg-[#282a2c] shadow-2xl flex flex-col justify-between p-5 transform transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)] z-10 border-r border-slate-200/80 dark:border-[#3c4043] ${
            isMobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Drawer Header */}
          <div className="flex items-center justify-between pb-4 mb-2 border-b border-slate-200/80 dark:border-[#3c4043]">
            <div className="flex items-center gap-2.5">
              <img
                src="/gemini-gradebook-logo.png"
                alt="Gemini Gradebook"
                className="w-9 h-9 object-contain flex-shrink-0 drop-shadow-sm filter brightness-105"
              />
              <span className="font-bold text-base text-slate-900 dark:text-[#e8eaed] tracking-tight">
                Gemini Gradebook
              </span>
            </div>
            <button
              type="button"
              onClick={onMobileClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-[#e8eaed] hover:bg-slate-200/60 dark:hover:bg-[#353739] rounded-xl transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center google-btn-press"
              aria-label="Close navigation drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto">
            {content}
          </div>
        </div>
      </div>
    </>
  );
};
