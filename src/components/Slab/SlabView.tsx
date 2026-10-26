import React, { useState } from 'react';
import {
  BookCheck,
  Plus,
  Search,
  Layers,
  HelpCircle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Shuffle,
  Check,
  Trash2,
  Edit2,
  X,
  Sparkles,
  Award,
} from 'lucide-react';
import type { SlabItem, SlabType } from '../../types/slab';
import type { NoteItem } from '../../types/notebook';
import { MarkdownRenderer } from '../MarkdownRenderer';
import { CreateSlabModal } from './CreateSlabModal';

interface SlabViewProps {
  slabs: SlabItem[];
  notes: NoteItem[];
  selectedSlabId: string | null;
  onSelectSlab: (id: string | null) => void;
  onAddSlab: (slab: SlabItem) => void;
  onUpdateSlab: (slab: SlabItem) => void;
  onDeleteSlab: (id: string) => void;
}

export const SlabView: React.FC<SlabViewProps> = ({
  slabs,
  notes,
  selectedSlabId,
  onSelectSlab,
  onAddSlab,
  onUpdateSlab,
  onDeleteSlab,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<SlabType | 'all'>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Rename state
  const [editingSlabId, setEditingSlabId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  // Active study mode state inside a selected slab
  const [studyMode, setStudyMode] = useState<'flashcards' | 'mcq'>('flashcards');

  // Flashcard Player State
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);

  // MCQ Player State
  const [currentMcqIndex, setCurrentMcqIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [isQuizCompleted, setIsQuizCompleted] = useState(false);

  const selectedSlab = slabs.find((s) => s.id === selectedSlabId) || null;

  // Filtered slabs in library
  const filteredSlabs = slabs.filter((s) => {
    const matchesSearch =
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.sourceNoteNames && s.sourceNoteNames.some((n) => n.toLowerCase().includes(searchQuery.toLowerCase())));

    if (filterType === 'all') return matchesSearch;
    return matchesSearch && (s.type === filterType || s.type === 'both');
  });

  const handleStartRename = (slab: SlabItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingSlabId(slab.id);
    setEditingTitle(slab.title);
  };

  const handleSaveRename = (slabId: string) => {
    if (!editingTitle.trim()) {
      setEditingSlabId(null);
      return;
    }
    const target = slabs.find((s) => s.id === slabId);
    if (target) {
      onUpdateSlab({
        ...target,
        title: editingTitle.trim(),
        updatedAt: Date.now(),
      });
    }
    setEditingSlabId(null);
  };

  const handleSelectSlabItem = (slab: SlabItem) => {
    onSelectSlab(slab.id);
    setStudyMode(slab.type === 'mcq' ? 'mcq' : 'flashcards');
    setCurrentCardIndex(0);
    setIsCardFlipped(false);
    setCurrentMcqIndex(0);
    setUserAnswers({});
    setIsQuizCompleted(false);
  };

  // Toggle flashcard mastered
  const handleToggleMastered = (cardIndex: number) => {
    if (!selectedSlab) return;
    const updatedCards = [...selectedSlab.flashcards];
    const card = updatedCards[cardIndex];
    if (card) {
      updatedCards[cardIndex] = {
        ...card,
        mastered: !card.mastered,
      };
      onUpdateSlab({
        ...selectedSlab,
        flashcards: updatedCards,
        updatedAt: Date.now(),
      });
    }
  };

  // Shuffle flashcards
  const handleShuffleCards = () => {
    if (!selectedSlab) return;
    const shuffled = [...selectedSlab.flashcards].sort(() => Math.random() - 0.5);
    onUpdateSlab({
      ...selectedSlab,
      flashcards: shuffled,
      updatedAt: Date.now(),
    });
    setCurrentCardIndex(0);
    setIsCardFlipped(false);
  };

  // Select MCQ Option
  const handleSelectOption = (optionIndex: number) => {
    if (userAnswers[currentMcqIndex] !== undefined) return; // locked
    setUserAnswers((prev) => ({
      ...prev,
      [currentMcqIndex]: optionIndex,
    }));
  };

  // Calculate MCQ score
  const calculateMcqScore = () => {
    if (!selectedSlab) return { score: 0, total: 0, percentage: 0 };
    const total = selectedSlab.mcqs.length;
    let score = 0;
    selectedSlab.mcqs.forEach((mcq, idx) => {
      if (userAnswers[idx] === mcq.correctIndex) {
        score++;
      }
    });
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
    return { score, total, percentage };
  };

  /* ========================================================================= */
  /* DETAIL / STUDY VIEW                                                       */
  /* ========================================================================= */
  if (selectedSlab) {
    const hasFlashcards = selectedSlab.flashcards.length > 0;
    const hasMcqs = selectedSlab.mcqs.length > 0;
    const masteredCount = selectedSlab.flashcards.filter((f) => f.mastered).length;
    const totalCards = selectedSlab.flashcards.length;

    const currentCard = selectedSlab.flashcards[currentCardIndex] || null;
    const currentMcq = selectedSlab.mcqs[currentMcqIndex] || null;
    const mcqAnswered = userAnswers[currentMcqIndex] !== undefined;
    const selectedAnswer = userAnswers[currentMcqIndex];

    const scoreInfo = calculateMcqScore();

    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onSelectSlab(null)}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold"
              title="Back to all Slabs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            {/* Editable Title */}
            {editingSlabId === selectedSlab.id ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveRename(selectedSlab.id);
                    if (e.key === 'Escape') setEditingSlabId(null);
                  }}
                  autoFocus
                  className="text-base sm:text-xl font-extrabold text-slate-900 px-2 py-1 bg-white border border-violet-500 rounded-xl focus:outline-hidden shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => handleSaveRename(selectedSlab.id)}
                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                >
                  <Check className="w-4 h-4 stroke-[2.4]" />
                </button>
                <button
                  type="button"
                  onClick={() => setEditingSlabId(null)}
                  className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <h1 className="text-lg sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  {selectedSlab.title}
                </h1>
                <button
                  type="button"
                  onClick={(e) => handleStartRename(selectedSlab, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-all cursor-pointer"
                  title="Rename Slab"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Mode Switcher Tabs (if has both) */}
          {hasFlashcards && hasMcqs && (
            <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  setStudyMode('flashcards');
                  setIsCardFlipped(false);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  studyMode === 'flashcards'
                    ? 'bg-white text-violet-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Flashcards ({totalCards})</span>
              </button>
              <button
                type="button"
                onClick={() => setStudyMode('mcq')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  studyMode === 'mcq'
                    ? 'bg-white text-violet-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Practice MCQs ({selectedSlab.mcqs.length})</span>
              </button>
            </div>
          )}
        </div>

        {/* ================================================================= */}
        {/* FLASHCARDS INTERACTIVE MODE                                       */}
        {/* ================================================================= */}
        {studyMode === 'flashcards' && hasFlashcards && (
          <div className="max-w-2xl mx-auto space-y-5 animate-in fade-in duration-150">
            {/* Flashcard Header Controls */}
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1">
              <div className="flex items-center gap-2">
                <span>
                  Card {currentCardIndex + 1} of {totalCards}
                </span>
                <span>&bull;</span>
                <span className="text-violet-600">
                  {masteredCount} of {totalCards} Mastered ({totalCards > 0 ? Math.round((masteredCount / totalCards) * 100) : 0}%)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleShuffleCards}
                  className="flex items-center gap-1 px-2.5 py-1 text-slate-600 hover:text-violet-700 hover:bg-violet-50 rounded-lg transition-colors cursor-pointer text-xs font-bold"
                  title="Shuffle flashcards"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>Shuffle</span>
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-600 to-indigo-600 transition-all duration-300"
                style={{ width: `${((currentCardIndex + 1) / totalCards) * 100}%` }}
              />
            </div>

            {/* Interactive Flipping Card */}
            {currentCard && (
              <div
                onClick={() => setIsCardFlipped(!isCardFlipped)}
                className={`w-full min-h-[300px] sm:min-h-[340px] rounded-3xl p-6 sm:p-10 border transition-all duration-300 cursor-pointer flex flex-col justify-between shadow-md hover:shadow-lg relative select-none ${
                  isCardFlipped
                    ? 'bg-gradient-to-br from-violet-900 via-indigo-900 to-slate-900 text-white border-violet-800'
                    : 'bg-white text-slate-900 border-slate-200/90'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <span
                    className={`text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full ${
                      isCardFlipped
                        ? 'bg-white/20 text-violet-200 border border-white/20'
                        : 'bg-violet-100 text-violet-700'
                    }`}
                  >
                    {isCardFlipped ? 'Answer / Explanation' : 'Front / Concept'}
                  </span>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleMastered(currentCardIndex);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      currentCard.mastered
                        ? isCardFlipped
                          ? 'bg-emerald-500 text-white'
                          : 'bg-emerald-100 text-emerald-800'
                        : isCardFlipped
                        ? 'bg-white/10 hover:bg-white/20 text-white/80'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[2.8]" />
                    <span>{currentCard.mastered ? 'Mastered' : 'Mark as Mastered'}</span>
                  </button>
                </div>

                {/* Card Content with Markdown & LaTeX */}
                <div className="flex-1 flex items-center justify-center text-center my-4">
                  <div className="w-full text-base sm:text-lg font-medium leading-relaxed">
                    {isCardFlipped ? (
                      <MarkdownRenderer content={currentCard.back} />
                    ) : (
                      <MarkdownRenderer content={currentCard.front} />
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-center gap-1.5 text-[11px] opacity-60">
                  <RotateCw className="w-3 h-3" />
                  <span>Click card to flip</span>
                </div>
              </div>
            )}

            {/* Bottom Navigation Buttons */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                disabled={currentCardIndex === 0}
                onClick={() => {
                  setCurrentCardIndex((prev) => Math.max(0, prev - 1));
                  setIsCardFlipped(false);
                }}
                className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all disabled:opacity-30 cursor-pointer shadow-2xs"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <button
                type="button"
                onClick={() => setIsCardFlipped(!isCardFlipped)}
                className="px-5 py-2.5 text-xs font-extrabold text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-xl transition-colors cursor-pointer border border-violet-200/80"
              >
                {isCardFlipped ? 'Show Front' : 'Show Back'}
              </button>

              <button
                type="button"
                disabled={currentCardIndex === totalCards - 1}
                onClick={() => {
                  setCurrentCardIndex((prev) => Math.min(totalCards - 1, prev + 1));
                  setIsCardFlipped(false);
                }}
                className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all disabled:opacity-30 cursor-pointer shadow-2xs"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* MCQS PRACTICE QUIZ MODE                                           */}
        {/* ================================================================= */}
        {studyMode === 'mcq' && hasMcqs && (
          <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-150">
            {isQuizCompleted ? (
              /* Quiz Completion Summary Card */
              <div className="bg-white rounded-3xl p-8 border border-slate-200/90 text-center shadow-lg space-y-5 animate-in zoom-in-95">
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-md shadow-violet-500/20">
                  <Award className="w-8 h-8 stroke-[2.2]" />
                </div>
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                    Quiz Complete
                  </span>
                  <h3 className="text-3xl font-extrabold text-slate-900 mt-1">
                    {scoreInfo.percentage}% Score
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    You answered {scoreInfo.score} out of {scoreInfo.total} questions correctly.
                  </p>
                </div>

                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setUserAnswers({});
                      setCurrentMcqIndex(0);
                      setIsQuizCompleted(false);
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer shadow-xs"
                  >
                    <RotateCw className="w-4 h-4" />
                    <span>Retake Quiz</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectSlab(null)}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Back to Library
                  </button>
                </div>
              </div>
            ) : (
              /* Active MCQ Question View */
              currentMcq && (
                <div className="space-y-5">
                  {/* Question Header & Progress */}
                  <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1">
                    <span>
                      Question {currentMcqIndex + 1} of {selectedSlab.mcqs.length}
                    </span>
                    <span className="text-violet-600 font-bold">
                      {Object.keys(userAnswers).length} of {selectedSlab.mcqs.length} Answered
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-violet-600 to-indigo-600 transition-all duration-300"
                      style={{
                        width: `${((currentMcqIndex + 1) / selectedSlab.mcqs.length) * 100}%`,
                      }}
                    />
                  </div>

                  {/* Question Stem Card */}
                  <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-xs space-y-4">
                    <div className="text-sm sm:text-base font-bold text-slate-900 leading-relaxed">
                      <MarkdownRenderer content={currentMcq.question} />
                    </div>

                    {/* Options Grid */}
                    <div className="space-y-2.5 pt-2">
                      {currentMcq.options.map((option, optIdx) => {
                        const isSelected = selectedAnswer === optIdx;
                        const isCorrect = optIdx === currentMcq.correctIndex;

                        let styleClasses =
                          'bg-slate-50 border-slate-200 text-slate-800 hover:bg-violet-50/50 hover:border-violet-300';

                        if (mcqAnswered) {
                          if (isCorrect) {
                            styleClasses =
                              'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold ring-2 ring-emerald-500/20';
                          } else if (isSelected && !isCorrect) {
                            styleClasses =
                              'bg-rose-50 border-rose-500 text-rose-900 font-bold ring-2 ring-rose-500/20';
                          } else {
                            styleClasses = 'bg-slate-50 border-slate-200 text-slate-400 opacity-60';
                          }
                        }

                        return (
                          <button
                            key={optIdx}
                            type="button"
                            disabled={mcqAnswered}
                            onClick={() => handleSelectOption(optIdx)}
                            className={`w-full text-left p-3.5 sm:p-4 rounded-2xl border text-xs sm:text-sm transition-all flex items-start gap-3 cursor-pointer ${styleClasses}`}
                          >
                            <span
                              className={`w-6 h-6 rounded-lg text-xs font-extrabold flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                mcqAnswered
                                  ? isCorrect
                                    ? 'bg-emerald-600 text-white'
                                    : isSelected
                                    ? 'bg-rose-600 text-white'
                                    : 'bg-slate-200 text-slate-600'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <div className="flex-1 leading-relaxed">
                              <MarkdownRenderer content={option} />
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Explanation Box (Visible once answered) */}
                    {mcqAnswered && (
                      <div className="mt-4 p-4 rounded-2xl bg-violet-50/70 border border-violet-200/80 text-xs sm:text-sm text-slate-800 space-y-1.5 animate-in slide-in-from-top-2">
                        <div className="flex items-center gap-1.5 font-bold text-violet-900">
                          <Sparkles className="w-4 h-4 text-violet-600" />
                          <span>Rationale & Explanation:</span>
                        </div>
                        <div className="leading-relaxed text-slate-700">
                          <MarkdownRenderer content={currentMcq.explanation} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Navigation Buttons */}
                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      disabled={currentMcqIndex === 0}
                      onClick={() => setCurrentMcqIndex((prev) => Math.max(0, prev - 1))}
                      className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all disabled:opacity-30 cursor-pointer shadow-2xs"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Previous</span>
                    </button>

                    {currentMcqIndex === selectedSlab.mcqs.length - 1 ? (
                      <button
                        type="button"
                        disabled={!mcqAnswered}
                        onClick={() => setIsQuizCompleted(true)}
                        className="flex items-center gap-1.5 px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-gradient-to-tr from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 rounded-xl transition-all disabled:opacity-40 cursor-pointer shadow-md shadow-violet-500/20"
                      >
                        <span>Finish Quiz</span>
                        <Check className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={!mcqAnswered}
                        onClick={() => setCurrentMcqIndex((prev) => Math.min(selectedSlab.mcqs.length - 1, prev + 1))}
                        className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition-all disabled:opacity-40 cursor-pointer shadow-xs"
                      >
                        <span>Next Question</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>
    );
  }

  /* ========================================================================= */
  /* SLAB LIBRARY GRID VIEW                                                    */
  /* ========================================================================= */
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              Study Studio
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 via-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-2xs">
              <BookCheck className="w-4 h-4 stroke-[2.4]" />
            </div>
            <span>Slab</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Interactive Flashcards & MCQ Question Banks generated from your notes and uploaded files.
          </p>
        </div>

        {/* Action Button: Create with Gemini */}
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-tr from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-700 hover:via-purple-700 hover:to-indigo-700 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-violet-500/25 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.6]" />
          <span>New Slab Set</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search study sets, topics, or notes..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-violet-500 text-slate-900 placeholder-slate-400 shadow-2xs transition-all"
          />
        </div>

        {/* Type Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterType === 'all'
                ? 'bg-white text-violet-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Sets ({slabs.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('flashcards')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterType === 'flashcards'
                ? 'bg-white text-violet-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Flashcards</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterType('mcq')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterType === 'mcq'
                ? 'bg-white text-violet-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>MCQs</span>
          </button>
        </div>
      </div>

      {/* Slabs Grid */}
      {filteredSlabs.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-slate-200/80 p-8 shadow-2xs space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center mx-auto">
            <BookCheck className="w-7 h-7 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-800">No Slab sets found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? 'No study sets match your search query.'
                : 'Ask Gemini to generate your first interactive flashcard deck or MCQ quiz based on your notes!'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Create with Gemini</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredSlabs.map((slab) => {
            const isEditing = editingSlabId === slab.id;
            const fcCount = slab.flashcards.length;
            const mcqCount = slab.mcqs.length;

            return (
              <div
                key={slab.id}
                onClick={() => !isEditing && handleSelectSlabItem(slab)}
                className="group bg-white rounded-3xl border border-slate-200/90 hover:border-violet-300 p-5 sm:p-6 shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-4 relative"
              >
                <div>
                  {/* Card Header: Type Badge & Action Buttons */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-100 flex items-center gap-1">
                      {slab.type === 'both' ? (
                        <>
                          <BookCheck className="w-3 h-3 text-violet-600" />
                          <span>Flashcards & MCQs</span>
                        </>
                      ) : slab.type === 'flashcards' ? (
                        <>
                          <Layers className="w-3 h-3 text-violet-600" />
                          <span>Flashcard Deck</span>
                        </>
                      ) : (
                        <>
                          <HelpCircle className="w-3 h-3 text-violet-600" />
                          <span>Practice Quiz (MCQ)</span>
                        </>
                      )}
                    </span>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => handleStartRename(slab, e)}
                        className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors cursor-pointer"
                        title="Rename Slab"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSlab(slab.id);
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Slab"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Rename Input */}
                  {isEditing ? (
                    <div
                      className="flex items-center gap-1 my-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRename(slab.id);
                          if (e.key === 'Escape') setEditingSlabId(null);
                        }}
                        autoFocus
                        className="w-full text-sm font-bold px-2 py-1 bg-white border border-violet-500 rounded-lg text-slate-900 focus:outline-hidden shadow-2xs"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveRename(slab.id)}
                        className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[2.8]" />
                      </button>
                    </div>
                  ) : (
                    <h3 className="font-extrabold text-base text-slate-900 group-hover:text-violet-700 transition-colors line-clamp-2">
                      {slab.title}
                    </h3>
                  )}

                  {slab.description && (
                    <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                      {slab.description}
                    </p>
                  )}
                </div>

                {/* Footer Info: Counts & Sources */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-500 font-semibold text-[11px]">
                    {fcCount > 0 && <span>{fcCount} cards</span>}
                    {fcCount > 0 && mcqCount > 0 && <span>&bull;</span>}
                    {mcqCount > 0 && <span>{mcqCount} questions</span>}
                  </div>

                  <span className="text-xs font-bold text-violet-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                    <span>Study</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Creation Modal */}
      <CreateSlabModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        notes={notes}
        onCreateSlab={(newSlab) => {
          onAddSlab(newSlab);
          handleSelectSlabItem(newSlab);
        }}
      />
    </div>
  );
};
