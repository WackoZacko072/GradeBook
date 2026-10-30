export interface SourceAiSummary {
  conciseSummary: string;
  keyTakeaways: string[];
  importantConcepts: Array<{
    title: string;
    explanation: string;
    formulaOrExample?: string;
  }>;
  keyDefinitions: Array<{
    term: string;
    definition: string;
  }>;
  generatedAt: number;
}

export interface SourceChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}

export interface NoteSource {
  id: string;
  name: string;
  type: 'file' | 'text' | 'pdf' | 'slides';
  content: string;
  fileSize?: string;
  classId?: string;
  className?: string;
  extractedWordCount?: number;
  addedAt: number;
  lastOpenedAt?: number;
  aiSummary?: SourceAiSummary;
  chatHistory?: SourceChatMessage[];
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

