import React, { useState } from 'react';
import {
  Plus,
  Search,
  BookOpen,
  Trash2,
  Paperclip,
  HelpCircle,
  Layers,
  Sparkles,
  Calendar,
  Filter,
} from 'lucide-react';
import type { NoteItem } from '../../types/notebook';
import type { ClassItem } from '../../types/grade';

interface NotesLibraryProps {
  notes: NoteItem[];
  classes?: ClassItem[];
  onSelectNote: (noteId: string) => void;
  onCreateNote: (defaultClassId?: string) => void;
  onDeleteNote: (noteId: string) => void;
  onLoadDemoNotes: () => void;
  onOpenSlateAi?: (prompt?: string) => void;
}

export const NotesLibrary: React.FC<NotesLibraryProps> = ({
  notes,
  classes = [],
  onSelectNote,
  onCreateNote,
  onDeleteNote,
  onLoadDemoNotes,
  onOpenSlateAi,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [noteToDelete, setNoteToDelete] = useState<NoteItem | null>(null);

  // Filter by search and class
  const filteredNotes = notes.filter((n) => {
    // Class filter
    if (selectedClassFilter !== 'all') {
      if (selectedClassFilter === 'general') {
        if (n.classId) return false;
      } else if (n.classId !== selectedClassFilter) {
        return false;
      }
    }

    // Search query filter
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      n.title.toLowerCase().includes(q) ||
      (n.className && n.className.toLowerCase().includes(q)) ||
      n.content.toLowerCase().includes(q) ||
      n.sources.some((s) => s.name.toLowerCase().includes(q))
    );
  });

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffHours < 48) return 'Yesterday';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner / Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Notebook
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
              {notes.length} {notes.length === 1 ? 'Note' : 'Notes'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Notion-style note taking, class file attachments, and Slate AI question generators.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {notes.length === 0 && (
            <button
              type="button"
              onClick={onLoadDemoNotes}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold rounded-xl transition-all cursor-pointer min-h-[40px]"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Load Sample Notes</span>
            </button>
          )}

          {/* Quick Ask Slate AI Button */}
          {onOpenSlateAi && (
            <button
              type="button"
              onClick={() => onOpenSlateAi('Look at my notes and create a mcq quiz')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all cursor-pointer min-h-[40px]"
            >
              <Sparkles className="w-4 h-4 text-white stroke-[2.2]" />
              <span>Ask Slate AI</span>
            </button>
          )}

          <button
            type="button"
            onClick={() =>
              onCreateNote(selectedClassFilter !== 'all' && selectedClassFilter !== 'general' ? selectedClassFilter : undefined)
            }
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs shadow-blue-500/20 transition-all cursor-pointer min-h-[40px]"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Note</span>
          </button>
        </div>
      </div>

      {/* Class Filter Bar & Search */}
      <div className="space-y-3">
        {/* Class Filter Pills */}
        {classes.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mr-1 flex-shrink-0">
              <Filter className="w-3 h-3 text-slate-400" />
              Filter:
            </span>

            <button
              type="button"
              onClick={() => setSelectedClassFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex-shrink-0 ${
                selectedClassFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/90'
              }`}
            >
              All Notes ({notes.length})
            </button>

            {classes.map((cls) => {
              const count = notes.filter((n) => n.classId === cls.id).length;
              return (
                <button
                  key={cls.id}
                  type="button"
                  onClick={() => setSelectedClassFilter(cls.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex-shrink-0 flex items-center gap-1.5 ${
                    selectedClassFilter === cls.id
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/90'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: cls.color || '#2563EB' }}
                  />
                  <span>{cls.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                    selectedClassFilter === cls.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Search Input */}
        {notes.length > 0 && (
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes by title, class, topic, formula, or uploaded files..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200/90 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* Notes Grid */}
      {filteredNotes.length === 0 ? (
        <div className="py-16 px-4 text-center bg-white rounded-2xl border border-dashed border-slate-300 shadow-2xs">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
            <BookOpen className="w-7 h-7 stroke-[2.2]" />
          </div>
          <h3 className="text-base font-extrabold text-slate-900">
            {searchQuery ? 'No notes matched your search' : 'No notes found for this filter'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1.5 leading-relaxed">
            {searchQuery
              ? 'Try searching with different keywords or clear your query.'
              : 'Create a new note to start typing notes, attach class files, and let Slate AI generate MCQs.'}
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Clear Search
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() =>
                    onCreateNote(selectedClassFilter !== 'all' && selectedClassFilter !== 'general' ? selectedClassFilter : undefined)
                  }
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Create Note</span>
                </button>
                <button
                  type="button"
                  onClick={onLoadDemoNotes}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span>Load Sample Notes</span>
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredNotes.map((note) => {
            const totalQuestions =
              (note.multipleChoice?.length || 0) + (note.longAnswer?.length || 0);
            const sourceCount = note.sources?.length || 0;
            const flashcardCount = note.flashcards?.length || 0;

            // Extract clean excerpt without markdown symbols
            const cleanExcerpt = note.content
              ? note.content
                  .replace(/#+\s+/g, '')
                  .replace(/\*\*|`/g, '')
                  .replace(/\$\$[\s\S]*?\$\$/g, '[formula]')
                  .replace(/\$[^$]+\$/g, '[formula]')
                  .trim()
                  .slice(0, 160)
              : 'Empty note. Click to start typing notes...';

            return (
              <div
                key={note.id}
                onClick={() => onSelectNote(note.id)}
                className="group relative bg-white hover:bg-blue-50/20 border border-slate-200/90 hover:border-blue-300 rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  {/* Card Header: Icon, Class Tag & Delete */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{note.icon || '📝'}</span>
                      {note.className ? (
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200/80 rounded-md text-[10px] font-extrabold uppercase tracking-wider">
                          {note.className}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold">
                          General
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setNoteToDelete(note);
                      }}
                      title="Delete Note"
                      aria-label="Delete Note"
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Title */}
                  <h3 className="font-extrabold text-slate-900 text-base group-hover:text-blue-700 transition-colors line-clamp-2 leading-snug mb-2">
                    {note.title || 'Untitled Note'}
                  </h3>

                  {/* Content snippet */}
                  <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed mb-4">
                    {cleanExcerpt}
                  </p>
                </div>

                {/* Badges & Footer */}
                <div className="pt-3 border-t border-slate-100 flex flex-col gap-2.5">
                  {/* Feature chips */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {sourceCount > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                        <Paperclip className="w-3 h-3" />
                        {sourceCount} {sourceCount === 1 ? 'file' : 'files'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] text-slate-400 bg-slate-100">
                        <Paperclip className="w-3 h-3" />
                        0 files
                      </span>
                    )}

                    {totalQuestions > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60">
                        <HelpCircle className="w-3 h-3" />
                        {totalQuestions} questions
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] text-slate-400 bg-slate-100">
                        <HelpCircle className="w-3 h-3" />
                        0 questions
                      </span>
                    )}

                    {flashcardCount > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                        <Layers className="w-3 h-3" />
                        {flashcardCount} cards
                      </span>
                    )}
                  </div>

                  {/* Card Bottom: Date & Slate AI Quick Button */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(note.updatedAt || note.createdAt)}
                    </span>

                    {onOpenSlateAi && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const topic = note.className || note.title;
                          onOpenSlateAi(`Look at my ${topic} notes and create a mcq`);
                        }}
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3" />
                        Create MCQ
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Note Confirmation Dialog */}
      {noteToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs"
            onClick={() => setNoteToDelete(null)}
          />
          <div className="relative bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 z-10 animate-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900">Delete this note?</h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Are you sure you want to delete <span className="font-bold text-slate-800">"{noteToDelete.title}"</span>? This will permanently remove its notes, sources, question bank, and flashcards.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setNoteToDelete(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteNote(noteToDelete.id);
                  setNoteToDelete(null);
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
