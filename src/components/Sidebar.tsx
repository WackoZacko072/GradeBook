import React from 'react';
import {
  Plus,
  Calculator,
  X,
  BookOpen,
  BookMarked,
  FileText,
} from 'lucide-react';
import type { ClassItem } from '../types/grade';
import type { NoteItem } from '../types/notebook';
import { calculateClassAverage } from '../utils/gradeCalculations';

interface SidebarProps {
  activeTab: 'gradebook' | 'notebook';
  onChangeTab: (tab: 'gradebook' | 'notebook') => void;
  classes: ClassItem[];
  notes?: NoteItem[];
  selectedClassId: string | null;
  selectedNoteId?: string | null;
  onSelectOverview: () => void;
  onSelectClass: (id: string) => void;
  onSelectNote?: (id: string | null) => void;
  onOpenAddClass: () => void;
  onCreateNote?: () => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onChangeTab,
  classes,
  notes = [],
  selectedClassId,
  selectedNoteId = null,
  onSelectOverview,
  onSelectClass,
  onSelectNote,
  onOpenAddClass,
  onCreateNote,
  isMobileOpen = false,
  onMobileClose,
}) => {
  const content = (
    <div className="flex flex-col justify-between h-full">
      <div className="space-y-6">
        {/* Workspace section with Tab Switching */}
        <div>
          <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2 select-none">
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
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer min-h-[44px] ${
                activeTab === 'gradebook' && selectedClassId === null
                  ? 'bg-[#EBF2FE] text-[#2563EB] shadow-2xs'
                  : 'text-slate-700 hover:bg-slate-200/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <span>Gradebook</span>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  activeTab === 'gradebook' && selectedClassId === null
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-200 text-slate-600'
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
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer min-h-[44px] ${
                activeTab === 'notebook' && selectedNoteId === null
                  ? 'bg-[#EEF2FF] text-[#4F46E5] shadow-2xs'
                  : 'text-slate-700 hover:bg-slate-200/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <BookMarked className="w-4 h-4 text-indigo-600" />
                <span>Notebook</span>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  activeTab === 'notebook' && selectedNoteId === null
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {notes.length}
              </span>
            </button>
          </div>
        </div>

        {/* Dynamic section: If Gradebook active -> Your Classes. If Notebook active -> Your Notes */}
        {activeTab === 'gradebook' ? (
          <div>
            <div className="flex items-center justify-between px-3 mb-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider select-none">
                Your Classes
              </span>
              <button
                type="button"
                onClick={() => {
                  onOpenAddClass();
                  onMobileClose?.();
                }}
                title="Add New Class"
                className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-200/80 rounded-lg transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            <div className="space-y-1 max-h-[45vh] overflow-y-auto pr-1">
              {classes.length === 0 ? (
                <div className="px-3 py-3 text-center bg-slate-100/60 rounded-xl border border-dashed border-slate-200">
                  <p className="text-xs text-slate-500 font-medium">No classes yet</p>
                  <button
                    type="button"
                    onClick={() => {
                      onOpenAddClass();
                      onMobileClose?.();
                    }}
                    className="mt-2 text-xs font-bold text-blue-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
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
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all cursor-pointer min-h-[44px] ${
                        isSelected
                          ? 'bg-white text-blue-700 font-semibold shadow-2xs border border-slate-200/80'
                          : 'text-slate-700 hover:bg-slate-200/60 font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: dotColor }}
                        />
                        <span className="truncate">{c.name}</span>
                      </div>

                      <span className="text-xs font-bold text-slate-500 tabular-nums ml-2 flex-shrink-0">
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
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider select-none">
                Your Notes
              </span>
              {onCreateNote && (
                <button
                  type="button"
                  onClick={() => {
                    onCreateNote();
                    onMobileClose?.();
                  }}
                  title="New Note"
                  className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-200/80 rounded-lg transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                </button>
              )}
            </div>

            <div className="space-y-1 max-h-[45vh] overflow-y-auto pr-1">
              {notes.length === 0 ? (
                <div className="px-3 py-3 text-center bg-slate-100/60 rounded-xl border border-dashed border-slate-200">
                  <p className="text-xs text-slate-500 font-medium">No notes yet</p>
                  {onCreateNote && (
                    <button
                      type="button"
                      onClick={() => {
                        onCreateNote();
                        onMobileClose?.();
                      }}
                      className="mt-2 text-xs font-bold text-indigo-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Create Note
                    </button>
                  )}
                </div>
              ) : (
                notes.map((n) => {
                  const isSelected = selectedNoteId === n.id;
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => {
                        onSelectNote?.(n.id);
                        onMobileClose?.();
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all cursor-pointer min-h-[44px] ${
                        isSelected
                          ? 'bg-white text-indigo-700 font-semibold shadow-2xs border border-slate-200/80'
                          : 'text-slate-700 hover:bg-slate-200/60 font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <FileText className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                        <span className="truncate">{n.title || 'Untitled Note'}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Inspiration Tag */}
      <div className="pt-4 border-t border-slate-200/60 flex items-center gap-2.5 px-2">
        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 border border-blue-100">
          <Calculator className="w-4 h-4" />
        </div>
        <div className="leading-tight">
          <div className="text-xs font-bold text-slate-800">A little clarity.</div>
          <div className="text-[11px] text-slate-400">A lot less mental math.</div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Desktop Persistent Sidebar */}
      <aside className="hidden md:flex w-64 bg-[#F8FAFC] border-r border-slate-200/80 flex-col justify-between p-4 flex-shrink-0 min-h-[calc(100vh-65px)]">
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
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
          onClick={onMobileClose}
        />

        {/* Drawer Panel */}
        <div
          className={`fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-[#FAFBFD] shadow-2xl flex flex-col justify-between p-5 transform transition-transform duration-300 ease-out z-10 ${
            isMobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Drawer Header */}
          <div className="flex items-center justify-between pb-4 mb-2 border-b border-slate-200/80">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
                <BookOpen className="w-4 h-4 stroke-[2.2]" />
              </div>
              <span className="font-extrabold text-lg text-slate-900 tracking-tight">
                gradebook<span className="text-blue-600">.</span>
              </span>
            </div>
            <button
              type="button"
              onClick={onMobileClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
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
