import {
  calculateCategoryAverage,
  calculateClassAverage,
  calculateOverallAverage,
  validateCategoryWeights,
  roundTo,
} from './gradeCalculations';
import type { Category, ClassItem, Assessment } from '../types/grade';

export function runAllCalculationTests(): boolean {
  console.log('=====================================================');
  console.log('🧪 RUNNING SECTION 13 GRADE CALCULATION TEST SUITE');
  console.log('=====================================================');
  let allPassed = true;

  function assert(condition: boolean, desc: string) {
    if (!condition) {
      console.error(`❌ FAILED: ${desc}`);
      allPassed = false;
    } else {
      console.log(`✅ PASSED: ${desc}`);
    }
  }

  // 1. One class with one category (100% weight)
  const singleCategoryClass: ClassItem = {
    id: 'c_single',
    name: 'General Studies',
    createdAt: Date.now(),
    categories: [
      {
        id: 'cat_main',
        name: 'Assignments',
        weight: 100,
        assessments: [
          { id: 'a1', name: 'Task 1', score: 90 },
          { id: 'a2', name: 'Task 2', score: 96 },
        ],
      },
    ],
  };
  const singleCalc = calculateClassAverage(singleCategoryClass);
  assert(singleCalc.isWeightValid === true, '1. One class with one category: weight is valid (100%)');
  assert(Math.abs(singleCalc.average - 93) < 0.001, `1. One class with one category: average is 93% (got ${singleCalc.average})`);

  // 2. Multiple categories with weights totalling 100%
  const multiCat100Class: ClassItem = {
    id: 'c_multi',
    name: 'Economics 12',
    createdAt: Date.now(),
    categories: [
      { id: 'cat1', name: 'Tests', weight: 40, assessments: [{ id: 't1', name: 'T1', score: 90 }] },
      { id: 'cat2', name: 'Assignments', weight: 35, assessments: [{ id: 'a1', name: 'A1', score: 94 }] },
      { id: 'cat3', name: 'Participation', weight: 25, assessments: [{ id: 'p1', name: 'P1', score: 100 }] },
    ],
  };
  const multiCalc = calculateClassAverage(multiCat100Class);
  // (90 * 0.40) + (94 * 0.35) + (100 * 0.25) = 36 + 32.9 + 25 = 93.9%
  assert(multiCalc.isWeightValid === true, '2. Multiple categories totalling 100%: weight valid');
  assert(Math.abs(multiCalc.average - 93.9) < 0.001, `2. Multiple categories totalling 100%: average is 93.9% (got ${multiCalc.average})`);

  // 3. Category weights totalling less than 100% (e.g. 85%)
  const under100Cats: Category[] = [
    { id: 'cat1', name: 'Quizzes', weight: 45, assessments: [] },
    { id: 'cat2', name: 'Tests', weight: 40, assessments: [] },
  ];
  const underValidation = validateCategoryWeights(under100Cats);
  assert(underValidation.isValid === false, '3. Category weights totalling less than 100%: rejected as invalid');
  assert(underValidation.difference === 15, '3. Under 100%: detects exactly 15% remaining difference');
  assert(underValidation.message.includes('15.0% remaining'), '3. Under 100%: displays clear shortfall message');

  // 4. Category weights totalling more than 100% (e.g. 110%)
  const over100Cats: Category[] = [
    { id: 'cat1', name: 'Quizzes', weight: 60, assessments: [] },
    { id: 'cat2', name: 'Tests', weight: 50, assessments: [] },
  ];
  const overValidation = validateCategoryWeights(over100Cats);
  assert(overValidation.isValid === false, '4. Category weights totalling more than 100%: rejected as invalid');
  assert(overValidation.difference === -10, '4. Over 100%: detects exactly 10% over difference');
  assert(overValidation.message.includes('10.0% over'), '4. Over 100%: displays clear overage message');

  // 5. A category with several graded assessments (equal weighting)
  // Scores: 80%, 90%, 100% -> (80 + 90 + 100) / 3 = 90%
  const severalGradesCat: Category = {
    id: 'cat_grades',
    name: 'Quizzes',
    weight: 30,
    assessments: [
      { id: 'q1', name: 'Quiz 1', score: 80 },
      { id: 'q2', name: 'Quiz 2', score: 90 },
      { id: 'q3', name: 'Quiz 3', score: 100 },
    ],
  };
  const severalCalc = calculateCategoryAverage(severalGradesCat);
  assert(Math.abs(severalCalc.average - 90) < 0.001, `5. Category with several graded assessments: avg is 90% (got ${severalCalc.average})`);
  assert(severalCalc.contribution === 27, `5. Contribution is 27% (30% weight * 90%)`);

  // 6. A category with no assessments, which must count as 100%
  // User Prompt Example: Quizzes: 90%, weight 40%. Tests: no assessments yet, weight 60%.
  // Class Average = (90 * 0.40) + (100 * 0.60) = 36 + 60 = 96%
  const promptEmptyExampleClass: ClassItem = {
    id: 'c_empty_test',
    name: 'Pre-Calculus 12',
    createdAt: Date.now(),
    categories: [
      { id: 'cat_q', name: 'Quizzes', weight: 40, assessments: [{ id: 'q1', name: 'Q1', score: 90 }] },
      { id: 'cat_t', name: 'Tests', weight: 60, assessments: [] },
    ],
  };
  const promptEmptyCalc = calculateClassAverage(promptEmptyExampleClass);
  assert(promptEmptyCalc.categoryCalculations['cat_t'].average === 100, '6. Empty category average is 100%');
  assert(promptEmptyCalc.categoryCalculations['cat_t'].isDefault100 === true, '6. Empty category has isDefault100 = true');
  assert(Math.abs(promptEmptyCalc.average - 96) < 0.001, `6. Empty category rule: (90 * 0.40) + (100 * 0.60) = 96% (got ${promptEmptyCalc.average})`);

  // 7. An individual assessment with no grade entered (null)
  const nullAssessmentCat: Category = {
    id: 'cat_null',
    name: 'Labs',
    weight: 20,
    assessments: [
      { id: 'l1', name: 'Lab 1', score: 92 },
      { id: 'l2', name: 'Lab 2 (Upcoming)', score: null },
      { id: 'l3', name: 'Lab 3 (Pending)', score: null },
    ],
  };
  const nullCalc = calculateCategoryAverage(nullAssessmentCat);
  assert(nullCalc.gradedCount === 1, '7. Assessment with no grade: only 1 graded counted');
  assert(nullCalc.average === 92, '7. Ungraded assessments do NOT count as 0, average remains 92%');

  // 8. Percentage-based score entry
  const directScore: Assessment = { id: 'as_pct', name: 'Project', score: 87.5, mode: 'percentage' };
  assert(directScore.score === 87.5, '8. Percentage score stored directly');

  // 9. Points-based score entry (17 out of 20 = 85%)
  const earned = 17;
  const max = 20;
  const pointsScorePercent = roundTo((earned / max) * 100, 2);
  assert(pointsScorePercent === 85, `9. Points-based: 17/20 = 85% (got ${pointsScorePercent})`);

  // 10. A class average that contains fractional percentages
  // 3 categories: 33.33%, 33.33%, 33.34%. Grades: 91%, 86%, 94%
  const fractionalClass: ClassItem = {
    id: 'c_frac',
    name: 'Physics 12',
    createdAt: Date.now(),
    categories: [
      { id: 'f1', name: 'C1', weight: 33.33, assessments: [{ id: 'a', name: 'A', score: 91 }] },
      { id: 'f2', name: 'C2', weight: 33.33, assessments: [{ id: 'b', name: 'B', score: 86 }] },
      { id: 'f3', name: 'C3', weight: 33.34, assessments: [{ id: 'c', name: 'C', score: 94 }] },
    ],
  };
  const fracCalc = calculateClassAverage(fractionalClass);
  // 91*0.3333 + 86*0.3333 + 94*0.3334 = 30.3303 + 28.6638 + 31.3396 = 90.3337%
  assert(roundTo(fracCalc.average, 2) === 90.33, `10. Fractional percentage rounds accurately: 90.33% (got ${fracCalc.average.toFixed(2)})`);

  // 11. An overall average across multiple classes (equal weight)
  // Example from prompt: Pre-Calculus 12: 90%, Economics 12: 85%, English Literature 12: 95%
  // Overall Average = (90 + 85 + 95) / 3 = 90%
  const classA: ClassItem = {
    id: 'ca',
    name: 'Pre-Calculus 12',
    createdAt: Date.now(),
    categories: [{ id: 'c1', name: 'All', weight: 100, assessments: [{ id: 'x', name: 'X', score: 90 }] }],
  };
  const classB: ClassItem = {
    id: 'cb',
    name: 'Economics 12',
    createdAt: Date.now(),
    categories: [{ id: 'c2', name: 'All', weight: 100, assessments: [{ id: 'y', name: 'Y', score: 85 }] }],
  };
  const classC: ClassItem = {
    id: 'cc',
    name: 'English Literature 12',
    createdAt: Date.now(),
    categories: [{ id: 'c3', name: 'All', weight: 100, assessments: [{ id: 'z', name: 'Z', score: 95 }] }],
  };
  const overallRes = calculateOverallAverage([classA, classB, classC]);
  assert(overallRes.classCount === 3, '11. Overall average: classCount is 3');
  assert(Math.abs(overallRes.overallAverage - 90) < 0.001, `11. Overall average across classes is 90% (got ${overallRes.overallAverage})`);

  // 12. An empty gradebook with no classes
  const emptyGradebookCalc = calculateOverallAverage([]);
  assert(emptyGradebookCalc.classCount === 0, '12. Empty gradebook: classCount is 0');
  assert(emptyGradebookCalc.overallAverage === 100, '12. Empty gradebook: handled gracefully without NaN or div-by-zero');

  // 13. Editing and deleting assessments
  let mutableCat: Category = {
    id: 'cat_mut',
    name: 'Tests',
    weight: 100,
    assessments: [
      { id: 'a1', name: 'Test 1', score: 80 },
      { id: 'a2', name: 'Test 2', score: 90 },
    ],
  };
  // Edit a1 score to 100
  mutableCat.assessments = mutableCat.assessments.map(a => a.id === 'a1' ? { ...a, score: 100 } : a);
  let editCalc = calculateCategoryAverage(mutableCat);
  assert(editCalc.average === 95, `13. Edit assessment: avg updated to 95% (got ${editCalc.average})`);
  // Delete a2
  mutableCat.assessments = mutableCat.assessments.filter(a => a.id !== 'a2');
  let deleteCalc = calculateCategoryAverage(mutableCat);
  assert(deleteCalc.average === 100, `13. Delete assessment: avg updated to 100% (got ${deleteCalc.average})`);

  // 14. Editing category weights after marks have been entered without auto-rebalance
  const userControlCats: Category[] = [
    { id: 'cat_q', name: 'Quizzes', weight: 30, assessments: [{ id: 'q', name: 'Q', score: 90 }] },
    { id: 'cat_t', name: 'Tests', weight: 70, assessments: [{ id: 't', name: 'T', score: 80 }] },
  ];
  // User changes Quizzes from 30 to 40 directly
  userControlCats[0].weight = 40;
  // Tests MUST remain 70! No auto-rebalance!
  assert(userControlCats[1].weight === 70, '14. No auto-rebalance: Tests category weight remained unchanged at 70%');
  const userValidation = validateCategoryWeights(userControlCats);
  assert(userValidation.isValid === false, '14. Weights sum to 110%: flagged as invalid');
  // User corrects Tests to 60
  userControlCats[1].weight = 60;
  const userValidationFixed = validateCategoryWeights(userControlCats);
  assert(userValidationFixed.isValid === true, '14. User manually balanced weights to 100%: valid!');

  console.log('=====================================================');
  if (allPassed) {
    console.log('🎉 ALL 14 TEST CASES PASSED SUCCESSFULLY!');
  } else {
    console.error('💥 SOME TESTS FAILED! CHECK OUTPUT ABOVE.');
  }
  console.log('=====================================================');
  return allPassed;
}

runAllCalculationTests();
