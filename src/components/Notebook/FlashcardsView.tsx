import React, { useState } from 'react';
import {
  Layers,
  Sparkles,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Shuffle,
  CheckCircle2,
  Circle,
  Loader2,
  LayoutGrid,
  Maximize2,
} from 'lucide-react';
import type { FlashcardItem, NoteSource } from '../../types/notebook';
import { generateFlashcards } from '../../utils/notebookAiService';
import { LatexRenderer } from '../LatexRenderer';

interface FlashcardsViewProps {
  noteTitle: string;
  noteContent: string;
  sources: NoteSource[];
  flashcards: FlashcardItem[];
  onUpdateFlashcards: (cards: FlashcardItem[]) => void;
}

export const FlashcardsView: React.FC<FlashcardsViewProps> = ({
  noteTitle,
  noteContent,
  sources,
  flashcards,
  onUpdateFlashcards,
}) => {
  const [viewMode, setViewMode] = useState<'study' | 'grid'>('study');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Manual Add Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');

  // Generate Flashcards with AI
  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerateError(null);
    try {
      const generated = await generateFlashcards(noteTitle, noteContent, sources, 8);
      onUpdateFlashcards([...flashcards, ...generated]);
    } catch (err: any) {
      setGenerateError(err.message || 'Failed to generate flashcards. Please check your Gemini API key.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Flip active card
  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  // Next card
  const handleNext = () => {
    if (flashcards.length === 0) return;
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % flashcards.length);
  };

  // Prev card
  const handlePrev = () => {
    if (flashcards.length === 0) return;
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
  };

  // Shuffle cards
  const handleShuffle = () => {
    const shuffled = [...flashcards].sort(() => Math.random() - 0.5);
    onUpdateFlashcards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  // Toggle mastered status for current card
  const handleToggleMastered = (cardId: string) => {
    const updated = flashcards.map((c) =>
      c.id === cardId ? { ...c, mastered: !c.mastered } : c
    );
    onUpdateFlashcards(updated);
  };

  // Delete card
  const handleDeleteCard = (cardId: string) => {
    const updated = flashcards.filter((c) => c.id !== cardId);
    onUpdateFlashcards(updated);
    if (currentIndex >= updated.length) {
      setCurrentIndex(Math.max(0, updated.length - 1));
    }
    setIsFlipped(false);
  };

  // Save manual card
  const handleSaveManualCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFront.trim() || !newBack.trim()) return;

    const newCard: FlashcardItem = {
      id: `fc_${Date.now()}`,
      front: newFront.trim(),
      back: newBack.trim(),
      mastered: false,
    };

    onUpdateFlashcards([...flashcards, newCard]);
    setNewFront('');
    setNewBack('');
    setIsAddModalOpen(false);
  };

  const masteredCount = flashcards.filter((c) => c.mastered).length;
  const currentCard = flashcards[currentIndex];

  return (
    <div className="space-y-4">
      {/* Top Controls Header */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('study')}
              title="Study Carousel"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'study'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Study ({flashcards.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              title="Grid Overview"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Grid</span>
            </button>
          </div>

          {flashcards.length > 0 && (
            <span className="text-[11px] font-semibold text-slate-500 hidden sm:inline">
              {masteredCount} of {flashcards.length} mastered ({Math.round((masteredCount / flashcards.length) * 100)}%)
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {flashcards.length > 1 && (
            <button
              type="button"
              onClick={handleShuffle}
              title="Shuffle Cards"
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <Shuffle className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add Card</span>
          </button>

          <button
            type="button"
            disabled={isGenerating}
            onClick={handleGenerate}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-2xs transition-all cursor-pointer"
          >
            {isGenerating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            <span>{isGenerating ? 'Generating...' : 'AI Generate'}</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {generateError && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center justify-between">
          <span>{generateError}</span>
          <button
            type="button"
            onClick={() => setGenerateError(null)}
            className="text-xs font-bold underline ml-2 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* EMPTY STATE */}
      {flashcards.length === 0 ? (
        <div className="py-12 px-4 text-center bg-white rounded-2xl border border-dashed border-slate-300">
          <Layers className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h4 className="text-sm font-bold text-slate-800">No Flashcards Yet</h4>
          <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
            Click "AI Generate" to extract high-yield concept and equation flashcards with LaTeX formulas directly from your notes and sources.
          </p>
          <button
            type="button"
            disabled={isGenerating}
            onClick={handleGenerate}
            className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-2xs cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generate Flashcards</span>
          </button>
        </div>
      ) : viewMode === 'study' && currentCard ? (
        /* STUDY CAROUSEL MODE (Interactive 3D Flip Card) */
        <div className="space-y-4">
          {/* Progress Bar */}
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-blue-600 h-full transition-all duration-300 rounded-full"
              style={{
                width: `${((currentIndex + 1) / flashcards.length) * 100}%`,
              }}
            />
          </div>

          {/* Flip Card Container with 3D Perspective */}
          <div
            onClick={handleFlip}
            className="relative w-full min-h-[260px] sm:min-h-[300px] cursor-pointer select-none perspective-1000 group"
          >
            <div
              className={`relative w-full h-full min-h-[260px] sm:min-h-[300px] rounded-2xl p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 shadow-md hover:shadow-xl border-2 ${
                isFlipped
                  ? 'bg-gradient-to-br from-indigo-50/90 to-blue-50/90 border-blue-300'
                  : 'bg-white border-slate-200 hover:border-blue-400'
              }`}
            >
              {/* Card Header info */}
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-extrabold uppercase tracking-wider text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/50">
                  {isFlipped ? 'Answer / Explanation (Back)' : 'Concept / Question (Front)'}
                </span>

                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => handleToggleMastered(currentCard.id)}
                    title={currentCard.mastered ? 'Mastered' : 'Mark as Mastered'}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      currentCard.mastered
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {currentCard.mastered ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Circle className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    <span>{currentCard.mastered ? 'Mastered' : 'Learn'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteCard(currentCard.id)}
                    title="Delete Card"
                    className="p-1 text-slate-300 hover:text-rose-600 rounded-md transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Card Body Content with LaTeX */}
              <div className="my-auto py-4 text-center">
                <div
                  className={`leading-relaxed ${
                    isFlipped
                      ? 'text-xs sm:text-sm text-slate-800'
                      : 'text-sm sm:text-base font-bold text-slate-900'
                  }`}
                >
                  <LatexRenderer content={isFlipped ? currentCard.back : currentCard.front} />
                </div>
              </div>

              {/* Card Footer prompt */}
              <div className="text-center text-[11px] text-slate-400 font-medium">
                Click anywhere on card to flip &bull; Card {currentIndex + 1} of {flashcards.length}
              </div>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handlePrev}
              className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer min-h-[40px]"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <button
              type="button"
              onClick={handleFlip}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-all cursor-pointer min-h-[40px]"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Flip Card</span>
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer min-h-[40px]"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* GRID OVERVIEW MODE */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {flashcards.map((card, idx) => (
            <div
              key={card.id}
              className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-col justify-between space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-600 font-bold text-[10px] flex items-center justify-center">
                  {idx + 1}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleToggleMastered(card.id)}
                    className={`p-1 rounded-md transition-colors ${
                      card.mastered ? 'text-emerald-600' : 'text-slate-300 hover:text-slate-500'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCard(card.id)}
                    className="p-1 text-slate-300 hover:text-rose-600 rounded-md transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Front */}
              <div>
                <span className="block text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">
                  Front:
                </span>
                <div className="text-xs sm:text-sm font-bold text-slate-900">
                  <LatexRenderer content={card.front} />
                </div>
              </div>

              {/* Back */}
              <div className="pt-2 border-t border-slate-100">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Back:
                </span>
                <div className="text-xs text-slate-700 leading-relaxed">
                  <LatexRenderer content={card.back} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Manual Add Card Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs"
            onClick={() => setIsAddModalOpen(false)}
          />
          <div className="relative bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 z-10 space-y-4">
            <h3 className="text-base font-extrabold text-slate-900">Add New Flashcard</h3>
            <form onSubmit={handleSaveManualCard} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Front (Term, Concept, or Question - LaTeX supported via $...$):
                </label>
                <textarea
                  rows={2}
                  required
                  value={newFront}
                  onChange={(e) => setNewFront(e.target.value)}
                  placeholder="e.g. Work-Energy Theorem ($W_{\text{net}} = \Delta K$)..."
                  className="w-full p-2.5 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Back (Definition, Formula, or Explanation - LaTeX supported):
                </label>
                <textarea
                  rows={3}
                  required
                  value={newBack}
                  onChange={(e) => setNewBack(e.target.value)}
                  placeholder="e.g. The net work done on an object equals the change in its kinetic energy: $$W = \frac{1}{2}m v_f^2 - \frac{1}{2}m v_i^2$$"
                  className="w-full p-2.5 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold cursor-pointer"
                >
                  Save Flashcard
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
