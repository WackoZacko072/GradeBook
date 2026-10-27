export interface NoteSource {
  id: string;
  name: string;
  type: 'file' | 'text' | 'pdf';
  content: string;
  fileSize?: string;
  classId?: string;
  className?: string;
  extractedWordCount?: number;
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
  status?: 'know' | 'dont_know' | 'unreviewed';
}

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  classId?: string;
  className?: string;
  icon?: string;
  sources: NoteSource[];
  multipleChoice: MultipleChoiceQuestion[];
  longAnswer: LongAnswerQuestion[];
  flashcards: FlashcardItem[];
  createdAt: number;
  updatedAt: number;
}

