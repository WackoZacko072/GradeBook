import type {
  MultipleChoiceQuestion,
  LongAnswerQuestion,
  FlashcardItem,
  NoteSource,
} from '../types/notebook';
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
 * Builds aggregated study text combining the typed note content with all uploaded sources
 */
function buildSourceContext(noteTitle: string, noteContent: string, sources: NoteSource[]): string {
  let combined = `NOTE TITLE: ${noteTitle}\n\nSTUDENT'S NOTE CONTENT:\n${noteContent || '(No typed text yet)'}\n\n`;

  if (sources.length > 0) {
    combined += `UPLOADED SOURCES (${sources.length}):\n`;
    sources.forEach((src, idx) => {
      combined += `--- SOURCE ${idx + 1}: ${src.name} ---\n${src.content}\n\n`;
    });
  }

  return combined;
}

/**
 * Low-level caller to Gemini API with JSON output parsing
 */
async function callGemini(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('Gemini API key is missing. Please set VITE_GEMINI_API_KEY in your environment or settings.');
  }

  const preferredModel = getSelectedGeminiModel() || 'gemini-3.5-flash';
  const modelsToTry: GeminiModel[] = [
    preferredModel,
    ...FALLBACK_MODELS.filter((m) => m !== preferredModel),
  ];

  const payload = {
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
      temperature: 0.4,
      maxOutputTokens: 4000,
      responseMimeType: 'application/json',
    },
  };

  let lastError: Error | null = null;

  for (const model of modelsToTry) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        const errMsg = errJson?.error?.message || `HTTP ${response.status}: ${response.statusText}`;

        if (response.status === 404) {
          lastError = new Error(`Model ${model} not available on this endpoint.`);
          continue;
        }

        if (response.status === 429) {
          throw new Error('QUOTA_EXCEEDED');
        }

        if (response.status === 400 && errMsg.includes('API_KEY_INVALID')) {
          throw new Error('INVALID_API_KEY');
        }

        lastError = new Error(errMsg);
        continue;
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw new Error('Empty response received from Gemini.');
      }

      return rawText;
    } catch (err: any) {
      if (err.message === 'QUOTA_EXCEEDED' || err.message === 'INVALID_API_KEY') {
        throw err;
      }
      lastError = err;
    }
  }

  throw lastError || new Error('Failed to reach Gemini API.');
}

/**
 * Strips code fences if present around JSON
 */
function parseJsonSafely<T>(raw: string, fallback: T): T {
  try {
    const cleaned = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/, '')
      .replace(/\s*```$/, '')
      .trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('Failed to parse Gemini JSON output:', err, 'Raw text:', raw);
    return fallback;
  }
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
Your goal is to generate high-yield, conceptual multiple-choice questions grounded STRICTLY in the provided student notes and uploaded sources.

CRITICAL FORMATTING INSTRUCTIONS:
1. When writing any mathematical formulas, algebraic equations, physical laws, units, or chemical symbols, ALWAYS use standard LaTeX syntax:
   - Inline formulas: $...$ (e.g. $x^2 + y^2 = r^2$, $\\frac{a}{b}$, $9.8\\text{ m/s}^2$)
   - Standalone display equations: $$...$$
2. Never output raw LaTeX commands without enclosing dollar signs.
3. Every question must have exactly 4 plausible options, with exactly one correct option.
4. Provide a thorough, educational explanation referencing specific reasoning and formulas.
5. Output ONLY valid JSON matching this schema:
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
  const rawList = parseJsonSafely<any[]>(jsonString, []);

  return rawList.map((item, index) => ({
    id: `mc_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 6)}`,
    question: String(item.question || 'Untitled Question'),
    options: Array.isArray(item.options) ? item.options.map(String) : ['A', 'B', 'C', 'D'],
    correctIndex: typeof item.correctIndex === 'number' && item.correctIndex >= 0 && item.correctIndex < 4 ? item.correctIndex : 0,
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
Generate comprehensive Long Answer (free-response / analytical / derivation) questions grounded STRICTLY in the provided student notes and sources.

CRITICAL FORMATTING INSTRUCTIONS:
1. When writing mathematical expressions, formulas, scientific notation, or derivations, ALWAYS use standard LaTeX syntax ($...$ for inline and $$...$$ for display equations).
2. For each question, provide an exemplary, full-credit sample answer and a bulleted key rubric points checklist (what an evaluator looks for).
3. Output ONLY valid JSON matching this schema:
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
  const rawList = parseJsonSafely<any[]>(jsonString, []);

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
Extract high-yield concepts, definitions, formulas, and theorems into flashcards grounded STRICTLY in the provided student notes and sources.

CRITICAL FORMATTING INSTRUCTIONS:
1. When writing any mathematical formulas, equations, or scientific laws, ALWAYS format them in standard LaTeX:
   - Inline: $...$
   - Display blocks: $$...$$
2. Front: Crisp concept, term, theorem, or question.
3. Back: Clear, memorable explanation, formula derivation, or key definition.
4. Output ONLY valid JSON matching this schema:
[
  {
    "front": "Front of card (Term or Question)",
    "back": "Back of card (Definition, Formula in $LaTeX$, or Explanation)"
  }
]`;

  const userPrompt = `Based on the following notes and sources, create ${count} high-impact flashcards for active recall:\n\n${context}`;

  const jsonString = await callGemini(systemPrompt, userPrompt);
  const rawList = parseJsonSafely<any[]>(jsonString, []);

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
  const result = parseJsonSafely<{ scorePercentage: number; feedback: string }>(jsonString, {
    scorePercentage: 75,
    feedback: 'Good effort. Review the sample answer and key rubric points to refine your derivation.',
  });

  return {
    scorePercentage: Math.min(100, Math.max(0, Number(result.scorePercentage) || 0)),
    feedback: String(result.feedback || ''),
  };
}
