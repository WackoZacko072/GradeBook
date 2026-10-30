import type { SlabItem, SlabType } from '../types/slab';
import type { NoteItem, FlashcardItem, MultipleChoiceQuestion, NoteSource } from '../types/notebook';
import {
  getGeminiApiKey,
  getSelectedGeminiModel,
  saveSelectedGeminiModel,
  type GeminiModel,
} from './aiAdvisorService';
import {
  recoverControlCharLatex,
  normalizeBareLatexInTextSegment,
} from '../components/LatexRenderer';

const FAST_MODELS: GeminiModel[] = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.6-flash',
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

  const preferredModel = getSelectedGeminiModel() || 'gemini-2.5-flash';
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

  // Escape LaTeX commands that start with valid JSON escape letters (b, f, n, r, t, u)
  // before JSON.parse can turn \f, \b, \t, \n, \r into ASCII control characters!
  // Any \b, \f, \t, \r followed by an ASCII letter is a LaTeX command (e.g. \frac, \beta, \theta, \times, \text, \rho, \right)
  s = s.replace(/\\([bftr][a-zA-Z]+)/g, DOUBLE_BS_TOKEN + '$1');
  s = s.replace(
    /\\(neq|ne|nu|nabla|notin|ni|natural|neg|nmid|nparallel|nsim|ncong|nsubseteq|nsupseteq|nleq|ngeq|nless|ngtr|not|underline|uparrow|Uparrow|updownarrow|upsilon|Upsilon)(?![a-zA-Z])/g,
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
    // IMPORTANT: Try repairJsonLatexEscapes FIRST so single-backslash \frac, \times, \text, \theta, \beta, \neq
    // are not silently turned into control characters (\f, \t, \b, \n, \r) by JSON.parse!
    for (const attempt of [repairJsonLatexEscapes(candidateStr), candidateStr]) {
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
  let s = recoverControlCharLatex(text)
    // Collapse double-escaped backslashes before LaTeX commands: \\frac -> \frac
    .replace(/\\\\([a-zA-Z]+)/g, '\\$1')
    // Normalize display and inline math delimiters using callbacks so '$' is never misinterpreted by JS replace
    .replace(/\\\[/g, () => '$$')
    .replace(/\\\]/g, () => '$$')
    .replace(/\\\(/g, () => '$')
    .replace(/\\\)/g, () => '$')
    // Trim spaces inside inline math ($ x + 1 $ -> $x + 1$)
    .replace(/\$(?!\$)\s*([^$\n]+?)\s*\$(?![$a-zA-Z0-9\\])/g, (_m, inner) => `$${inner.trim()}$`);

  // Normalize bare LaTeX commands and spelled-out "pi"/"theta" in all segments outside $...$
  const segments = s.split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g);
  return segments
    .map((seg) => (seg.startsWith('$') && seg.endsWith('$') ? seg : normalizeBareLatexInTextSegment(seg)))
    .join('');
}

