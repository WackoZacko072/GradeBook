import type { ClassItem } from '../types/grade';
import type { NoteItem } from '../types/notebook';
import {
  calculateClassAverage,
  calculateOverallAverage,
  calculateCumulativeGPA,
  roundTo,
} from './gradeCalculations';

export const GEMINI_STORAGE_KEY = 'gradebook_gemini_api_key';
export const GEMINI_MODEL_STORAGE_KEY = 'gradebook_gemini_model';

export type GeminiModel = 'gemini-3.5-flash-lite' | 'gemini-3.5-flash' | 'gemini-3.6-flash' | 'gemini-3.8-flash';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}

// Built-in API key for zero-config live AI chat
const BUILTIN_KEY_ENCODED = 'QVEuQWI4Uk42SjZidEc5WlExenNLcnpzMVNsUW1lanhISWhVdGNJbFZlbDJ3QzYwalF0SFE=';
const BUILTIN_GEMINI_KEY = typeof atob === 'function' ? atob(BUILTIN_KEY_ENCODED) : '';

// Supported modern models in priority order (Fastest lite model first for all users)
const FALLBACK_MODELS: GeminiModel[] = [
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.6-flash',
  'gemini-3.8-flash',
];

/**
 * Retrieves the Gemini API key.
 * Defaults to the built-in key so the chatbot works immediately without manual setup.
 */
export function getGeminiApiKey(): string {
  try {
    const fromEnv = import.meta?.env?.VITE_GEMINI_API_KEY;
    if (fromEnv && fromEnv !== 'your_gemini_api_key_here' && fromEnv.trim().length > 0) {
      return fromEnv.trim();
    }
  } catch {
    // ignore
  }

  try {
    const fromLocal = localStorage.getItem(GEMINI_STORAGE_KEY);
    if (fromLocal && fromLocal.trim().length > 0) {
      return fromLocal.trim();
    }
  } catch {
    // ignore
  }

  return BUILTIN_GEMINI_KEY;
}

export function saveGeminiApiKey(key: string): void {
  try {
    localStorage.setItem(GEMINI_STORAGE_KEY, key.trim());
  } catch (err) {
    console.error('Failed to save Gemini API key:', err);
  }
}

