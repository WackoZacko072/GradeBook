import type { SlabItem, SlabType } from '../types/slab';
import type { NoteItem, FlashcardItem, MultipleChoiceQuestion, NoteSource } from '../types/notebook';
import {
  getGeminiApiKey,
  getSelectedGeminiModel,
  type GeminiModel,
} from './aiAdvisorService';

const FAST_MODELS: GeminiModel[] = [
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.8-flash',
];

/**
 * Builds rich combined context from the student's selected sources (PDFs, files, pasted notes) and notes.
 */
function buildSourceContext(
  notes?: NoteItem[],
  selectedNoteIds?: string[],
  sources?: NoteSource[],
  selectedSourceIds?: string[]
): { context: string; noteNames: string[] } {
  const chunks: string[] = [];
  const sourceNames: string[] = [];

  // Prioritize dedicated uploaded sources & documents
  if (sources && sources.length > 0) {
    const targetSources = selectedSourceIds && selectedSourceIds.length > 0
      ? sources.filter((s) => selectedSourceIds.includes(s.id))
      : sources;

    for (const src of targetSources) {
      sourceNames.push(src.name);
      chunks.push(
        `--- CLASS SOURCE: ${src.name} (Class: ${src.className || 'General'}, Type: ${src.type}) ---\n${src.content.slice(0, 8000)}`
      );
    }
  }

  // Also include notes if available
  if (notes && notes.length > 0) {
    const targetNotes = selectedNoteIds && selectedNoteIds.length > 0
      ? notes.filter((n) => selectedNoteIds.includes(n.id))
      : notes;

    for (const note of targetNotes) {
      sourceNames.push(note.title);
      chunks.push(`--- NOTE TITLE: ${note.title} (Class: ${note.className || 'General'}) ---`);
      if (note.content && note.content.trim()) {
        chunks.push(`NOTE CONTENT:\n${note.content.trim().slice(0, 4000)}`);
      }
    }
  }

  if (chunks.length === 0) {
    return {
      context: 'General student knowledge base.',
      noteNames: ['All Knowledge Base'],
    };
  }

  return {
    context: chunks.join('\n\n'),
    noteNames: sourceNames,
  };
}

/**
 * Low-level Gemini API caller for fast Office set generation
 */
async function callGeminiForSlab(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('Gemini API key is missing. Please check your settings.');
  }

  const preferredModel = getSelectedGeminiModel() || 'gemini-3.5-flash-lite';
  const modelsToTry: GeminiModel[] = [
    preferredModel,
    ...FAST_MODELS.filter((m) => m !== preferredModel),
  ];

  let lastError: any = null;

  for (const model of modelsToTry) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const requestBody = {
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: userPrompt }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
      },
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const status = response.status;
        const errMsg = errorData?.error?.message || response.statusText;

        if (status === 400 && errMsg?.toLowerCase().includes('api key')) {
          throw new Error('Gemini API key is invalid.');
        }
        if (status === 429) {
          lastError = new Error('QUOTA_EXCEEDED');
          continue;
        }
        // 503 high demand or 404: try next fallback model immediately
        if (status === 503 || status === 404) {
          console.warn(`Model ${model} returned ${status}, switching model...`);
          lastError = new Error(`Gemini (${model}): ${errMsg}`);
          continue;
        }

        lastError = new Error(`Gemini (${model}): ${errMsg}`);
        continue;
      }

      const data = await response.json();
      const candidate = data.candidates?.[0];
      const part = candidate?.content?.parts?.[0];
      const text = part?.text;

      if (!text || text.trim().length === 0) {
        lastError = new Error('Empty text content received from Gemini.');
        continue;
      }

      return text.trim();
    } catch (err: any) {
      if (err.message === 'QUOTA_EXCEEDED' || err.message?.includes('API key')) {
        throw err;
      }
      lastError = err;
    }
  }

  throw lastError || new Error('Failed to reach Gemini API. Please try again.');
}

/**
 * Extracts a JSON object from Gemini response
 */
function extractJsonObject(raw: string): any {
  let cleaned = raw.trim();

  // Strip ```json ... ```
  if (cleaned.startsWith('```')) {
    const firstNewline = cleaned.indexOf('\n');
    const lastBackticks = cleaned.lastIndexOf('```');
    if (firstNewline !== -1 && lastBackticks > firstNewline) {
      cleaned = cleaned.slice(firstNewline + 1, lastBackticks).trim();
    }
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    const startIdx = cleaned.indexOf('{');
    const endIdx = cleaned.lastIndexOf('}');
    if (startIdx !== -1 && endIdx > startIdx) {
      try {
        return JSON.parse(cleaned.slice(startIdx, endIdx + 1));
      } catch (e) {
        console.error('Failed to parse Slab JSON:', e, cleaned);
      }
    }
    return null;
  }
}

export interface GenerateSlabOptions {
  prompt: string;
  type: SlabType;
  notes?: NoteItem[];
  sources?: NoteSource[];
  selectedSourceIds?: string[];
  selectedNoteIds?: string[];
  count?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  classId?: string;
  className?: string;
}

