import type { FlashcardItem, MultipleChoiceQuestion } from './notebook';

export type SlabType = 'flashcards' | 'mcq' | 'both';

export interface SlabItem {
  id: string;
  title: string;
  description?: string;
  type: SlabType;
  icon?: string;
  prompt: string;
  classId?: string;
  className?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  sourceNoteIds?: string[];
  sourceNoteNames?: string[];
  flashcards: FlashcardItem[];
  mcqs: MultipleChoiceQuestion[];
  createdAt: number;
  updatedAt: number;
}
