export interface Assessment {
  id: string;
  name: string;
  score: number | null; // null represents ungraded/blank
  maxScore?: number; // for points mode, e.g. 50
  earnedScore?: number; // for points mode, e.g. 45
  mode?: 'percentage' | 'points';
  date?: string;
}

export interface Category {
  id: string;
  name: string;
  weight: number; // Percentage 0 - 100
  assessments: Assessment[];
}

export interface ClassItem {
  id: string;
  name: string;
  code?: string;
  color?: string; // Optional accent color
  credits?: number; // Credit hours/units (defaults to 3.0)
  categories: Category[];
  targetGrade?: number;
  createdAt: number;
}

export interface CategoryCalculation {
  average: number;
  isDefault100: boolean;
  gradedCount: number;
  totalCount: number;
  weight: number;
  contribution: number; // (average * weight / 100)
}

export interface ClassCalculation {
  average: number;
  totalWeight: number;
  isWeightValid: boolean;
  weightError?: string;
  isDefault100: boolean;
  categoryCalculations: Record<string, CategoryCalculation>;
  letterGrade: string;
}

export interface GradeScaleEntry {
  id: string;
  letter: string;
  minPercentage: number;
  gpaPoints: number;
}

export interface OverallCalculation {
  overallAverage: number;
  classCount: number;
  letterGrade: string;
}
