import React from 'react';
import type { NoteSource, NoteItem } from '../../types/notebook';
import type { ClassItem } from '../../types/grade';
import { SourcesLibrary } from './SourcesLibrary';

interface NotebookViewProps {
  sources?: NoteSource[];
  notes?: NoteItem[];
  classes?: ClassItem[];
  selectedNoteId?: string | null;
  onSelectNote?: (noteId: string | null) => void;
  onAddNote?: (newNote: NoteItem) => void;
  onUpdateNote?: (updatedNote: NoteItem) => void;
  onDeleteNote?: (noteId: string) => void;
  onAddSource: (source: NoteSource) => void;
  onUpdateSource: (source: NoteSource) => void;
  onDeleteSource: (sourceId: string) => void;
  onAddClass?: (name: string, color?: string) => void;
  onOpenSlateAi?: (prompt?: string) => void;
  onOpenCreateSlab?: (options: {
    prompt: string;
    type: 'flashcards' | 'mcq' | 'both';
    sourceId: string;
  }) => void;
}

export const NotebookView: React.FC<NotebookViewProps> = ({
  sources = [],
  classes = [],
  onAddSource,
  onUpdateSource,
  onDeleteSource,
  onAddClass,
  onOpenSlateAi,
  onOpenCreateSlab,
}) => {
  return (
    <SourcesLibrary
      sources={sources}
      classes={classes}
      onAddSource={onAddSource}
      onUpdateSource={onUpdateSource}
      onDeleteSource={onDeleteSource}
      onAddClass={onAddClass}
      onOpenSlateAi={onOpenSlateAi}
      onOpenCreateSlab={onOpenCreateSlab}
    />
  );
};
