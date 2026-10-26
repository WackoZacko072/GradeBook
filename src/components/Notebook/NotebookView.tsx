import React from 'react';
import type { NoteItem } from '../../types/notebook';
import type { ClassItem } from '../../types/grade';
import { NotesLibrary } from './NotesLibrary';
import { NoteDetail } from './NoteDetail';

interface NotebookViewProps {
  notes: NoteItem[];
  classes?: ClassItem[];
  selectedNoteId: string | null;
  onSelectNote: (noteId: string | null) => void;
  onAddNote: (newNote: NoteItem) => void;
  onUpdateNote: (updatedNote: NoteItem) => void;
  onDeleteNote: (noteId: string) => void;
  onLoadDemoNotes: () => void;
  onOpenSlateAi?: (prompt?: string) => void;
}

export const NotebookView: React.FC<NotebookViewProps> = ({
  notes,
  classes = [],
  selectedNoteId,
  onSelectNote,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onLoadDemoNotes,
  onOpenSlateAi,
}) => {
  const activeNote = notes.find((n) => n.id === selectedNoteId) || null;

  const handleCreateNewNote = (defaultClassId?: string) => {
    const matchedClass = classes.find((c) => c.id === defaultClassId);
    const newNote: NoteItem = {
      id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: 'Untitled Note',
      classId: defaultClassId || undefined,
      className: matchedClass ? matchedClass.name : undefined,
      icon: '📝',
      content: '',
      sources: [],
      multipleChoice: [],
      longAnswer: [],
      flashcards: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    onAddNote(newNote);
    onSelectNote(newNote.id);
  };

  if (activeNote) {
    return (
      <NoteDetail
        note={activeNote}
        classes={classes}
        onBack={() => onSelectNote(null)}
        onUpdateNote={onUpdateNote}
        onDeleteNote={(id) => {
          onDeleteNote(id);
          onSelectNote(null);
        }}
        onOpenSlateAi={onOpenSlateAi}
      />
    );
  }

  return (
    <NotesLibrary
      notes={notes}
      classes={classes}
      onSelectNote={(id) => onSelectNote(id)}
      onCreateNote={handleCreateNewNote}
      onDeleteNote={onDeleteNote}
      onLoadDemoNotes={onLoadDemoNotes}
      onOpenSlateAi={onOpenSlateAi}
    />
  );
};