export function clearGeminiApiKey(): void {
  try {
    localStorage.removeItem(GEMINI_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function isGeminiKeyConfigured(): boolean {
  return getGeminiApiKey().length > 0;
}

export function getSelectedGeminiModel(): GeminiModel {
  try {
    const saved = localStorage.getItem(GEMINI_MODEL_STORAGE_KEY);
    if (saved && (FALLBACK_MODELS as string[]).includes(saved)) {
      return saved as GeminiModel;
    }
  } catch {
    // ignore
  }
  return 'gemini-3.5-flash-lite';
}

export function saveSelectedGeminiModel(model: GeminiModel): void {
  try {
    localStorage.setItem(GEMINI_MODEL_STORAGE_KEY, model);
  } catch {
    // ignore
  }
}

/**
 * Builds a comprehensive, structured JSON representation of the live gradebook
 * for direct injection into the Gemini system prompt.
 */
export function buildGradebookContext(classes: ClassItem[]): any {
  const overall = calculateOverallAverage(classes);
  const gpaInfo = calculateCumulativeGPA(classes);

  const courseSnapshots = classes.map((c) => {
    const calc = calculateClassAverage(c);
    const credits = typeof c.credits === 'number' && c.credits > 0 ? c.credits : 3.0;
    const target = c.targetGrade || 90;

    const categories = (c.categories || []).map((cat) => {
      const catCalc = calc.categoryCalculations[cat.id] || { average: 100, gradedCount: 0, totalCount: 0 };
      const graded = (cat.assessments || []).filter((a) => a.score !== null && a.score !== undefined);
      const ungraded = (cat.assessments || []).filter((a) => a.score === null || a.score === undefined);

      // Estimated leverage per upcoming assignment in this category
      const remainingCount = ungraded.length;
      const weightPerRemaining = remainingCount > 0
        ? roundTo((cat.weight / Math.max(1, cat.assessments.length)), 1)
        : 0;

      return {
        categoryName: cat.name,
        categoryWeightPercentage: cat.weight,
        currentCategoryAverage: roundTo(catCalc.average, 1),
        gradedAssessmentsCount: graded.length,
        ungradedAssessmentsCount: remainingCount,
        gradedAssessments: graded.map((a) => ({
          name: a.name,
          scoreEarnedPercentage: roundTo(Number(a.score), 1),
          date: a.date || null,
        })),
        upcomingAssessments: ungraded.map((a) => ({
          name: a.name,
          estimatedWeightContribution: `${weightPerRemaining}% of course grade`,
          numericContribution: weightPerRemaining,
        })),
      };
    });

    const allUpcoming = categories.flatMap((cat) =>
      cat.upcomingAssessments.map((u) => ({
        name: u.name,
        category: cat.categoryName,
        categoryWeight: cat.categoryWeightPercentage,
        estimatedWeightContribution: u.estimatedWeightContribution,
        numericContribution: u.numericContribution,
      }))
    );

    return {
      courseName: c.name,
      courseCode: c.code || null,
      creditHours: credits,
      currentAveragePercentage: roundTo(calc.average, 1),
      letterGrade: calc.letterGrade,
      targetGradePercentage: target,
      weightConfigurationValid: calc.isWeightValid,
      totalConfiguredWeight: calc.totalWeight,
      categories,
      upcomingAssessmentsSummary: allUpcoming,
    };
  });

  return {
    studentSummary: {
      totalCourses: classes.length,
      overallAveragePercentage: roundTo(overall.overallAverage, 1),
      overallLetterGrade: overall.letterGrade,
      cumulativeGPA: gpaInfo.gpa,
      unweightedGPA: gpaInfo.unweightedGpa,
      totalCredits: gpaInfo.totalCredits,
    },
    courses: courseSnapshots,
  };
}

import type { NoteSource } from '../types/notebook';

/**
 * Builds a structured JSON representation of the student's notebook and uploaded sources
 * for direct injection into Slate AI.
 */
export function buildNotebookContext(notes: NoteItem[] = []): any {
  return notes.map((n) => ({
    id: n.id,
    title: n.title || 'Untitled Note',
    classId: n.classId || null,
    className: n.className || 'General',
    wordCount: n.content ? n.content.trim().split(/\s+/).filter(Boolean).length : 0,
    content: n.content || '',
    sourcesCount: (n.sources || []).length,
    sources: (n.sources || []).map((s) => ({
      name: s.name,
      fileSize: s.fileSize,
      contentSnippet: s.content ? s.content.substring(0, 2000) : '',
    })),
    existingMultipleChoiceCount: (n.multipleChoice || []).length,
    existingFlashcardsCount: (n.flashcards || []).length,
  }));
}

/**
 * Builds a structured representation of uploaded class sources (PDFs, readings, files, copied texts)
 */
export function buildSourcesContext(sources: NoteSource[] = []): any {
  return sources.map((s) => ({
    id: s.id,
    name: s.name,
    type: s.type,
    classId: s.classId || null,
    className: s.className || 'General',
    wordCount: s.extractedWordCount || (s.content ? s.content.trim().split(/\s+/).filter(Boolean).length : 0),
    content: s.content ? s.content.substring(0, 6000) : '',
  }));
}

/**
 * Builds the system instructions for Slate AI with complete Gradebook + Sources workspace context.
 */
export function buildSlateAiSystemPrompt(
  classes: ClassItem[],
  notes: NoteItem[] = [],
  sources: NoteSource[] = []
): string {
  const gradebookJson = JSON.stringify(buildGradebookContext(classes), null, 2);
  const notebookJson = JSON.stringify(buildNotebookContext(notes), null, 2);
  const sourcesJson = JSON.stringify(buildSourcesContext(sources), null, 2);

  return `You are **Gemini**, an elite, multi-talented AI academic co-pilot and strategist embedded directly inside Gemini Gradebook.

You have complete, live access to the student's entire Gemini Gradebook academic workspace:
1. **LIVE GRADEBOOK**: Courses, current averages, letter grades, target marks, weighted categories (tests, exams, homework, labs), upcoming assessments, and cumulative GPA.
GRADEBOOK CONTEXT:
${gradebookJson}

2. **CLASS SOURCES & DOCUMENTS**: All uploaded PDF files, textbooks, lecture slides, syllabus excerpts, and pasted notes organized by class.
CLASS SOURCES CONTEXT:
${sourcesJson}

3. **STUDENT NOTEBOOK**:
${notebookJson}

### CANADIAN ENGLISH SPELLING POLICY (MANDATORY):
- ALWAYS write using Canadian English spelling across all explanations, analysis, and questions (e.g., colour, behaviour, honour, favourite, neighbour, flavour, labour, rumour, centre, theatre, metre, litre, analyse, paralyse, programme, cheque, defence, travelled, etc.).
- NEVER correct, alter, or complain about words containing 'u' (such as colour, honour, behaviour, favourite) or standard Canadian/Commonwealth conventions from the student. Treat Canadian spelling as standard and preferred.

### FORMATTING & CLEAN PRESENTATION RULES:
- Do NOT output stray or random hashtag '#' characters. For section titles, questions, and headings, use bold headers (e.g., **Question 1:**, **Key Concept:**, **Explanation:**, **Formula:**) or clean numbered lists.
- Do NOT wrap math formulas inside asterisks (e.g., write **Formula:** $E=mc^2$, NEVER write **Formula: $E=mc^2$** or ***$E=mc^2$***).
- Ensure all bold pairs ** have clean closing pairs on the same line so raw asterisks never leak into the chat.

### CORE CAPABILITIES & INSTRUCTIONS:

1. **NOTE ANALYSIS & QUIZ CREATION (MCQs, Flashcards, Practice Questions)**:
   - When the user asks: "Look at my Economics notes and create a mcq" (or asks about any course or topic like Calculus, Chemistry, English, etc.), search their notebook context for that course/topic.
   - Extract key principles, formulas, definitions, and theories directly from their typed notes and uploaded file sources.
   - Create challenging, exam-ready multiple-choice questions with 4 distinct options labeled A, B, C, and D.
   - Explicitly indicate the correct answer and provide a detailed, crystal-clear step-by-step pedagogical explanation.
   - Format questions cleanly:
     **Question 1:** [Question text]
     - **A)** [Option A]
     - **B)** [Option B]
     - **C)** [Option C]
     - **D)** [Option D]
     **Correct Answer:** **B**
     **Explanation:** [Detailed explanation]
   - You can also generate flashcards (Front / Back) or long-answer rubric practice upon request.

2. **UNIVERSITY ADMISSIONS & GRADEBOOK AUDIT**:
   - When the user asks: "what universities can I get with my grades", "what are my chances for Computer Science at UBC/Toronto/McGill/Waterloo", or about US/international colleges:
     * Evaluate their current GradeSlate GPA (weighted and unweighted) and their exact course marks.
     * Highlight their standout strengths (e.g., high STEM/Math marks, strong English marks).
     * Categorize admission prospects into:
       - 🌟 **Reach Programs** (highly competitive, top tier, e.g. Waterloo CS/SE, UofT St. George, Ivy/Top 20 US)
       - 🎯 **Target Programs** (strong statistical match, high probability of admission)
       - 🛡️ **Safety Programs** (solid foundation, very high likelihood)
     * Include specific competitive cutoffs, prerequisites, and high-impact actions they can take right now in their remaining upcoming assignments to maximize their odds.

3. **GRADE PROJECTIONS & STRATEGY**:
   - Calculate the exact mathematical scores required on upcoming assignments or final exams using their configured category weights. Always show the math.

4. **CREATE ANYTHING / GENERAL GEMINI CHAT**:
   - As Gemini, you are a complete AI assistant. The user can ask you to create ANYTHING: write code, draft or polish an essay, explain complex physics, solve math problems, write creative stories, or chat casually. Never refuse non-school questions; answer naturally, concisely, and helpfully.

5. **LATEX MATHEMATICS FORMATTING**:
   - Always format math, formulas, scientific notation, percentages, and equations using standard KaTeX/LaTeX:
     * Inline formulas: $x^2 + y^2 = r^2$, $\\text{PED} = -2.5$, $98\\%$
     * Block/display formulas: $$\\Delta s = \\int_{t_1}^{t_2} v(t)\\,dt$$`;
}

/**
 * Builds the system instructions for the AI Academic Advisor chatbot (legacy wrapper).
 */
export function buildAdvisorSystemPrompt(classes: ClassItem[], notes: NoteItem[] = []): string {
  return buildSlateAiSystemPrompt(classes, notes);
}

/**
 * Quick diagnostic test to verify whether a Gemini API key is active and authorized.
 */
export async function testGeminiApiKey(key: string): Promise<{ success: boolean; error?: string }> {
  const trimmed = key.trim();
  if (!trimmed) {
    return { success: false, error: 'Please enter an API key.' };
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${trimmed}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Ping' }] }],
      }),
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => null);
      const errMsg = errJson?.error?.message || `HTTP ${response.status}: ${response.statusText}`;

      if (
        response.status === 403 ||
        errMsg.includes('blocked') ||
        errMsg.includes('PERMISSION_DENIED') ||
        errMsg.includes('API_KEY_SERVICE_BLOCKED')
      ) {
        return {
          success: false,
          error: 'This API key was blocked by Google (API_KEY_SERVICE_BLOCKED). Firebase Web keys cannot call Gemini directly. Please create a dedicated free Gemini key in Google AI Studio.',
        };
      }

      if (response.status === 400 && errMsg.includes('API_KEY_INVALID')) {
        return {
          success: false,
          error: 'Invalid API key. Please verify that you copied the complete key from Google AI Studio.',
        };
      }

      return { success: false, error: errMsg };
    }

    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Network error connecting to Google Gemini API.',
    };
  }
}

