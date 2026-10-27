import React from 'react';
import { BookOpen, Plus, Sparkles, BookMarked, BookCheck, Layers } from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: 'gradebook' | 'notebook' | 'slab';
  onChangeTab: (tab: 'gradebook' | 'notebook' | 'slab') => void;
  selectedClassId: string | null;
  classCount: number;
  noteCount?: number;
  slabCount?: number;
  onSelectOverview: () => void;
  onOpenMobileDrawer: () => void;
  onOpenAddClass: () => void;
  onOpenAddNote?: () => void;
  onOpenAddSlab?: () => void;
  onOpenTranscript?: () => void;
  onOpenAiAdvisor: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onChangeTab,
  selectedClassId,
  classCount,
  noteCount = 0,
  slabCount = 0,
  onSelectOverview,
  onOpenMobileDrawer,
  onOpenAddClass,
  onOpenAddNote,
  onOpenAddSlab,
  onOpenAiAdvisor,
}) => {
  const handleCenterAdd = () => {
    if (activeTab === 'notebook' && onOpenAddNote) {
      onOpenAddNote();
    } else if (activeTab === 'slab' && onOpenAddSlab) {
      onOpenAddSlab();
    } else {
      onOpenAddClass();
    }
  };

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#1e1f20]/95 backdrop-blur-md border-t border-slate-200/90 dark:border-[#3c4043] shadow-lg px-2 py-1.5 flex items-center justify-around pb-[max(0.6rem,env(safe-area-inset-bottom))]"
    >
      {/* 1. Gradebook Tab */}
      <button
        type="button"
        onClick={() => {
          onChangeTab('gradebook');
          onSelectOverview();
        }}
        className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 cursor-pointer transition-colors google-btn-press ${
          activeTab === 'gradebook' && selectedClassId === null
            ? 'text-blue-600 dark:text-[#8ab4f8] font-bold'
            : 'text-slate-500 dark:text-[#9aa0a6] hover:text-slate-800 dark:hover:text-[#e8eaed]'
        }`}
      >
        <div
          className={`p-1 rounded-xl transition-all ${
            activeTab === 'gradebook' && selectedClassId === null ? 'bg-blue-50 dark:bg-blue-950/40' : ''
          }`}
        >
          <Layers className="w-4 h-4" />
        </div>
        <span className="text-[10px] tracking-tight">Gradebook</span>
      </button>

      {/* 2. Notebook Tab */}
      <button
        type="button"
        onClick={() => onChangeTab('notebook')}
        className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 cursor-pointer transition-colors relative google-btn-press ${
          activeTab === 'notebook' ? 'text-indigo-600 dark:text-[#c58af9] font-bold' : 'text-slate-500 dark:text-[#9aa0a6] hover:text-slate-800 dark:hover:text-[#e8eaed]'
        }`}
      >
        <div
          className={`p-1 rounded-xl transition-all relative ${
            activeTab === 'notebook' ? 'bg-indigo-50 dark:bg-indigo-950/40' : ''
          }`}
        >
          <BookMarked className="w-4 h-4" />
          {noteCount > 0 && (
            <span className="absolute -top-1 -right-1.5 px-1.5 py-0.2 text-[8px] font-extrabold bg-indigo-600 dark:bg-[#c58af9] text-white dark:text-[#1e1f20] rounded-full leading-tight">
              {noteCount}
            </span>
          )}
        </div>
        <span className="text-[10px] tracking-tight">Sources</span>
      </button>

      {/* 3. Slab Tab (Flashcards & MCQs) */}
      <button
        type="button"
        onClick={() => onChangeTab('slab')}
        className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 cursor-pointer transition-colors relative google-btn-press ${
          activeTab === 'slab' ? 'text-violet-600 dark:text-[#c58af9] font-bold' : 'text-slate-500 dark:text-[#9aa0a6] hover:text-slate-800 dark:hover:text-[#e8eaed]'
        }`}
      >
        <div
          className={`p-1 rounded-xl transition-all relative ${
            activeTab === 'slab' ? 'bg-violet-50 dark:bg-violet-950/40' : ''
          }`}
        >
          <BookCheck className="w-4 h-4" />
          {slabCount > 0 && (
            <span className="absolute -top-1 -right-1.5 px-1.5 py-0.2 text-[8px] font-extrabold bg-violet-600 dark:bg-[#c58af9] text-white dark:text-[#1e1f20] rounded-full leading-tight">
              {slabCount}
            </span>
          )}
        </div>
        <span className="text-[10px] tracking-tight">Slab</span>
      </button>

      {/* 4. Center Add Action Button */}
      <div className="flex-1 flex justify-center -mt-3.5">
        <button
          type="button"
          onClick={handleCenterAdd}
          className={`w-11 h-11 rounded-2xl active:scale-95 text-white flex items-center justify-center shadow-lg transition-all cursor-pointer border-2 border-white dark:border-[#1e1f20] google-btn-press ${
            activeTab === 'slab'
              ? 'bg-violet-600 hover:bg-violet-700 shadow-violet-500/30'
              : activeTab === 'notebook'
              ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/30'
              : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30'
          }`}
          title={
            activeTab === 'slab'
              ? 'Create Slab Set'
              : activeTab === 'notebook'
              ? 'Create Note'
              : 'Add Class'
          }
          aria-label={
            activeTab === 'slab'
              ? 'Create Slab Set'
              : activeTab === 'notebook'
              ? 'Create Note'
              : 'Add Class'
          }
        >
          <Plus className="w-5 h-5 stroke-[2.6]" />
        </button>
      </div>

      {/* 5. Classes Drawer Tab */}
      <button
        type="button"
        onClick={onOpenMobileDrawer}
        className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 cursor-pointer transition-colors relative google-btn-press ${
          selectedClassId !== null ? 'text-blue-600 dark:text-[#8ab4f8] font-bold' : 'text-slate-500 dark:text-[#9aa0a6] hover:text-slate-800 dark:hover:text-[#e8eaed]'
        }`}
      >
        <div
          className={`p-1 rounded-xl transition-all relative ${
            selectedClassId !== null ? 'bg-blue-50 dark:bg-blue-950/40' : ''
          }`}
        >
          <BookOpen className="w-4 h-4" />
          {classCount > 0 && (
            <span className="absolute -top-1 -right-1.5 px-1.5 py-0.2 text-[8px] font-extrabold bg-blue-600 dark:bg-[#8ab4f8] text-white dark:text-[#1e1f20] rounded-full leading-tight">
              {classCount}
            </span>
          )}
        </div>
        <span className="text-[10px] tracking-tight">Classes</span>
      </button>

      {/* 6. AI Advisor Tab */}
      <button
        type="button"
        onClick={onOpenAiAdvisor}
        className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1 cursor-pointer transition-colors text-blue-600 dark:text-[#8ab4f8] hover:text-blue-700 dark:hover:text-blue-300 font-semibold google-btn-press"
      >
        <div className="p-1 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-[#8ab4f8]">
          <Sparkles className="w-4 h-4 stroke-[2.2]" />
        </div>
        <span className="text-[10px] tracking-tight">AI Advisor</span>
      </button>
    </nav>
  );
};
