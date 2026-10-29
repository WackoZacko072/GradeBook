import type {
  Assessment,
  Category,
  ClassItem,
  CategoryCalculation,
  ClassCalculation,
  OverallCalculation,
  GradeScaleEntry,
} from '../types/grade';

const GRADING_SCALE_STORAGE_KEY = 'gemini_gradebook_grading_scale_v1';

export const DEFAULT_GRADING_SCALE: GradeScaleEntry[] = [
  { id: 'scale_a_plus', letter: 'A+', minPercentage: 97, gpaPoints: 4.0 },
  { id: 'scale_a', letter: 'A', minPercentage: 93, gpaPoints: 4.0 },
  { id: 'scale_a_minus', letter: 'A-', minPercentage: 90, gpaPoints: 3.7 },
  { id: 'scale_b_plus', letter: 'B+', minPercentage: 87, gpaPoints: 3.3 },
  { id: 'scale_b', letter: 'B', minPercentage: 83, gpaPoints: 3.0 },
  { id: 'scale_b_minus', letter: 'B-', minPercentage: 80, gpaPoints: 2.7 },
  { id: 'scale_c_plus', letter: 'C+', minPercentage: 77, gpaPoints: 2.3 },
  { id: 'scale_c', letter: 'C', minPercentage: 73, gpaPoints: 2.0 },
  { id: 'scale_c_minus', letter: 'C-', minPercentage: 70, gpaPoints: 1.7 },
  { id: 'scale_d', letter: 'D', minPercentage: 60, gpaPoints: 1.0 },
  { id: 'scale_f', letter: 'F', minPercentage: 0, gpaPoints: 0.0 },
];

type ScaleListener = (scale: GradeScaleEntry[]) => void;
const scaleListeners = new Set<ScaleListener>();

function normalizeScale(scale: GradeScaleEntry[]): GradeScaleEntry[] {
  return [...scale]
    .map((entry, idx) => ({
      id: entry.id || `scale_${idx}_${Date.now()}`,
      letter: (entry.letter || '').trim() || 'Grade',
      minPercentage: Math.max(0, Math.min(100, Number(entry.minPercentage) || 0)),
      gpaPoints: Math.max(0, Number(entry.gpaPoints) || 0),
    }))
    .sort((a, b) => b.minPercentage - a.minPercentage);
}

let cachedScale: GradeScaleEntry[] | null = null;

export function getGradingScale(): GradeScaleEntry[] {
  if (cachedScale) return cachedScale;
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(GRADING_SCALE_STORAGE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        cachedScale = normalizeScale(parsed);
        return cachedScale;
      }
    }
  } catch {
    // ignore storage errors
  }
  cachedScale = [...DEFAULT_GRADING_SCALE];
  return cachedScale;
}

