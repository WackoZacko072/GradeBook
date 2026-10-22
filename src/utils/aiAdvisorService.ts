import type { ClassItem } from '../types/grade';
import {
  calculateClassAverage,
  calculateOverallAverage,
  calculateCumulativeGPA,
  roundTo,
} from './gradeCalculations';

export const GEMINI_STORAGE_KEY = 'gradebook_gemini_api_key';
export const GEMINI_MODEL_STORAGE_KEY = 'gradebook_gemini_model';

export type GeminiModel = 'gemini-2.0-flash' | 'gemini-2.5-flash' | 'gemini-1.5-flash-latest' | 'gemini-1.5-flash' | 'gemini-1.5-pro';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}

// Built-in default key from your Firebase/Google Cloud project
const DEFAULT_PROJECT_KEY = 'AIzaSyBLXZNaIecqkf_rRBZcwRc8IQHDdwi2HI0';

// Supported models in order of priority (newer 2.0-flash is primary since 1.5-flash is retired/404 on current endpoints)
const FALLBACK_MODELS: GeminiModel[] = [
  'gemini-2.0-flash',
  'gemini-2.5-flash',
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash',
];

/**
 * Retrieves the Gemini API key (env variable, localStorage, or built-in default project key)
 */
export function getGeminiApiKey(): string {
  const fromEnv = import.meta.env.VITE_GEMINI_API_KEY;
  if (fromEnv && fromEnv !== 'your_gemini_api_key_here' && fromEnv.trim().length > 0) {
    return fromEnv.trim();
  }

  try {
    const fromLocal = localStorage.getItem(GEMINI_STORAGE_KEY);
    if (fromLocal && fromLocal.trim().length > 0) {
      return fromLocal.trim();
    }
  } catch {
    // ignore
  }

  return DEFAULT_PROJECT_KEY;
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
  return 'gemini-2.0-flash';
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
 * Intelligent local fallback engine that performs exact What-If and GPA mathematics
 * if the external Gemini API is unreachable, blocked, or unconfigured.
 */
export function generateLocalAdvisorResponse(userPrompt: string, classes: ClassItem[]): string {
  const p = userPrompt.toLowerCase();

  if (classes.length === 0) {
    return `### 📚 No Courses in Gradebook Yet\n\nYou currently have **0 courses** in your gradebook. To unlock personalized "What-If" grade calculations, finals targets, and admission projections:\n\n1. Click **+ Add Class** on your dashboard.\n2. Add your courses, categories (e.g., Homework, Midterm, Final Exam), and weights totaling 100%.\n3. Enter your current scores.\n\nOnce added, ask me any question like *"What do I need on my finals?"* and I'll calculate the exact minimum scores required!`;
  }

  // 1. Check for "raise lowest grade" or "lowest"
  if (p.includes('lowest') || p.includes('raise') || p.includes('pulling')) {
    const sorted = [...classes].sort((a, b) => {
      const avgA = calculateClassAverage(a).average;
      const avgB = calculateClassAverage(b).average;
      return avgA - avgB;
    });

    const lowestClass = sorted[0];
    const calc = calculateClassAverage(lowestClass);
    const target = lowestClass.targetGrade || 90;

    // Check categories
    const categoriesBreakdown = lowestClass.categories.map((cat) => {
      const catCalc = calc.categoryCalculations[cat.id] || { average: 100, gradedCount: 0, totalCount: 0 };
      const graded = cat.assessments.filter((a) => a.score !== null && a.score !== undefined);
      const ungraded = cat.assessments.filter((a) => a.score === null || a.score === undefined);
      return {
        name: cat.name,
        weight: cat.weight,
        average: roundTo(catCalc.average, 1),
        gradedCount: graded.length,
        ungradedCount: ungraded.length,
        ungradedNames: ungraded.map((a) => a.name),
      };
    });

    const weakestCat = [...categoriesBreakdown]
      .filter((c) => c.gradedCount > 0)
      .sort((a, b) => a.average - b.average)[0];

    const upcomingTotal = categoriesBreakdown.reduce((sum, c) => sum + c.ungradedCount, 0);

    return `### 🎯 Strategy to Raise Your Lowest Grade: **${lowestClass.name}**

- **Current Grade:** **${calc.average.toFixed(1)}%** (${calc.letterGrade})
- **Target Goal:** **${target}%**
- **Credit Value:** **${lowestClass.credits || 3} credits**

#### 🔍 Performance Breakdown:
| Category | Weight | Current Avg | Graded | Remaining |
| :--- | :---: | :---: | :---: | :---: |
${categoriesBreakdown.map((c) => `| **${c.name}** | ${c.weight}% | ${c.average}% | ${c.gradedCount} | ${c.ungradedCount} |`).join('\n')}

${weakestCat ? `> ⚠️ **Primary Drag:** Your lowest category is **${weakestCat.name}** at **${weakestCat.average}%**. Improving scores on future work in this category yields immediate gains.` : ''}

#### 📋 Actionable Steps:
1. **Target Upcoming Work:** You have **${upcomingTotal}** remaining assessment(s) in this course.
2. **High-ROI Study Focus:** Schedule 2x weekly active practice sessions specifically for topics covered in ${weakestCat ? weakestCat.name : 'upcoming exams'}.
3. **Office Hours:** Review past mistakes with your instructor or TA prior to the final submission.`;
  }

  // 2. What-If Finals & Target Grades
  if (p.includes('final') || p.includes('what-if') || p.includes('what do i need') || p.includes('target')) {
    const rows = classes.map((c) => {
      const calc = calculateClassAverage(c);
      const target = c.targetGrade || 90;

      // Calculate total completed weight and remaining weight
      let completedWeight = 0;
      let earnedPoints = 0;
      let remainingWeight = 0;

      (c.categories || []).forEach((cat) => {
        const graded = cat.assessments.filter((a) => a.score !== null && a.score !== undefined);
        const ungraded = cat.assessments.filter((a) => a.score === null || a.score === undefined);
        const total = cat.assessments.length;

        if (total === 0) {
          // Empty category counts as 100% per spec
          completedWeight += cat.weight;
          earnedPoints += (100 * cat.weight) / 100;
        } else if (graded.length > 0 && ungraded.length === 0) {
          // All graded
          const catAvg = graded.reduce((sum, a) => sum + Number(a.score), 0) / graded.length;
          completedWeight += cat.weight;
          earnedPoints += (catAvg * cat.weight) / 100;
        } else if (graded.length > 0 && ungraded.length > 0) {
          // Partially graded: partition weight
          const gradedWeightShare = (cat.weight * graded.length) / total;
          const remainingWeightShare = (cat.weight * ungraded.length) / total;
          const gradedAvg = graded.reduce((sum, a) => sum + Number(a.score), 0) / graded.length;
          completedWeight += gradedWeightShare;
          earnedPoints += (gradedAvg * gradedWeightShare) / 100;
          remainingWeight += remainingWeightShare;
        } else {
          // 0 graded, but has assessments
          remainingWeight += cat.weight;
        }
      });

      let reqScoreStr = 'N/A';
      let status = 'Achieved';

      if (remainingWeight <= 0) {
        reqScoreStr = calc.average >= target ? 'Done (Hit Target)' : 'No remaining work';
        status = calc.average >= target ? '✅ Reached' : '🔒 Locked';
      } else {
        const neededPoints = target - earnedPoints;
        const requiredScore = roundTo((neededPoints / remainingWeight) * 100, 1);

        if (requiredScore <= 0) {
          reqScoreStr = '0% (Already locked in!)';
          status = '🌟 Guaranteed';
        } else if (requiredScore > 100) {
          const maxPossible = roundTo(earnedPoints + (remainingWeight * 1.0), 1);
          reqScoreStr = `${requiredScore}% (Max possible: ${maxPossible}%)`;
          status = '⚠️ Mathematically Tough';
        } else {
          reqScoreStr = `**${requiredScore}%**`;
          status = requiredScore > 85 ? '⚡ High Focus' : '👍 Attainable';
        }
      }

      return {
        name: c.name,
        current: roundTo(calc.average, 1),
        target,
        remainingWeight: roundTo(remainingWeight, 1),
        requiredScore: reqScoreStr,
        status,
      };
    });

    return `### 📊 "What-If" Final Exam & Target Grade Analysis

Here is the exact minimum score required on all remaining weighted assignments to achieve your target grade in each course:

| Course | Current | Target | Remaining Weight | Required Score on Remaining | Feasibility |
| :--- | :---: | :---: | :---: | :---: | :--- |
${rows.map((r) => `| **${r.name}** | ${r.current}% | **${r.target}%** | ${r.remainingWeight}% | ${r.requiredScore} | ${r.status} |`).join('\n')}

#### 💡 Key Takeaways:
- **Prioritize High-Remaining Courses:** Focus your study hours on courses where remaining weight is highest (e.g. 30%+ remaining).
- **Target Feasibility:** Courses marked *"Attainable"* need standard consistent review, while *"High Focus"* courses require dedicated practice exams.`;
  }

  // 3. Highest Leverage
  if (p.includes('leverage') || p.includes('rank') || p.includes('upcoming') || p.includes('important')) {
    const allUpcoming: Array<{ course: string; name: string; category: string; leverage: number }> = [];

    classes.forEach((c) => {
      c.categories.forEach((cat) => {
        const total = Math.max(1, cat.assessments.length);
        const weightPerAssignment = roundTo(cat.weight / total, 1);
        const ungraded = cat.assessments.filter((a) => a.score === null || a.score === undefined);

        ungraded.forEach((a) => {
          allUpcoming.push({
            course: c.name,
            name: a.name,
            category: cat.name,
            leverage: weightPerAssignment,
          });
        });
      });
    });

    if (allUpcoming.length === 0) {
      return `### ⚖️ Highest Leverage Assessment Ranking\n\nAll current assignments in your courses have grades recorded! You don't have any ungraded upcoming items in the system.\n\nTo view upcoming leverage, add your upcoming finals or assignments inside your classes without assigning a score.`;
    }

    allUpcoming.sort((a, b) => b.leverage - a.leverage);

    return `### ⚖️ Upcoming Assessment Leverage Ranking

Ranked from highest percentage impact to lowest on your overall course grades:

| Rank | Assessment | Course | Category | Final Grade Weight |
| :---: | :--- | :--- | :--- | :---: |
${allUpcoming.map((item, idx) => `| **#${idx + 1}** | **${item.name}** | ${item.course} | ${item.category} | **${item.leverage}%** |`).join('\n')}

> 🚀 **Advice:** Allocate study time proportionally to leverage. Your top 2 items contribute more to your term grade than all other assignments combined!`;
  }

  // 4. University Admissions & Program Analysis
  if (p.includes('admissions') || p.includes('university') || p.includes('ubc') || p.includes('toronto') || p.includes('mcgill') || p.includes('gpa') || p.includes('transfer')) {
    const gpaInfo = calculateCumulativeGPA(classes);
    const overall = calculateOverallAverage(classes);

    return `### 🎓 University & Program Admissions Analysis

- **Cumulative GPA:** **${gpaInfo.gpa.toFixed(2)} / 4.0**
- **Unweighted GPA:** **${gpaInfo.unweightedGpa.toFixed(2)} / 4.0**
- **Overall Grade Average:** **${overall.overallAverage.toFixed(1)}%** (${overall.letterGrade})
- **Total Completed Credits:** **${gpaInfo.totalCredits} credits**

#### 🏛️ Admissions Competitiveness Tiers:
| Program Tier | Typical Requirement | Your Status |
| :--- | :---: | :--- |
| **Tier 1 (Ultra-Competitive)**<br>*(e.g., UBC CS, Waterloo CS/Eng, U of T CS)* | 3.85 - 4.0 GPA<br>(89% - 95%+) | ${gpaInfo.gpa >= 3.85 ? '🟢 Highly Competitive' : gpaInfo.gpa >= 3.6 ? '🟡 Borderline Competitive' : '🔴 Requires Significant Grade Boost'} |
| **Tier 2 (Highly Competitive)**<br>*(e.g., UBC Arts/Science, McGill, Top 30 US)* | 3.50 - 3.80 GPA<br>(84% - 88%) | ${gpaInfo.gpa >= 3.5 ? '🟢 Solid Candidate' : gpaInfo.gpa >= 3.2 ? '🟡 Reachable with Final Push' : '🔴 Target Grade Increase Needed'} |
| **Tier 3 (Moderate Competitive)**<br>*(e.g., Regional Universities, Standard Programs)* | 3.00 - 3.40 GPA<br>(75% - 82%) | ${gpaInfo.gpa >= 3.0 ? '🟢 Strong Profile' : '🟡 On Track'} |

#### 🎯 Highest Impact GPA Movers:
${classes
  .map((c) => {
    const calc = calculateClassAverage(c);
    const cred = c.credits || 3;
    return { name: c.name, avg: calc.average, credits: cred };
  })
  .sort((a, b) => a.avg - b.avg)
  .slice(0, 2)
  .map((c) => `- **${c.name}** (${c.credits} cr): currently at **${c.avg.toFixed(1)}%**. Boosting this course by 5% creates the largest upward leverage on your cumulative GPA.`)
  .join('\n')}`;
  }

  // 5. Default Comprehensive Audit
  const overall = calculateOverallAverage(classes);
  const gpaInfo = calculateCumulativeGPA(classes);

  return `### 📋 Comprehensive Academic Audit & Action Plan

- **Total Courses Enrolled:** **${classes.length}**
- **Cumulative GPA:** **${gpaInfo.gpa.toFixed(2)} / 4.0**
- **Term Average:** **${overall.overallAverage.toFixed(1)}%** (${overall.letterGrade})
- **Total Credits:** **${gpaInfo.totalCredits} credits**

#### 📚 Current Course Standing:
| Course | Current Grade | Letter | Target | Credits |
| :--- | :---: | :---: | :---: | :---: |
${classes
  .map((c) => {
    const calc = calculateClassAverage(c);
    return `| **${c.name}** | **${calc.average.toFixed(1)}%** | ${calc.letterGrade} | ${c.targetGrade || 90}% | ${c.credits || 3} |`;
  })
  .join('\n')}

#### 💡 Recommended Next Actions:
1. **Audit Weights:** Ensure all course category weights total exactly 100%.
2. **Upcoming Leverage:** Check remaining final exams and calculate what-if targets.
3. **Ask me specific questions:** E.g., *"What do I need on my finals?"* or *"How can I raise my lowest grade?"*`;
}

/**
 * Sends chat message to Google Gemini API with the dynamic live gradebook context injected.
 * Automatically tries modern models (gemini-2.0-flash -> gemini-2.5-flash -> fallbacks),
 * and transparently provides accurate local grade analysis if Google API access is blocked or unavailable.
 */
export async function sendAdvisorMessage(
  userPrompt: string,
  history: ChatMessage[],
  classes: ClassItem[],
  preferredModel?: GeminiModel
): Promise<string> {
  const apiKey = getGeminiApiKey();

  // Determine model sequence: start with preferred or gemini-2.0-flash
  const startingModel = preferredModel || getSelectedGeminiModel() || 'gemini-2.0-flash';
  const modelsToTry: GeminiModel[] = [
    startingModel,
    ...FALLBACK_MODELS.filter((m) => m !== startingModel),
  ];

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
          return 'The response was flagged by safety filters. Please rephrase your academic query.';
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

  // If Gemini API could not be reached or was blocked on this project key,
  // execute the exact mathematical formulas locally so the student always receives an immediate, accurate answer!
  console.info('Switching to local math engine fallback due to API status:', lastError?.message);
  const localAnalysis = generateLocalAdvisorResponse(userPrompt, classes);

  if (isPermissionOrBlocked) {
    return `${localAnalysis}\n\n---\n*💡 Note: Calculated using the built-in Gradebook Mathematical Engine. To enable Gemini AI reasoning, enable the Generative Language API on Google Cloud project 428854713959 or supply a free key in Settings.*`;
  }

  return localAnalysis;
}

