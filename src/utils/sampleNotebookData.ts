import type { NoteItem } from '../types/notebook';

export const INITIAL_DEMO_NOTES: NoteItem[] = [
  {
    id: 'note_demo_calc_physics',
    title: 'Calculus & Physics: Motion & Rates of Change',
    content: `# Calculus & Physics: Motion & Rates of Change

## 1. Position, Velocity, and Acceleration
In classical mechanics, kinematics describes the motion of points without considering the forces that cause them:

- **Position Function**: $s(t)$ or $x(t)$ represents the location of an object at time $t$.
- **Instantaneous Velocity**: The first derivative of position with respect to time:
  $$v(t) = s'(t) = \\frac{ds}{dt} = \\lim_{\\Delta t \\to 0} \\frac{s(t + \\Delta t) - s(t)}{\\Delta t}$$
- **Instantaneous Acceleration**: The derivative of velocity or second derivative of position:
  $$a(t) = v'(t) = s''(t) = \\frac{d^2s}{dt^2}$$

## 2. Constant Acceleration Formulas (Kinematic Equations)
When acceleration is constant ($a = \\text{const}$):
1. Velocity as a function of time:
   $$v(t) = v_0 + a t$$
2. Position as a function of time:
   $$s(t) = s_0 + v_0 t + \\frac{1}{2} a t^2$$
3. Time-independent velocity-position relation:
   $$v^2 = v_0^2 + 2a(s - s_0)$$

## 3. Integration for Total Displacement
Displacement is the definite integral of velocity over the time interval $[t_1, t_2]$:
$$\\Delta s = \\int_{t_1}^{t_2} v(t)\\,dt$$

Total distance traveled accounts for direction changes ($|v(t)|$):
$$\\text{Total Distance} = \\int_{t_1}^{t_2} |v(t)|\\,dt$$`,
    sources: [
      {
        id: 'src_calc_physics_1',
        name: 'Kinematics_Lecture_Summary.txt',
        type: 'file',
        fileSize: '3.4 KB',
        addedAt: Date.now() - 86400000,
        content: `Summary of Kinematics and Derivatives:
- Position s(t) measured in meters (m).
- Velocity v(t) = ds/dt measured in m/s.
- Speed is the absolute scalar magnitude of velocity |v(t)|.
- Acceleration a(t) = dv/dt = d^2s/dt^2 measured in m/s^2.
- A particle changes direction when v(t) = 0 and the sign of v(t) alternates.
- A particle is speeding up when v(t) and a(t) have the same sign (both positive or both negative).
- A particle is slowing down when v(t) and a(t) have opposite signs.
- Gravitational acceleration near Earth surface: g = 9.8 m/s^2 downward.`,
      },
    ],
    multipleChoice: [
      {
        id: 'mc_1',
        question: 'If the position of an object is given by $s(t) = 2t^3 - 9t^2 + 12t$, at what times is the object momentarily at rest?',
        options: [
          '$t = 1$ and $t = 2$',
          '$t = 0$ and $t = 3$',
          '$t = 2$ and $t = 4$',
          '$t = 1.5$ only',
        ],
        correctIndex: 0,
        explanation: 'The object is at rest when velocity $v(t) = s\'(t) = 0$. Finding the derivative: $v(t) = 6t^2 - 18t + 12 = 6(t^2 - 3t + 2) = 6(t-1)(t-2) = 0$, giving $t = 1$ and $t = 2$.',
      },
      {
        id: 'mc_2',
        question: 'Under what condition is a particle strictly **speeding up** at time $t$?',
        options: [
          'Whenever acceleration is positive ($a(t) > 0$)',
          'When velocity and acceleration have the same algebraic sign ($v(t) \\cdot a(t) > 0$)',
          'Whenever velocity is positive ($v(t) > 0$)',
          'When the position function is increasing ($s\'(t) > 0$)',
        ],
        correctIndex: 1,
        explanation: 'Speed is $|v(t)|$. An object speeds up if velocity and acceleration share the same direction (both positive or both negative, so $v(t) \\cdot a(t) > 0$).',
      },
      {
        id: 'mc_3',
        question: 'A rocket launches with $v(t) = 3t^2 + 4t$. What is its displacement $\\Delta s$ from $t = 0$ to $t = 2$?',
        options: [
          '$16\\text{ m}$',
          '$20\\text{ m}$',
          '$12\\text{ m}$',
          '$24\\text{ m}$',
        ],
        correctIndex: 0,
        explanation: 'Displacement is $\\Delta s = \\int_0^2 (3t^2 + 4t)\\,dt = [t^3 + 2t^2]_0^2 = (2^3 + 2(2^2)) - 0 = 8 + 8 = 16\\text{ m}$.',
      },
    ],
    longAnswer: [
      {
        id: 'la_1',
        question: 'A ball is thrown vertically upward from a height of $20\\text{ m}$ with initial velocity $v_0 = 15\\text{ m/s}$. Given $a(t) = -9.8\\text{ m/s}^2$, derive the expression for the maximum height reached and compute its value.',
        sampleAnswer: '1. The velocity function is $v(t) = v_0 + at = 15 - 9.8t$.\n2. Maximum height occurs when the vertical velocity is zero: $v(t_{\\text{max}}) = 0 \\implies 15 - 9.8t = 0 \\implies t_{\\text{max}} = \\frac{15}{9.8} \\approx 1.53\\text{ s}$.\n3. Using the position equation $s(t) = s_0 + v_0 t - \\frac{1}{2} g t^2$:\n$$s(1.53) = 20 + 15(1.53) - \\frac{1}{2}(9.8)(1.53)^2 \\approx 20 + 22.96 - 11.47 = 31.49\\text{ m}$$\nAlternatively using $v^2 = v_0^2 - 2g(h - s_0)$: $0 = 15^2 - 2(9.8)(h - 20) \\implies h = 20 + \\frac{225}{19.6} \\approx 31.48\\text{ m}$.',
        keyRubricPoints: [
          'Sets velocity $v(t) = 0$ to find the time of peak height.',
          'Calculates $t_{\\text{max}} \\approx 1.53\\text{ s}$ or applies kinematic conservation relation $v^2 = v_0^2 - 2g\\Delta h$.',
          'Accounts for initial starting height $s_0 = 20\\text{ m}$.',
          'Arrives at maximum height of $\\approx 31.5\\text{ m}$ with proper units.',
        ],
      },
    ],
    flashcards: [
      {
        id: 'fc_1',
        front: 'Definition of Instantaneous Velocity',
        back: 'The first derivative of position with respect to time:\n$$v(t) = \\frac{ds}{dt} = s\'(t)$$',
        mastered: true,
      },
      {
        id: 'fc_2',
        front: 'Definition of Instantaneous Acceleration',
        back: 'The derivative of velocity or second derivative of position:\n$$a(t) = \\frac{dv}{dt} = \\frac{d^2s}{dt^2} = s\'\'(t)$$',
        mastered: true,
      },
      {
        id: 'fc_3',
        front: 'Condition for a Particle Speeding Up vs Slowing Down',
        back: '- **Speeding Up**: $v(t)$ and $a(t)$ have the **same sign** ($v \\cdot a > 0$).\n- **Slowing Down**: $v(t)$ and $a(t)$ have **opposite signs** ($v \\cdot a < 0$).',
        mastered: false,
      },
      {
        id: 'fc_4',
        front: 'Displacement vs Total Distance via Calculus',
        back: '- **Displacement**: $\\Delta s = \\int_{t_1}^{t_2} v(t)\\,dt$\n- **Total Distance**: $\\int_{t_1}^{t_2} |v(t)|\\,dt$',
        mastered: false,
      },
      {
        id: 'fc_5',
        front: 'Kinematic Position Equation ($a = \\text{const}$)',
        back: '$$s(t) = s_0 + v_0 t + \\frac{1}{2} a t^2$$',
        mastered: false,
      },
      {
        id: 'fc_6',
        front: 'Time-Independent Kinematic Formula',
        back: '$$v^2 = v_0^2 + 2a(s - s_0)$$',
        mastered: false,
      },
    ],
    classId: 'class_precalc12',
    className: 'Pre-Calculus 12',
    icon: '📐',
    createdAt: Date.now() - 172800000,
    updatedAt: Date.now() - 3600000,
  },
  {
    id: 'note_demo_economics_12',
    title: 'Economics 12: Supply, Demand & Market Equilibrium',
    classId: 'class_econ12',
    className: 'Economics 12',
    icon: '📈',
    content: `# Economics 12: Supply, Demand & Market Equilibrium

## 1. The Law of Demand & Elasticity
The **Law of Demand** states that, ceteris paribus (all other factors held constant), as the price of a good increases, the quantity demanded decreases.
- **Demand Curve**: Downward sloping due to the income effect and substitution effect.
- **Price Elasticity of Demand (PED)**:
  $$\\text{PED} = \\frac{\\% \\Delta Q_d}{\\% \\Delta P} = \\frac{\\frac{Q_2 - Q_1}{Q_1}}{\\frac{P_2 - P_1}{P_1}}$$
- If $|\\text{PED}| > 1$: Elastic (luxury goods, many substitutes).
- If $|\\text{PED}| < 1$: Inelastic (necessities, insulin, electricity).
- If $|\\text{PED}| = 1$: Unitary elastic.

## 2. The Law of Supply
The **Law of Supply** states that as the price of a good rises, producers are willing to supply more to maximize profit.
- **Supply Determinants**: Cost of inputs, technology changes, government taxes/subsidies, number of sellers, and producer expectations.

## 3. Market Equilibrium & Price Controls
Market equilibrium occurs where the quantity demanded equals the quantity supplied:
$$Q_d(P^*) = Q_s(P^*)$$

- **Price Ceiling**: Legal maximum price set below equilibrium (creates shortage: $Q_d > Q_s$). Example: Rent control.
- **Price Floor**: Legal minimum price set above equilibrium (creates surplus: $Q_s > Q_d$). Example: Minimum wage, agricultural subsidies.
- **Consumer Surplus ($CS$)**: Area beneath the demand curve and above market price $P^*$.
- **Producer Surplus ($PS$)**: Area above the supply curve and below market price $P^*$.
- **Deadweight Loss ($DWL$)**: Loss in total economic surplus caused by market distortions or price interventions.`,
    sources: [
      {
        id: 'src_econ_ch2_summary',
        name: 'AP_Econ_Unit2_Market_Forces.pdf',
        type: 'file',
        fileSize: '4.8 KB',
        addedAt: Date.now() - 72000000,
        content: `Chapter 2 Key Takeaways - Microeconomics:
- Determinants of Demand (Shift in Demand Curve vs Movement along Curve):
  * TRIBE: Tastes, Related goods prices (Complements & Substitutes), Income (Normal vs Inferior goods), Buyers number, Expectations.
- Determinants of Supply:
  * ROTTEN: Resource costs, Other goods prices, Technology, Taxes & Subsidies, Expectations, Number of sellers.
- Total Revenue Test:
  * When price rises and Total Revenue falls -> Demand is Elastic.
  * When price rises and Total Revenue rises -> Demand is Inelastic.
- Deadweight loss is represented geometrically as a triangle between demand and supply curves: DWL = 0.5 * (P_buyer - P_seller) * (Q_market - Q_distorted).`,
      },
    ],
    multipleChoice: [
      {
        id: 'econ_mc_1',
        question: 'If a $10\\%$ increase in the price of coffee leads to a $25\\%$ decrease in quantity demanded, what is the Price Elasticity of Demand (PED)?',
        options: [
          '$-2.5$ (Elastic)',
          '$-0.4$ (Inelastic)',
          '$-1.0$ (Unitary)',
          '$-0.25$ (Perfectly Inelastic)',
        ],
        correctIndex: 0,
        explanation: '$\\text{PED} = \\frac{\\% \\Delta Q_d}{\\% \\Delta P} = \\frac{-25\\%}{+10\\%} = -2.5$. Because $|\\text{PED}| = 2.5 > 1$, demand is price elastic.',
      },
      {
        id: 'econ_mc_2',
        question: 'What is the immediate market effect of a government-imposed **Price Ceiling** set strictly below the equilibrium price?',
        options: [
          'A persistent shortage where quantity demanded exceeds quantity supplied ($Q_d > Q_s$)',
          'A persistent surplus where quantity supplied exceeds quantity demanded ($Q_s > Q_d$)',
          'An increase in total producer surplus',
          'The supply curve shifts to the right',
        ],
        correctIndex: 0,
        explanation: 'When a binding price ceiling is set below equilibrium, low prices encourage excessive demand while discouraging suppliers, leading to a shortage ($Q_d > Q_s$) and non-price rationing.',
      },
      {
        id: 'econ_mc_3',
        question: 'If beef and chicken are substitute goods, an increase in the price of beef will cause which of the following in the chicken market?',
        options: [
          'The demand curve for chicken shifts rightward, increasing both price and quantity',
          'The supply curve of chicken shifts leftward',
          'The demand curve for chicken shifts leftward',
          'Movement downward along the chicken demand curve',
        ],
        correctIndex: 0,
        explanation: 'As beef becomes more expensive, consumers substitute toward chicken. This shifts the chicken demand curve to the right, driving up both the equilibrium price and quantity of chicken.',
      },
    ],
    longAnswer: [
      {
        id: 'econ_la_1',
        question: 'Explain why a price ceiling creates a deadweight loss in an otherwise competitive market. Illustrate your answer by referencing consumer surplus and producer surplus.',
        sampleAnswer: 'In a competitive market at equilibrium, total economic surplus ($CS + PS$) is maximized with zero deadweight loss. When a price ceiling is imposed below the equilibrium price:\n1. The quantity traded falls from $Q^*$ to $Q_s$ because suppliers reduce production at the lower mandated price.\n2. Although remaining consumers pay less, some consumers cannot obtain the good due to shortages.\n3. Transactions between $Q_s$ and $Q^*$ that would have generated surplus for both buyers and sellers are prevented.\n4. This unrealized economic surplus forms a deadweight loss triangle, representing net efficiency loss to society.',
        keyRubricPoints: [
          'Identifies that trade is constrained to $Q_s$, below efficient market equilibrium quantity $Q^*$.',
          'Explains the reduction in producer surplus and the transfer/rationing effects for consumers.',
          'Explicitly defines deadweight loss as lost mutual gains from mutually beneficial trades that are prevented by the ceiling.',
        ],
      },
    ],
    flashcards: [
      {
        id: 'econ_fc_1',
        front: 'Price Elasticity of Demand (PED) Formula',
        back: '$$\\text{PED} = \\frac{\\% \\Delta Q_d}{\\% \\Delta P}$$',
        mastered: true,
      },
      {
        id: 'econ_fc_2',
        front: 'Difference between a Change in Demand vs Change in Quantity Demanded',
        back: '- **Change in Quantity Demanded**: Movement along the curve caused ONLY by a change in the good\'s own price.\n- **Change in Demand**: Entire curve shifts right or left caused by non-price factors (TRIBE).',
        mastered: false,
      },
      {
        id: 'econ_fc_3',
        front: 'Binding Price Ceiling vs Binding Price Floor',
        back: '- **Price Ceiling**: Max legal price, binding when set **BELOW** equilibrium -> causes **Shortage**.\n- **Price Floor**: Min legal price, binding when set **ABOVE** equilibrium -> causes **Surplus**.',
        mastered: true,
      },
    ],
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 1800000,
  },
];
