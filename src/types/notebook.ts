export interface NoteSource {
  id: string;
  name: string;
  type: 'file' | 'text';
  content: string;
  fileSize?: string;
  addedAt: number;
}

export interface MultipleChoiceQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  userAnswer?: number;
}

export interface LongAnswerQuestion {
  id: string;
  question: string;
  sampleAnswer: string;
  keyRubricPoints: string[];
  userResponse?: string;
  aiFeedback?: {
    scorePercentage: number;
    feedback: string;
  };
}

export interface FlashcardItem {
  id: string;
  front: string;
  back: string;
  mastered?: boolean;
}

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  sources: NoteSource[];
  multipleChoice: MultipleChoiceQuestion[];
  longAnswer: LongAnswerQuestion[];
  flashcards: FlashcardItem[];
  createdAt: number;
  updatedAt: number;
}
