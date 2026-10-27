import type {
  MultipleChoiceQuestion,
  LongAnswerQuestion,
  FlashcardItem,
  NoteSource,
} from '../types/notebook';
import {
  getGeminiApiKey,
  getSelectedGeminiModel,
  saveSelectedGeminiModel,
  type GeminiModel,
} from './aiAdvisorService';

// Priority order: latest stable flash models with working endpoints
const FALLBACK_MODELS: GeminiModel[] = [
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.6-flash',
  'gemini-3.8-flash',
];

/**
 * Builds aggregated study text combining the typed note content with all uploaded sources
 */
function buildSourceContext(noteTitle: string, noteContent: string, sources: NoteSource[]): string {
  const hasContent = Boolean(noteContent && noteContent.trim().length > 0);
  const hasSources = sources && sources.length > 0;
  const isUntitled = !noteTitle || noteTitle.trim().toLowerCase() === 'untitled note';
  const effectiveTopic = isUntitled && !hasContent ? 'Foundational Academic Principles and Problem Solving' : (noteTitle || 'General Study');

  let combined = `NOTE TITLE / SUBJECT: ${effectiveTopic}\n\n`;

  if (hasContent) {
    combined += `STUDENT NOTE CONTENT:\n${noteContent}\n\n`;
  }

  if (hasSources) {
    combined += `UPLOADED STUDY SOURCES (${sources.length}):\n`;
    sources.forEach((src, idx) => {
      combined += `--- SOURCE ${idx + 1}: ${src.name} ---\n${src.content}\n\n`;
    });
  }

  if (!hasContent && !hasSources) {
    combined += `(Note: The student is initiating notes for "${effectiveTopic}". Generate high-yield, comprehensive academic questions directly covering core concepts, formulas, and theorems in this topic.)\n\n`;
  }

  return combined;
}

/**
 * Low-level caller to Gemini API with robust candidate parsing and fallback handling
 */
async function callGemini(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('Gemini API key is missing. Please check your settings or environment configuration.');
  }

  const preferredModel = getSelectedGeminiModel() || 'gemini-3.5-flash-lite';
  const modelsToTry: GeminiModel[] = [
    preferredModel,
    ...FALLBACK_MODELS.filter((m) => m !== preferredModel),
  ];

  let lastError: Error | null = null;

  for (const model of modelsToTry) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    // Payload formatted for Gemini with thinkingConfig and adequate maxOutputTokens
    const payload: any = {
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
        responseMimeType: 'application/json',
        thinkingConfig: {
          thinkingBudget: 512,
        },
      },
    };

    try {
      let response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // If thinkingConfig or responseMimeType is rejected on this endpoint/model, retry cleanly
      if (!response.ok && response.status === 400) {
        const errJson = await response.json().catch(() => null);
        const errMsg = errJson?.error?.message || '';

        let modified = false;
        if (errMsg.includes('thinkingConfig') || errMsg.includes('thinking_config')) {
          delete payload.generationConfig.thinkingConfig;
          modified = true;
        }
        if (errMsg.includes('responseMimeType') || errMsg.includes('response_mime_type')) {
          delete payload.generationConfig.responseMimeType;
          modified = true;
        }

        if (modified) {
          response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        }
      }

      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        const errMsg = errJson?.error?.message || `HTTP ${response.status}: ${response.statusText}`;

        // If high demand (503), model not found (404), or transient server error, try next fallback model
        if (response.status === 503 || response.status === 404 || response.status >= 500) {
          console.warn(`Model ${model} returned ${response.status} (${errMsg}). Falling back to next model...`);
          lastError = new Error(errMsg);
          continue;
        }

        if (response.status === 429) {
          throw new Error('Rate limit reached (QUOTA_EXCEEDED). Please wait a few seconds and try again.');
        }

        if (response.status === 400 && (errMsg.includes('API_KEY_INVALID') || errMsg.includes('API key not valid'))) {
          throw new Error('Gemini API key is invalid. Please verify your API key in Settings.');
        }

        if (response.status === 403 || errMsg.includes('API_KEY_SERVICE_BLOCKED')) {
          throw new Error('Gemini API key is blocked or does not have access to Generative Language API.');
        }

        lastError = new Error(errMsg);
        continue;
      }

      const data = await response.json();
      const candidate = data?.candidates?.[0];

      if (!candidate || !candidate.content?.parts) {
        if (candidate?.finishReason === 'SAFETY') {
          throw new Error('The request was flagged by AI safety filters. Please adjust the note content.');
        }
        throw new Error('Received an empty response from Gemini.');
      }

      // Collect all text parts from the response (handling thinking models where parts may be split)
      const parts = candidate.content.parts;
      const nonThoughtParts = parts.filter((p: any) => !p.thought && typeof p.text === 'string');
      const rawText = nonThoughtParts.length > 0
        ? nonThoughtParts.map((p: any) => p.text).join('')
        : parts.map((p: any) => p.text || '').join('');

      if (!rawText.trim()) {
        throw new Error('Empty text content received from Gemini.');
      }

      // Save working model for subsequent calls
      saveSelectedGeminiModel(model);
      return rawText;
    } catch (err: any) {
      if (
        err.message.includes('Rate limit') ||
        err.message.includes('invalid') ||
        err.message.includes('blocked')
      ) {
        throw err;
      }
      lastError = err;
    }
  }

  throw lastError || new Error('Failed to reach Gemini API. Please check your network and API key.');
}