function sanitizeLatexString(text: string): string {
  if (!text) return '';
  return text
    .replace(/\\\\([a-zA-Z]+)/g, '\\$1')
    .replace(/\\\[/g, '$$')
    .replace(/\\\]/g, '$$')
    .replace(/\\\(/g, '$')
    .replace(/\\\)/g, '$')
    .replace(/\$\s+([^$\n]+?)\s+\$/g, '$$1$');
}

/**
 * Generates an interactive Office study set (Flashcards, MCQs, or Both) quickly and reliably.
 */
export async function generateSlabSet(options: GenerateSlabOptions): Promise<SlabItem> {
  const {
    prompt,
    type,
    notes,
    sources,
    selectedNoteIds,
    selectedSourceIds,
    count = 12,
    difficulty = 'medium',
    classId,
    className,
  } = options;

  const { context, noteNames } = buildSourceContext(notes, selectedNoteIds, sources, selectedSourceIds);

  const difficultyInstruction =
    difficulty === 'easy'
      ? 'Focus on fundamental definitions, core terminology, and foundational formulas.'
      : difficulty === 'hard'
      ? 'Focus on challenging analytical questions, edge cases, multi-step problem solving, and synthesis.'
      : 'Balanced exam-level difficulty covering core concepts and practical problem solving.';

  // Target count: standard 10-15 items for rapid generation under 2-3 seconds
  const targetCount = Math.min(Math.max(count || 12, 6), 18);

  const systemPrompt = `You are an expert exam preparation engine and cognitive study assistant.
Generate a concise, high-yield study set (Flashcards and/or Multiple Choice Questions) based on the student's materials.

${difficultyInstruction}

MATHEMATICAL & SCIENTIFIC NOTATION:
Format math and scientific formulas using standard inline LaTeX: $formula$.

JSON SCHEMA:
Return ONLY a valid JSON object matching this schema:
{
  "title": "Concise, descriptive title for this set",
  "description": "Brief 1-sentence description",
  "flashcards": [
    {
      "front": "Concept, term, question, or theorem to recall",
      "back": "Clear, comprehensive definition or answer with steps"
    }
  ],
  "mcqs": [
    {
      "question": "Clear multiple choice question",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Brief explanation of why the correct option is right"
    }
  ]
}

RULES:
- If type is 'flashcards', generate ${targetCount} flashcards and an empty mcqs array.
- If type is 'mcq', generate ${targetCount} mcqs and an empty flashcards array.
- If type is 'both', generate ~${Math.ceil(targetCount / 2)} flashcards and ~${Math.floor(targetCount / 2)} mcqs.
- Output pure JSON only.`;

  const userPrompt = `STUDENT REQUEST: "${prompt}"
TYPE: ${type}
TARGET COUNT: ${targetCount} items
DIFFICULTY: ${difficulty}

STUDENT SOURCES & NOTES:
${context}`;

  const rawJson = await callGeminiForSlab(systemPrompt, userPrompt);
  const parsed = extractJsonObject(rawJson);

  if (!parsed) {
    throw new Error('Could not parse study set response. Please try again.');
  }

  // Format flashcards
  const flashcards: FlashcardItem[] = Array.isArray(parsed.flashcards)
    ? parsed.flashcards.map((f: any, idx: number) => ({
        id: `fc_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
        front: sanitizeLatexString(String(f.front || f.question || f.term || `Concept ${idx + 1}`)),
        back: sanitizeLatexString(String(f.back || f.answer || f.definition || 'No answer provided')),
      }))
    : [];

  // Format MCQs
  const mcqs: MultipleChoiceQuestion[] = Array.isArray(parsed.mcqs)
    ? parsed.mcqs.map((q: any, idx: number) => {
        const rawOptions = Array.isArray(q.options) && q.options.length >= 2 ? q.options : ['True', 'False'];
        const sanitizedOptions = rawOptions.map((opt: any) => sanitizeLatexString(String(opt)));
        let correctIdx = typeof q.correctIndex === 'number' ? q.correctIndex : 0;
        if (correctIdx < 0 || correctIdx >= sanitizedOptions.length) {
          correctIdx = 0;
        }

        return {
          id: `mcq_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
          question: sanitizeLatexString(String(q.question || `Question ${idx + 1}`)),
          options: sanitizedOptions,
          correctIndex: correctIdx,
          explanation: sanitizeLatexString(String(q.explanation || 'Review course concepts for more details.')),
        };
      })
    : [];

  if (flashcards.length === 0 && mcqs.length === 0) {
    throw new Error('Gemini generated an empty set. Please adjust your prompt and try again.');
  }

  const determinedType: SlabType =
    flashcards.length > 0 && mcqs.length > 0
      ? 'both'
      : flashcards.length > 0
      ? 'flashcards'
      : 'mcq';

  return {
    id: `slab_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    title: parsed.title?.trim() || prompt.slice(0, 40) || 'Study Set',
    description: parsed.description?.trim() || `Generated from ${noteNames.length} sources`,
    type: determinedType,
    prompt,
    flashcards,
    mcqs,
    sourceNoteIds: selectedNoteIds,
    sourceNoteNames: noteNames,
    classId,
    className,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
