import type { ClassItem } from '../types/grade';

export const DEFAULT_CATEGORY_SUGGESTIONS = [
  'Tests',
  'Quizzes',
  'Assignments',
  'Projects',
  'Labs',
  'Final Exam',
  'Homework',
  'Participation',
  'Midterm',
];

export const INITIAL_DEMO_CLASSES: ClassItem[] = [
  {
    id: 'class_english12',
    name: 'English 12',
    color: '#2563EB',
    createdAt: Date.now() - 400000,
    categories: [
      {
        id: 'cat_en_essays',
        name: 'Essays & Papers',
        weight: 40,
        assessments: [
          { id: 'en_a1', name: 'Comparative Essay', score: 97, mode: 'percentage' },
        ],
      },
      {
        id: 'cat_en_novel',
        name: 'Novel Study',
        weight: 30,
        assessments: [
          { id: 'en_a2', name: 'Hamlet Thematic Analysis', score: 98, mode: 'percentage' },
        ],
      },
      {
        id: 'cat_en_pres',
        name: 'Presentations',
        weight: 30,
        assessments: [
          { id: 'en_a3', name: 'Seminar Presentation', score: 98.67, mode: 'percentage' },
        ],
      },
    ],
  },
  {
    id: 'class_chem12',
    name: 'Chemistry 12',
    color: '#0D9488',
    createdAt: Date.now() - 300000,
    categories: [
      {
        id: 'cat_ch_tests',
        name: 'Unit Tests',
        weight: 40,
        assessments: [
          { id: 'ch_a1', name: 'Equilibrium & Reaction Kinetics Exam', score: 100, mode: 'percentage' },
        ],
      },
      {
        id: 'cat_ch_labs',
        name: 'Lab Investigations',
        weight: 35,
        assessments: [
          { id: 'ch_a2', name: 'Titration Curve Lab Report', score: 100, mode: 'percentage' },
        ],
      },
      {
        id: 'cat_ch_assign',
        name: 'Problem Sets',
        weight: 25,
        assessments: [
          { id: 'ch_a3', name: 'Solubility Equilibrium Problem Set', score: 100, mode: 'percentage' },
        ],
      },
    ],
  },
  {
    id: 'class_econ12',
    name: 'Economics 12',
    color: '#6366F1',
    createdAt: Date.now() - 200000,
    categories: [
      {
        id: 'cat_ec_exams',
        name: 'Exams & Quizzes',
        weight: 60,
        assessments: [], // Empty category -> defaults to 100%
      },
      {
        id: 'cat_ec_cases',
        name: 'Case Studies',
        weight: 40,
        assessments: [], // Empty category -> defaults to 100%
      },
    ],
  },
  {
    id: 'class_precalc12',
    name: 'Pre-Calculus 12',
    color: '#2563EB',
    createdAt: Date.now() - 100000,
    categories: [
      {
        id: 'cat_pc_tests',
        name: 'Tests',
        weight: 35,
        assessments: [
          { id: 'pc_t1', name: 'Unit 1 Trigonometry Exam', score: 96, mode: 'percentage' },
          { id: 'pc_t2', name: 'Unit 2 Polynomials Test', score: 98, mode: 'percentage' },
        ],
      },
      {
        id: 'cat_pc_quizzes',
        name: 'Quizzes',
        weight: 20,
        assessments: [
          { id: 'pc_q1', name: 'Radian Measure Quiz', score: 98, mode: 'percentage' },
          { id: 'pc_q2', name: 'Trig Identities Quiz', score: 100, mode: 'percentage' },
        ],
      },
      {
        id: 'cat_pc_assignments',
        name: 'Assignments',
        weight: 20,
        assessments: [
          { id: 'pc_a1', name: 'Function Transformations Portfolio', score: 98, mode: 'percentage' },
        ],
      },
      {
        id: 'cat_pc_projects',
        name: 'Projects',
        weight: 15,
        assessments: [
          { id: 'pc_p1', name: 'Conic Sections Modeling Project', score: 97, mode: 'percentage' },
        ],
      },
      {
        id: 'cat_pc_final',
        name: 'Final Exam',
        weight: 10,
        assessments: [], // Empty category -> defaults to 100%
      },
    ],
  },
];
