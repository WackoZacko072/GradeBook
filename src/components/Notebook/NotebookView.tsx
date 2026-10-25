import React from 'react';
import type { NoteItem } from '../../types/notebook';
import { NotesLibrary } from './NotesLibrary';
import { NoteDetail } from './NoteDetail';

interface NotebookViewProps {
  notes: NoteItem[];
  selectedNoteId: string | null;
  onSelectNote: (noteId: string | null) => void;
  onAddNote: (newNote: NoteItem) => void;
  onUpdateNote: (updatedNote: NoteItem) => void;
  onDeleteNote: (noteId: string) => void;
  onLoadDemoNotes: () => void;
}

export const NotebookView: React.FC<NotebookViewProps> = ({
  notes,
  selectedNoteId,
  onSelectNote,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onLoadDemoNotes,
}) => {
  const activeNote = notes.find((n) => n.id === selectedNoteId) || null;

  const handleCreateNewNote = () => {
    const newNote: NoteItem = {
      id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: 'Untitled Note',
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
        onBack={() => onSelectNote(null)}
        onUpdateNote={onUpdateNote}
        onDeleteNote={(id) => {
          onDeleteNote(id);
          onSelectNote(null);
        }}
      />
    );
  }

  return (
    <NotesLibrary
      notes={notes}
      onSelectNote={(id) => onSelectNote(id)}
      onCreateNote={handleCreateNewNote}
      onDeleteNote={onDeleteNote}
      onLoadDemoNotes={onLoadDemoNotes}
    />
  );
};