function buildDifficultyInstruction(difficulty: 'easy' | 'medium' | 'hard'): string {
  if (difficulty === 'easy') {
    return `DIFFICULTY LEVEL: EASY (Foundational Recall & Direct Recognition)
- COGNITIVE LEVEL: Bloom's Taxonomy Level 1-2 (Remembering & Basic Understanding).
- FLASHCARDS: Ask direct, single-concept definitional questions ("What is...", "Define...", "State the basic formula/unit for..."). Keep answers concise (1-2 clear sentences) and easy to grasp.
- MCQs: Ask straightforward, single-step recognition questions testing core vocabulary, fundamental facts, and basic formulas. Do NOT include multi-step calculations or trick questions. Make the 3 distractors clearly distinct concepts so a beginner who reviewed the terms can identify the right answer.`;
  }

  if (difficulty === 'hard') {
    return `DIFFICULTY LEVEL: HARD (Advanced Synthesis, Multi-Step Problem Solving & Edge Cases)
- COGNITIVE LEVEL: Bloom's Taxonomy Level 5-6 (Evaluation, Multi-Step Analysis & Synthesis).
- STRICT RULE: DO NOT generate simple "What is X?" or "Define Y" questions. Every single item MUST challenge a top student preparing for a difficult final exam.
- FLASHCARDS: Focus on complex multi-step derivations/scenarios, boundary conditions ("Under what exact conditions does law/method X fail and why?"), subtle conceptual distinctions, second-order effects ("If parameter A doubles while B is constrained, how does Y change?"), and synthesis combining multiple concepts from the sources.
- MCQs: Write rigorous, multi-step analytical or quantitative exam questions, experimental perturbation scenarios, non-obvious edge cases, or "Which of the following MUST be true if..." problems. All 4 options must look highly plausible, and the 3 distractors must represent realistic analytical traps (e.g., common sign/factor errors, inverted relationships, or overlooking a key constraint).`;
  }

  return `DIFFICULTY LEVEL: MEDIUM (Standard Midterm Exam Application)
- COGNITIVE LEVEL: Bloom's Taxonomy Level 3-4 (Application & Conceptual Analysis).
- FLASHCARDS: Go beyond one-line definitions—ask "How" and "Why" questions, cause-and-effect mechanisms, comparisons between two related concepts, and standard 1-to-2 step formula applications.
- MCQs: Write realistic university/high-school midterm questions that require applying a concept or formula to a concrete scenario or solving a 1-to-2 step problem. Distractors should reflect common student misconceptions.`;
}

function buildSystemPromptForBatch(
  batchType: 'flashcards' | 'mcq',
  batchCount: number,
  difficulty: 'easy' | 'medium' | 'hard',
  avoidTopics?: string[]
): string {
  const difficultyInstruction = buildDifficultyInstruction(difficulty);
  const schemaRule =
    batchType === 'flashcards'
      ? `- You MUST generate EXACTLY ${batchCount} items in the "flashcards" array (items 1 through ${batchCount}) and an empty "mcqs": [] array. Do NOT stop at 8 or fewer items!`
      : `- You MUST generate EXACTLY ${batchCount} items in the "mcqs" array (items 1 through ${batchCount}) and an empty "flashcards": [] array. Do NOT stop at 8 or fewer items!`;

  const avoidClause =
    avoidTopics && avoidTopics.length > 0
      ? `\nDO NOT DUPLICATE THESE EXISTING QUESTIONS/FRONTS:\n${avoidTopics.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n`
      : '';

  return `You are Gemini Office AI, an expert exam preparation engine and cognitive study assistant.
Generate a high-yield study set grounded in the student's materials that strictly matches the requested DIFFICULTY LEVEL and EXACT ITEM COUNT.

${difficultyInstruction}
${avoidClause}
CANADIAN ENGLISH, CONCRETE NUMBERS & CLEAN MATH SYMBOLS:
- Use Canadian English spelling (e.g., colour, behaviour, centre, analyse).
- USE ACTUAL NUMBERS IN MCQs: For any quantitative, math, science, or problem-solving MCQ, give concrete numerical values in the question and compute the ACTUAL final numerical answers for the 4 options (e.g., "14.7 m/s", "240 J", "0.125 mol/L", "37.5%") instead of leaving options as raw symbolic LaTeX formulas.
- USE THE ACTUAL π SYMBOL & REAL MATH SYMBOLS (NEVER SPELL OUT "pi" OR "theta"): Never write English words like "pi", "pi/2", "2pi", "3pi/4", "theta", "alpha", "beta", "delta", or "sqrt(2)". Always use the real mathematical symbols: π (e.g., "π", "π/2", "2π", "3π/4"), θ, α, β, Δ, √, ∞, °, ±, ≤, ≥, ≠, ×, ÷.
- DO NOT OUTPUT RAW LATEX CODE: Never output bare un-delimited LaTeX commands like \\frac, \\text, \\times, \\cdot, \\Delta, \\sqrt, \\sin, \\cos, \\left, or \\right as raw text. For numbers, units, angles, and simple expressions, write clean readable text with real Unicode symbols (e.g., "π/2", "2π rad", "25 m/s", "3.0 × 10⁸ m/s", "ΔH = -285 kJ/mol", "x² + 2x + 1").
- If a complex multi-term equation or fraction requires LaTeX rendering, wrap the entire formula in single dollar signs ($...$) with no spaces inside the dollar signs, and double-escape backslashes in JSON (e.g., "$\\\\frac{\\\\pi}{2}$").

JSON SCHEMA:
Return ONLY a valid JSON object matching this schema:
{
  "title": "Concise, descriptive title for this study set",
  "description": "Brief 1-sentence description",
  "flashcards": [
    {
      "front": "Question, scenario, or concept prompt matching the ${difficulty.toUpperCase()} difficulty level",
      "back": "Clear, complete answer or step-by-step explanation matching the ${difficulty.toUpperCase()} difficulty level"
    }
  ],
  "mcqs": [
    {
      "question": "Clear multiple-choice question stem matching the ${difficulty.toUpperCase()} difficulty level",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Concise explanation of why the correct option is right and why distractors are wrong"
    }
  ]
}

CRITICAL RULES:
${schemaRule}
- Count carefully from 1 to ${batchCount} before closing the JSON array so the array length is strictly ${batchCount}.
- DIFFICULTY OVERRIDE: Even if the student prompt mentions generic words like "definitions" or "key concepts", you MUST strictly enforce the ${difficulty.toUpperCase()} difficulty level rules above for every single item.
- Every MCQ must have 4 distinct options and a valid correctIndex (0-3).
- Output pure valid JSON only.`;
}

