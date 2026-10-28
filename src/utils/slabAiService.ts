import type { SlabItem, SlabType } from '../types/slab';
import type { NoteItem, FlashcardItem, MultipleChoiceQuestion, NoteSource } from '../types/notebook';
import {
  getGeminiApiKey,
  getSelectedGeminiModel,
  saveSelectedGeminiModel,
  type GeminiModel,
} from './aiAdvisorService';

const FAST_MODELS: GeminiModel[] = [
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.6-flash',
  'gemini-3.8-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
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
    const targetSources =
      selectedSourceIds && selectedSourceIds.length > 0
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
    const targetNotes =
      selectedNoteIds && selectedNoteIds.length > 0
        ? notes.filter((n) => selectedNoteIds.includes(n.id))
        : notes;

    for (const note of targetNotes) {
      sourceNames.push(note.title);
      chunks.push(`--- NOTE TITLE: ${note.title} (Class: ${note.className || 'General'}) ---`);
      if (note.content && note.content.trim()) {
        chunks.push(`NOTE CONTENT:\n${note.content.trim().slice(0, 4000)}`);
      }
      if (note.sources && note.sources.length > 0) {
        for (const s of note.sources) {
          chunks.push(`[File: ${s.name} (${s.type})]:\n${s.content.slice(0, 3500)}`);
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
 * Low-level Gemini API caller for fast Office set generation.
 * Disables thinking overhead (thinkingBudget: 0) for rapid 1-3s responses and
 * properly filters out any `thought` parts if a thinking model is used.
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

    const requestBody: any = {
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
        temperature: 0.25,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
        thinkingConfig: {
          thinkingBudget: 0,
        },
      },
    };

    try {
      let response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      // If thinkingConfig or responseMimeType is rejected on this model endpoint (HTTP 400), strip and retry immediately
      if (!response.ok && response.status === 400) {
        const errJson = await response.json().catch(() => null);
        const errMsg = errJson?.error?.message || '';

        if (errMsg.toLowerCase().includes('api key') || errMsg.includes('API_KEY_INVALID')) {
          throw new Error('Gemini API key is invalid.');
        }

        let modified = false;
        if (errMsg.includes('thinkingConfig') || errMsg.includes('thinking_config') || errMsg.includes('thinking')) {
          delete requestBody.generationConfig.thinkingConfig;
          modified = true;
        }
        if (errMsg.includes('responseMimeType') || errMsg.includes('response_mime_type')) {
          delete requestBody.generationConfig.responseMimeType;
          modified = true;
        }
        if (!modified) {
          // Generic 400 schema rejection: retry with minimal generationConfig
          delete requestBody.generationConfig.thinkingConfig;
          modified = true;
        }

        if (modified) {
          response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
          });
        }
      }

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
        if (status === 503 || status === 404 || status >= 500) {
          console.warn(`Model ${model} returned ${status}, switching model...`);
          lastError = new Error(`Gemini (${model}): ${errMsg}`);
          continue;
        }

        lastError = new Error(`Gemini (${model}): ${errMsg}`);
        continue;
      }

      const data = await response.json();
      const candidate = data.candidates?.[0];
      const parts = candidate?.content?.parts || [];

      // Filter out internal thinking parts (`thought: true`) so we only extract the actual JSON output
      const nonThoughtParts = parts.filter((p: any) => !p.thought && typeof p.text === 'string');
      const text = (
        nonThoughtParts.length > 0
          ? nonThoughtParts.map((p: any) => p.text).join('')
          : parts.map((p: any) => p.text || '').join('')
      ).trim();

      if (!text || text.length === 0) {
        lastError = new Error('Empty text content received from Gemini.');
        continue;
      }

      saveSelectedGeminiModel(model);
      return text;
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
 * Repairs single-backslash LaTeX commands inside raw JSON strings before JSON.parse
 * so commands like \frac, \theta, \beta, \text, \Delta, \sqrt do not break JSON parsing
 * or turn into control characters (\f, \t, \b, \n, \r).
 */
function repairJsonLatexEscapes(rawJson: string): string {
  const DOUBLE_BS_TOKEN = '__DBL_BS_PLACEHOLDER__';
  let s = rawJson.replace(/\\\\/g, DOUBLE_BS_TOKEN);

  // Escape common LaTeX commands that start with valid JSON escape letters (b, f, n, r, t)
  s = s.replace(
    /\\(frac|forall|flat|fbox|beta|binom|boxed|bar|begin|bf|Big|big|bigl|bigr|theta|times|text|textbf|textit|textrm|texttt|to|tan|tau|triangle|tilde|top|neq|nu|nabla|notin|ni|natural|neg|rho|rightarrow|Rightarrow|right|rangle|rceil|rfloor)\b/g,
    DOUBLE_BS_TOKEN + '$1'
  );

  // Escape any remaining single backslash not followed by a valid JSON escape (", \, /, b, f, n, r, t, uXXXX)
  s = s.replace(/\\(?![/\\bfnrt"]|u[0-9a-fA-F]{4})/g, DOUBLE_BS_TOKEN);

  return s.replaceAll(DOUBLE_BS_TOKEN, '\\\\');
}

/**
 * Extracts a JSON object from Gemini response with automatic LaTeX escape & truncation recovery.
 */
function extractJsonObject(raw: string): any {
  if (!raw) return null;
  let cleaned = raw.trim();

  // Strip ```json ... ``` fences if present
  if (cleaned.includes('```')) {
    cleaned = cleaned
      .replace(/^[\s\S]*?```(?:json)?\s*/i, '')
      .replace(/\s*```[\s\S]*$/, '')
      .trim();
  }

  const tryParseObject = (candidateStr: string): any => {
    for (const attempt of [candidateStr, repairJsonLatexEscapes(candidateStr)]) {
      try {
        const parsed = JSON.parse(attempt);
        if (Array.isArray(parsed)) {
          // If Gemini returned a raw array instead of an object wrapper, wrap it automatically
          const first = parsed[0];
          if (first && ('options' in first || 'question' in first)) {
            return { mcqs: parsed, flashcards: [] };
          }
          return { flashcards: parsed, mcqs: [] };
        }
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      } catch {
        // continue
      }
    }
    return null;
  };

  // 1. Direct parse
  let result = tryParseObject(cleaned);
  if (result) return result;

  // 2. Substring between outermost { and }
  const startIdx = cleaned.indexOf('{');
  const endIdx = cleaned.lastIndexOf('}');
  if (startIdx !== -1 && endIdx > startIdx) {
    result = tryParseObject(cleaned.slice(startIdx, endIdx + 1));
    if (result) return result;
  }

  // 3. Truncated JSON repair: if cut off mid-array, close at the last complete item `}`
  if (startIdx !== -1) {
    const fromStart = cleaned.slice(startIdx);
    let searchPos = fromStart.length;
    while (searchPos > 0) {
      const prevBrace = fromStart.lastIndexOf('}', searchPos - 1);
      if (prevBrace <= 0) break;
      const slice = fromStart.slice(0, prevBrace + 1);
      for (const suffix of [']}', '],"mcqs":[]}', ']}']) {
        const repaired = tryParseObject(slice + suffix);
        if (
          repaired &&
          ((Array.isArray(repaired.flashcards) && repaired.flashcards.length > 0) ||
            (Array.isArray(repaired.mcqs) && repaired.mcqs.length > 0))
        ) {
          return repaired;
        }
      }
      searchPos = prevBrace;
    }
  }

  console.error('Failed to parse Slab JSON:', cleaned);
  return null;
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
  return (
    text
      // Recover control characters if \frac, \beta, \theta, \text were ever unescaped in JSON
      .replace(/\f(rac|orall|lat|box)/g, '\\f$1')
      .replace(/[\b](eta|inom|oxed|ar|egin|f|ig)/g, '\\b$1')
      .replace(/\t(heta|imes|ext|o|an|au|riangle|ilde|op)/g, '\\t$1')
      .replace(/\\\\([a-zA-Z]+)/g, '\\$1')
      .replace(/\\\[/g, '$$')
      .replace(/\\\]/g, '$$')
      .replace(/\\\(/g, '$')
      .replace(/\\\)/g, '$')
      .replace(/\$\s+([^$\n]+?)\s+\$/g, '$$1$')
  );
}

function buildSystemPromptForBatch(
  batchType: SlabType,
  batchCount: number,
  difficultyInstruction: string,
  focusGuidance?: string
): string {
  const schemaRule =
    batchType === 'flashcards'
      ? `- Generate EXACTLY ${batchCount} items in "flashcards" and an empty "mcqs": [] array.`
      : batchType === 'mcq'
      ? `- Generate EXACTLY ${batchCount} items in "mcqs" and an empty "flashcards": [] array.`
      : `- Generate ${Math.ceil(batchCount / 2)} items in "flashcards" and ${Math.floor(batchCount / 2)} items in "mcqs".`;

  return `You are Gemini Office AI, an expert exam preparation engine and cognitive study assistant.
Generate a high-yield study set (Flashcards and/or Multiple Choice Questions) grounded in the student's materials.

${difficultyInstruction}
${focusGuidance ? `\nBATCH FOCUS: ${focusGuidance}` : ''}

CANADIAN ENGLISH & NOTATION:
- Use Canadian English spelling (e.g., colour, behaviour, centre, analyse).
- Format mathematical and scientific formulas using inline LaTeX ($...$). Escape backslashes in JSON strings (e.g., "\\\\frac{a}{b}").

JSON SCHEMA:
Return ONLY a valid JSON object matching this schema:
{
  "title": "Concise, descriptive title for this study set",
  "description": "Brief 1-sentence description",
  "flashcards": [
    {
      "front": "Concept, term, question, or theorem to recall",
      "back": "Clear, comprehensive definition or answer with key steps"
    }
  ],
  "mcqs": [
    {
      "question": "Clear multiple-choice question stem",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Concise explanation of why the correct option is right"
    }
  ]
}

RULES:
${schemaRule}
- Every MCQ must have 4 distinct options and a valid correctIndex (0-3).
- Output pure valid JSON only.`;
}

/**
 * Generates an interactive Office study set (Flashcards, MCQs, or Both) quickly and reliably.
 * Uses parallel concurrent batching for larger sets or 'both' mode to cut latency in half.
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

  const effectivePrompt =
    prompt && prompt.trim().length > 0
      ? prompt.trim()
      : `Core concepts, definitions, formulas, and exam review questions${className ? ` for ${className}` : ''}`;

  const { context, noteNames } = buildSourceContext(notes, selectedNoteIds, sources, selectedSourceIds);

  const difficultyInstruction =
    difficulty === 'easy'
      ? 'DIFFICULTY: EASY. Focus on fundamental definitions, core terminology, and foundational formulas.'
      : difficulty === 'hard'
      ? 'DIFFICULTY: HARD. Focus on challenging analytical questions, edge cases, multi-step problem solving, and synthesis.'
      : 'DIFFICULTY: MEDIUM. Balanced exam-level difficulty covering core concepts and practical problem solving.';

  // Parse prompt if user explicitly asked for a specific number (e.g. "15 flashcards")
  const promptNumMatch =
    effectivePrompt.match(/\b(\d+)\s*(?:flashcards?|cards?|mcqs?|questions?|items?)\b/i) ||
    effectivePrompt.match(/\b(?:create|make|give me|generate)\s+(\d+)\b/i);
  const parsedPromptCount = promptNumMatch ? parseInt(promptNumMatch[1], 10) : 0;
  const targetCount = Math.min(Math.max(parsedPromptCount > 0 ? parsedPromptCount : count || 12, 6), 24);

  let parsed: any = null;

  // Fast Parallel Generation:
  // 1) If type === 'both', generate Flashcards and MCQs concurrently in 2 parallel calls.
  // 2) If targetCount >= 12, split into 2 parallel calls of ~half size so generation finishes in ~2 seconds.
  if (type === 'both' || targetCount >= 12) {
    const isBoth = type === 'both';
    const countA = Math.ceil(targetCount / 2);
    const countB = Math.max(1, Math.floor(targetCount / 2));

    const typeA: SlabType = isBoth ? 'flashcards' : type;
    const typeB: SlabType = isBoth ? 'mcq' : type;

    const focusA = isBoth
      ? 'Generate high-yield active recall flashcards covering core concepts, definitions, and formulas.'
      : 'Part 1 of 2: Focus on foundational concepts, definitions, principles, and core formulas.';
    const focusB = isBoth
      ? 'Generate exam-style multiple-choice questions testing conceptual application and problem solving.'
      : 'Part 2 of 2: Focus on practical application scenarios, problem-solving, comparisons, and edge cases (avoid duplicating Part 1).';

    const sysA = buildSystemPromptForBatch(typeA, countA, difficultyInstruction, focusA);
    const usrA = `STUDENT REQUEST: "${effectivePrompt}"\nTYPE: ${typeA}\nTARGET COUNT: ${countA} items\nDIFFICULTY: ${difficulty}\n\nSTUDENT SOURCES & NOTES:\n${context}`;

    const sysB = buildSystemPromptForBatch(typeB, countB, difficultyInstruction, focusB);
    const usrB = `STUDENT REQUEST: "${effectivePrompt}"\nTYPE: ${typeB}\nTARGET COUNT: ${countB} items\nDIFFICULTY: ${difficulty}\n\nSTUDENT SOURCES & NOTES:\n${context}`;

    try {
      const results = await Promise.allSettled([
        callGeminiForSlab(sysA, usrA),
        callGeminiForSlab(sysB, usrB),
      ]);

      const parsedA = results[0].status === 'fulfilled' ? extractJsonObject(results[0].value) : null;
      const parsedB = results[1].status === 'fulfilled' ? extractJsonObject(results[1].value) : null;

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
      } else if (parsedA && !isBoth) {
        parsed = parsedA;
      } else if (parsedB && !isBoth) {
        parsed = parsedB;
      }
    } catch (parallelErr) {
      console.warn('Parallel Office generation fallback to single request:', parallelErr);
    }
  }

  // Single-request generation (for smaller sets or if parallel batching fell back)
  if (!parsed) {
    const systemPrompt = buildSystemPromptForBatch(type, targetCount, difficultyInstruction);
    const userPrompt = `STUDENT REQUEST: "${effectivePrompt}"
TYPE: ${type}
TARGET COUNT: ${targetCount} items
DIFFICULTY: ${difficulty}

STUDENT SOURCES & NOTES:
${context}`;

    const rawJson = await callGeminiForSlab(systemPrompt, userPrompt);
    parsed = extractJsonObject(rawJson);
  }

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
    title: parsed.title?.trim() || effectivePrompt.slice(0, 40) || 'Study Set',
    description: parsed.description?.trim() || `Generated from ${noteNames.length} sources`,
    type: determinedType,
    prompt: effectivePrompt,
    difficulty,
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