export function saveGradingScale(scale: GradeScaleEntry[]): GradeScaleEntry[] {
  const normalized = normalizeScale(scale.length > 0 ? scale : DEFAULT_GRADING_SCALE);
  cachedScale = normalized;
  try {
    localStorage.setItem(GRADING_SCALE_STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // ignore storage errors
  }
  scaleListeners.forEach((listener) => listener(normalized));
  return normalized;
}

export function resetGradingScale(): GradeScaleEntry[] {
  return saveGradingScale(DEFAULT_GRADING_SCALE);
}

export function subscribeToGradingScale(listener: ScaleListener): () => void {
  scaleListeners.add(listener);
  return () => {
    scaleListeners.delete(listener);
  };
}

export function getLetterBadgeStyle(letter: string): { color: string; badgeBg: string } {
  const upper = letter.trim().toUpperCase();
  if (upper === 'A+') return { color: 'text-emerald-700', badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (upper.startsWith('A')) return { color: 'text-blue-700', badgeBg: 'bg-blue-50 text-blue-700 border-blue-200' };
  if (upper.startsWith('B')) return { color: 'text-cyan-700', badgeBg: 'bg-cyan-50 text-cyan-700 border-cyan-200' };
  if (upper.startsWith('C')) return { color: 'text-amber-700', badgeBg: 'bg-amber-50 text-amber-700 border-amber-200' };
  if (upper.startsWith('D')) return { color: 'text-orange-700', badgeBg: 'bg-orange-50 text-orange-700 border-orange-200' };
  return { color: 'text-rose-700', badgeBg: 'bg-rose-50 text-rose-700 border-rose-200' };
}

/**
 * Rounds a number to a specified number of decimal places using EPSILON for stability.
 */
export function roundTo(val: number, decimals: number = 2): number {
  if (isNaN(val) || !isFinite(val)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round((val + Number.EPSILON) * factor) / factor;
}

/**
 * Computes the letter grade corresponding to a percentage using the active grading scale.
 */
export function getLetterGrade(
  percentage: number,
  customScale?: GradeScaleEntry[]
): { letter: string; color: string; badgeBg: string } {
  const scale = customScale ? normalizeScale(customScale) : getGradingScale();
  for (const entry of scale) {
    if (percentage >= entry.minPercentage) {
      const style = getLetterBadgeStyle(entry.letter);
      return { letter: entry.letter, ...style };
    }
  }
  const fallback = scale[scale.length - 1] || { letter: 'F' };
  const style = getLetterBadgeStyle(fallback.letter);
  return { letter: fallback.letter, ...style };
}

/**
 * Calculates the percentage score of a single assessment.
 * Supports both percentage and points-based entry (earned / max * 100).
 * Returns null if ungraded / blank.
 */
export function getAssessmentPercentage(assessment: Assessment): number | null {
  if (assessment.score === null || assessment.score === undefined || isNaN(assessment.score)) {
    return null;
  }
  return roundTo(assessment.score, 4);
}

/**
 * Section 7A & 7B:
 * Calculates a single category's average.
 * - Each graded assessment contributes equally to the category average as a percentage.
 * - An individual ungraded assessment (null) is excluded from the calculation.
 * - Empty category rule: A category with NO assessments (or where no assessments have recorded grades)
 *   MUST count as 100% for the calculation.
 */
export function calculateCategoryAverage(category: Category): CategoryCalculation {
  const gradedAssessments = category.assessments
    .map(getAssessmentPercentage)
    .filter((score): score is number => score !== null);

  const gradedCount = gradedAssessments.length;
  const totalCount = category.assessments.length;

  let average = 100;
  let isDefault100 = false;

  if (gradedCount === 0) {
    average = 100;
    isDefault100 = true;
  } else {
    const sum = gradedAssessments.reduce((acc, curr) => acc + curr, 0);
    average = sum / gradedCount;
  }

  const weight = Number(category.weight) || 0;
  const contribution = (average * weight) / 100;

  return {
    average,
    isDefault100,
    gradedCount,
    totalCount,
    weight,
    contribution,
  };
}

/**
 * Section 5:
 * Validates whether the sum of category weights equals exactly 100%.
 */
export function validateCategoryWeights(categories: Category[]): {
  isValid: boolean;
  totalWeight: number;
  difference: number;
  message: string;
} {
  const totalWeight = roundTo(categories.reduce((acc, c) => acc + (Number(c.weight) || 0), 0), 2);
  const diff = roundTo(100 - totalWeight, 2);
  const isValid = Math.abs(diff) < 0.001;

  let message = 'Category weights total exactly 100%.';
  if (diff > 0) {
    message = `Category weights total ${totalWeight.toFixed(1)}%. They must equal exactly 100% (${diff.toFixed(1)}% remaining).`;
  } else if (diff < 0) {
    message = `Category weights total ${totalWeight.toFixed(1)}%. They must equal exactly 100% (${Math.abs(diff).toFixed(1)}% over).`;
  }

  return {
    isValid,
    totalWeight,
    difference: diff,
    message,
  };
}

/**
 * Section 7C:
 * Weighted Class Average:
 * Formula: Class Average = Sum of (Category Average * Category Weight / 100)
 * Empty categories contribute 100% * weight / 100.
 */
export function calculateClassAverage(classItem: ClassItem): ClassCalculation {
  if (!classItem.categories || classItem.categories.length === 0) {
    return {
      average: 100,
      totalWeight: 0,
      isWeightValid: false,
      weightError: 'No grading categories configured for this class.',
      isDefault100: true,
      categoryCalculations: {},
      letterGrade: getLetterGrade(100).letter,
    };
  }

  const categoryCalculations: Record<string, CategoryCalculation> = {};
  let totalClassScore = 0;
  let totalWeight = 0;
  let allCategoriesEmpty = true;

  for (const cat of classItem.categories) {
    const calc = calculateCategoryAverage(cat);
    categoryCalculations[cat.id] = calc;
    totalWeight += Number(cat.weight) || 0;
    totalClassScore += calc.contribution;

    if (!calc.isDefault100) {
      allCategoriesEmpty = false;
    }
  }

  totalWeight = roundTo(totalWeight, 2);
  const isWeightValid = Math.abs(totalWeight - 100) < 0.001;
  let weightError: string | undefined;

  if (!isWeightValid) {
    if (totalWeight < 100) {
      weightError = `Category weights total ${totalWeight.toFixed(1)}% (must equal exactly 100% — ${(100 - totalWeight).toFixed(1)}% remaining).`;
    } else {
      weightError = `Category weights total ${totalWeight.toFixed(1)}% (must equal exactly 100% — ${(totalWeight - 100).toFixed(1)}% over).`;
    }
  }

  // Formula: Sum of (Category Average * Category Weight / 100)
  // When weights total 100%, totalClassScore is the exact class average.
  const classAverage = totalClassScore;

  return {
    average: classAverage,
    totalWeight,
    isWeightValid,
    weightError,
    isDefault100: allCategoriesEmpty,
    categoryCalculations,
    letterGrade: getLetterGrade(classAverage).letter,
  };
}

/**
 * Section 7D:
 * Overall Average Across Classes:
 * Formula: Overall Average = Sum of All Class Averages / Number of Classes
 * Each class contributes equally to the overall average.
 * Empty gradebook handled gracefully.
 */
export function calculateOverallAverage(classes: ClassItem[]): OverallCalculation {
  if (!classes || classes.length === 0) {
    return {
      overallAverage: 100,
      classCount: 0,
      letterGrade: getLetterGrade(100).letter,
    };
  }

  const classAverages = classes.map((c) => calculateClassAverage(c).average);
  const sum = classAverages.reduce((acc, curr) => acc + curr, 0);
  const overallAverage = sum / classes.length;

  return {
    overallAverage,
    classCount: classes.length,
    letterGrade: getLetterGrade(overallAverage).letter,
  };
}

/**
 * Distributes weights equally across all categories (only when user explicitly requests it).
 * Does NOT run automatically.
 */
export function equalizeCategoryWeights(categories: Category[]): Category[] {
  if (categories.length === 0) return [];
  const share = roundTo(100 / categories.length, 2);
  const result = categories.map((c) => ({ ...c, weight: share }));
  const sum = result.reduce((acc, c) => acc + c.weight, 0);
  const drift = roundTo(100 - sum, 2);
  if (Math.abs(drift) > 0.0001) {
    result[0].weight = roundTo(result[0].weight + drift, 2);
  }
  return result;
}

/**
 * Grade point conversion using the active grading scale
 */
export function getGradePoint(percentage: number, customScale?: GradeScaleEntry[]): number {
  const scale = customScale ? normalizeScale(customScale) : getGradingScale();
  for (const entry of scale) {
    if (percentage >= entry.minPercentage) {
      return roundTo(entry.gpaPoints, 2);
    }
  }
  const fallback = scale[scale.length - 1];
  return fallback ? roundTo(fallback.gpaPoints, 2) : 0.0;
}

/**
 * Computes the maximum GPA scale value from the active grading scale (e.g. 4.0 or 4.33)
 */
export function getMaxGpaScale(customScale?: GradeScaleEntry[]): number {
  const scale = customScale ? normalizeScale(customScale) : getGradingScale();
  if (scale.length === 0) return 4.0;
  const maxPts = Math.max(...scale.map((s) => s.gpaPoints));
  return maxPts > 0 ? roundTo(maxPts, 2) : 4.0;
}

/**
 * Computes credit-weighted Cumulative GPA using the active grading scale
 */
export function calculateCumulativeGPA(
  classes: ClassItem[],
  customScale?: GradeScaleEntry[]
): {
  gpa: number;
  totalCredits: number;
  unweightedGpa: number;
  maxGpa: number;
} {
  const maxGpa = getMaxGpaScale(customScale);
  if (!classes || classes.length === 0) {
    return { gpa: maxGpa, totalCredits: 0, unweightedGpa: maxGpa, maxGpa };
  }

  let totalQualityPoints = 0;
  let totalCredits = 0;
  let unweightedPointsSum = 0;

  for (const c of classes) {
    const avg = calculateClassAverage(c).average;
    const gradePoint = getGradePoint(avg, customScale);
    const credits = typeof c.credits === 'number' && c.credits > 0 ? c.credits : 3.0;

    totalQualityPoints += gradePoint * credits;
    totalCredits += credits;
    unweightedPointsSum += gradePoint;
  }

  const gpa = totalCredits > 0 ? roundTo(totalQualityPoints / totalCredits, 2) : maxGpa;
  const unweightedGpa = roundTo(unweightedPointsSum / classes.length, 2);

  return { gpa, totalCredits, unweightedGpa, maxGpa };
}

