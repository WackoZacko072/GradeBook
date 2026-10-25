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
} from 'lucide-react';
import type { NoteItem } from '../../types/notebook';

interface NotesLibraryProps {
  notes: NoteItem[];
  onSelectNote: (noteId: string) => void;
  onCreateNote: () => void;
  onDeleteNote: (noteId: string) => void;
  onLoadDemoNotes: () => void;
}

export const NotesLibrary: React.FC<NotesLibraryProps> = ({
  notes,
  onSelectNote,
  onCreateNote,
  onDeleteNote,
  onLoadDemoNotes,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [noteToDelete, setNoteToDelete] = useState<NoteItem | null>(null);

  const filteredNotes = notes.filter((n) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      n.title.toLowerCase().includes(q) ||
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
            Your study library: typed notes, source grounding, AI question banks, and flashcards.
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
              <span>Load Sample Note</span>
            </button>
          )}

          <button
            type="button"
            onClick={onCreateNote}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs shadow-blue-500/20 transition-all cursor-pointer min-h-[40px]"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Note</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      {notes.length > 0 && (
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes by title, topic, formula, or uploaded sources..."
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

      {/* Notes Grid */}
      {filteredNotes.length === 0 ? (
        <div className="py-16 px-4 text-center bg-white rounded-2xl border border-dashed border-slate-300 shadow-2xs">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
            <BookOpen className="w-7 h-7 stroke-[2.2]" />
          </div>
          <h3 className="text-base font-extrabold text-slate-900">
            {searchQuery ? 'No notes matched your search' : 'No notes yet in your Notebook'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1.5 leading-relaxed">
            {searchQuery
              ? 'Try searching with different keywords or clear your query.'
              : 'Create your first note to start writing, upload textbook/lecture sources, and generate AI multiple-choice, long answer questions, and flashcards.'}
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
                  onClick={onCreateNote}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Create First Note</span>
                </button>
                <button
                  type="button"
                  onClick={onLoadDemoNotes}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span>Load Sample Physics/Calc Note</span>
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

            // Extract text excerpt without markdown symbols
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
                  {/* Card Header: Title & Delete */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-extrabold text-slate-900 text-base group-hover:text-blue-700 transition-colors line-clamp-2 leading-snug">
                      {note.title || 'Untitled Note'}
                    </h3>
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
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                        <Paperclip className="w-3 h-3 text-emerald-600" />
                        <span>{sourceCount} {sourceCount === 1 ? 'source' : 'sources'}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-500">
                        <Paperclip className="w-3 h-3 text-slate-400" />
                        <span>0 sources</span>
                      </span>
                    )}

                    {totalQuestions > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                        <HelpCircle className="w-3 h-3 text-indigo-600" />
                        <span>{totalQuestions} {totalQuestions === 1 ? 'Q' : 'Qs'}</span>
                      </span>
                    )}

                    {flashcardCount > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/60">
                        <Layers className="w-3 h-3 text-amber-600" />
                        <span>{flashcardCount} cards</span>
                      </span>
                    )}
                  </div>

                  {/* Date footer */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>Updated {formatDate(note.updatedAt || note.createdAt)}</span>
                    </span>
                    <span className="text-blue-600 font-bold group-hover:translate-x-0.5 transition-transform">
                      Open &rarr;
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
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
              Are you sure you want to delete <span className="font-bold text-slate-800">"{noteToDelete.title}"</span>? All typed text, uploaded sources, question banks, and flashcards will be removed.
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
