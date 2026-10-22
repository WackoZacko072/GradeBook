import type { ClassItem } from '../types/grade';
import {
  calculateClassAverage,
  calculateOverallAverage,
  calculateCumulativeGPA,
  roundTo,
} from './gradeCalculations';

export const GEMINI_STORAGE_KEY = 'gradebook_gemini_api_key';
export const GEMINI_MODEL_STORAGE_KEY = 'gradebook_gemini_model';

export type GeminiModel = 'gemini-1.5-flash' | 'gemini-1.5-pro' | 'gemini-2.5-flash';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}

/**
 * Retrieves the stored Gemini API key (localStorage or .env)
 */
export function getGeminiApiKey(): string {
  try {
    const fromLocal = localStorage.getItem(GEMINI_STORAGE_KEY);
    if (fromLocal && fromLocal.trim().length > 0) {
      return fromLocal.trim();
    }
  } catch {
    // ignore
  }

  const fromEnv = import.meta.env.VITE_GEMINI_API_KEY;
  if (fromEnv && fromEnv !== 'your_gemini_api_key_here' && fromEnv.trim().length > 0) {
    return fromEnv.trim();
  }

  return '';
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
    if (saved === 'gemini-1.5-pro' || saved === 'gemini-2.5-flash' || saved === 'gemini-1.5-flash') {
      return saved;
    }
  } catch {
    // ignore
  }
  return 'gemini-1.5-flash';
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
        })),
      };
    });

    const allUpcoming = categories.flatMap((cat) =>
      cat.upcomingAssessments.map((u) => ({
        ...u,
        category: cat.categoryName,
        categoryWeight: cat.categoryWeightPercentage,
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
 * Builds the strict, specialized system instructions for the AI Academic Advisor
 */
export function buildAdvisorSystemPrompt(classes: ClassItem[]): string {
  const contextJson = JSON.stringify(buildGradebookContext(classes), null, 2);

  return `You are an Elite Academic Advisor, Grade Strategist, and Admissions Consultant embedded directly inside the student's Gradebook app.

CURRENT LIVE STUDENT GRADEBOOK DATA:
\`\`\`json
${contextJson}
\`\`\`

CORE DIRECTIVES & GROUND RULES:
1. STRICT TRUTHFULNESS & ZERO HALLUCINATION:
   - You MUST reference ONLY the courses, credit hours, categories, scores, and upcoming assignments in the JSON above.
   - Never invent grades, assignments, or courses that do not exist in this data.
   - If the student has 0 courses or missing assignments, explicitly state that they haven't added them yet.

2. "WHAT-IF" GRADE & GPA CALCULATIONS:
   - When asked what score is needed on finals/upcoming work to hit a target grade or GPA, calculate the exact mathematical score required:
     Target = (Completed Weight * Completed Avg) + (Remaining Weight * Required Score)
   - If a target is mathematically impossible (e.g., requires > 100% or remaining weight is too low), state this candidly and show the maximum possible grade they can still attain.
   - Highlight the "highest leverage" upcoming assignments (those with the largest remaining percentage contribution to their final grade).

3. ACTIONABLE STUDY & PERFORMANCE STRATEGIES:
   - Contrast strong categories vs weak categories (e.g., "You have 98% in Homework but 72% in Midterms").
   - Provide concrete, high-ROI study techniques (e.g., active recall, past exam practice, office hours for weak categories) prioritized by which courses most impact their cumulative GPA.

4. UNIVERSITY & PROGRAM ADMISSIONS / TRANSFER ANALYSIS:
   - When asked about admissions (e.g., UBC, University of Toronto, McGill, Waterloo, UC Berkeley, Ivy League, Top 50 US universities, competitive majors like Computer Science, Engineering, Business/Commerce, Pre-med, or Graduate school):
     - Compare the student's live GPA (${(calculateCumulativeGPA(classes)).gpa.toFixed(2)} / 4.0) and overall average against realistic historical competitive thresholds:
       * Ultra-competitive (e.g., UBC CS, Waterloo CS/Eng, U of T Eng/CS): typically requires 89-95%+ / 3.85 - 4.0 GPA.
       * Highly competitive (e.g., UBC Arts/Science, McGill, Top 30 US): typically requires 84-88%+ / 3.5 - 3.8 GPA.
       * Moderate competitive: ~75-82% / 3.0 - 3.4 GPA.
     - Tell the student EXACTLY which specific classes are pulling down their GPA and how boosting them by X% shifts their admission competitiveness.

5. OUTPUT FORMATTING & STYLE:
   - Use clean, readable Markdown.
   - Use bold for key numbers, course names, and required percentages.
   - Use Markdown tables for "What-If" grade targets and score requirements.
   - Use bullet points for study strategies.
   - Keep answers direct, motivating, empathetic, yet realistic.`;
}

/**
 * Sends chat message to Google Gemini API with the dynamic live gradebook context injected.
 */
export async function sendAdvisorMessage(
  userPrompt: string,
  history: ChatMessage[],
  classes: ClassItem[],
  modelChoice: GeminiModel = 'gemini-1.5-flash'
): Promise<string> {
  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    throw new Error('MISSING_API_KEY');
  }

  const systemInstructionText = buildAdvisorSystemPrompt(classes);

  // Build multi-turn conversation contents
  const contents = history.map((msg) => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }],
  }));

  // Append latest user prompt
  contents.push({
    role: 'user',
    parts: [{ text: userPrompt }],
  });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelChoice}:generateContent?key=${apiKey}`;

  const payload = {
    systemInstruction: {
      parts: [{ text: systemInstructionText }],
    },
    contents,
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 2500,
    },
  };

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
      const errMsg = errJson?.error?.message || `HTTP error ${response.status}: ${response.statusText}`;

      if (response.status === 400 && errMsg.includes('API_KEY_INVALID')) {
        throw new Error('INVALID_API_KEY');
      }
      if (response.status === 429) {
        throw new Error('QUOTA_EXCEEDED');
      }
      if (response.status === 404) {
        // Fallback model if user selected an unavailable experimental name
        throw new Error(`Model ${modelChoice} not found. Please try gemini-1.5-flash.`);
      }
      throw new Error(errMsg);
    }

    const data = await response.json();
    const candidate = data?.candidates?.[0];

    if (!candidate || !candidate.content?.parts?.[0]?.text) {
      if (candidate?.finishReason === 'SAFETY') {
        return 'The response was flagged by safety filters. Please rephrase your academic query.';
      }
      return 'I received an empty response from the AI model. Please try asking again.';
    }

    return candidate.content.parts[0].text;
  } catch (err: any) {
    console.error('Gemini API call failed:', err);
    throw err;
  }
}
