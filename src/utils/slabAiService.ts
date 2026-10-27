import type { SlabItem, SlabType } from '../types/slab';
import type { NoteItem, FlashcardItem, MultipleChoiceQuestion } from '../types/notebook';
import {
  getGeminiApiKey,
  getSelectedGeminiModel,
  type GeminiModel,
} from './aiAdvisorService';

const FALLBACK_MODELS: GeminiModel[] = [
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.6-flash',
  'gemini-3.8-flash',
];

import type { NoteSource } from '../types/notebook';

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
        `--- CLASS SOURCE: ${src.name} (Class: ${src.className || 'General'}, Type: ${src.type}) ---\n${src.content.slice(0, 12000)}`
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
        chunks.push(`NOTE CONTENT:\n${note.content.trim()}`);
      }

      if (note.sources && note.sources.length > 0) {
        for (const s of note.sources) {
          chunks.push(`[File: ${s.name} (${s.type})]:\n${s.content.slice(0, 4000)}`);
        }
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
 * Low-level Gemini API caller for Slab generation
 */
async function callGeminiForSlab(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('Gemini API key is missing. Please check your settings.');
  }

  const preferredModel = getSelectedGeminiModel() || 'gemini-3.5-flash-lite';
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
  notes?: NoteItem[];
  sources?: NoteSource[];
  selectedSourceIds?: string[];
  selectedNoteIds?: string[];
  count?: number;
}

/**
 * Generates an interactive Slab study set (Flashcards, MCQs, or Both) grounded in the student's sources and notes.
 */
