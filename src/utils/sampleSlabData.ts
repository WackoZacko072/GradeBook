import type { SlabItem } from '../types/slab';

export const INITIAL_DEMO_SLABS: SlabItem[] = [
  {
    id: 'slab_demo_micro_1',
    title: 'Microeconomics: Supply, Demand & Elasticity',
    description: 'Core concepts, price elasticity of demand formulas, and market equilibrium principles.',
    type: 'both',
    icon: '📊',
    prompt: 'Create high-yield flashcards and MCQs based on Intro to Microeconomics notes and elasticity formulas.',
    sourceNoteNames: ['Intro to Microeconomics', 'Market Structure Handout.pdf'],
    flashcards: [
      {
        id: 'fc_m1',
        front: 'Price Elasticity of Demand ($E_d$)',
        back: 'The percentage change in quantity demanded divided by the percentage change in price:\n$$E_d = \\frac{\\% \\Delta Q_d}{\\% \\Delta P} = \\frac{\\frac{\\Delta Q}{Q_{avg}}}{\\frac{\\Delta P}{P_{avg}}}$$',
        mastered: true,
      },
      {
        id: 'fc_m2',
        front: 'Law of Diminishing Marginal Returns',
        back: 'As successive units of a variable resource are added to a fixed resource, beyond some point the marginal product will decline.',
        mastered: false,
      },
      {
        id: 'fc_m3',
        front: 'Consumer Surplus vs. Producer Surplus',
        back: '**Consumer Surplus**: Difference between what buyers are willing to pay and actual price ($CS = \\frac{1}{2} b h$ above equilibrium price).\n**Producer Surplus**: Difference between price received and minimum acceptable cost.',
        mastered: false,
      },
      {
        id: 'fc_m4',
        front: 'Cross-Price Elasticity ($E_{xy}$)',
        back: 'Measures responsiveness of demand for good X to a change in price of good Y:\n- $E_{xy} > 0$: Substitutes\n- $E_{xy} < 0$: Complements\n- $E_{xy} = 0$: Independent goods',
        mastered: true,
      },
      {
        id: 'fc_m5',
        front: 'Deadweight Loss (DWL)',
        back: 'The loss of economic efficiency and social welfare that can occur when market equilibrium is not achieved (e.g., taxes, price ceilings, monopolies).',
        mastered: false,
      },
    ],
    mcqs: [
      {
        id: 'mc_m1',
        question: 'If the price elasticity of demand for coffee is $|E_d| = 1.6$, what happens to total revenue if the price decreases by 5%?',
        options: [
          'Total revenue decreases because price is lower',
          'Total revenue increases because demand is price elastic',
          'Total revenue remains completely constant',
          'Quantity demanded falls by 8%'
        ],
        correctIndex: 1,
        explanation: 'Because $|E_d| > 1$, demand is price elastic. For elastic goods, a percentage price reduction yields a proportionally larger percentage increase in quantity demanded ($\\% \\Delta Q = 1.6 \\times 5\\% = 8\\%$), raising total revenue ($TR = P \\times Q$).',
      },
      {
        id: 'mc_m2',
        question: 'Which of the following describes a binding price ceiling placed on apartments?',
        options: [
          'A price set above equilibrium, generating a persistent surplus',
          'A price set below equilibrium, generating a shortage where $Q_d > Q_s$',
          'A government subsidy that shifts the supply curve to the left',
          'A tax on landlords that raises market rental prices'
        ],
        correctIndex: 1,
        explanation: 'A binding price ceiling is legislated below the market clearing price ($P_c < P^*$). At this lower price, quantity demanded exceeds quantity supplied, causing an excess demand or housing shortage.',
      },
      {
        id: 'mc_m3',
        question: 'If goods A and B have a cross-price elasticity of $E_{AB} = -0.75$, how are they related?',
        options: [
          'They are luxury goods',
          'They are substitute goods',
          'They are complementary goods',
          'They are inferior goods'
        ],
        correctIndex: 2,
        explanation: 'A negative cross-price elasticity ($E_{AB} < 0$) indicates that as the price of good B rises, the demand for good A decreases, identifying them as complementary goods (e.g., printers and ink).',
      },
    ],
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 86400000 * 2,
  },
  {
    id: 'slab_demo_calc_2',
    title: 'Calculus I: Limits, Derivatives & Tangent Lines',
    description: 'Derivative definitions, product rule, quotient rule, and chain rule review.',
    type: 'mcq',
    icon: '📐',
    prompt: 'Generate multiple-choice practice problems for introductory calculus derivatives and limits.',
    sourceNoteNames: ['Calculus I Lecture Notes', 'Derivative Rules Cheat Sheet.pdf'],
    flashcards: [
      {
        id: 'fc_c1',
        front: 'Formal Definition of the Derivative',
        back: 'The instantaneous rate of change of $f(x)$:\n$$f\'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}$$',
        mastered: true,
      },
      {
        id: 'fc_c2',
        front: 'Product Rule & Quotient Rule',
        back: '**Product Rule**: $(fg)\' = f\'g + fg\'$\n**Quotient Rule**: $\\left(\\frac{f}{g}\\right)\' = \\frac{f\'g - fg\'}{g^2}$',
        mastered: false,
      },
    ],
    mcqs: [
      {
        id: 'mc_c1',
        question: 'Evaluate the derivative of $f(x) = x^3 \\sin(x)$ with respect to $x$:',
        options: [
          '3x^2 \\cos(x)',
          '3x^2 \\sin(x) + x^3 \\cos(x)',
          'x^3 \\cos(x) - 3x^2 \\sin(x)',
          '3x^2 \\sin(x)'
        ],
        correctIndex: 1,
        explanation: 'By the Product Rule, $(u \\cdot v)\' = u\'v + uv\'$. Here $u = x^3 \\implies u\' = 3x^2$ and $v = \\sin(x) \\implies v\' = \\cos(x)$, giving $f\'(x) = 3x^2 \\sin(x) + x^3 \\cos(x)$.',
      },
      {
        id: 'mc_c2',
        question: 'What is the limit: $\\lim_{x \\to 0} \\frac{\\sin(4x)}{x}$?',
        options: [
          '0',
          '1',
          '4',
          'Undefined'
        ],
        correctIndex: 2,
        explanation: 'Using the fundamental limit $\\lim_{\\theta \\to 0} \\frac{\\sin(\\theta)}{\\theta} = 1$: $\\lim_{x \\to 0} \\frac{\\sin(4x)}{x} = 4 \\lim_{x \\to 0} \\frac{\\sin(4x)}{4x} = 4(1) = 4$. Alternatively, by L\'Hôpital\'s Rule: $\\lim_{x \\to 0} \\frac{4\\cos(4x)}{1} = 4$.',
      },
      {
        id: 'mc_c3',
        question: 'Find the slope of the tangent line to the curve $y = e^{2x}$ at $x = 0$:',
        options: [
          '1',
          '2',
          '0',
          'e^2'
        ],
        correctIndex: 1,
        explanation: 'By the Chain Rule, $\\frac{dy}{dx} = 2e^{2x}$. Evaluating at $x = 0$ yields $2e^0 = 2(1) = 2$.',
      },
    ],
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 86400000,
  },
];