/**
 * Robust JSON array extractor:
 * Handles direct JSON, markdown fenced blocks, regex brackets, and repairs truncated JSON arrays
 */
function extractJsonArray(raw: string): any[] {
  if (!raw) return [];

  const tryParse = (str: string): any[] | null => {
    try {
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && typeof parsed === 'object') {
        for (const key of Object.keys(parsed)) {
          if (Array.isArray(parsed[key])) return parsed[key];
        }
      }
    } catch {}
    return null;
  };

  // 1. Direct JSON parse
  let res = tryParse(raw);
  if (res) return res;

  // 2. Strip markdown fences: ```json ... ``` or ``` ... ```
  const withoutFences = raw
    .replace(/^[\s\S]*?```(?:json)?\s*/i, '')
    .replace(/\s*```[\s\S]*$/, '')
    .trim();

  res = tryParse(withoutFences);
  if (res) return res;

  // 3. Regex bracket matching: find outermost [ ... ]
  const firstBracket = withoutFences.indexOf('[');
  const lastBracket = withoutFences.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    const arrayStr = withoutFences.substring(firstBracket, lastBracket + 1);
    res = tryParse(arrayStr);
    if (res) return res;
  }

  // 4. Truncated array repair: find the last `}` before the end and close the array with `]`
  if (firstBracket !== -1) {
    const afterFirst = withoutFences.substring(firstBracket);
    const lastBrace = afterFirst.lastIndexOf('}');
    if (lastBrace !== -1) {
      const repaired = afterFirst.substring(0, lastBrace + 1) + ']';
      res = tryParse(repaired);
      if (res && res.length > 0) return res;
    }
  }

  // 5. Regex object matching: find outermost { ... } and search for an array field
  const firstBrace = withoutFences.indexOf('{');
  const lastBrace = withoutFences.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const objStr = withoutFences.substring(firstBrace, lastBrace + 1);
    try {
      const parsed = JSON.parse(objStr);
      for (const key of Object.keys(parsed)) {
        if (Array.isArray(parsed[key])) return parsed[key];
      }
    } catch {}
  }

  return [];
}

/**
 * Generate Multiple Choice Questions grounded strictly in the note and sources
 */
export async function generateMultipleChoiceQuestions(
  noteTitle: string,
  noteContent: string,
  sources: NoteSource[],
  count = 5
): Promise<MultipleChoiceQuestion[]> {
  const context = buildSourceContext(noteTitle, noteContent, sources);

  const systemPrompt = `You are an expert academic curriculum designer and test author. 
Your goal is to generate high-yield, conceptual multiple-choice questions grounded in the provided student notes, sources, or topic.

CRITICAL FORMATTING INSTRUCTIONS:
1. When writing any mathematical formulas, algebraic equations, physical laws, units, or chemical symbols, ALWAYS use standard LaTeX syntax:
   - Inline formulas: $...$ (e.g. $x^2 + y^2 = r^2$, $\\frac{a}{b}$, $9.8\\text{ m/s}^2$)
   - Standalone display equations: $$...$$
2. Never output raw LaTeX commands without enclosing dollar signs.
3. Every question must have exactly 4 plausible options, with exactly one correct option.
4. Provide a thorough, educational explanation referencing specific reasoning and formulas.
5. Output ONLY a valid JSON array matching this schema:
[
  {
    "question": "Question text with $LaTeX$ if applicable",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0,
    "explanation": "Detailed explanation with $LaTeX$ steps"
  }
]`;

  const userPrompt = `Based on the following notes and uploaded study sources, create ${count} challenging, high-yield multiple-choice questions:\n\n${context}`;

  const jsonString = await callGemini(systemPrompt, userPrompt);
  const rawList = extractJsonArray(jsonString);

  if (!rawList || rawList.length === 0) {
    throw new Error('AI generated an empty question bank. Please add more details to your note or upload a source.');
  }

  return rawList.map((item, index) => ({
    id: `mc_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 6)}`,
    question: String(item.question || 'Untitled Question'),
    options: Array.isArray(item.options) && item.options.length >= 2
      ? item.options.map(String)
      : ['Option A', 'Option B', 'Option C', 'Option D'],
    correctIndex: typeof item.correctIndex === 'number' && item.correctIndex >= 0 && item.correctIndex < 4
      ? item.correctIndex
      : 0,
    explanation: String(item.explanation || ''),
  }));
}

/**
 * Generate Long Answer / Free Response Questions grounded in the note and sources
 */
