import React, { useState } from 'react';
import {
  X,
  Sparkles,
  BookCheck,
  AlertCircle,
  FileText,
  Check,
  ChevronRight,
  Layers,
  HelpCircle,
} from 'lucide-react';
import type { NoteItem, NoteSource } from '../../types/notebook';
import type { SlabItem, SlabType } from '../../types/slab';
import type { ClassItem } from '../../types/grade';
import { generateSlabSet } from '../../utils/slabAiService';

interface CreateSlabModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes?: ClassItem[];
  notes?: NoteItem[];
  sources?: NoteSource[];
  initialPrompt?: string;
  initialType?: SlabType;
  initialSourceIds?: string[];
  onCreateSlab: (slab: SlabItem) => void;
}

const PROMPT_SUGGESTIONS = [
  'Key concepts, terms, and applications from my sources',
  'Core definitions, formulas, and fundamental laws',
  'Challenging questions extending concepts from my files',
  'Comprehensive exam review with diverse question styles',
];

export const CreateSlabModal: React.FC<CreateSlabModalProps> = ({
  isOpen,
  onClose,
  classes = [],
  notes = [],
  sources = [],
  initialPrompt = '',
  initialType = 'flashcards',
  initialSourceIds = [],
  onCreateSlab,
}) => {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [slabType, setSlabType] = useState<SlabType>(initialType);
  const [selectedClassNotebook, setSelectedClassNotebook] = useState<string>('all');
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>(initialSourceIds);
  const [selectedNoteIds] = useState<string[]>([]);
  const [useAllSources, setUseAllSources] = useState(initialSourceIds.length === 0);
  const [quantity, setQuantity] = useState<'less' | 'standard' | 'more'>('standard');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Filter sources for currently chosen class notebook
  const availableSources =
    selectedClassNotebook === 'all'
      ? sources
      : sources.filter((s) => s.classId === selectedClassNotebook);

  const selectedClassEntity = classes.find((c) => c.id === selectedClassNotebook);

  const handlePromptChange = (val: string) => {
    setPrompt(val);
    const numMatch = val.match(/\b(\d+)\s*(?:flashcards?|cards?|mcqs?|questions?|items?)\b/i);
    if (numMatch) {
      const num = parseInt(numMatch[1], 10);
      if (num <= 12) setQuantity('less');
      else if (num >= 25) setQuantity('more');
      else setQuantity('standard');
    }
    if (/\beasy\b/i.test(val)) setDifficulty('easy');
    else if (/\bhard\b|\bchallenging\b|\badvanced\b/i.test(val)) setDifficulty('hard');
  };

  const handleToggleSource = (id: string) => {
    setSelectedSourceIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setError(null);

    try {
      const countMap = {
        less: 10,
        standard: 20,
        more: 30,
      };
      const effectiveCount = countMap[quantity];

      const targetSources =
        selectedClassNotebook === 'all'
          ? sources
          : sources.filter((s) => s.classId === selectedClassNotebook);

      const effectiveSourceIds = useAllSources
        ? selectedClassNotebook === 'all'
          ? undefined
          : targetSources.map((s) => s.id)
        : selectedSourceIds;

      const generated = await generateSlabSet({
        prompt,
        type: slabType,
        notes,
        sources,
        selectedSourceIds: effectiveSourceIds,
        selectedNoteIds: useAllSources ? undefined : selectedNoteIds,
        count: effectiveCount,
        difficulty,
        classId: selectedClassNotebook === 'all' ? undefined : selectedClassNotebook,
        className: selectedClassEntity?.name,
      });

      onCreateSlab(generated);
      onClose();
    } catch (err: any) {
      console.error('Error generating Slab:', err);
      let msg = err.message || 'Failed to generate Office study set. Please try again.';
      if (msg === 'QUOTA_EXCEEDED') {
        msg = 'Gemini API quota exceeded. Please wait a moment and try again.';
      }
      setError(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 dark:bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#18191b] rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200/80 dark:border-[#26282a] flex flex-col max-h-[calc(100vh-2rem)] sm:max-h-[88vh] min-h-0 my-auto animate-fade-scale overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-[#26282a] flex items-center justify-between bg-slate-50/70 dark:bg-[#242526] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 via-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-xs">
              <BookCheck className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-[#e8eaed] tracking-tight flex items-center gap-2">
                <span>Create New Office Set</span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-violet-100 dark:bg-violet-950/50 text-violet-700 dark:text-[#c58af9] px-2 py-0.5 rounded-full">
                  Gemini Powered
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-[#9aa0a6]">
                Generate interactive flashcards & MCQs grounded in your notes & files
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isGenerating}
            onClick={onClose}
            className="p-2 text-slate-400 dark:text-[#9aa0a6] hover:text-slate-600 dark:hover:text-[#e8eaed] hover:bg-slate-200/60 dark:hover:bg-[#202123] rounded-xl transition-colors cursor-pointer google-btn-press"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleGenerate} className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Error Banner */}
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-300 animate-in slide-in-from-top-1">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{error}</div>
            </div>
          )}

          {/* 1. Prompt Text Area */}
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-[#e8eaed] mb-1.5">
              What do you want Gemini to create?
            </label>
            <textarea
              required
              rows={3}
              value={prompt}
              onChange={(e) => handlePromptChange(e.target.value)}
              disabled={isGenerating}
              placeholder="e.g. Look at my Biology sources and create flashcards on cellular respiration and ATP..."
              className="w-full text-xs sm:text-sm p-3.5 bg-slate-50 dark:bg-[#0f0f10] border border-slate-200 dark:border-[#26282a] rounded-2xl focus:bg-white dark:focus:bg-[#0f0f10] focus:outline-hidden focus:ring-2 focus:ring-violet-500 transition-all text-slate-900 dark:text-[#e8eaed] placeholder-slate-400 dark:placeholder-[#5f6368] leading-relaxed shadow-2xs"
            />

            {/* Prompt suggestion chips */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {PROMPT_SUGGESTIONS.map((sug, i) => (
                <button
                  key={i}
                  type="button"
                  disabled={isGenerating}
                  onClick={() => handlePromptChange(sug)}
                  className="text-[11px] px-2.5 py-1 bg-slate-100 dark:bg-[#202123] hover:bg-violet-50 dark:hover:bg-violet-950/40 text-slate-600 dark:text-[#c4c7c5] hover:text-violet-700 dark:hover:text-[#c58af9] rounded-lg transition-colors cursor-pointer border border-slate-200/60 dark:border-[#26282a] font-medium truncate max-w-full google-btn-press"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Format / Type Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-[#e8eaed] mb-2">
              Select Study Format
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                disabled={isGenerating}
                onClick={() => setSlabType('flashcards')}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all cursor-pointer google-btn-press ${
                  slabType === 'flashcards'
                    ? 'bg-violet-50/80 dark:bg-violet-950/40 border-violet-500 text-violet-800 dark:text-[#c58af9] ring-2 ring-violet-500/20 shadow-2xs'
                    : 'bg-white dark:bg-[#0f0f10] border-slate-200 dark:border-[#26282a] text-slate-700 dark:text-[#c4c7c5] hover:bg-slate-50 dark:hover:bg-[#202123]'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-[#c58af9] flex items-center justify-center mb-1.5">
                  <Layers className="w-4 h-4 stroke-[2.2]" />
                </div>
                <span className="text-xs font-bold">Flashcards</span>
                <span className="text-[10px] text-slate-500 dark:text-[#9aa0a6] mt-0.5">Flip & recall</span>
              </button>

              <button
                type="button"
                disabled={isGenerating}
                onClick={() => setSlabType('mcq')}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all cursor-pointer google-btn-press ${
                  slabType === 'mcq'
                    ? 'bg-violet-50/80 dark:bg-violet-950/40 border-violet-500 text-violet-800 dark:text-[#c58af9] ring-2 ring-violet-500/20 shadow-2xs'
                    : 'bg-white dark:bg-[#0f0f10] border-slate-200 dark:border-[#26282a] text-slate-700 dark:text-[#c4c7c5] hover:bg-slate-50 dark:hover:bg-[#202123]'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-[#c58af9] flex items-center justify-center mb-1.5">
                  <HelpCircle className="w-4 h-4 stroke-[2.2]" />
                </div>
                <span className="text-xs font-bold">Practice MCQs</span>
                <span className="text-[10px] text-slate-500 dark:text-[#9aa0a6] mt-0.5">Quiz & rationale</span>
              </button>

              <button
                type="button"
                disabled={isGenerating}
                onClick={() => setSlabType('both')}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all cursor-pointer google-btn-press ${
                  slabType === 'both'
                    ? 'bg-violet-50/80 dark:bg-violet-950/40 border-violet-500 text-violet-800 dark:text-[#c58af9] ring-2 ring-violet-500/20 shadow-2xs'
                    : 'bg-white dark:bg-[#0f0f10] border-slate-200 dark:border-[#26282a] text-slate-700 dark:text-[#c4c7c5] hover:bg-slate-50 dark:hover:bg-[#202123]'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-[#c58af9] flex items-center justify-center mb-1.5">
                  <BookCheck className="w-4 h-4 stroke-[2.2]" />
                </div>
                <span className="text-xs font-bold">Full Set (Both)</span>
                <span className="text-[10px] text-slate-500 dark:text-[#9aa0a6] mt-0.5">Cards + MCQs</span>
              </button>
            </div>
          </div>

          {/* 3. Quantity Selector: Less, Standard, More */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-800 dark:text-[#e8eaed]">
                Quantity
              </label>
              <span className="text-[11px] font-bold text-violet-600 dark:text-[#c58af9] bg-violet-50 dark:bg-violet-950/40 px-2.5 py-0.5 rounded-full">
                {quantity === 'less' ? 'Less (~10 items)' : quantity === 'more' ? 'More (~30 items)' : 'Standard (~20 items)'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'less' as const, label: 'Less', desc: '~10 items' },
                { id: 'standard' as const, label: 'Standard', desc: '~20 items' },
                { id: 'more' as const, label: 'More', desc: '~30 items' },
              ].map((q) => {
                const isSelected = quantity === q.id;
                return (
                  <button
                    key={q.id}
                    type="button"
                    disabled={isGenerating}
                    onClick={() => setQuantity(q.id)}
                    className={`py-2 px-2.5 rounded-xl border text-center transition-all cursor-pointer google-btn-press ${
                      isSelected
                        ? 'bg-violet-600 text-white border-violet-600 shadow-2xs font-extrabold'
                        : 'bg-white dark:bg-[#0f0f10] text-slate-700 dark:text-[#c4c7c5] border-slate-200 dark:border-[#26282a] hover:bg-slate-50 dark:hover:bg-[#202123]'
                    }`}
                  >
                    <div className="text-xs font-bold">{q.label}</div>
                    <div
                      className={`text-[10px] mt-0.5 ${
                        isSelected ? 'text-violet-100' : 'text-slate-400 dark:text-[#9aa0a6]'
                      }`}
                    >
                      {q.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Difficulty Selector: Easy, Medium, Hard */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-800 dark:text-[#e8eaed]">
                Difficulty Level
              </label>
              <span className="text-[11px] font-bold text-violet-600 dark:text-[#c58af9] bg-violet-50 dark:bg-violet-950/40 px-2.5 py-0.5 rounded-full capitalize">
                {difficulty}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'easy' as const, label: 'Easy', desc: 'Core terms & concepts' },
                { id: 'medium' as const, label: 'Medium', desc: 'Standard exam level' },
                { id: 'hard' as const, label: 'Hard', desc: 'Deep synthesis & edge cases' },
              ].map((d) => {
                const isSelected = difficulty === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    disabled={isGenerating}
                    onClick={() => setDifficulty(d.id)}
                    className={`py-2 px-2.5 rounded-xl border text-center transition-all cursor-pointer google-btn-press ${
                      isSelected
                        ? 'bg-violet-600 text-white border-violet-600 shadow-2xs font-extrabold'
                        : 'bg-white dark:bg-[#0f0f10] text-slate-700 dark:text-[#c4c7c5] border-slate-200 dark:border-[#26282a] hover:bg-slate-50 dark:hover:bg-[#202123]'
                    }`}
                  >
                    <div className="text-xs font-bold">{d.label}</div>
                    <div
                      className={`text-[10px] mt-0.5 ${
                        isSelected ? 'text-violet-100' : 'text-slate-400 dark:text-[#9aa0a6]'
                      }`}
                    >
                      {d.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. Choose Class Notebook */}
          {classes.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-[#e8eaed] mb-1.5">
                Choose Class Notebook
              </label>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={() => setSelectedClassNotebook('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer google-btn-press ${
                    selectedClassNotebook === 'all'
                      ? 'bg-violet-600 text-white shadow-2xs'
                      : 'bg-white dark:bg-[#0f0f10] text-slate-600 dark:text-[#c4c7c5] hover:bg-slate-100 dark:hover:bg-[#202123] border border-slate-200 dark:border-[#26282a]'
                  }`}
                >
                  <span>All Classes</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      selectedClassNotebook === 'all'
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 dark:bg-[#26282a]'
                    }`}
                  >
                    {sources.length}
                  </span>
                </button>

                {classes.map((cls) => {
                  const count = sources.filter((s) => s.classId === cls.id).length;
                  const isSelected = selectedClassNotebook === cls.id;
                  return (
                    <button
                      key={cls.id}
                      type="button"
                      disabled={isGenerating}
                      onClick={() => setSelectedClassNotebook(cls.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer google-btn-press ${
                        isSelected
                          ? 'bg-violet-600 text-white shadow-2xs'
                          : 'bg-white dark:bg-[#0f0f10] text-slate-600 dark:text-[#c4c7c5] hover:bg-slate-100 dark:hover:bg-[#202123] border border-slate-200 dark:border-[#26282a]'
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: cls.color || '#8B5CF6' }}
                      />
                      <span className="truncate max-w-[120px]">{cls.name}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-[#26282a]'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 6. Grounded Class Sources (PDFs, Files & Notes) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800 dark:text-[#e8eaed]">
                Grounded Class Sources & Files
              </label>
              <button
                type="button"
                disabled={isGenerating}
                onClick={() => setUseAllSources(!useAllSources)}
                className="text-[11px] font-semibold text-violet-600 dark:text-[#c58af9] hover:underline cursor-pointer"
              >
                {useAllSources ? 'Pick specific sources' : 'Use all sources'}
              </button>
            </div>

            {useAllSources ? (
              <div className="p-3 bg-slate-50 dark:bg-[#0f0f10] border border-slate-200/80 dark:border-[#26282a] rounded-2xl flex items-center justify-between text-xs text-slate-600 dark:text-[#c4c7c5]">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-violet-600 dark:text-[#c58af9] flex-shrink-0" />
                  <span>
                    {selectedClassEntity
                      ? `Analyzing all ${availableSources.length} sources from ${selectedClassEntity.name}`
                      : `Analyzing all ${sources.length > 0 ? sources.length : notes.length} sources and uploaded materials`}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                  All Grounded
                </span>
              </div>
            ) : (
              <div className="border border-slate-200 dark:border-[#26282a] rounded-2xl p-2.5 max-h-40 overflow-y-auto space-y-1.5 bg-slate-50 dark:bg-[#0f0f10]">
                {availableSources.length === 0 ? (
                  <p className="text-xs text-slate-400 dark:text-[#9aa0a6] p-2 text-center">
                    {selectedClassEntity
                      ? `No sources uploaded in ${selectedClassEntity.name} yet.`
                      : 'No sources uploaded yet.'} Gemini will formulate high-yield questions extending your prompt!
                  </p>
                ) : (
                  availableSources.map((s) => {
                    const isChecked = selectedSourceIds.includes(s.id);
                    return (
                      <div
                        key={s.id}
                        onClick={() => !isGenerating && handleToggleSource(s.id)}
                        className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-violet-100/70 dark:bg-violet-950/50 text-violet-900 dark:text-[#c58af9] font-semibold'
                            : 'hover:bg-slate-100 dark:hover:bg-[#202123] text-slate-700 dark:text-[#c4c7c5]'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-xs font-bold px-1.5 py-0.5 bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-[#c58af9] rounded">
                            {s.type.toUpperCase()}
                          </span>
                          <span className="truncate">{s.name}</span>
                          {s.className && (
                            <span className="text-[10px] bg-slate-200/80 dark:bg-[#202123] text-slate-600 dark:text-[#9aa0a6] px-1.5 py-0.2 rounded-md">
                              {s.className}
                            </span>
                          )}
                        </div>
                        <div
                          className={`w-4 h-4 rounded-md border flex items-center justify-center flex-shrink-0 ${
                            isChecked
                              ? 'bg-violet-600 border-violet-600 text-white'
                              : 'border-slate-300 dark:border-[#5f6368] bg-white dark:bg-[#18191b]'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[2.8]" />}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </form>

        {/* Footer Actions */}
        <div className="p-3.5 sm:p-4 border-t border-slate-100 dark:border-[#26282a] bg-slate-50/70 dark:bg-[#242526] flex items-center justify-between gap-3 flex-shrink-0">
          <button
            type="button"
            disabled={isGenerating}
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-[#c4c7c5] hover:text-slate-800 dark:hover:text-[#e8eaed] hover:bg-slate-200/60 dark:hover:bg-[#202123] rounded-xl transition-colors cursor-pointer google-btn-press"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={!prompt.trim() || isGenerating}
            onClick={handleGenerate}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-tr from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-700 hover:via-purple-700 hover:to-indigo-700 active:scale-95 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-violet-500/25 transition-all cursor-pointer google-btn-press"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                <span>Gemini is generating...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 stroke-[2.2]" />
                <span>Generate Office Set</span>
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