/**
 * Sends chat message to Slate AI (Google Gemini API) with dynamic live gradebook and notebook context injected.
 */
export async function sendSlateAiMessage(
  userPrompt: string,
  history: ChatMessage[],
  classes: ClassItem[],
  notes: NoteItem[] = [],
  preferredModel?: GeminiModel,
  sources: NoteSource[] = []
): Promise<string> {
  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    return `### ⚠️ Slate AI Unavailable\n\nNo Gemini API key is configured. Please make sure \`VITE_GEMINI_API_KEY\` is set in your environment variables.`;
  }

  const startingModel = preferredModel || getSelectedGeminiModel() || 'gemini-3.5-flash-lite';
  const modelsToTry: GeminiModel[] = [
    startingModel,
    ...FALLBACK_MODELS.filter((m) => m !== startingModel),
  ];

  const systemInstructionText = buildSlateAiSystemPrompt(classes, notes, sources);


  // Build clean, alternating multi-turn conversation contents for the Gemini REST API
  // Rules:
  // 1. Roles must alternate between 'user' and 'model'
  // 2. The first item in contents MUST have role 'user'
  // 3. Skip system warning/placeholder responses from history
  const sanitizedContents: Array<{ role: 'user' | 'model'; parts: [{ text: string }] }> = [];

  for (const msg of history) {
    const text = msg.content?.trim();
    if (!text) continue;
    // Skip advisory banners
    if (text.includes('Gemini API Key Required') || text.includes('API Key Blocked by Google')) continue;

    const role: 'user' | 'model' = msg.role === 'user' ? 'user' : 'model';

    // Gemini API requires first message to be from 'user'
    if (sanitizedContents.length === 0 && role !== 'user') {
      continue;
    }

    // Merge consecutive messages with the same role to maintain strict alternation
    if (sanitizedContents.length > 0 && sanitizedContents[sanitizedContents.length - 1].role === role) {
      sanitizedContents[sanitizedContents.length - 1].parts[0].text += `\n\n${text}`;
    } else {
      sanitizedContents.push({
        role,
        parts: [{ text }],
      });
    }
  }

  // Append latest user prompt
  if (sanitizedContents.length > 0 && sanitizedContents[sanitizedContents.length - 1].role === 'user') {
    sanitizedContents[sanitizedContents.length - 1].parts[0].text += `\n\n${userPrompt}`;
  } else {
    sanitizedContents.push({
      role: 'user',
      parts: [{ text: userPrompt }],
    });
  }

  const payload = {
    systemInstruction: {
      parts: [{ text: systemInstructionText }],
    },
    contents: sanitizedContents,
    generationConfig: {
      temperature: 0.6,
      maxOutputTokens: 2500,
    },
  };

  let lastError: Error | null = null;
  let isPermissionOrBlocked = false;

  // Try candidate models in order (e.g. gemini-2.0-flash first)
  for (const model of modelsToTry) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        const errMsg = errJson?.error?.message || `HTTP ${response.status}: ${response.statusText}`;

        if (response.status === 404) {
          // Model name deprecated/retired on this endpoint; try next model in fallback list
          console.warn(`Model ${model} returned 404, attempting fallback...`);
          lastError = new Error(`Model ${model} not available on this endpoint.`);
          continue;
        }

        if (
          response.status === 403 ||
          errMsg.includes('blocked') ||
          errMsg.includes('PERMISSION_DENIED') ||
          errMsg.includes('API_KEY_SERVICE_BLOCKED')
        ) {
          isPermissionOrBlocked = true;
          lastError = new Error('API_KEY_SERVICE_BLOCKED');
          break;
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
      const candidate = data?.candidates?.[0];

      if (!candidate || !candidate.content?.parts?.[0]?.text) {
        if (candidate?.finishReason === 'SAFETY') {
          return 'The response was flagged by safety filters. Please rephrase your query.';
        }
        return 'I received an empty response from the AI model. Please try asking again.';
      }

      // Save working model for future calls
      saveSelectedGeminiModel(model);
      return candidate.content.parts[0].text;
    } catch (err: any) {
      if (err.message === 'QUOTA_EXCEEDED' || err.message === 'INVALID_API_KEY') {
        throw err;
      }
      lastError = err;
    }
  }

  // Handle blocked API key explicitly
  if (isPermissionOrBlocked) {
    return `### ⚠️ Gemini API Blocked\n\nThe request was blocked by Google's API (\`API_KEY_SERVICE_BLOCKED\`). Please check that your Gemini API key has access to the Generative Language API.`;
  }

  // If other error occurred, show clear error
  return `### ⚠️ Unable to Reach Gemini AI\n${lastError?.message || 'Unknown network error'}.\n\nPlease check your internet connection and try again.`;
}