async function generateItemsForSingleType(
  singleType: 'flashcards' | 'mcq',
  targetCount: number,
  effectivePrompt: string,
  difficulty: 'easy' | 'medium' | 'hard',
  context: string
): Promise<{ title?: string; description?: string; items: any[] }> {
  const sysPrompt = buildSystemPromptForBatch(singleType, targetCount, difficulty);
  const usrPrompt = `STUDENT REQUEST: "${effectivePrompt}"
TYPE: ${singleType}
REQUIRED EXACT ITEM COUNT: ${targetCount} items (You MUST output all ${targetCount} items in the "${singleType}" array — do not stop early!)
REQUIRED DIFFICULTY: ${difficulty.toUpperCase()}

STUDENT SOURCES & NOTES:
${context}`;

  const rawJson = await callGeminiForSlab(sysPrompt, usrPrompt);
  const parsed = extractJsonObject(rawJson);
  if (!parsed) {
    throw new Error('Could not parse study set response. Please try again.');
  }

  const key = singleType === 'flashcards' ? 'flashcards' : 'mcqs';
  let items: any[] = Array.isArray(parsed[key]) ? parsed[key] : [];

  // If the model stopped early (e.g. returned 8 items when 12 or 16 were requested), fetch the remaining items
  if (items.length < targetCount) {
    const missingCount = targetCount - items.length;
    const existingPrompts = items
      .map((it: any) => String(it.front || it.question || '').slice(0, 120))
      .filter(Boolean);

    try {
      const topUpSys = buildSystemPromptForBatch(singleType, missingCount, difficulty, existingPrompts);
      const topUpUsr = `STUDENT REQUEST: "${effectivePrompt}"
TYPE: ${singleType}
REQUIRED EXACT ITEM COUNT: Generate ${missingCount} ADDITIONAL unique ${difficulty.toUpperCase()}-level items to complete the set of ${targetCount}.
REQUIRED DIFFICULTY: ${difficulty.toUpperCase()}

STUDENT SOURCES & NOTES:
${context}`;

      const topUpRaw = await callGeminiForSlab(topUpSys, topUpUsr);
      const topUpParsed = extractJsonObject(topUpRaw);
      const extraItems = topUpParsed && Array.isArray(topUpParsed[key]) ? topUpParsed[key] : [];
      if (extraItems.length > 0) {
        items = [...items, ...extraItems];
      }
    } catch (topUpErr) {
      console.warn(`Top-up generation for ${singleType} skipped:`, topUpErr);
    }
  }

  return {
    title: parsed.title,
    description: parsed.description,
    items: items.slice(0, targetCount),
  };
}

