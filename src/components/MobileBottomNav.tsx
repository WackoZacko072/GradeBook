import React from 'react';
import { Layers, BookOpen, Plus, DownloadCloud, Sparkles } from 'lucide-react';

interface MobileBottomNavProps {
  selectedClassId: string | null;
  classCount: number;
  onSelectOverview: () => void;
  onOpenMobileDrawer: () => void;
  onOpenAddClass: () => void;
  onOpenBackup: () => void;
  onOpenAiAdvisor: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  selectedClassId,
  classCount,
  onSelectOverview,
  onOpenMobileDrawer,
  onOpenAddClass,
  onOpenBackup,
  onOpenAiAdvisor,
}) => {
  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-lg px-2 py-1.5 flex items-center justify-around pb-[max(0.6rem,env(safe-area-inset-bottom))]"
    >
      {/* 1. Overview Tab */}
      <button
        type="button"
        onClick={onSelectOverview}
        className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 cursor-pointer transition-colors ${
          selectedClassId === null ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <div className={`p-1 rounded-xl transition-all ${selectedClassId === null ? 'bg-blue-50' : ''}`}>
          <Layers className="w-4 h-4" />
        </div>
        <span className="text-[10px] tracking-tight">Overview</span>
      </button>

      {/* 2. Classes Drawer Tab */}
      <button
        type="button"
        onClick={onOpenMobileDrawer}
        className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 cursor-pointer transition-colors relative ${
          selectedClassId !== null ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <div className={`p-1 rounded-xl transition-all relative ${selectedClassId !== null ? 'bg-blue-50' : ''}`}>
          <BookOpen className="w-4 h-4" />
          {classCount > 0 && (
            <span className="absolute -top-1 -right-1.5 px-1.5 py-0.2 text-[8px] font-extrabold bg-blue-600 text-white rounded-full leading-tight">
              {classCount}
            </span>
          )}
        </div>
        <span className="text-[10px] tracking-tight">Classes</span>
      </button>

      {/* 3. Center Add Class Action Button */}
      <div className="flex-1 flex justify-center -mt-3.5">
        <button
          type="button"
          onClick={onOpenAddClass}
          className="w-11 h-11 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 transition-all cursor-pointer border-2 border-white"
          title="Add Class"
          aria-label="Add Class"
        >
          <Plus className="w-5 h-5 stroke-[2.6]" />
        </button>
      </div>

      {/* 4. AI Advisor Tab */}
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

      {/* 5. Backup & Data */}
      <button
        type="button"
        onClick={onOpenBackup}
        className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1 cursor-pointer transition-colors text-slate-500 hover:text-slate-800"
      >
        <div className="p-1 rounded-xl">
          <DownloadCloud className="w-4 h-4" />
        </div>
        <span className="text-[10px] tracking-tight">Backup</span>
      </button>
    </nav>
  );
};
