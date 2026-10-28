import React, { useState, useEffect } from 'react';
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
  Award,
} from 'lucide-react';
import type { SlabItem, SlabType } from '../../types/slab';
import type { NoteItem, NoteSource } from '../../types/notebook';
import type { ClassItem } from '../../types/grade';
import { MarkdownRenderer } from '../MarkdownRenderer';
import { CreateSlabModal } from './CreateSlabModal';

interface SlabViewProps {
  slabs: SlabItem[];
  notes: NoteItem[];
  sources?: NoteSource[];
  classes?: ClassItem[];
  selectedSlabId: string | null;
  onSelectSlab: (id: string | null) => void;
  onAddSlab: (slab: SlabItem) => void;
  onUpdateSlab: (slab: SlabItem) => void;
  onDeleteSlab: (id: string) => void;
  initialCreateConfig?: {
    prompt?: string;
    type?: SlabType;
    sourceIds?: string[];
  };
  isCreateModalForcedOpen?: boolean;
  onCloseCreateModalForced?: () => void;
}

export const SlabView: React.FC<SlabViewProps> = ({
  slabs,
  notes,
  sources = [],
  classes = [],
  selectedSlabId,
  onSelectSlab,
  onAddSlab,
  onUpdateSlab,
  onDeleteSlab,
  initialCreateConfig,
  isCreateModalForcedOpen,
  onCloseCreateModalForced,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClassId, setFilterClassId] = useState<string | 'all'>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Rename state
  const [editingSlabId, setEditingSlabId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  // Active study mode state inside a selected slab
  const [studyMode, setStudyMode] = useState<'flashcards' | 'mcq'>('flashcards');

  // Flashcard Player State with Know / Don't Know Tracking & Swipe Physics
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [cardReviews, setCardReviews] = useState<Record<string, 'know' | 'dont_know'>>({});
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [isSwipeAnimating, setIsSwipeAnimating] = useState(false);
  const [isDeckCompleted, setIsDeckCompleted] = useState(false);
  const [activeCardFilter, setActiveCardFilter] = useState<'all' | 'dont_know'>('all');

  // MCQ Player State
  const [currentMcqIndex, setCurrentMcqIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [isQuizCompleted, setIsQuizCompleted] = useState(false);

  const selectedSlab = slabs.find((s) => s.id === selectedSlabId) || null;

  // Filtered slabs in library by class & search
  const filteredSlabs = slabs.filter((s) => {
    const matchesSearch =
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.className && s.className.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.sourceNoteNames && s.sourceNoteNames.some((n) => n.toLowerCase().includes(searchQuery.toLowerCase())));

    if (!matchesSearch) return false;
    if (filterClassId === 'all') return true;
    if (filterClassId === 'unassigned') return !s.classId;
    return s.classId === filterClassId;
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
    setCardReviews({});
    setSwipeDirection(null);
    setIsSwipeAnimating(false);
    setIsDeckCompleted(false);
    setActiveCardFilter('all');
    setCurrentMcqIndex(0);
    setUserAnswers({});
    setIsQuizCompleted(false);
  };

  // Trigger Review with Left/Right Swipe Animation
  const triggerReview = (status: 'know' | 'dont_know') => {
    if (isSwipeAnimating || !selectedSlab) return;

    const allCards = selectedSlab.flashcards;
    const cardsToUse = activeCardFilter === 'dont_know'
      ? allCards.filter((c) => cardReviews[c.id] === 'dont_know')
      : allCards;

    const card = cardsToUse[currentCardIndex];
    if (!card) return;

    setIsSwipeAnimating(true);
    setSwipeDirection(status === 'dont_know' ? 'left' : 'right');

    const cardId = card.id;
    setCardReviews((prev) => ({
      ...prev,
      [cardId]: status,
    }));

    setTimeout(() => {
      if (currentCardIndex + 1 < cardsToUse.length) {
        setCurrentCardIndex((prev) => prev + 1);
        setIsCardFlipped(false);
        setSwipeDirection(null);
        setIsSwipeAnimating(false);
      } else {
        setIsDeckCompleted(true);
        setSwipeDirection(null);
        setIsSwipeAnimating(false);
      }
    }, 280);
  };

  // Keyboard Navigation for Flashcard Review & Swiping
  useEffect(() => {
    if (studyMode !== 'flashcards' || !selectedSlab || isDeckCompleted) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        triggerReview('dont_know');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        triggerReview('know');
      } else if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsCardFlipped((f) => !f);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

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
    setSwipeDirection(null);
    setIsDeckCompleted(false);
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

    const allCards = selectedSlab.flashcards;
    const activeCards = activeCardFilter === 'dont_know'
      ? allCards.filter((c) => cardReviews[c.id] === 'dont_know')
      : allCards;
    const totalCards = activeCards.length;
    const currentCard = activeCards[currentCardIndex] || null;

    const knowCount = Object.values(cardReviews).filter((s) => s === 'know').length;
    const dontKnowCount = Object.values(cardReviews).filter((s) => s === 'dont_know').length;

    const currentMcq = selectedSlab.mcqs[currentMcqIndex] || null;
    const mcqAnswered = userAnswers[currentMcqIndex] !== undefined;
    const selectedAnswer = userAnswers[currentMcqIndex];

    const scoreInfo = calculateMcqScore();

    return (
      <div className="space-y-6 animate-fade-scale">
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-[#26282a]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onSelectSlab(null)}
              className="p-2 text-slate-600 dark:text-[#c4c7c5] hover:text-slate-900 dark:hover:text-[#e8eaed] hover:bg-slate-100 dark:hover:bg-[#202123] rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold google-btn-press"
              title="Back to all Office study sets"
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
                  className="text-base sm:text-xl font-extrabold text-slate-900 dark:text-[#e8eaed] px-2 py-1 bg-white dark:bg-[#0f0f10] border border-violet-500 rounded-xl focus:outline-hidden shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => handleSaveRename(selectedSlab.id)}
                  className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition-colors cursor-pointer google-btn-press"
                >
                  <Check className="w-4 h-4 stroke-[2.4]" />
                </button>
                <button
                  type="button"
                  onClick={() => setEditingSlabId(null)}
                  className="p-1.5 text-slate-400 dark:text-[#9aa0a6] hover:bg-slate-100 dark:hover:bg-[#202123] rounded-lg transition-colors cursor-pointer google-btn-press"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <h1 className="text-lg sm:text-2xl font-extrabold text-slate-900 dark:text-[#e8eaed] tracking-tight">
                  {selectedSlab.title}
                </h1>
                <button
                  type="button"
                  onClick={(e) => handleStartRename(selectedSlab, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 dark:text-[#9aa0a6] hover:text-violet-600 dark:hover:text-[#c58af9] hover:bg-violet-50 dark:hover:bg-violet-950/30 rounded-lg transition-all cursor-pointer google-btn-press"
                  title="Rename Slab"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Mode Switcher Tabs (if has both) */}
          {hasFlashcards && hasMcqs && (
            <div className="flex items-center p-1 bg-slate-100 dark:bg-[#0f0f10] rounded-xl border border-slate-200/80 dark:border-[#26282a] self-start sm:self-auto shadow-inner">
              <button
                type="button"
                onClick={() => {
                  setStudyMode('flashcards');
                  setIsCardFlipped(false);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer google-btn-press ${
                  studyMode === 'flashcards'
                    ? 'bg-white dark:bg-[#202123] text-violet-700 dark:text-[#c58af9] shadow-2xs font-extrabold'
                    : 'text-slate-600 dark:text-[#c4c7c5] hover:text-slate-900 dark:hover:text-[#e8eaed]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Flashcards ({totalCards})</span>
              </button>
              <button
                type="button"
                onClick={() => setStudyMode('mcq')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer google-btn-press ${
                  studyMode === 'mcq'
                    ? 'bg-white dark:bg-[#202123] text-violet-700 dark:text-[#c58af9] shadow-2xs font-extrabold'
                    : 'text-slate-600 dark:text-[#c4c7c5] hover:text-slate-900 dark:hover:text-[#e8eaed]'
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
          <div className="max-w-2xl mx-auto space-y-5 animate-fade-scale">
            {isDeckCompleted ? (
              /* Deck Review Complete Screen */
              <div className="bg-white dark:bg-[#18191b] rounded-3xl p-8 border border-slate-200/90 dark:border-[#26282a] text-center shadow-lg space-y-6 animate-fade-scale">
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-md shadow-violet-500/20">
                  <Award className="w-8 h-8 stroke-[2.2]" />
                </div>

                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-[#9aa0a6]">
                    Review Session Complete
                  </span>
                  <h3 className="text-3xl font-extrabold text-slate-900 dark:text-[#e8eaed] mt-1">
                    {knowCount} / {allCards.length} Cards Known
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-[#9aa0a6] mt-1">
                    {dontKnowCount === 0
                      ? 'Incredible job! You know every single flashcard in this deck.'
                      : `You have ${dontKnowCount} card${dontKnowCount === 1 ? '' : 's'} that need further review.`}
                  </p>
                </div>

                <div className="flex items-center justify-center gap-4">
                  <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-2xl min-w-[130px]">
                    <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">{dontKnowCount}</div>
                    <div className="text-xs font-semibold text-rose-700 dark:text-rose-300">Need Review</div>
                  </div>
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl min-w-[130px]">
                    <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{knowCount}</div>
                    <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Know</div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  {dontKnowCount > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveCardFilter('dont_know');
                        setCurrentCardIndex(0);
                        setIsCardFlipped(false);
                        setIsDeckCompleted(false);
                      }}
                      className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer google-btn-press"
                    >
                      <X className="w-4 h-4 stroke-[3]" />
                      <span>Review {dontKnowCount} Cards You Don't Know</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setActiveCardFilter('all');
                      setCardReviews({});
                      setCurrentCardIndex(0);
                      setIsCardFlipped(false);
                      setIsDeckCompleted(false);
                    }}
                    className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer google-btn-press"
                  >
                    <RotateCw className="w-4 h-4" />
                    <span>Restart Entire Deck</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleShuffleCards();
                      setActiveCardFilter('all');
                      setCardReviews({});
                      setCurrentCardIndex(0);
                      setIsCardFlipped(false);
                      setIsDeckCompleted(false);
                    }}
                    className="px-4 py-2.5 bg-slate-100 dark:bg-[#202123] hover:bg-slate-200 dark:hover:bg-[#26282a] text-slate-700 dark:text-[#e8eaed] rounded-xl text-xs font-bold transition-all border border-slate-200 dark:border-[#26282a] flex items-center gap-2 cursor-pointer google-btn-press"
                  >
                    <Shuffle className="w-4 h-4" />
                    <span>Shuffle & Restart</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Flashcard Header Controls with Live Know / Don't Know Counter */}
                <div className="flex items-center justify-between text-xs font-semibold px-1">
                  <div className="flex items-center gap-2 sm:gap-3">
                    {/* Don't Know Counter Pill */}
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 rounded-full text-xs font-extrabold shadow-2xs">
                      <X className="w-3.5 h-3.5 stroke-[3]" />
                      <span>{dontKnowCount} Don't Know</span>
                    </span>

                    {/* Know Counter Pill */}
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 rounded-full text-xs font-extrabold shadow-2xs">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>{knowCount} Know</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 dark:text-[#9aa0a6] text-xs font-bold">
                      {currentCardIndex + 1} / {totalCards}
                    </span>
                    <button
                      type="button"
                      onClick={handleShuffleCards}
                      className="flex items-center gap-1 px-2.5 py-1 text-slate-600 dark:text-[#c4c7c5] hover:text-violet-700 dark:hover:text-[#c58af9] hover:bg-violet-50 dark:hover:bg-violet-950/30 rounded-lg transition-colors cursor-pointer text-xs font-bold google-btn-press"
                      title="Shuffle flashcards"
                    >
                      <Shuffle className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Shuffle</span>
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-1.5 bg-slate-200/80 dark:bg-[#26282a] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-[#c58af9] dark:to-[#8ab4f8] transition-all duration-300"
                    style={{ width: `${totalCards > 0 ? ((currentCardIndex + 1) / totalCards) * 100 : 0}%` }}
                  />
                </div>

                {/* Interactive Flipping Card with Left/Right Swipe Physics & High Contrast Legibility */}
                {currentCard ? (
                  <div className="relative w-full min-h-[300px] sm:min-h-[340px]">
                    <div
                      onClick={() => setIsCardFlipped(!isCardFlipped)}
                      className={`w-full min-h-[300px] sm:min-h-[340px] rounded-3xl p-6 sm:p-10 border transition-all duration-300 cursor-pointer flex flex-col justify-between shadow-md hover:shadow-lg relative select-none ${
                        swipeDirection === 'left'
                          ? 'animate-swipe-left pointer-events-none'
                          : swipeDirection === 'right'
                          ? 'animate-swipe-right pointer-events-none'
                          : 'animate-card-enter'
                      } ${
                        isCardFlipped
                          ? 'bg-white dark:bg-[#18191b] text-slate-900 dark:text-[#e8eaed] border-2 border-violet-400/80 dark:border-violet-500/50 shadow-violet-500/10'
                          : 'bg-white dark:bg-[#18191b] text-slate-900 dark:text-[#e8eaed] border border-slate-200/90 dark:border-[#26282a]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <span
                          className={`text-[11px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full ${
                            isCardFlipped
                              ? 'bg-violet-100 dark:bg-violet-950/60 text-violet-800 dark:text-[#c58af9] border border-violet-200/60 dark:border-violet-800/40'
                              : 'bg-slate-100 dark:bg-[#26282a] text-slate-700 dark:text-[#c4c7c5]'
                          }`}
                        >
                          {isCardFlipped ? 'Answer / Explanation' : 'Front / Concept'}
                        </span>

                        {cardReviews[currentCard.id] && (
                          <span
                            className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                              cardReviews[currentCard.id] === 'know'
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                                : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                            }`}
                          >
                            {cardReviews[currentCard.id] === 'know' ? '✓ Known' : '✕ Review'}
                          </span>
                        )}
                      </div>

                      {/* Card Content with Markdown & LaTeX - Crisp Contrast in Light and Dark Mode */}
                      <div className="flex-1 flex items-center justify-center text-center my-4 px-2">
                        <div className="w-full text-base sm:text-lg font-semibold leading-relaxed text-slate-900 dark:text-[#e8eaed]">
                          {isCardFlipped ? (
                            <MarkdownRenderer content={currentCard.back} />
                          ) : (
                            <MarkdownRenderer content={currentCard.front} />
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 dark:text-[#9aa0a6]">
                        <RotateCw className="w-3.5 h-3.5" />
                        <span>Click card or press Space to flip</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center bg-white dark:bg-[#18191b] rounded-3xl border border-slate-200 dark:border-[#26282a]">
                    <p className="text-sm text-slate-500">No cards in this filter.</p>
                  </div>
                )}

                {/* Two Review Action Buttons Below Card: X (Swipe Left) & Checkmark (Swipe Right) */}
                <div className="flex items-center justify-center gap-6 sm:gap-10 pt-3 pb-1">
                  {/* X Button: Don't Know / Need Review (Swipes Left) */}
                  <div className="flex flex-col items-center gap-1.5">
                    <button
                      type="button"
                      disabled={isSwipeAnimating || !currentCard}
                      onClick={() => triggerReview('dont_know')}
                      aria-label="Don't Know / Need Review (Swipe Left)"
                      title="Don't Know / Need Review (Left Arrow)"
                      className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 border-2 border-rose-300 dark:border-rose-900/60 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer google-btn-press disabled:opacity-40"
                    >
                      <X className="w-7 h-7 stroke-[3]" />
                    </button>
                    <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 tracking-tight">
                      Don't Know
                    </span>
                  </div>

                  {/* Center: Flip Card Button */}
                  <div className="flex flex-col items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setIsCardFlipped(!isCardFlipped)}
                      className="px-4 py-2 text-xs font-bold text-violet-700 dark:text-[#c58af9] bg-violet-50 dark:bg-violet-950/40 hover:bg-violet-100 dark:hover:bg-violet-900/40 rounded-xl transition-all cursor-pointer border border-violet-200/80 dark:border-violet-800/40 google-btn-press"
                    >
                      {isCardFlipped ? 'Show Front' : 'Flip Card'}
                    </button>
                    <span className="text-[10px] text-slate-400 dark:text-[#9aa0a6]">
                      (Spacebar)
                    </span>
                  </div>

                  {/* Checkmark Button: Know / Got It (Swipes Right) */}
                  <div className="flex flex-col items-center gap-1.5">
                    <button
                      type="button"
                      disabled={isSwipeAnimating || !currentCard}
                      onClick={() => triggerReview('know')}
                      aria-label="Know / Got It (Swipe Right)"
                      title="Know / Got It (Right Arrow)"
                      className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 border-2 border-emerald-300 dark:border-emerald-900/60 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer google-btn-press disabled:opacity-40"
                    >
                      <Check className="w-7 h-7 stroke-[3]" />
                    </button>
                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 tracking-tight">
                      Know
                    </span>
                  </div>
                </div>

                {/* Sub-dock: Previous / Next Card Peek Controls */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-[#26282a]/50">
                  <button
                    type="button"
                    disabled={currentCardIndex === 0 || isSwipeAnimating}
                    onClick={() => {
                      setCurrentCardIndex((prev) => Math.max(0, prev - 1));
                      setIsCardFlipped(false);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-[#c4c7c5] hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Previous Card</span>
                  </button>

                  <span className="text-[11px] text-slate-400 dark:text-[#80868b]">
                    Use Left / Right arrow keys to swipe
                  </span>

                  <button
                    type="button"
                    disabled={currentCardIndex === totalCards - 1 || isSwipeAnimating}
                    onClick={() => {
                      setCurrentCardIndex((prev) => Math.min(totalCards - 1, prev + 1));
                      setIsCardFlipped(false);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-[#c4c7c5] hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors disabled:opacity-30 cursor-pointer"
                  >
                    <span>Next Card</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* MCQS PRACTICE QUIZ MODE                                           */}
        {/* ================================================================= */}
        {studyMode === 'mcq' && hasMcqs && (
          <div className="max-w-2xl mx-auto space-y-6 animate-fade-scale">
            {isQuizCompleted ? (
              /* Quiz Completion Summary Card */
              <div className="bg-white dark:bg-[#18191b] rounded-3xl p-8 border border-slate-200/90 dark:border-[#26282a] text-center shadow-lg space-y-5 animate-in zoom-in-95">
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-md shadow-violet-500/20">
                  <Award className="w-8 h-8 stroke-[2.2]" />
                </div>
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-[#9aa0a6]">
                    Quiz Complete
                  </span>
                  <h3 className="text-3xl font-extrabold text-slate-900 dark:text-[#e8eaed] mt-1">
                    {scoreInfo.percentage}% Score
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-[#9aa0a6] mt-1">
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
                    className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer shadow-xs google-btn-press"
                  >
                    <RotateCw className="w-4 h-4" />
                    <span>Retake Quiz</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectSlab(null)}
                    className="px-5 py-2.5 bg-slate-100 dark:bg-[#202123] hover:bg-slate-200 dark:hover:bg-[#26282a] text-slate-700 dark:text-[#e8eaed] text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer google-btn-press"
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
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-[#9aa0a6] font-semibold px-1">
                    <span>
                      Question {currentMcqIndex + 1} of {selectedSlab.mcqs.length}
                    </span>
                    <span className="text-violet-600 dark:text-[#c58af9] font-bold">
                      {Object.keys(userAnswers).length} of {selectedSlab.mcqs.length} Answered
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-1.5 bg-slate-200/80 dark:bg-[#26282a] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-[#c58af9] dark:to-[#8ab4f8] transition-all duration-300"
                      style={{
                        width: `${((currentMcqIndex + 1) / selectedSlab.mcqs.length) * 100}%`,
                      }}
                    />
                  </div>

                  {/* Question Stem Card */}
                  <div className="bg-white dark:bg-[#18191b] rounded-3xl p-6 sm:p-7 border border-slate-200/90 dark:border-[#26282a] shadow-xs space-y-4">
                    <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-[#e8eaed] leading-relaxed">
                      <MarkdownRenderer content={currentMcq.question} />
                    </div>

                    {/* Options Grid */}
                    <div className="space-y-2.5 pt-2">
                      {currentMcq.options.map((option, optIdx) => {
                        const isSelected = selectedAnswer === optIdx;
                        const isCorrect = optIdx === currentMcq.correctIndex;

                        let styleClasses =
                          'bg-slate-50 dark:bg-[#0f0f10] border-slate-200 dark:border-[#26282a] text-slate-800 dark:text-[#e8eaed] hover:bg-violet-50/50 dark:hover:bg-violet-950/30 hover:border-violet-300 dark:hover:border-violet-500/50';

                        if (mcqAnswered) {
                          if (isCorrect) {
                            styleClasses =
                              'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-900 dark:text-emerald-300 font-bold ring-2 ring-emerald-500/20';
                          } else if (isSelected && !isCorrect) {
                            styleClasses =
                              'bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-900 dark:text-rose-300 font-bold ring-2 ring-rose-500/20';
                          } else {
                            styleClasses = 'bg-slate-50 dark:bg-[#0f0f10] border-slate-200 dark:border-[#26282a] text-slate-400 dark:text-[#5f6368] opacity-60';
                          }
                        }

                        return (
                          <button
                            key={optIdx}
                            type="button"
                            disabled={mcqAnswered}
                            onClick={() => handleSelectOption(optIdx)}
                            className={`w-full text-left p-3.5 sm:p-4 rounded-2xl border text-xs sm:text-sm transition-all flex items-start gap-3 cursor-pointer google-btn-press ${styleClasses}`}
                          >
                            <span
                              className={`w-6 h-6 rounded-lg text-xs font-extrabold flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                mcqAnswered
                                  ? isCorrect
                                    ? 'bg-emerald-600 text-white'
                                    : isSelected
                                    ? 'bg-rose-600 text-white'
                                    : 'bg-slate-200 dark:bg-[#202123] text-slate-600 dark:text-[#9aa0a6]'
                                  : 'bg-slate-200 dark:bg-[#202123] text-slate-700 dark:text-[#c4c7c5]'
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
                      <div className="mt-4 p-4 rounded-2xl bg-violet-50/70 dark:bg-violet-950/30 border border-violet-200/80 dark:border-violet-800/40 text-xs sm:text-sm text-slate-800 dark:text-[#e8eaed] space-y-1.5 animate-in slide-in-from-top-2">
                        <div className="flex items-center gap-1.5 font-bold text-violet-900 dark:text-[#c58af9]">
                          <HelpCircle className="w-4 h-4 text-violet-600 dark:text-[#c58af9]" />
                          <span>Rationale & Explanation:</span>
                        </div>
                        <div className="leading-relaxed text-slate-700 dark:text-[#c4c7c5]">
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
                      className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-[#e8eaed] bg-white dark:bg-[#18191b] hover:bg-slate-50 dark:hover:bg-[#202123] border border-slate-200 dark:border-[#26282a] rounded-xl transition-all disabled:opacity-30 cursor-pointer shadow-2xs google-btn-press"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Previous</span>
                    </button>

                    {currentMcqIndex === selectedSlab.mcqs.length - 1 ? (
                      <button
                        type="button"
                        disabled={!mcqAnswered}
                        onClick={() => setIsQuizCompleted(true)}
                        className="flex items-center gap-1.5 px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-gradient-to-tr from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 rounded-xl transition-all disabled:opacity-40 cursor-pointer shadow-md shadow-violet-500/20 google-btn-press"
                      >
                        <span>Finish Quiz</span>
                        <Check className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={!mcqAnswered}
                        onClick={() => setCurrentMcqIndex((prev) => Math.min(selectedSlab.mcqs.length - 1, prev + 1))}
                        className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition-all disabled:opacity-40 cursor-pointer shadow-xs google-btn-press"
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
    <div className="space-y-6 animate-fade-scale">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-slate-400 dark:text-[#9aa0a6] uppercase tracking-widest">
              Study Studio
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-[#e8eaed] tracking-tight flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 via-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-2xs">
              <BookCheck className="w-4 h-4 stroke-[2.4]" />
            </div>
            <span>Office</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-[#9aa0a6] mt-1">
            Interactive Flashcards & MCQ Question Banks generated from your notes and uploaded files.
          </p>
        </div>

        {/* Action Button: Create with Gemini */}
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-tr from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-700 hover:via-purple-700 hover:to-indigo-700 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-violet-500/25 transition-all cursor-pointer self-start sm:self-auto google-btn-press"
        >
          <Plus className="w-4 h-4 stroke-[2.6]" />
          <span>New Office Set</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 dark:text-[#9aa0a6] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search study sets, topics, or notes..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-white dark:bg-[#18191b] border border-slate-200 dark:border-[#26282a] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-violet-500 text-slate-900 dark:text-[#e8eaed] placeholder-slate-400 dark:placeholder-[#5f6368] shadow-2xs transition-all"
          />
        </div>

        {/* Class Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setFilterClassId('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer google-btn-press ${
              filterClassId === 'all'
                ? 'bg-violet-600 text-white shadow-2xs font-extrabold'
                : 'bg-white dark:bg-[#0f0f10] text-slate-600 dark:text-[#c4c7c5] hover:bg-slate-100 dark:hover:bg-[#202123] border border-slate-200 dark:border-[#26282a]'
            }`}
          >
            <span>All Classes</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                filterClassId === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-[#26282a]'
              }`}
            >
              {slabs.length}
            </span>
          </button>

          {classes.map((cls) => {
            const count = slabs.filter((s) => s.classId === cls.id).length;
            const isSelected = filterClassId === cls.id;
            return (
              <button
                key={cls.id}
                type="button"
                onClick={() => setFilterClassId(cls.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer google-btn-press ${
                  isSelected
                    ? 'bg-violet-600 text-white shadow-2xs font-extrabold'
                    : 'bg-white dark:bg-[#0f0f10] text-slate-600 dark:text-[#c4c7c5] hover:bg-slate-100 dark:hover:bg-[#202123] border border-slate-200 dark:border-[#26282a]'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
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

          {slabs.some((s) => !s.classId) && (
            <button
              type="button"
              onClick={() => setFilterClassId('unassigned')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer google-btn-press ${
                filterClassId === 'unassigned'
                  ? 'bg-violet-600 text-white shadow-2xs font-extrabold'
                  : 'bg-white dark:bg-[#0f0f10] text-slate-600 dark:text-[#c4c7c5] hover:bg-slate-100 dark:hover:bg-[#202123] border border-slate-200 dark:border-[#26282a]'
              }`}
            >
              <span>General</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  filterClassId === 'unassigned' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-[#26282a]'
                }`}
              >
                {slabs.filter((s) => !s.classId).length}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Slabs Grid */}
      {filteredSlabs.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-[#18191b] rounded-3xl border border-slate-200/80 dark:border-[#26282a] p-8 shadow-2xs space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-[#c58af9] flex items-center justify-center mx-auto">
            <BookCheck className="w-7 h-7 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-800 dark:text-[#e8eaed]">No study sets found</h3>
            <p className="text-xs text-slate-500 dark:text-[#9aa0a6] mt-1 max-w-sm mx-auto">
              {searchQuery
                ? 'No study sets match your search query.'
                : 'Ask Gemini to generate your first interactive flashcard deck or MCQ quiz based on your notes!'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs google-btn-press"
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
                className="group bg-white dark:bg-[#18191b] rounded-3xl border border-slate-200/90 dark:border-[#26282a] hover:border-violet-300 dark:hover:border-violet-500/50 p-5 sm:p-6 shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-4 relative google-card"
              >
                <div>
                  {/* Card Header: Type Badge & Action Buttons */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-[#c58af9] border border-violet-100 dark:border-violet-800/40 flex items-center gap-1">
                        {slab.type === 'both' ? (
                          <>
                            <BookCheck className="w-3 h-3 text-violet-600 dark:text-[#c58af9]" />
                            <span>Flashcards & MCQs</span>
                          </>
                        ) : slab.type === 'flashcards' ? (
                          <>
                            <Layers className="w-3 h-3 text-violet-600 dark:text-[#c58af9]" />
                            <span>Flashcard Deck</span>
                          </>
                        ) : (
                          <>
                            <HelpCircle className="w-3 h-3 text-violet-600 dark:text-[#c58af9]" />
                            <span>Practice Quiz</span>
                          </>
                        )}
                      </span>

                      {slab.className && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#202123] text-slate-700 dark:text-[#c4c7c5] border border-slate-200/60 dark:border-[#26282a] flex items-center gap-1">
                          <span
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{
                              backgroundColor:
                                classes.find((c) => c.id === slab.classId)?.color || '#8B5CF6',
                            }}
                          />
                          <span className="truncate max-w-[100px]">{slab.className}</span>
                        </span>
                      )}

                      {slab.difficulty && (
                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-[#202123] text-slate-500 dark:text-[#9aa0a6]">
                          {slab.difficulty}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => handleStartRename(slab, e)}
                        className="p-1.5 text-slate-400 dark:text-[#9aa0a6] hover:text-violet-600 dark:hover:text-[#c58af9] hover:bg-violet-50 dark:hover:bg-violet-950/30 rounded-lg transition-colors cursor-pointer google-btn-press"
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
                        className="p-1.5 text-slate-400 dark:text-[#9aa0a6] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer google-btn-press"
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
                        className="w-full text-sm font-bold px-2 py-1 bg-white dark:bg-[#0f0f10] border border-violet-500 rounded-lg text-slate-900 dark:text-[#e8eaed] focus:outline-hidden shadow-2xs"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveRename(slab.id)}
                        className="p-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-md transition-colors"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[2.8]" />
                      </button>
                    </div>
                  ) : (
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-[#e8eaed] group-hover:text-violet-700 dark:group-hover:text-[#c58af9] transition-colors line-clamp-2">
                      {slab.title}
                    </h3>
                  )}

                  {slab.description && (
                    <p className="text-xs text-slate-500 dark:text-[#9aa0a6] mt-1.5 line-clamp-2 leading-relaxed">
                      {slab.description}
                    </p>
                  )}
                </div>

                {/* Footer Info: Counts & Sources */}
                <div className="pt-3 border-t border-slate-100 dark:border-[#26282a] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-[#9aa0a6] font-semibold text-[11px]">
                    {fcCount > 0 && <span>{fcCount} cards</span>}
                    {fcCount > 0 && mcqCount > 0 && <span>&bull;</span>}
                    {mcqCount > 0 && <span>{mcqCount} questions</span>}
                  </div>

                  <span className="text-xs font-bold text-violet-600 dark:text-[#c58af9] group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
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
        isOpen={isCreateModalOpen || !!isCreateModalForcedOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          if (onCloseCreateModalForced) onCloseCreateModalForced();
        }}
        classes={classes}
        notes={notes}
        sources={sources}
        initialPrompt={initialCreateConfig?.prompt}
        initialType={initialCreateConfig?.type}
        initialSourceIds={initialCreateConfig?.sourceIds}
        onCreateSlab={(newSlab) => {
          onAddSlab(newSlab);
          handleSelectSlabItem(newSlab);
        }}
      />
    </div>
  );
};