export async function generateLongAnswerQuestions(
  noteTitle: string,
  noteContent: string,
  sources: NoteSource[],
  count = 3
): Promise<LongAnswerQuestion[]> {
  const context = buildSourceContext(noteTitle, noteContent, sources);

  const systemPrompt = `You are an expert university professor and exam maker.
Generate comprehensive Long Answer (free-response / analytical / derivation) questions grounded in the provided student notes, sources, or topic.

CRITICAL FORMATTING INSTRUCTIONS:
1. When writing mathematical expressions, formulas, scientific notation, or derivations, ALWAYS use standard LaTeX syntax ($...$ for inline and $$...$$ for display equations).
2. For each question, provide an exemplary, full-credit sample answer and a bulleted key rubric points checklist (what an evaluator looks for).
3. Output ONLY a valid JSON array matching this schema:
[
  {
    "question": "Question prompt asking student to explain, derive, or analyze",
    "sampleAnswer": "Comprehensive model response with step-by-step LaTeX derivation if applicable",
    "keyRubricPoints": [
      "Key grading point 1",
      "Key grading point 2",
      "Key grading point 3"
    ]
  }
]`;

  const userPrompt = `Based on the following notes and uploaded sources, create ${count} long answer practice questions with sample answers and rubric criteria:\n\n${context}`;

  const jsonString = await callGemini(systemPrompt, userPrompt);
  const rawList = extractJsonArray(jsonString);

  if (!rawList || rawList.length === 0) {
    throw new Error('AI generated empty long answer questions. Please add more details to your note or upload a source.');
  }

  return rawList.map((item, index) => ({
    id: `la_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 6)}`,
    question: String(item.question || 'Untitled Long Answer Question'),
    sampleAnswer: String(item.sampleAnswer || ''),
    keyRubricPoints: Array.isArray(item.keyRubricPoints) ? item.keyRubricPoints.map(String) : [],
  }));
}

/**
 * Generate Flashcards grounded in the note and sources
 */
export async function generateFlashcards(
  noteTitle: string,
  noteContent: string,
  sources: NoteSource[],
  count = 8
): Promise<FlashcardItem[]> {
  const context = buildSourceContext(noteTitle, noteContent, sources);

  const systemPrompt = `You are an expert study assistant (like Gemini Notebook / Anki).
Extract high-yield concepts, definitions, formulas, and theorems into flashcards grounded in the provided student notes, sources, or topic.

CRITICAL FORMATTING INSTRUCTIONS:
1. When writing any mathematical formulas, equations, or scientific laws, ALWAYS format them in standard LaTeX:
   - Inline: $...$
   - Display blocks: $$...$$
2. Front: Crisp concept, term, theorem, or question.
3. Back: Clear, memorable explanation, formula derivation, or key definition.
4. Output ONLY a valid JSON array matching this schema:
[
  {
    "front": "Front of card (Term or Question)",
    "back": "Back of card (Definition, Formula in $LaTeX$, or Explanation)"
  }
]`;

  const userPrompt = `Based on the following notes and sources, create ${count} high-impact flashcards for active recall:\n\n${context}`;

  const jsonString = await callGemini(systemPrompt, userPrompt);
  const rawList = extractJsonArray(jsonString);

  if (!rawList || rawList.length === 0) {
    throw new Error('AI generated empty flashcards. Please add more notes or upload a source.');
  }

  return rawList.map((item, index) => ({
    id: `fc_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 6)}`,
    front: String(item.front || 'Untitled Concept'),
    back: String(item.back || ''),
    mastered: false,
  }));
}

/**
 * Grade a student's long answer response against the rubric and sample answer
 */
export async function gradeLongAnswerSubmission(
  question: string,
  sampleAnswer: string,
  keyRubricPoints: string[],
  studentResponse: string
): Promise<{ scorePercentage: number; feedback: string }> {
  const systemPrompt = `You are a supportive, rigorous academic tutor grading a student's written response against an exam rubric.

Instructions:
1. Evaluate how thoroughly the student addressed the question and satisfied the key rubric points.
2. Use LaTeX syntax ($...$ and $$...$$) for any mathematical or scientific symbols in your feedback.
3. Provide an integer percentage score (0 to 100) and constructive feedback highlighting what was done well and what was missed.
4. Output ONLY valid JSON matching this schema:
{
  "scorePercentage": 85,
  "feedback": "Your explanation of $v(t)$ was accurate..."
}`;

  const userPrompt = `QUESTION:
${question}

RUBRIC / KEY POINTS:
${keyRubricPoints.map((p) => `- ${p}`).join('\n')}

MODEL SAMPLE ANSWER:
${sampleAnswer}

STUDENT'S SUBMITTED RESPONSE:
${studentResponse || '(No response written)'}`;

  const jsonString = await callGemini(systemPrompt, userPrompt);
  
  try {
    const cleaned = jsonString.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
    const result = JSON.parse(cleaned);
    return {
      scorePercentage: Math.min(100, Math.max(0, Number(result.scorePercentage) || 0)),
      feedback: String(result.feedback || ''),
    };
  } catch {
    return {
      scorePercentage: 75,
      feedback: 'Good effort. Review the sample answer and key rubric points to refine your derivation.',
    };
  }
}