export async function generateSlabSet(options: GenerateSlabOptions): Promise<SlabItem> {
  const { prompt, type, notes, sources, selectedNoteIds, selectedSourceIds, count = 10 } = options;
  const { context, noteNames } = buildSourceContext(notes, selectedNoteIds, sources, selectedSourceIds);

  // Parse prompt for requested count (e.g. "create 20 flashcards", "give me 25 questions", "make 20", etc.)
  const promptNumMatch =
    prompt.match(/\b(\d+)\s*(?:flashcards?|cards?|mcqs?|questions?|items?)\b/i) ||
    prompt.match(/\b(?:create|make|give me|generate)\s+(\d+)\b/i);

  const parsedPromptCount = promptNumMatch ? parseInt(promptNumMatch[1], 10) : 0;
  const finalCount = parsedPromptCount > 0 ? Math.max(parsedPromptCount, count) : count;

  let parsed: any = null;

  // High-Speed Parallel Generation for 16+ items (e.g. 20, 25, 30 cards/questions)
  if (finalCount >= 16) {
    const countA = Math.ceil(finalCount / 2);
    const countB = Math.floor(finalCount / 2);

    const makeBatchSystemPrompt = (batchNum: number, batchCount: number, focusTopic: string) => `You are Slab AI, an expert exam preparation engine and cognitive study assistant (like Anki and Quizlet, powered by Google Gemini).
Your purpose is to generate high-yield, engaging study decks (Flashcards and/or Multiple Choice Questions) strictly grounded in the student's class sources and uploaded files.

CANADIAN ENGLISH & SPELLING:
- Use Canadian English conventions (e.g., colour, behaviour, centre, analyse).

MATHEMATICAL & SCIENTIFIC NOTATION:
- ALWAYS format formulas, scientific units, equations, and mathematical derivations in standard LaTeX ($...$ for inline, $$...$$ for display).

OUTPUT FORMAT:
Output ONLY a single valid JSON object strictly matching this schema:
{
  "title": "A concise, descriptive, professional name for this study set",
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
1. PARALLEL BATCH REQUIREMENT: This is BATCH ${batchNum} of 2. You MUST generate EXACTLY ${batchCount} items in the target array.
   ${focusTopic}
   - If 'flashcards', output EXACTLY ${batchCount} items in the "flashcards" array and an empty "mcqs" array.
   - If 'mcq', output EXACTLY ${batchCount} items in the "mcqs" array and an empty "flashcards" array.
   - If 'both', output ~${Math.ceil(batchCount / 2)} items in "flashcards" and ~${Math.floor(batchCount / 2)} in "mcqs".
2. Base questions directly on the provided class sources and files.`;

    const makeBatchUserPrompt = (batchNum: number, batchCount: number, focusTopic: string) => `STUDENT REQUEST / PROMPT: "${prompt}" (BATCH ${batchNum}: ${focusTopic})
REQUESTED TYPE: ${type}
TARGET ITEM COUNT: ${batchCount} (CRITICAL: Output EXACTLY ${batchCount} items!)

GROUNDING SOURCES (Notes & Uploaded Files):
${context}`;

    const sysA = makeBatchSystemPrompt(1, countA, 'Focus on core definitions, fundamental laws, and essential foundational formulas.');
    const usrA = makeBatchUserPrompt(1, countA, 'Focus on core definitions, fundamental laws, and essential foundational formulas.');

    const sysB = makeBatchSystemPrompt(2, countB, 'Focus on practical applications, problem-solving techniques, edge cases, and high-yield exam questions.');
    const usrB = makeBatchUserPrompt(2, countB, 'Focus on practical applications, problem-solving techniques, edge cases, and high-yield exam questions.');

    try {
      const [resA, resB] = await Promise.all([
        callGeminiForSlab(sysA, usrA),
        callGeminiForSlab(sysB, usrB),
      ]);

      const parsedA = extractJsonObject(resA);
      const parsedB = extractJsonObject(resB);

      if (parsedA && parsedB) {
        parsed = {
          title: parsedA.title || parsedB.title || 'Study Set',
          description: parsedA.description || parsedB.description,
          flashcards: [
            ...(Array.isArray(parsedA.flashcards) ? parsedA.flashcards : []),
            ...(Array.isArray(parsedB.flashcards) ? parsedB.flashcards : []),
          ],
          mcqs: [
            ...(Array.isArray(parsedA.mcqs) ? parsedA.mcqs : []),
            ...(Array.isArray(parsedB.mcqs) ? parsedB.mcqs : []),
          ],
        };
      } else if (parsedA) {
        parsed = parsedA;
      } else if (parsedB) {
        parsed = parsedB;
      }
    } catch (parallelErr) {
      console.warn('Parallel generation fallback to single query:', parallelErr);
    }
  }

  // Fallback to single generation if count < 16 or parallel failed
  if (!parsed) {
    const systemPrompt = `You are Slab AI, an expert exam preparation engine and cognitive study assistant (like Anki and Quizlet, powered by Google Gemini).
Your purpose is to generate high-yield, engaging study decks (Flashcards and/or Multiple Choice Questions) strictly grounded in the student's class sources and uploaded files.

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
1. CRITICAL COUNT REQUIREMENT: You MUST generate EXACTLY ${finalCount} items in the target array. Do NOT default to 10 or stop early.
   - If 'flashcards', output EXACTLY ${finalCount} items in the "flashcards" array and an empty "mcqs" array.
   - If 'mcq', output EXACTLY ${finalCount} items in the "mcqs" array and an empty "flashcards" array.
   - If 'both', output ~${Math.ceil(finalCount / 2)} items in "flashcards" and ~${Math.floor(finalCount / 2)} in "mcqs".
2. Base questions directly on the provided class sources and files. If the user prompt asks for specific topics (e.g. 'Chapter 3 MCQs'), tailor the questions precisely.`;

    const userPrompt = `STUDENT REQUEST / PROMPT: "${prompt}"
REQUESTED TYPE: ${type}
TARGET ITEM COUNT: ${finalCount} (CRITICAL: Output EXACTLY ${finalCount} items, do not stop at 10!)

GROUNDING SOURCES (Notes & Uploaded Files):
${context}`;

    const rawReply = await callGeminiForSlab(systemPrompt, userPrompt);
    parsed = extractJsonObject(rawReply);
  }

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