/**
 * Generates an interactive Office study set (Flashcards, MCQs, or Both) with exact item counts
 * and strictly differentiated difficulty levels (Easy, Medium, Hard).
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
      : `Course study set${className ? ` for ${className}` : ''}`;

  const { context, noteNames } = buildSourceContext(notes, selectedNoteIds, sources, selectedSourceIds);

  // Strictly respect the Quantity selector count (8 = Less, 12 = Standard, 16 = More)
  const targetCount = Math.min(Math.max(count || 12, 6), 24);

  let rawFlashcards: any[] = [];
  let rawMcqs: any[] = [];
  let setTitle = '';
  let setDescription = '';

  if (type === 'flashcards') {
    const res = await generateItemsForSingleType('flashcards', targetCount, effectivePrompt, difficulty, context);
    rawFlashcards = res.items;
    setTitle = res.title || '';
    setDescription = res.description || '';
  } else if (type === 'mcq') {
    const res = await generateItemsForSingleType('mcq', targetCount, effectivePrompt, difficulty, context);
    rawMcqs = res.items;
    setTitle = res.title || '';
    setDescription = res.description || '';
  } else {
    // 'both': generate targetCount flashcards AND targetCount MCQs
    const [fcSettled, mcqSettled] = await Promise.allSettled([
      generateItemsForSingleType('flashcards', targetCount, effectivePrompt, difficulty, context),
      generateItemsForSingleType('mcq', targetCount, effectivePrompt, difficulty, context),
    ]);

    if (fcSettled.status === 'fulfilled') {
      rawFlashcards = fcSettled.value.items;
      setTitle = fcSettled.value.title || '';
      setDescription = fcSettled.value.description || '';
    } else {
      // Retry sequentially if concurrent request hit burst limit
      const fcRetry = await generateItemsForSingleType('flashcards', targetCount, effectivePrompt, difficulty, context);
      rawFlashcards = fcRetry.items;
      setTitle = fcRetry.title || '';
      setDescription = fcRetry.description || '';
    }

    if (mcqSettled.status === 'fulfilled') {
      rawMcqs = mcqSettled.value.items;
      if (!setTitle) setTitle = mcqSettled.value.title || '';
      if (!setDescription) setDescription = mcqSettled.value.description || '';
    } else {
      // Retry sequentially if concurrent request hit burst limit
      const mcqRetry = await generateItemsForSingleType('mcq', targetCount, effectivePrompt, difficulty, context);
      rawMcqs = mcqRetry.items;
      if (!setTitle) setTitle = mcqRetry.title || '';
      if (!setDescription) setDescription = mcqRetry.description || '';
    }
  }

  // Format flashcards
  const flashcards: FlashcardItem[] = rawFlashcards.map((f: any, idx: number) => ({
    id: `fc_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
    front: sanitizeLatexString(String(f.front || f.question || f.term || `Concept ${idx + 1}`)),
    back: sanitizeLatexString(String(f.back || f.answer || f.definition || 'No answer provided')),
  }));

  // Format MCQs
  const mcqs: MultipleChoiceQuestion[] = rawMcqs.map((q: any, idx: number) => {
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
  });

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
    title: setTitle.trim() || effectivePrompt.slice(0, 40) || 'Study Set',
    description: setDescription.trim() || `Generated from ${noteNames.length} sources`,
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
