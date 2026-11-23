import React from 'react';
import { BookOpen, BookMarked, CheckSquare } from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: 'gradebook' | 'notebook' | 'todo' | 'gemini';
  onChangeTab: (tab: 'gradebook' | 'notebook' | 'todo' | 'gemini') => void;
  selectedClassId: string | null;
  classCount?: number;
  noteCount?: number;
  todoCount?: number;
  onSelectOverview: () => void;
  onOpenMobileDrawer?: () => void;
  onOpenAddClass?: () => void;
  onOpenAddNote?: () => void;
  onOpenTranscript?: () => void;
  onOpenAiAdvisor: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onChangeTab,
  selectedClassId: _selectedClassId,
  noteCount = 0,
  todoCount = 0,
  onSelectOverview,
  onOpenAiAdvisor,
}) => {
  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#f0f4f9]/98 dark:bg-[#1e1f20]/98 backdrop-blur-md border-t border-slate-200/60 dark:border-white/10 shadow-lg px-2 pt-1.5 pb-[max(0.6rem,env(safe-area-inset-bottom))] flex items-center justify-around select-none"
    >
      {/* 1. Gradebook Tab */}
      <button
        type="button"
        onClick={() => {
          onChangeTab('gradebook');
          onSelectOverview();
        }}
        className="flex flex-col items-center justify-center flex-1 cursor-pointer transition-all group"
      >
        <div
          className={`w-14 h-8 rounded-full flex items-center justify-center transition-all ${
            activeTab === 'gradebook'
              ? 'bg-[#c2e7ff] dark:bg-[#004a77] text-[#001d35] dark:text-[#c2e7ff]'
              : 'text-slate-600 dark:text-[#9aa0a6] hover:bg-slate-200/50 dark:hover:bg-white/5'
          }`}
        >
          <BookOpen className="w-5 h-5 stroke-[2]" />
        </div>
        <span
          className={`text-[11px] mt-0.5 tracking-tight ${
            activeTab === 'gradebook'
              ? 'font-semibold text-slate-900 dark:text-white'
              : 'font-normal text-slate-600 dark:text-[#9aa0a6]'
          }`}
          style={{ fontFamily: "'Google Sans', sans-serif" }}
        >
          Gradebook
        </span>
      </button>

      {/* 2. Notebook Tab */}
      <button
        type="button"
        onClick={() => onChangeTab('notebook')}
        className="flex flex-col items-center justify-center flex-1 cursor-pointer transition-all group"
      >
        <div
          className={`w-14 h-8 rounded-full flex items-center justify-center relative transition-all ${
            activeTab === 'notebook'
              ? 'bg-[#c2e7ff] dark:bg-[#004a77] text-[#001d35] dark:text-[#c2e7ff]'
              : 'text-slate-600 dark:text-[#9aa0a6] hover:bg-slate-200/50 dark:hover:bg-white/5'
          }`}
        >
          <BookMarked className="w-5 h-5 stroke-[2]" />
          {noteCount > 0 && (
            <span className="absolute 1 top-0.5 right-2 px-1 text-[9px] font-bold bg-blue-600 dark:bg-blue-400 text-white dark:text-black rounded-full leading-tight">
              {noteCount}
            </span>
          )}
        </div>
        <span
          className={`text-[11px] mt-0.5 tracking-tight ${
            activeTab === 'notebook'
              ? 'font-semibold text-slate-900 dark:text-white'
              : 'font-normal text-slate-600 dark:text-[#9aa0a6]'
          }`}
          style={{ fontFamily: "'Google Sans', sans-serif" }}
        >
          Notebook
        </span>
      </button>

      {/* 3. To-Do Tab */}
      <button
        type="button"
        onClick={() => onChangeTab('todo')}
        className="flex flex-col items-center justify-center flex-1 cursor-pointer transition-all group"
      >
        <div
          className={`w-14 h-8 rounded-full flex items-center justify-center relative transition-all ${
            activeTab === 'todo'
              ? 'bg-[#c2e7ff] dark:bg-[#004a77] text-[#001d35] dark:text-[#c2e7ff]'
              : 'text-slate-600 dark:text-[#9aa0a6] hover:bg-slate-200/50 dark:hover:bg-white/5'
          }`}
        >
          <CheckSquare className="w-5 h-5 stroke-[2]" />
          {todoCount > 0 && (
            <span className="absolute top-0.5 right-2 px-1 text-[9px] font-bold bg-emerald-600 dark:bg-emerald-400 text-white dark:text-black rounded-full leading-tight">
              {todoCount}
            </span>
          )}
        </div>
        <span
          className={`text-[11px] mt-0.5 tracking-tight ${
            activeTab === 'todo'
              ? 'font-semibold text-slate-900 dark:text-white'
              : 'font-normal text-slate-600 dark:text-[#9aa0a6]'
          }`}
          style={{ fontFamily: "'Google Sans', sans-serif" }}
        >
          To-Do
        </span>
      </button>

      {/* 4. Gemini Tab */}
      <button
        type="button"
        onClick={() => {
          onChangeTab('gemini');
          onOpenAiAdvisor();
        }}
        className="flex flex-col items-center justify-center flex-1 cursor-pointer transition-all group"
      >
        <div
          className={`w-14 h-8 rounded-full flex items-center justify-center transition-all ${
            activeTab === 'gemini'
              ? 'bg-[#c2e7ff] dark:bg-[#004a77] text-[#001d35] dark:text-[#c2e7ff]'
              : 'text-slate-600 dark:text-[#9aa0a6] hover:bg-slate-200/50 dark:hover:bg-white/5'
          }`}
        >
          <img
            src="/gemini-icon.png"
            alt="Gemini"
            className="w-5 h-5 object-contain"
          />
        </div>
        <span
          className={`text-[11px] mt-0.5 tracking-tight ${
            activeTab === 'gemini'
              ? 'font-semibold text-slate-900 dark:text-white'
              : 'font-normal text-slate-600 dark:text-[#9aa0a6]'
          }`}
          style={{ fontFamily: "'Google Sans', sans-serif" }}
        >
          Gemini
        </span>
      </button>
    </nav>
  );
};
