import React, { useState } from 'react';
import {
  Plus,
  BookOpen,
  Calendar,
  Search,
  Filter,
  Trash2,
  Paperclip,
  HelpCircle,
  Layers,
  X,
} from 'lucide-react';
import { ModalPortal } from '../ModalPortal';
import type { NoteItem } from '../../types/notebook';
import type { ClassItem } from '../../types/grade';

interface NotesLibraryProps {
  notes: NoteItem[];
  classes?: ClassItem[];
  onSelectNote: (noteId: string) => void;
  onCreateNote: (defaultClassId?: string) => void;
  onDeleteNote: (noteId: string) => void;
  onOpenSlateAi?: (prompt?: string) => void;
}

export const NotesLibrary: React.FC<NotesLibraryProps> = ({
  notes,
  classes = [],
  onSelectNote,
  onCreateNote,
  onDeleteNote,
  onOpenSlateAi,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [noteToDelete, setNoteToDelete] = useState<NoteItem | null>(null);

  // Filter notes by search query and class filter
  const filteredNotes = notes.filter((n) => {
    const matchesSearch =
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (n.className && n.className.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (selectedClassFilter === 'all') return true;
    if (selectedClassFilter === 'general') return !n.classId;
    return n.classId === selectedClassFilter;
  });

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6 animate-fade-scale select-none">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-slate-400 dark:text-[#80868b] uppercase tracking-widest">
              Study Studio
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-[#e8eaed] tracking-tight flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-2xs">
              <BookOpen className="w-4 h-4 stroke-[2.4]" />
            </div>
            <span>Notebook</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-[#c4c7c5] mt-1">
            Take structured notes, attach syllabus & class documents, and study with Slate AI.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {/* Quick Ask Slate AI Button */}
          {onOpenSlateAi && (
            <button
              type="button"
              onClick={() => onOpenSlateAi('Look at my notes and create a mcq quiz')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs sm:text-sm font-medium rounded-full shadow-xs transition-all cursor-pointer min-h-[40px] google-btn-press"
            >
              <img src="/gemini-icon.png" alt="Gemini" className="w-4 h-4 object-contain" />
              <span>Ask Gemini</span>
            </button>
          )}

          <button
            type="button"
            onClick={() =>
              onCreateNote(selectedClassFilter !== 'all' && selectedClassFilter !== 'general' ? selectedClassFilter : undefined)
            }
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs shadow-blue-500/20 transition-all cursor-pointer min-h-[40px] google-btn-press"
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
            <span className="text-[11px] font-bold text-slate-400 dark:text-[#80868b] uppercase tracking-wider flex items-center gap-1 mr-1 flex-shrink-0">
              <Filter className="w-3 h-3 text-slate-400 dark:text-[#80868b]" />
              Filter:
            </span>

            <button
              type="button"
              onClick={() => setSelectedClassFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex-shrink-0 google-btn-press ${
                selectedClassFilter === 'all'
                  ? 'bg-blue-600 dark:bg-[#8ab4f8] text-white dark:text-[#0f0f10] shadow-2xs'
                  : 'bg-white dark:bg-[#18191b] hover:bg-slate-100 dark:hover:bg-[#26282a] text-slate-600 dark:text-[#c4c7c5] border border-slate-200/90 dark:border-[#26282a]'
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
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex-shrink-0 flex items-center gap-1.5 google-btn-press ${
                    selectedClassFilter === cls.id
                      ? 'bg-blue-600 dark:bg-[#8ab4f8] text-white dark:text-[#0f0f10] shadow-2xs'
                      : 'bg-white dark:bg-[#18191b] hover:bg-slate-100 dark:hover:bg-[#26282a] text-slate-600 dark:text-[#c4c7c5] border border-slate-200/90 dark:border-[#26282a]'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: cls.color || '#2563EB' }}
                  />
                  <span>{cls.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                    selectedClassFilter === cls.id
                      ? 'bg-white/20 text-white dark:text-[#0f0f10]'
                      : 'bg-slate-100 dark:bg-[#26282a] text-slate-500 dark:text-[#9aa0a6]'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setSelectedClassFilter('general')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex-shrink-0 google-btn-press ${
                selectedClassFilter === 'general'
                  ? 'bg-blue-600 dark:bg-[#8ab4f8] text-white dark:text-[#0f0f10] shadow-2xs'
                  : 'bg-white dark:bg-[#18191b] hover:bg-slate-100 dark:hover:bg-[#26282a] text-slate-600 dark:text-[#c4c7c5] border border-slate-200/90 dark:border-[#26282a]'
              }`}
            >
              General Notes ({notes.filter((n) => !n.classId).length})
            </button>
          </div>
        )}

        {/* Search Input */}
        {notes.length > 0 && (
          <div className="relative w-full max-w-md">
            <Search className="w-4 h-4 text-slate-400 dark:text-[#80868b] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your notes or syllabus content..."
              className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-white dark:bg-[#18191b] border border-slate-200 dark:border-[#26282a] rounded-xl text-slate-900 dark:text-[#e8eaed] placeholder-slate-400 dark:placeholder-[#80868b] focus:outline-hidden focus:ring-2 focus:ring-blue-600 dark:focus:ring-[#8ab4f8] shadow-2xs transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Notes Grid */}
      {filteredNotes.length === 0 ? (
        <div className="py-16 px-4 text-center bg-white dark:bg-[#18191b] rounded-3xl border border-dashed border-slate-300 dark:border-[#26282a] shadow-2xs transition-colors">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 dark:bg-[#8ab4f8]/15 text-blue-600 dark:text-[#8ab4f8] flex items-center justify-center mb-4">
            <BookOpen className="w-7 h-7 stroke-[2.2]" />
          </div>
          <h3 className="text-base font-extrabold text-slate-900 dark:text-[#e8eaed]">
            {searchQuery ? 'No notes matched your search' : 'No notes found'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-[#c4c7c5] max-w-sm mx-auto mt-1.5 leading-relaxed">
            {searchQuery
              ? 'Try searching with different keywords or clear your query.'
              : 'Create your first note to start typing notes, attach class files, and let Slate AI generate MCQs.'}
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="px-4 py-2 bg-slate-100 dark:bg-[#26282a] hover:bg-slate-200 dark:hover:bg-[#444746] text-slate-700 dark:text-[#e8eaed] text-xs font-semibold rounded-xl cursor-pointer google-btn-press"
              >
                Clear Search
              </button>
            ) : (
              <button
                type="button"
                onClick={() =>
                  onCreateNote(selectedClassFilter !== 'all' && selectedClassFilter !== 'general' ? selectedClassFilter : undefined)
                }
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 google-btn-press"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Create Note</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div
          className="w-full gap-4 sm:gap-5"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
          }}
        >
          {filteredNotes.map((note) => {
            const totalQuestions =
              (note.multipleChoice?.length || 0) + (note.longAnswer?.length || 0);
            const sourceCount = note.sources?.length || 0;
            const flashcardCount = note.flashcards?.length || 0;

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
                className="group relative bg-white dark:bg-[#18191b] hover:bg-blue-50/20 dark:hover:bg-[#202123] border border-slate-200/90 dark:border-[#26282a] hover:border-blue-300 dark:hover:border-[#8ab4f8] rounded-2xl p-5 shadow-2xs cursor-pointer flex flex-col justify-between google-card transition-colors min-w-0"
              >
                <div>
                  {/* Card Header: Icon, Class Tag & Delete */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{note.icon || '📝'}</span>
                      {note.className ? (
                        <span className="px-2 py-0.5 bg-blue-50 dark:bg-[#8ab4f8]/15 text-blue-700 dark:text-[#8ab4f8] border border-blue-200/80 dark:border-[#8ab4f8]/30 rounded-md text-[10px] font-extrabold uppercase tracking-wider">
                          {note.className}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-[#26282a] text-slate-600 dark:text-[#c4c7c5] rounded-md text-[10px] font-bold">
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
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-all cursor-pointer flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Title */}
                  <h3 className="font-extrabold text-slate-900 dark:text-[#e8eaed] text-base group-hover:text-blue-700 dark:group-hover:text-[#8ab4f8] transition-colors line-clamp-2 leading-snug mb-2">
                    {note.title || 'Untitled Note'}
                  </h3>

                  {/* Content snippet */}
                  <p className="text-xs text-slate-500 dark:text-[#c4c7c5] line-clamp-3 leading-relaxed mb-4">
                    {cleanExcerpt}
                  </p>
                </div>

                {/* Badges & Footer */}
                <div className="pt-3 border-t border-slate-100 dark:border-[#26282a] flex flex-col gap-2.5">
                  {/* Feature chips */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {sourceCount > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
                        <Paperclip className="w-3 h-3" />
                        {sourceCount} {sourceCount === 1 ? 'file' : 'files'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] text-slate-400 dark:text-[#80868b] bg-slate-100 dark:bg-[#26282a]">
                        <Paperclip className="w-3 h-3" />
                        0 files
                      </span>
                    )}

                    {totalQuestions > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 dark:bg-[#8ab4f8]/15 text-blue-700 dark:text-[#8ab4f8] border border-blue-200/60 dark:border-[#8ab4f8]/30">
                        <HelpCircle className="w-3 h-3" />
                        {totalQuestions} questions
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] text-slate-400 dark:text-[#80868b] bg-slate-100 dark:bg-[#26282a]">
                        <HelpCircle className="w-3 h-3" />
                        0 questions
                      </span>
                    )}

                    {flashcardCount > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 dark:bg-[#c58af9]/15 text-indigo-700 dark:text-[#c58af9] border border-indigo-200/60 dark:border-[#c58af9]/30">
                        <Layers className="w-3 h-3" />
                        {flashcardCount} cards
                      </span>
                    )}
                  </div>

                  {/* Card Bottom: Date & Slate AI Quick Button */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-[#80868b]">
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
                        className="text-[10px] font-bold text-blue-600 dark:text-[#8ab4f8] hover:text-blue-800 dark:hover:text-[#a8c7fa] flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        <img src="/gemini-icon.png" alt="Gemini" className="w-3 h-3 object-contain" />
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
      <ModalPortal
        isOpen={!!noteToDelete}
        onClose={() => setNoteToDelete(null)}
        maxWidth="max-w-md"
        className="p-6 text-center"
      >
        {noteToDelete && (
          <div>
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6 stroke-[2.2]" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-[#e8eaed]" style={{ fontFamily: "'Google Sans', sans-serif" }}>
              Delete this note?
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-[#c4c7c5] mt-1.5 leading-relaxed">
              Are you sure you want to delete <span className="font-bold text-slate-800 dark:text-white">"{noteToDelete.title}"</span>? This will permanently remove its notes, sources, question bank, and flashcards.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setNoteToDelete(null)}
                className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 dark:text-[#c4c7c5] hover:bg-slate-100 dark:hover:bg-[#26282a] rounded-xl cursor-pointer google-btn-press"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteNote(noteToDelete.id);
                  setNoteToDelete(null);
                }}
                className="px-5 py-2 text-xs sm:text-sm font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs cursor-pointer google-btn-press"
              >
                Delete Note
              </button>
            </div>
          </div>
        )}
      </ModalPortal>
    </div>
  );
};
