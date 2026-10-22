import type { Assessment, Category, ClassItem, CategoryCalculation, ClassCalculation, OverallCalculation } from '../types/grade';

/**
 * Rounds a number to a specified number of decimal places using EPSILON for stability.
 */
export function roundTo(val: number, decimals: number = 2): number {
  if (isNaN(val) || !isFinite(val)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round((val + Number.EPSILON) * factor) / factor;
}

/**
 * Computes the letter grade corresponding to a percentage.
 */
export function getLetterGrade(percentage: number): { letter: string; color: string; badgeBg: string } {
  if (percentage >= 97) return { letter: 'A+', color: 'text-emerald-700', badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (percentage >= 93) return { letter: 'A', color: 'text-blue-700', badgeBg: 'bg-blue-50 text-blue-700 border-blue-200' };
  if (percentage >= 90) return { letter: 'A-', color: 'text-blue-600', badgeBg: 'bg-blue-50 text-blue-600 border-blue-200' };
  if (percentage >= 87) return { letter: 'B+', color: 'text-cyan-700', badgeBg: 'bg-cyan-50 text-cyan-700 border-cyan-200' };
  if (percentage >= 83) return { letter: 'B', color: 'text-cyan-700', badgeBg: 'bg-cyan-50 text-cyan-700 border-cyan-200' };
  if (percentage >= 80) return { letter: 'B-', color: 'text-cyan-600', badgeBg: 'bg-cyan-50 text-cyan-600 border-cyan-200' };
  if (percentage >= 77) return { letter: 'C+', color: 'text-amber-700', badgeBg: 'bg-amber-50 text-amber-700 border-amber-200' };
  if (percentage >= 73) return { letter: 'C', color: 'text-amber-700', badgeBg: 'bg-amber-50 text-amber-700 border-amber-200' };
  if (percentage >= 70) return { letter: 'C-', color: 'text-amber-600', badgeBg: 'bg-amber-50 text-amber-600 border-amber-200' };
  if (percentage >= 60) return { letter: 'D', color: 'text-orange-700', badgeBg: 'bg-orange-50 text-orange-700 border-orange-200' };
  return { letter: 'F', color: 'text-rose-700', badgeBg: 'bg-rose-50 text-rose-700 border-rose-200' };
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
      letterGrade: 'A+',
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
 * Standard North American 4.0 GPA scale conversion
 */
export function getGradePoint(percentage: number): number {
  if (percentage >= 93) return 4.0;
  if (percentage >= 90) return 3.7;
  if (percentage >= 87) return 3.3;
  if (percentage >= 83) return 3.0;
  if (percentage >= 80) return 2.7;
  if (percentage >= 77) return 2.3;
  if (percentage >= 73) return 2.0;
  if (percentage >= 70) return 1.7;
  if (percentage >= 67) return 1.3;
  if (percentage >= 65) return 1.0;
  return 0.0;
}

/**
 * Computes credit-weighted Cumulative GPA on a 4.0 scale
 */
export function calculateCumulativeGPA(classes: ClassItem[]): {
  gpa: number;
  totalCredits: number;
  unweightedGpa: number;
} {
  if (!classes || classes.length === 0) {
    return { gpa: 4.0, totalCredits: 0, unweightedGpa: 4.0 };
  }

  let totalQualityPoints = 0;
  let totalCredits = 0;
  let unweightedPointsSum = 0;

  for (const c of classes) {
    const avg = calculateClassAverage(c).average;
    const gradePoint = getGradePoint(avg);
    const credits = typeof c.credits === 'number' && c.credits > 0 ? c.credits : 3.0;

    totalQualityPoints += gradePoint * credits;
    totalCredits += credits;
    unweightedPointsSum += gradePoint;
  }

  const gpa = totalCredits > 0 ? roundTo(totalQualityPoints / totalCredits, 2) : 4.0;
  const unweightedGpa = roundTo(unweightedPointsSum / classes.length, 2);

  return { gpa, totalCredits, unweightedGpa };
}

