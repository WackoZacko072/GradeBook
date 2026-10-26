import type { SlabItem, SlabType } from '../types/slab';
import type { NoteItem, FlashcardItem, MultipleChoiceQuestion } from '../types/notebook';
import {
  getGeminiApiKey,
  getSelectedGeminiModel,
  type GeminiModel,
} from './aiAdvisorService';

const FALLBACK_MODELS: GeminiModel[] = [
  'gemini-3.5-flash',
  'gemini-3.6-flash',
  'gemini-3.8-flash',
  'gemini-3.5-flash-lite',
];

/**
 * Builds rich combined context from the student's selected notes and all uploaded files within them.
 */
function buildSourceContext(notes: NoteItem[], selectedNoteIds?: string[]): { context: string; noteNames: string[] } {
  const targetNotes = selectedNoteIds && selectedNoteIds.length > 0
    ? notes.filter((n) => selectedNoteIds.includes(n.id))
    : notes;

  if (targetNotes.length === 0) {
    return {
      context: 'General student knowledge base.',
      noteNames: ['All Knowledge Base'],
    };
  }

  const chunks: string[] = [];
  const noteNames: string[] = [];

  for (const note of targetNotes) {
    noteNames.push(note.title);
    chunks.push(`--- NOTE TITLE: ${note.title} (Class: ${note.className || 'General'}) ---`);
    if (note.content && note.content.trim()) {
      chunks.push(`NOTE CONTENT:\n${note.content.trim()}`);
    }

    if (note.sources && note.sources.length > 0) {
      chunks.push(`ATTACHED / UPLOADED STUDY FILES:`);
      for (const s of note.sources) {
        chunks.push(`[File: ${s.name} (${s.type})]:\n${s.content.slice(0, 3000)}`);
      }
    }
  }

  return {
    context: chunks.join('\n\n'),
    noteNames,
  };
}

/**
 * Low-level Gemini API caller for Slab generation
 */
async function callGeminiForSlab(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('Gemini API key is missing. Please check your settings.');
  }

  const preferredModel = getSelectedGeminiModel() || 'gemini-3.5-flash';
  const modelsToTry: GeminiModel[] = [
    preferredModel,
    ...FALLBACK_MODELS.filter((m) => m !== preferredModel),
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
        temperature: 0.3,
        maxOutputTokens: 8192,
        thinkingConfig: {
          thinkingBudget: 0,
        },
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

  throw lastError || new Error('Failed to reach Gemini API.');
}

/**
 * Extracts a JSON object from Gemini markdown backticks
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
  notes: NoteItem[];
  selectedNoteIds?: string[];
  count?: number;
}

/**
 * Generates an interactive Slab study set (Flashcards, MCQs, or Both) grounded in the student's notes and uploaded files.
 */
export async function generateSlabSet(options: GenerateSlabOptions): Promise<SlabItem> {
  const { prompt, type, notes, selectedNoteIds, count = 10 } = options;
  const { context, noteNames } = buildSourceContext(notes, selectedNoteIds);

  const systemPrompt = `You are Slab AI, an expert exam preparation engine and cognitive study assistant (like Anki and Quizlet, powered by Google Gemini).
Your purpose is to generate high-yield, engaging study decks (Flashcards and/or Multiple Choice Questions) strictly grounded in the student's notes and uploaded files.

CANADIAN ENGLISH & SPELLING:
- Use Canadian English conventions (e.g., colour, behaviour, centre, analyse).

MATHEMATICAL & SCIENTIFIC NOTATION:
- ALWAYS format formulas, scientific units, equations, and mathematical derivations in standard LaTeX ($...$ for inline, $$...$$ for display).

OUTPUT FORMAT:
Output ONLY a single valid JSON object strictly matching this schema:
{
  "title": "A concise, descriptive, professional name for this study set (e.g., 'Macroeconomics: Monetary Policy & Inflation' or 'Calculus: Derivatives Practice')",
  "description": "A 1-sentence overview of the concepts tested in this set",
  "flashcards": [
    {
      "front": "Concept, term, question, or theorem to recall",
      "back": "Clear, comprehensive definition or answer with LaTeX formulas and key steps if applicable"
    }
  ],
  "mcqs": [
    {
      "question": "Clear, high-yield multiple-choice question stem with LaTeX if relevant",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Detailed pedagogical explanation explaining why the correct choice is true and why distractors are false"
    }
  ]
}

RULES:
1. If the user requested 'flashcards', output at least ${count} items in the "flashcards" array and an empty or minimal "mcqs" array.
2. If the user requested 'mcq', output at least ${count} items in the "mcqs" array and an empty "flashcards" array.
3. If the user requested 'both', output ~${Math.ceil(count / 2)} items in "flashcards" and ~${Math.ceil(count / 2)} in "mcqs".
4. Base questions directly on the provided notes and files. If the user prompt asks for specific topics (e.g. 'Chapter 3 MCQs'), tailor the questions precisely.`;

  const userPrompt = `STUDENT REQUEST / PROMPT: "${prompt}"
REQUESTED TYPE: ${type}
TARGET ITEM COUNT: ${count}

GROUNDING SOURCES (Notes & Uploaded Files):
${context}`;

  const rawReply = await callGeminiForSlab(systemPrompt, userPrompt);
  const parsed = extractJsonObject(rawReply);

  if (!parsed || (!Array.isArray(parsed.flashcards) && !Array.isArray(parsed.mcqs))) {
    throw new Error('Gemini did not return a valid study set structure. Please try adjusting your prompt.');
  }

  const flashcards: FlashcardItem[] = Array.isArray(parsed.flashcards)
    ? parsed.flashcards.map((f: any, idx: number) => ({
        id: `fc_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
        front: String(f.front || 'Untitled Concept'),
        back: String(f.back || ''),
        mastered: false,
      }))
    : [];

  const mcqs: MultipleChoiceQuestion[] = Array.isArray(parsed.mcqs)
    ? parsed.mcqs.map((m: any, idx: number) => ({
        id: `mc_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
        question: String(m.question || 'Untitled Question'),
        options: Array.isArray(m.options) && m.options.length >= 2
          ? m.options.map(String)
          : ['Option A', 'Option B', 'Option C', 'Option D'],
        correctIndex: typeof m.correctIndex === 'number' && m.correctIndex >= 0 && m.correctIndex < 4
          ? m.correctIndex
          : 0,
        explanation: String(m.explanation || ''),
      }))
    : [];

  // Determine effective type based on generated content
  const effectiveType: SlabType =
    flashcards.length > 0 && mcqs.length > 0
      ? 'both'
      : flashcards.length > 0
      ? 'flashcards'
      : 'mcq';

  return {
    id: `slab_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    title: parsed.title ? String(parsed.title).trim() : 'Study Set',
    description: parsed.description ? String(parsed.description).trim() : undefined,
    type: effectiveType,
    prompt: prompt.trim(),
    sourceNoteIds: selectedNoteIds,
    sourceNoteNames: noteNames,
    flashcards,
    mcqs,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
