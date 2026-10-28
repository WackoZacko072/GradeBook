import React, { useState, useEffect } from 'react';
import {
  X,
  BookCheck,
  AlertCircle,
  FileText,
  Check,
  ChevronRight,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { ModalPortal } from '../ModalPortal';
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

const EMPTY_CLASSES: ClassItem[] = [];
const EMPTY_NOTES: NoteItem[] = [];
const EMPTY_SOURCES: NoteSource[] = [];
const EMPTY_SOURCE_IDS: string[] = [];

export const CreateSlabModal: React.FC<CreateSlabModalProps> = ({
  isOpen,
  onClose,
  classes = EMPTY_CLASSES,
  notes = EMPTY_NOTES,
  sources = EMPTY_SOURCES,
  initialPrompt = '',
  initialType = 'flashcards',
  initialSourceIds = EMPTY_SOURCE_IDS,
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
  const wasOpenRef = React.useRef(false);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setError(null);
      if (initialPrompt) setPrompt(initialPrompt);
      setSlabType(initialType || 'flashcards');
      if (initialSourceIds && initialSourceIds.length > 0) {
        setSelectedSourceIds(initialSourceIds);
        setUseAllSources(false);
      } else {
        setSelectedSourceIds([]);
        setUseAllSources(true);
      }
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, initialPrompt, initialType, initialSourceIds]);

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
      if (num <= 10) setQuantity('less');
      else if (num >= 20) setQuantity('more');
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
    if (isGenerating) return;

    const classScope = selectedClassEntity ? ` for ${selectedClassEntity.name}` : ' from my course materials';
    const defaultPromptByDifficulty =
      difficulty === 'easy'
        ? `Foundational definitions, core terminology, and basic concept identification${classScope}`
        : difficulty === 'hard'
          ? `Advanced multi-step synthesis, challenging edge cases, complex problem-solving, and deep analytical questions${classScope}`
          : `Exam-standard conceptual applications, key mechanisms, and practical problem-solving questions${classScope}`;

    const finalPrompt = prompt.trim() || defaultPromptByDifficulty;

    setIsGenerating(true);
    setError(null);

    try {
      const countMap = {
        less: 8,
        standard: 12,
        more: 16,
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
        prompt: finalPrompt,
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
    <ModalPortal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-3xl"
      className="select-none"
      aria-labelledby="create-slab-title"
    >
      {/* Header (Clean, spacious Material 3) */}
      <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50/70 dark:bg-[#252628] flex-shrink-0">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-blue-600 dark:bg-[#8ab4f8] flex items-center justify-center text-white dark:text-[#0f0f10] shadow-sm">
            <BookCheck className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h2 id="create-slab-title" className="text-lg sm:text-xl font-bold text-slate-900 dark:text-[#e8eaed] tracking-tight">
              Create New Office Set
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-[#9aa0a6] mt-0.5">
              Interactive flashcards & MCQs grounded in your course materials
            </p>
          </div>
        </div>
        <button
          type="button"
          disabled={isGenerating}
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-[#e8eaed] hover:bg-slate-100 dark:hover:bg-[#2e2f31] rounded-full transition-colors cursor-pointer google-btn-press"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable Form Body */}
      <form onSubmit={handleGenerate} className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-7 space-y-6">
        {/* Error Banner */}
        {error && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 rounded-2xl flex items-start gap-3 text-xs sm:text-sm text-rose-800 dark:text-rose-300">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{error}</div>
          </div>
        )}

        {/* 1. Prompt Text Area */}
        <div>
          <label className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-[#e8eaed] mb-2">
            What do you want to create?
          </label>
          <textarea
            rows={4}
            value={prompt}
            onChange={(e) => handlePromptChange(e.target.value)}
            disabled={isGenerating}
            placeholder="e.g. Look at my Biology sources and create flashcards on cellular respiration (or leave blank to cover all key concepts)..."
            className="w-full text-sm sm:text-base p-4 bg-slate-100/70 dark:bg-[#131314] rounded-2xl focus:bg-white dark:focus:bg-[#131314] focus:outline-hidden focus:ring-2 focus:ring-blue-500/50 transition-all text-slate-900 dark:text-[#e8eaed] placeholder-slate-400 dark:placeholder-[#5f6368] leading-relaxed shadow-2xs border border-transparent"
          />

          {/* Prompt suggestion chips */}
          <div className="flex flex-wrap gap-2 mt-2.5">
            {PROMPT_SUGGESTIONS.map((sug, i) => (
              <button
                key={i}
                type="button"
                disabled={isGenerating}
                onClick={() => handlePromptChange(sug)}
                className="text-xs px-3 py-1.5 bg-slate-100 dark:bg-[#28292a] hover:bg-slate-200 dark:hover:bg-[#333538] text-slate-600 dark:text-[#c4c7c5] hover:text-slate-900 dark:hover:text-white rounded-xl transition-colors cursor-pointer font-medium max-w-full google-btn-press"
              >
                {sug}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Format / Type Selector */}
        <div>
          <label className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-[#e8eaed] mb-2.5">
            Study Format
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              disabled={isGenerating}
              onClick={() => setSlabType('flashcards')}
              className={`flex flex-col items-center justify-center p-4 rounded-2xl text-center transition-all cursor-pointer google-btn-press ${
                slabType === 'flashcards'
                  ? 'bg-blue-50 dark:bg-[#8ab4f8]/15 text-blue-700 dark:text-[#8ab4f8] font-bold shadow-2xs ring-1 ring-blue-500/30'
                  : 'bg-slate-100/70 dark:bg-[#252628] text-slate-700 dark:text-[#c4c7c5] hover:bg-slate-200/60 dark:hover:bg-[#2e2f31]'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-blue-100/80 dark:bg-[#8ab4f8]/20 text-blue-700 dark:text-[#8ab4f8] flex items-center justify-center mb-2">
                <Layers className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span className="text-sm font-bold">Flashcards</span>
              <span className="text-xs opacity-75 mt-0.5">Flip & active recall</span>
            </button>

            <button
              type="button"
              disabled={isGenerating}
              onClick={() => setSlabType('mcq')}
              className={`flex flex-col items-center justify-center p-4 rounded-2xl text-center transition-all cursor-pointer google-btn-press ${
                slabType === 'mcq'
                  ? 'bg-blue-50 dark:bg-[#8ab4f8]/15 text-blue-700 dark:text-[#8ab4f8] font-bold shadow-2xs ring-1 ring-blue-500/30'
                  : 'bg-slate-100/70 dark:bg-[#252628] text-slate-700 dark:text-[#c4c7c5] hover:bg-slate-200/60 dark:hover:bg-[#2e2f31]'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-blue-100/80 dark:bg-[#8ab4f8]/20 text-blue-700 dark:text-[#8ab4f8] flex items-center justify-center mb-2">
                <HelpCircle className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span className="text-sm font-bold">Practice MCQs</span>
              <span className="text-xs opacity-75 mt-0.5">Quiz & rationales</span>
            </button>

            <button
              type="button"
              disabled={isGenerating}
              onClick={() => setSlabType('both')}
              className={`flex flex-col items-center justify-center p-4 rounded-2xl text-center transition-all cursor-pointer google-btn-press ${
                slabType === 'both'
                  ? 'bg-blue-50 dark:bg-[#8ab4f8]/15 text-blue-700 dark:text-[#8ab4f8] font-bold shadow-2xs ring-1 ring-blue-500/30'
                  : 'bg-slate-100/70 dark:bg-[#252628] text-slate-700 dark:text-[#c4c7c5] hover:bg-slate-200/60 dark:hover:bg-[#2e2f31]'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-blue-100/80 dark:bg-[#8ab4f8]/20 text-blue-700 dark:text-[#8ab4f8] flex items-center justify-center mb-2">
                <BookCheck className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span className="text-sm font-bold">Both</span>
              <span className="text-xs opacity-75 mt-0.5">Cards + MCQs combined</span>
            </button>
          </div>
        </div>

        {/* 3. Quantity Selector */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-[#e8eaed]">
              Quantity
            </label>
            <span className="text-xs font-semibold text-blue-600 dark:text-[#8ab4f8]">
              {quantity === 'less'
                ? slabType === 'both'
                  ? '8 cards + 8 MCQs'
                  : '8 items'
                : quantity === 'more'
                  ? slabType === 'both'
                    ? '16 cards + 16 MCQs'
                    : '16 items'
                  : slabType === 'both'
                    ? '12 cards + 12 MCQs'
                    : '12 items'}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {[
              { id: 'less' as const, label: 'Less', desc: slabType === 'both' ? '8 of each' : '8 items' },
              { id: 'standard' as const, label: 'Standard', desc: slabType === 'both' ? '12 of each' : '12 items' },
              { id: 'more' as const, label: 'More', desc: slabType === 'both' ? '16 of each' : '16 items' },
            ].map((q) => {
              const isSelected = quantity === q.id;
              return (
                <button
                  key={q.id}
                  type="button"
                  disabled={isGenerating}
                  onClick={() => setQuantity(q.id)}
                  className={`py-2.5 px-3 rounded-xl text-center transition-all cursor-pointer google-btn-press ${
                    isSelected
                      ? 'bg-blue-600 dark:bg-[#8ab4f8] text-white dark:text-[#0f0f10] shadow-2xs font-bold'
                      : 'bg-slate-100/70 dark:bg-[#252628] text-slate-700 dark:text-[#c4c7c5] hover:bg-slate-200/60 dark:hover:bg-[#2e2f31]'
                  }`}
                >
                  <div className="text-xs sm:text-sm font-bold">{q.label}</div>
                  <div className="text-[11px] opacity-75 mt-0.5">{q.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Difficulty Selector */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-[#e8eaed]">
              Difficulty Level
            </label>
            <span className="text-xs font-semibold text-blue-600 dark:text-[#8ab4f8] capitalize">
              {difficulty}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {[
              { id: 'easy' as const, label: 'Easy', desc: 'Core terms' },
              { id: 'medium' as const, label: 'Medium', desc: 'Exam standard' },
              { id: 'hard' as const, label: 'Hard', desc: 'Deep synthesis' },
            ].map((d) => {
              const isSelected = difficulty === d.id;
              return (
                <button
                  key={d.id}
                  type="button"
                  disabled={isGenerating}
                  onClick={() => setDifficulty(d.id)}
                  className={`py-2.5 px-3 rounded-xl text-center transition-all cursor-pointer google-btn-press ${
                    isSelected
                      ? 'bg-blue-600 dark:bg-[#8ab4f8] text-white dark:text-[#0f0f10] shadow-2xs font-bold'
                      : 'bg-slate-100/70 dark:bg-[#252628] text-slate-700 dark:text-[#c4c7c5] hover:bg-slate-200/60 dark:hover:bg-[#2e2f31]'
                  }`}
                >
                  <div className="text-xs sm:text-sm font-bold">{d.label}</div>
                  <div className="text-[11px] opacity-75 mt-0.5">{d.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 5. Choose Class Notebook */}
        {classes.length > 0 && (
          <div>
            <label className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-[#e8eaed] mb-2">
              Class Notebook
            </label>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
              <button
                type="button"
                disabled={isGenerating}
                onClick={() => setSelectedClassNotebook('all')}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 flex-shrink-0 cursor-pointer google-btn-press ${
                  selectedClassNotebook === 'all'
                    ? 'bg-blue-600 dark:bg-[#8ab4f8] text-white dark:text-[#0f0f10] shadow-2xs'
                    : 'bg-slate-100 dark:bg-[#252628] text-slate-600 dark:text-[#c4c7c5] hover:bg-slate-200/60 dark:hover:bg-[#2e2f31]'
                }`}
              >
                <span>All Classes</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/20">
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
                    className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 flex-shrink-0 cursor-pointer google-btn-press ${
                      isSelected
                        ? 'bg-blue-600 dark:bg-[#8ab4f8] text-white dark:text-[#0f0f10] shadow-2xs'
                        : 'bg-slate-100 dark:bg-[#252628] text-slate-600 dark:text-[#c4c7c5] hover:bg-slate-200/60 dark:hover:bg-[#2e2f31]'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: cls.color || '#2563EB' }}
                    />
                    <span className="truncate max-w-[150px]">{cls.name}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/20">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 6. Grounded Class Sources */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-[#e8eaed]">
              Grounded Sources & Files
            </label>
            <button
              type="button"
              disabled={isGenerating}
              onClick={() => setUseAllSources(!useAllSources)}
              className="text-xs font-semibold text-blue-600 dark:text-[#8ab4f8] hover:underline cursor-pointer"
            >
              {useAllSources ? 'Pick specific sources' : 'Use all sources'}
            </button>
          </div>

          {useAllSources ? (
            <div className="p-4 bg-slate-100/70 dark:bg-[#131314] rounded-2xl flex items-center justify-between text-xs sm:text-sm text-slate-600 dark:text-[#c4c7c5]">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-blue-600 dark:text-[#8ab4f8] flex-shrink-0" />
                <span>
                  {selectedClassEntity
                    ? `Analyzing all sources from ${selectedClassEntity.name}`
                    : `Analyzing all ${sources.length > 0 ? sources.length : notes.length} sources and uploaded materials`}
                </span>
              </div>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full">
                All Grounded
              </span>
            </div>
          ) : (
            <div className="rounded-2xl p-3 max-h-48 overflow-y-auto space-y-2 bg-slate-100/70 dark:bg-[#131314]">
              {availableSources.length === 0 ? (
                <p className="text-xs sm:text-sm text-slate-400 dark:text-[#9aa0a6] p-3 text-center">
                  {selectedClassEntity
                    ? `No sources uploaded in ${selectedClassEntity.name} yet.`
                    : 'No sources uploaded yet.'}
                </p>
              ) : (
                availableSources.map((s) => {
                  const isChecked = selectedSourceIds.includes(s.id);
                  return (
                    <div
                      key={s.id}
                      onClick={() => !isGenerating && handleToggleSource(s.id)}
                      className={`flex items-center justify-between p-2.5 rounded-xl text-xs sm:text-sm cursor-pointer transition-colors ${
                        isChecked
                          ? 'bg-blue-100/80 dark:bg-[#8ab4f8]/20 text-blue-900 dark:text-[#8ab4f8] font-semibold'
                          : 'hover:bg-slate-200/60 dark:hover:bg-[#202123] text-slate-700 dark:text-[#c4c7c5]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <span className="text-[11px] font-bold px-2 py-0.5 bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-[#8ab4f8] rounded">
                          {s.type.toUpperCase()}
                        </span>
                        <span className="truncate">{s.name}</span>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${
                          isChecked
                            ? 'bg-blue-600 dark:bg-[#8ab4f8] text-white dark:text-[#0f0f10]'
                            : 'border border-slate-300 dark:border-[#5f6368] bg-white dark:bg-[#18191b]'
                        }`}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5 stroke-[2.8]" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </form>

      {/* Sticky Footer Actions - ALWAYS visible and never clipped */}
      <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-[#252628] flex items-center justify-between gap-3 flex-shrink-0">
        <button
          type="button"
          disabled={isGenerating}
          onClick={onClose}
          className="px-5 py-2.5 text-xs sm:text-sm font-semibold text-slate-600 dark:text-[#c4c7c5] hover:text-slate-800 dark:hover:text-[#e8eaed] hover:bg-slate-200/60 dark:hover:bg-[#28292a] rounded-xl transition-colors cursor-pointer google-btn-press"
        >
          Cancel
        </button>

        <button
          type="button"
          disabled={isGenerating}
          onClick={handleGenerate}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 dark:bg-[#8ab4f8] dark:hover:bg-[#a6c8ff] dark:text-[#0f0f10] active:scale-95 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all cursor-pointer google-btn-press min-h-[44px]"
        >
          {isGenerating ? (
            <>
              <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
              <span>Creating set...</span>
            </>
          ) : (
            <>
              <span>Create Office Set</span>
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </ModalPortal>
  );
};
