import React from 'react';
import { BookOpen, Plus, Sparkles, BookMarked, Layers } from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: 'gradebook' | 'notebook';
  onChangeTab: (tab: 'gradebook' | 'notebook') => void;
  selectedClassId: string | null;
  classCount: number;
  noteCount?: number;
  onSelectOverview: () => void;
  onOpenMobileDrawer: () => void;
  onOpenAddClass: () => void;
  onOpenAddNote?: () => void;
  onOpenTranscript?: () => void;
  onOpenAiAdvisor: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onChangeTab,
  selectedClassId,
  classCount,
  noteCount = 0,
  onSelectOverview,
  onOpenMobileDrawer,
  onOpenAddClass,
  onOpenAddNote,
  onOpenAiAdvisor,
}) => {
  const handleCenterAdd = () => {
    if (activeTab === 'notebook' && onOpenAddNote) {
      onOpenAddNote();
    } else {
      onOpenAddClass();
    }
  };

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-lg px-2 py-1.5 flex items-center justify-around pb-[max(0.6rem,env(safe-area-inset-bottom))]"
    >
      {/* 1. Gradebook Tab */}
      <button
        type="button"
        onClick={() => {
          onChangeTab('gradebook');
          onSelectOverview();
        }}
        className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 cursor-pointer transition-colors ${
          activeTab === 'gradebook' && selectedClassId === null
            ? 'text-blue-600 font-bold'
            : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <div
          className={`p-1 rounded-xl transition-all ${
            activeTab === 'gradebook' && selectedClassId === null ? 'bg-blue-50' : ''
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
        className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 cursor-pointer transition-colors relative ${
          activeTab === 'notebook' ? 'text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <div
          className={`p-1 rounded-xl transition-all relative ${
            activeTab === 'notebook' ? 'bg-indigo-50' : ''
          }`}
        >
          <BookMarked className="w-4 h-4" />
          {noteCount > 0 && (
            <span className="absolute -top-1 -right-1.5 px-1.5 py-0.2 text-[8px] font-extrabold bg-indigo-600 text-white rounded-full leading-tight">
              {noteCount}
            </span>
          )}
        </div>
        <span className="text-[10px] tracking-tight">Notebook</span>
      </button>

      {/* 3. Center Add Action Button (Class or Note depending on active tab) */}
      <div className="flex-1 flex justify-center -mt-3.5">
        <button
          type="button"
          onClick={handleCenterAdd}
          className={`w-11 h-11 rounded-2xl active:scale-95 text-white flex items-center justify-center shadow-lg transition-all cursor-pointer border-2 border-white ${
            activeTab === 'notebook'
              ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/30'
              : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30'
          }`}
          title={activeTab === 'notebook' ? 'Create Note' : 'Add Class'}
          aria-label={activeTab === 'notebook' ? 'Create Note' : 'Add Class'}
        >
          <Plus className="w-5 h-5 stroke-[2.6]" />
        </button>
      </div>

      {/* 4. Classes Drawer Tab */}
      <button
        type="button"
        onClick={onOpenMobileDrawer}
        className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 cursor-pointer transition-colors relative ${
          selectedClassId !== null ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <div
          className={`p-1 rounded-xl transition-all relative ${
            selectedClassId !== null ? 'bg-blue-50' : ''
          }`}
        >
          <BookOpen className="w-4 h-4" />
          {classCount > 0 && (
            <span className="absolute -top-1 -right-1.5 px-1.5 py-0.2 text-[8px] font-extrabold bg-blue-600 text-white rounded-full leading-tight">
              {classCount}
            </span>
          )}
        </div>
        <span className="text-[10px] tracking-tight">Classes</span>
      </button>

      {/* 5. AI Advisor Tab */}
      <button
        type="button"
        onClick={onOpenAiAdvisor}
        className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1 cursor-pointer transition-colors text-blue-600 hover:text-blue-700 font-semibold"
      >
        <div className="p-1 rounded-xl bg-blue-50 text-blue-600">
          <Sparkles className="w-4 h-4 text-blue-600 stroke-[2.2]" />
        </div>
        <span className="text-[10px] tracking-tight">AI Advisor</span>
      </button>
    </nav>
  );
};
