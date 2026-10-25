import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Trash2,
  Edit2,
  Check,
  HelpCircle,
  Layers,
  Sparkles,
  Eye,
  Edit3,
  Bold,
  Italic,
  Heading,
  List,
  Code,
  Sigma,
} from 'lucide-react';
import type {
  NoteItem,
  NoteSource,
  MultipleChoiceQuestion,
  LongAnswerQuestion,
  FlashcardItem,
} from '../../types/notebook';
import { MarkdownRenderer } from '../MarkdownRenderer';
import { SourcesSection } from './SourcesSection';
import { QuestionBankView } from './QuestionBankView';
import { FlashcardsView } from './FlashcardsView';

interface NoteDetailProps {
  note: NoteItem;
  onBack: () => void;
  onUpdateNote: (updated: NoteItem) => void;
  onDeleteNote: (id: string) => void;
}

export const NoteDetail: React.FC<NoteDetailProps> = ({
  note,
  onBack,
  onUpdateNote,
  onDeleteNote,
}) => {
  // Title editing state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(note.title);

  // Note Content state
  const [content, setContent] = useState(note.content);
  const [editorTab, setEditorTab] = useState<'write' | 'preview'>('write');

  // Study Studio Tab (Question Bank vs Flashcards)
  const [studyTab, setStudyTab] = useState<'questions' | 'flashcards'>('questions');

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Sync title input if note prop changes
  useEffect(() => {
    setTitleInput(note.title);
    setContent(note.content);
  }, [note.id]);

  // Handle title save
  const handleSaveTitle = () => {
    const trimmed = titleInput.trim() || 'Untitled Note';
    setTitleInput(trimmed);
    setIsEditingTitle(false);
    onUpdateNote({
      ...note,
      title: trimmed,
      updatedAt: Date.now(),
    });
  };

  // Handle content change & auto-save debounce
  const handleContentChange = (newText: string) => {
    setContent(newText);
    onUpdateNote({
      ...note,
      content: newText,
      updatedAt: Date.now(),
    });
  };

  // Helper to insert markdown or LaTeX at cursor
  const handleInsertSnippet = (before: string, after: string = '') => {
    const textarea = document.getElementById('note-editor-textarea') as HTMLTextAreaElement | null;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = textarea.value;
    const selectedText = currentText.substring(start, end) || 'text';

    const replacement = `${before}${selectedText}${after}`;
    const nextContent = currentText.substring(0, start) + replacement + currentText.substring(end);

    handleContentChange(nextContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 0);
  };

  // Update sources
  const handleUpdateSources = (sources: NoteSource[]) => {
    onUpdateNote({
      ...note,
      sources,
      updatedAt: Date.now(),
    });
  };

  // Update questions (Multiple Choice & Long Answer)
  const handleUpdateQuestions = (
    multipleChoice: MultipleChoiceQuestion[],
    longAnswer: LongAnswerQuestion[]
  ) => {
    onUpdateNote({
      ...note,
      multipleChoice,
      longAnswer,
      updatedAt: Date.now(),
    });
  };

  // Update flashcards
  const handleUpdateFlashcards = (flashcards: FlashcardItem[]) => {
    onUpdateNote({
      ...note,
      flashcards,
      updatedAt: Date.now(),
    });
  };

  const totalQuestions =
    (note.multipleChoice?.length || 0) + (note.longAnswer?.length || 0);

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Navigation & Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/90">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold rounded-xl transition-all cursor-pointer min-h-[36px]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>All Notes</span>
          </button>

          {/* Editable Title */}
          {isEditingTitle ? (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                autoFocus
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle();
                  if (e.key === 'Escape') {
                    setTitleInput(note.title);
                    setIsEditingTitle(false);
                  }
                }}
                className="text-lg sm:text-xl font-extrabold text-slate-900 bg-white border border-blue-500 rounded-lg px-2.5 py-1 focus:outline-hidden"
              />
              <button
                type="button"
                onClick={handleSaveTitle}
                className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group">
              <h1
                onClick={() => setIsEditingTitle(true)}
                title="Click to rename note"
                className="text-lg sm:text-2xl font-extrabold text-slate-900 tracking-tight cursor-pointer hover:text-blue-700 transition-colors"
              >
                {note.title || 'Untitled Note'}
              </h1>
              <button
                type="button"
                onClick={() => setIsEditingTitle(true)}
                title="Rename note"
                className="opacity-60 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-700 rounded-md transition-all cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-auto">
          <span className="text-[11px] text-slate-400 hidden md:inline">
            Auto-saved
          </span>

          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            title="Delete this note"
            className="flex items-center gap-1.5 px-3 py-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold transition-all cursor-pointer min-h-[36px]"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Note</span>
          </button>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Note Text Editor + Sources (7 cols on desktop) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Note Editor Card */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden flex flex-col">
            {/* Editor Top Bar with Formatting Toolbar */}
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 flex-wrap">
              {/* Tab: Write vs Preview */}
              <div className="flex items-center p-0.5 bg-slate-200/80 rounded-lg">
                <button
                  type="button"
                  onClick={() => setEditorTab('write')}
                  className={`flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                    editorTab === 'write'
                      ? 'bg-white text-blue-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Write</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditorTab('preview')}
                  className={`flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                    editorTab === 'preview'
                      ? 'bg-white text-blue-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Eye className="w-3 h-3" />
                  <span>Preview</span>
                </button>
              </div>

              {/* Formatting Helper Buttons */}
              {editorTab === 'write' && (
                <div className="flex items-center gap-1 text-slate-600">
                  <button
                    type="button"
                    onClick={() => handleInsertSnippet('**', '**')}
                    title="Bold (**text**)"
                    className="p-1 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertSnippet('*', '*')}
                    title="Italic (*text*)"
                    className="p-1 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                  >
                    <Italic className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertSnippet('## ')}
                    title="Heading (## )"
                    className="p-1 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                  >
                    <Heading className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertSnippet('- ')}
                    title="Bullet List (- )"
                    className="p-1 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertSnippet('`', '`')}
                    title="Code (`code`)"
                    className="p-1 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                  >
                    <Code className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertSnippet('$', '$')}
                    title="LaTeX Math Formula ($formula$)"
                    className="flex items-center gap-0.5 px-2 py-0.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-md text-[11px] font-bold border border-blue-200 cursor-pointer"
                  >
                    <Sigma className="w-3 h-3" />
                    <span>$LaTeX$</span>
                  </button>
                </div>
              )}
            </div>

            {/* Editor Body */}
            {editorTab === 'write' ? (
              <textarea
                id="note-editor-textarea"
                rows={16}
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="Type your notes here... You can write formulas like $E=mc^2$ or $$\int f(x)dx$$, headings, definitions, or study summaries..."
                className="w-full p-4 text-xs sm:text-sm font-sans text-slate-800 placeholder-slate-400 focus:outline-hidden resize-y min-h-[320px] leading-relaxed"
              />
            ) : (
              <div className="p-5 min-h-[320px] overflow-y-auto bg-[#FAFBFD]">
                {content.trim() ? (
                  <MarkdownRenderer content={content} />
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    Nothing typed yet. Switch back to Write to add note content.
                  </p>
                )}
              </div>
            )}

            <div className="px-4 py-2 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span>{content.length.toLocaleString()} characters &bull; {content.split(/\s+/).filter(Boolean).length} words</span>
              <span>LaTeX Math ($...$) Supported</span>
            </div>
          </div>

          {/* Sources Section */}
          <SourcesSection
            sources={note.sources || []}
            onUpdateSources={handleUpdateSources}
          />
        </div>

        {/* Right Column: Study Studio (5 cols on desktop) */}
        {/* Strictly: Question Bank (MC + Long Answer) and Flashcards ("those only nothing else") */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
            {/* Study Studio Header & Tabs */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                  <Sparkles className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Study Studio</h3>
                  <p className="text-[10px] text-slate-500">AI-generated from note & sources</p>
                </div>
              </div>

              {/* Tab Switcher: Question Bank vs Flashcards */}
              <div className="flex items-center p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setStudyTab('questions')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    studyTab === 'questions'
                      ? 'bg-white text-blue-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Questions ({totalQuestions})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStudyTab('flashcards')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    studyTab === 'flashcards'
                      ? 'bg-white text-blue-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Flashcards ({note.flashcards?.length || 0})</span>
                </button>
              </div>
            </div>

            {/* Active Study Tool */}
            {studyTab === 'questions' ? (
              <QuestionBankView
                noteTitle={note.title}
                noteContent={note.content}
                sources={note.sources || []}
                multipleChoice={note.multipleChoice || []}
                longAnswer={note.longAnswer || []}
                onUpdateQuestions={handleUpdateQuestions}
              />
            ) : (
              <FlashcardsView
                noteTitle={note.title}
                noteContent={note.content}
                sources={note.sources || []}
                flashcards={note.flashcards || []}
                onUpdateFlashcards={handleUpdateFlashcards}
              />
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs"
            onClick={() => setIsDeleteModalOpen(false)}
          />
          <div className="relative bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 z-10 animate-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900">Delete this note?</h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Are you sure you want to delete <span className="font-bold text-slate-800">"{note.title}"</span>? This will permanently remove its notes, sources, question bank, and flashcards.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteNote(note.id);
                  onBack();
                }}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs cursor-pointer"
              >
                Delete Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
