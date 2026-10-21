import React from 'react';
import { Layers, Plus, Calculator } from 'lucide-react';
import type { ClassItem } from '../types/grade';
import { calculateClassAverage } from '../utils/gradeCalculations';

interface SidebarProps {
  classes: ClassItem[];
  selectedClassId: string | null;
  onSelectOverview: () => void;
  onSelectClass: (id: string) => void;
  onOpenAddClass: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  classes,
  selectedClassId,
  onSelectOverview,
  onSelectClass,
  onOpenAddClass,
}) => {
  return (
    <aside className="w-64 bg-[#F8FAFC] border-r border-slate-200/80 flex flex-col justify-between p-4 flex-shrink-0 min-h-[calc(100vh-65px)]">
      <div className="space-y-6">
        {/* Workspace section */}
        <div>
          <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2 select-none">
            Workspace
          </span>
          <button
            type="button"
            onClick={onSelectOverview}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              selectedClassId === null
                ? 'bg-[#EBF2FE] text-[#2563EB] shadow-2xs'
                : 'text-slate-700 hover:bg-slate-200/60'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Layers className="w-4 h-4" />
              <span>Overview</span>
            </div>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                selectedClassId === null
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {classes.length}
            </span>
          </button>
        </div>

        {/* Your Classes section */}
        <div>
          <div className="flex items-center justify-between px-3 mb-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider select-none">
              Your Classes
            </span>
            <button
              type="button"
              onClick={onOpenAddClass}
              title="Add New Class"
              className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-200/80 rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>

          <div className="space-y-1">
            {classes.length === 0 ? (
              <p className="text-xs text-slate-400 px-3 py-2 italic">
                No classes added yet
              </p>
            ) : (
              classes.map((c) => {
                const isSelected = selectedClassId === c.id;
                const calc = calculateClassAverage(c);
                const dotColor = c.color || '#2563EB';

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onSelectClass(c.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white text-blue-700 font-semibold shadow-2xs border border-slate-200/80'
                        : 'text-slate-700 hover:bg-slate-200/60 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: dotColor }}
                      />
                      <span className="truncate">{c.name}</span>
                    </div>

                    <span className="text-xs font-bold text-slate-400 tabular-nums ml-2 flex-shrink-0">
                      {calc.average.toFixed(1)}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
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
    </aside>
  );
};