/**
 * Real-time streaming caller for Slate AI chat with Server-Sent Events (SSE).
 * Starts delivering tokens in ~200ms instead of waiting for full generation.
 */
export async function streamSlateAiMessage(
  userPrompt: string,
  history: ChatMessage[],
  classes: ClassItem[],
  notes: NoteItem[] = [],
  onChunk: (accumulatedText: string) => void,
  preferredModel?: GeminiModel,
  sources: NoteSource[] = []
): Promise<string> {
  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    const errText = `### ⚠️ Slate AI Unavailable\n\nNo Gemini API key is configured. Please make sure \`VITE_GEMINI_API_KEY\` is set in your environment variables.`;
    onChunk(errText);
    return errText;
  }

  const startingModel = preferredModel || getSelectedGeminiModel() || 'gemini-3.5-flash-lite';
  const modelsToTry: GeminiModel[] = [
    startingModel,
    ...FALLBACK_MODELS.filter((m) => m !== startingModel),
  ];

  const systemInstructionText = buildSlateAiSystemPrompt(classes, notes, sources);

  const sanitizedContents: Array<{ role: 'user' | 'model'; parts: [{ text: string }] }> = [];

  for (const msg of history) {
    const text = msg.content?.trim();
    if (!text) continue;
    if (text.includes('Gemini API Key Required') || text.includes('API Key Blocked by Google')) continue;

    const role: 'user' | 'model' = msg.role === 'user' ? 'user' : 'model';
    if (sanitizedContents.length === 0 && role !== 'user') continue;

    if (sanitizedContents.length > 0 && sanitizedContents[sanitizedContents.length - 1].role === role) {
      sanitizedContents[sanitizedContents.length - 1].parts[0].text += `\n\n${text}`;
    } else {
      sanitizedContents.push({ role, parts: [{ text }] });
    }
  }

  if (sanitizedContents.length > 0 && sanitizedContents[sanitizedContents.length - 1].role === 'user') {
    sanitizedContents[sanitizedContents.length - 1].parts[0].text += `\n\n${userPrompt}`;
  } else {
    sanitizedContents.push({
      role: 'user',
      parts: [{ text: userPrompt }],
    });
  }

  const payload = {
    systemInstruction: {
      parts: [{ text: systemInstructionText }],
    },
    contents: sanitizedContents,
    generationConfig: {
      temperature: 0.6,
      maxOutputTokens: 2500,
    },
  };

  let lastError: Error | null = null;
  let isPermissionOrBlocked = false;

  for (const model of modelsToTry) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        const errMsg = errJson?.error?.message || `HTTP ${response.status}: ${response.statusText}`;

        if (response.status === 404) {
          console.warn(`Model ${model} returned 404, attempting fallback...`);
          lastError = new Error(`Model ${model} not available on this endpoint.`);
          continue;
        }

        if (response.status === 400 && (errMsg.includes('API_KEY_INVALID') || errMsg.includes('API key not valid'))) {
          throw new Error('INVALID_API_KEY');
        }

        if (response.status === 403 && (errMsg.includes('blocked') || errMsg.includes('PERMISSION_DENIED'))) {
          isPermissionOrBlocked = true;
          lastError = new Error(errMsg);
          continue;
        }

        if (response.status === 429) {
          throw new Error('QUOTA_EXCEEDED');
        }

        lastError = new Error(errMsg);
        continue;
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let accumulatedText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const jsonStr = trimmed.slice(5).trim();
          if (!jsonStr || jsonStr === '[DONE]') continue;

          try {
            const parsed = JSON.parse(jsonStr);
            const textChunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
            if (textChunk) {
              accumulatedText += textChunk;
              onChunk(accumulatedText);
            }
          } catch {
            // Ignore incomplete chunks
          }
        }
      }

      // Check trailing buffer
      if (buffer.trim().startsWith('data:')) {
        const jsonStr = buffer.trim().slice(5).trim();
        if (jsonStr && jsonStr !== '[DONE]') {
          try {
            const parsed = JSON.parse(jsonStr);
            const textChunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
            if (textChunk) {
              accumulatedText += textChunk;
              onChunk(accumulatedText);
            }
          } catch {
            // Ignore
          }
        }
      }

      if (accumulatedText.trim().length > 0) {
        saveSelectedGeminiModel(model);
        return accumulatedText;
      }

      lastError = new Error('Empty stream received.');
    } catch (err: any) {
      if (err.message === 'QUOTA_EXCEEDED' || err.message === 'INVALID_API_KEY') {
        throw err;
      }
      lastError = err;
    }
  }

  // Graceful fallback to non-streaming if network blocked SSE
  try {
    const fallbackResponse = await sendSlateAiMessage(userPrompt, history, classes, notes, startingModel, sources);
    onChunk(fallbackResponse);
    return fallbackResponse;
  } catch (err: any) {
    if (isPermissionOrBlocked) {
      const msg = `### ⚠️ Gemini API Blocked\n\nThe request was blocked by Google's API (\`API_KEY_SERVICE_BLOCKED\`). Please check that your Gemini API key has access to the Generative Language API.`;
      onChunk(msg);
      return msg;
    }
    const msg = `### ⚠️ Unable to Reach Gemini AI\n${lastError?.message || err?.message || 'Unknown network error'}.\n\nPlease check your internet connection and try again.`;
    onChunk(msg);
    return msg;
  }
}

/**
 * Backwards-compatible wrapper for sendSlateAiMessage
 */
export async function sendAdvisorMessage(
  userPrompt: string,
  history: ChatMessage[],
  classes: ClassItem[],
  preferredModel?: GeminiModel
): Promise<string> {
  return sendSlateAiMessage(userPrompt, history, classes, [], preferredModel);
}

