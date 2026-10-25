import type { ClassItem } from '../types/grade';
import {
  calculateClassAverage,
  calculateOverallAverage,
  calculateCumulativeGPA,
  roundTo,
} from './gradeCalculations';

export const GEMINI_STORAGE_KEY = 'gradebook_gemini_api_key';
export const GEMINI_MODEL_STORAGE_KEY = 'gradebook_gemini_model';

export type GeminiModel = 'gemini-3.5-flash' | 'gemini-3.6-flash' | 'gemini-3.8-flash' | 'gemini-3.5-flash-lite';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}

// Built-in API key for zero-config live AI chat
const BUILTIN_KEY_ENCODED = 'QVEuQWI4Uk42SjZidEc5WlExenNLcnpzMVNsUW1lanhISWhVdGNJbFZlbDJ3QzYwalF0SFE=';
const BUILTIN_GEMINI_KEY = typeof atob === 'function' ? atob(BUILTIN_KEY_ENCODED) : '';

// Supported modern models in priority order
const FALLBACK_MODELS: GeminiModel[] = [
  'gemini-3.5-flash',
  'gemini-3.6-flash',
  'gemini-3.8-flash',
  'gemini-3.5-flash-lite',
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
  return 'gemini-3.5-flash';
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

/**
 * Builds the system instructions for the AI Academic Advisor chatbot
 * with automatic background gradebook context injection.
 */
export function buildAdvisorSystemPrompt(classes: ClassItem[]): string {
  const contextJson = JSON.stringify(buildGradebookContext(classes), null, 2);

  return `You are a versatile, intelligent AI assistant and Academic Advisor embedded inside a student's gradebook app. 

Here is the user's live gradebook data in JSON format for reference: ${contextJson}

Instructions:
1. If the user asks about their grades, GPA, course performance, how to raise/maintain their marks, or university admissions eligibility, analyze their live gradebook JSON above to give exact math, projections, and tailored advice.
2. If the user asks to be tutored, quizzed, or have a practice answer graded (like Save My Exams), act as an expert tutor.
3. LATEX FORMATTING: Whenever writing mathematical expressions, formulas, scientific notation, weighted averages, or algebraic equations, ALWAYS wrap them in LaTeX syntax: use inline $...$ for inline terms (e.g. $x^2$, $\frac{a}{b}$, $90\%$) and standalone $$...$$ for display equations (e.g. $$\text{Average} = \sum (\text{Grade}_i \times w_i)$$). Never leave raw LaTeX commands without dollar signs.
4. IMPORTANT: You are also a general-purpose AI chatbot. The user can ask you ANYTHING, including questions completely unrelated to their gradebook or school. Never refuse a question just because it isn't about grades—answer all general, random, or unrelated questions helpfully and naturally.`;
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
 * Sends chat message to Google Gemini API with the dynamic live gradebook context injected.
 * Automatically tries modern models (gemini-2.0-flash -> gemini-1.5-flash -> fallbacks),
 * maintaining full conversational chatbot context across turns.
 */
export async function sendAdvisorMessage(
  userPrompt: string,
  history: ChatMessage[],
  classes: ClassItem[],
  preferredModel?: GeminiModel
): Promise<string> {
  const apiKey = getGeminiApiKey();

  // If no Gemini API key is configured yet
  if (!apiKey) {
    return `### ⚠️ AI Service Unavailable\n\nNo Gemini API key is configured. Please make sure \`VITE_GEMINI_API_KEY\` is set in your environment variables.`;
  }

  // Determine model sequence: start with preferred or gemini-3.5-flash
  const startingModel = preferredModel || getSelectedGeminiModel() || 'gemini-3.5-flash';
  const modelsToTry: GeminiModel[] = [
    startingModel,
    ...FALLBACK_MODELS.filter((m) => m !== startingModel),
  ];

  const systemInstructionText = buildAdvisorSystemPrompt(classes);

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

