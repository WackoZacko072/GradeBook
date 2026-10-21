import React from 'react';
import { BookOpen, ShieldCheck, CheckCircle2, DownloadCloud, GraduationCap } from 'lucide-react';

interface HeaderProps {
  onOpenBackup: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenBackup }) => {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200/80 transition-all">
      <div className="w-full px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Left: Logo & Brand aligned with sidebar width */}
        <div className="w-56 sm:w-60 flex items-center gap-2.5 flex-shrink-0">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
            <BookOpen className="w-5 h-5 stroke-[2.2]" />
          </div>
          <span className="font-extrabold text-xl text-slate-900 tracking-tight select-none">
            gradebook<span className="text-blue-600">.</span>
          </span>
        </div>

        {/* Center: Segmented Navigation Pill (matching screenshot) */}
        <div className="hidden md:flex items-center p-1 bg-slate-100/90 rounded-2xl border border-slate-200/60 shadow-2xs">
          <button
            type="button"
            className="flex items-center gap-1.5 px-4 py-1.5 bg-white text-blue-700 font-semibold text-xs rounded-xl shadow-xs border border-slate-200/50 cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-600" />
            <span>Gradebook</span>
          </button>
          <div
            title="University Planner"
            className="flex items-center gap-1.5 px-4 py-1.5 text-slate-500 font-medium text-xs rounded-xl opacity-75 select-none"
          >
            <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
            <span>University Planner</span>
          </div>
        </div>

        {/* Right: Status Indicators & Backup */}
        <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-200/70 text-slate-600 rounded-full text-xs font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            <span>Private to you</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
            <span>All changes saved</span>
          </div>

          <button
            type="button"
            onClick={onOpenBackup}
            title="Export / Restore Backup"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer min-h-[36px]"
          >
            <DownloadCloud className="w-3.5 h-3.5 text-slate-500" />
            <span>Backup</span>
          </button>
        </div>
      </div>
    </header>
  );
};
