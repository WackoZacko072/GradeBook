import React from 'react';
import { BookOpen, Sparkles, BookMarked, BookCheck } from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: 'gradebook' | 'notebook' | 'slab';
  onChangeTab: (tab: 'gradebook' | 'notebook' | 'slab') => void;
  selectedClassId: string | null;
  classCount?: number;
  noteCount?: number;
  slabCount?: number;
  onSelectOverview: () => void;
  onOpenMobileDrawer?: () => void;
  onOpenAddClass?: () => void;
  onOpenAddNote?: () => void;
  onOpenAddSlab?: () => void;
  onOpenTranscript?: () => void;
  onOpenAiAdvisor: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onChangeTab,
  selectedClassId,
  noteCount = 0,
  slabCount = 0,
  onSelectOverview,
  onOpenAiAdvisor,
}) => {
  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0f0f10]/95 backdrop-blur-md border-t border-slate-200/90 dark:border-[#26282a] shadow-lg px-3 py-2 flex items-center justify-around pb-[max(0.6rem,env(safe-area-inset-bottom))]"
    >
      {/* 1. Gradebook Tab */}
      <button
        type="button"
        onClick={() => {
          onChangeTab('gradebook');
          onSelectOverview();
        }}
        className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 cursor-pointer transition-colors google-btn-press ${
          activeTab === 'gradebook' && selectedClassId === null
            ? 'text-blue-600 dark:text-[#8ab4f8] font-bold'
            : 'text-slate-500 dark:text-[#9aa0a6] hover:text-slate-800 dark:hover:text-[#e8eaed]'
        }`}
      >
        <div
          className={`p-1.5 rounded-xl transition-all ${
            activeTab === 'gradebook' && selectedClassId === null ? 'bg-blue-50 dark:bg-blue-950/40' : ''
          }`}
        >
          <BookOpen className="w-5 h-5 stroke-[2.2]" />
        </div>
        <span className="text-[11px] tracking-tight">Gradebook</span>
      </button>

      {/* 2. Notebook Tab */}
      <button
        type="button"
        onClick={() => onChangeTab('notebook')}
        className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 cursor-pointer transition-colors relative google-btn-press ${
          activeTab === 'notebook'
            ? 'text-indigo-600 dark:text-[#c58af9] font-bold'
            : 'text-slate-500 dark:text-[#9aa0a6] hover:text-slate-800 dark:hover:text-[#e8eaed]'
        }`}
      >
        <div
          className={`p-1.5 rounded-xl transition-all relative ${
            activeTab === 'notebook' ? 'bg-indigo-50 dark:bg-indigo-950/40' : ''
          }`}
        >
          <BookMarked className="w-5 h-5 stroke-[2.2]" />
          {noteCount > 0 && (
            <span className="absolute -top-1 -right-1 px-1.5 py-0.2 text-[8px] font-extrabold bg-indigo-600 dark:bg-[#c58af9] text-white dark:text-[#0f0f10] rounded-full leading-tight">
              {noteCount}
            </span>
          )}
        </div>
        <span className="text-[11px] tracking-tight">Notebook</span>
      </button>

      {/* 3. Office Tab (renamed from Slab) */}
      <button
        type="button"
        onClick={() => onChangeTab('slab')}
        className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 cursor-pointer transition-colors relative google-btn-press ${
          activeTab === 'slab'
            ? 'text-violet-600 dark:text-[#c58af9] font-bold'
            : 'text-slate-500 dark:text-[#9aa0a6] hover:text-slate-800 dark:hover:text-[#e8eaed]'
        }`}
      >
        <div
          className={`p-1.5 rounded-xl transition-all relative ${
            activeTab === 'slab' ? 'bg-violet-50 dark:bg-violet-950/40' : ''
          }`}
        >
          <BookCheck className="w-5 h-5 stroke-[2.2]" />
          {slabCount > 0 && (
            <span className="absolute -top-1 -right-1 px-1.5 py-0.2 text-[8px] font-extrabold bg-violet-600 dark:bg-[#c58af9] text-white dark:text-[#0f0f10] rounded-full leading-tight">
              {slabCount}
            </span>
          )}
        </div>
        <span className="text-[11px] tracking-tight">Office</span>
      </button>

      {/* 4. Gemini Tab (renamed from Slate AI / AI Advisor) */}
      <button
        type="button"
        onClick={onOpenAiAdvisor}
        className="flex flex-col items-center justify-center gap-1 flex-1 py-1 cursor-pointer transition-colors text-blue-600 dark:text-[#8ab4f8] hover:text-blue-700 dark:hover:text-blue-300 font-semibold google-btn-press"
      >
        <div className="p-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-[#8ab4f8]">
          <Sparkles className="w-5 h-5 stroke-[2.2]" />
        </div>
        <span className="text-[11px] tracking-tight">Gemini</span>
      </button>
    </nav>
  );
};
