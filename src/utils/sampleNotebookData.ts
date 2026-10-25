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
    createdAt: Date.now() - 172800000,
    updatedAt: Date.now() - 3600000,
  },
];
