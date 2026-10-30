import React from 'react';
import katex from 'katex';

interface LatexRendererProps {
  content: string;
  className?: string;
  block?: boolean;
}

const SUPERSCRIPT_MAP: Record<string, string> = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
  '+': '⁺',
  '-': '⁻',
  '=': '⁼',
  '(': '⁽',
  ')': '⁾',
  n: 'ⁿ',
  i: 'ⁱ',
  x: 'ˣ',
  y: 'ʸ',
};

const SUBSCRIPT_MAP: Record<string, string> = {
  '0': '₀',
  '1': '₁',
  '2': '₂',
  '3': '₃',
  '4': '₄',
  '5': '₅',
  '6': '₆',
  '7': '₇',
  '8': '₈',
  '9': '₉',
  '+': '₊',
  '-': '₋',
  '=': '₌',
  '(': '₍',
  ')': '₎',
  a: 'ₐ',
  e: 'ₑ',
  o: 'ₒ',
  x: 'ₓ',
  i: 'ᵢ',
  j: 'ⱼ',
  k: 'ₖ',
  n: 'ₙ',
  m: 'ₘ',
  p: 'ₚ',
  r: 'ᵣ',
  s: 'ₛ',
  t: 'ₜ',
  u: 'ᵤ',
  v: 'ᵥ',
};

function toUnicodeSuperscript(str: string): string | null {
  let out = '';
  for (const ch of str) {
    if (SUPERSCRIPT_MAP[ch]) {
      out += SUPERSCRIPT_MAP[ch];
    } else {
      return null;
    }
  }
  return out;
}

function toUnicodeSubscript(str: string): string | null {
  let out = '';
  for (const ch of str) {
    if (SUBSCRIPT_MAP[ch]) {
      out += SUBSCRIPT_MAP[ch];
    } else {
      return null;
    }
  }
  return out;
}

/**
 * Recovers ASCII control characters (\f, \b, \t, \r, \n) if single-backslash LaTeX commands
 * like \frac, \beta, \theta, \text, \neq, \rho, \right were ever unescaped in JSON.
 */
export function recoverControlCharLatex(text: string): string {
  if (!text) return '';
  return text
    .replace(/\f([a-zA-Z])/g, '\\f$1')
    .replace(/[\b]([a-zA-Z])/g, '\\b$1')
    .replace(/\t([a-zA-Z])/g, '\\t$1')
    .replace(/\r([a-zA-Z])/g, '\\r$1')
    .replace(
      /\n(eq\b|e\b|u\b|abla\b|otin\b|i\b|atural\b|eg\b|ot\b|mid\b|parallel\b|sim\b|cong\b|subseteq\b|supseteq\b|less\b|gtr\b|leq\b|geq\b)/g,
      '\\n$1'
    );
}

/**
 * Converts any spelled-out "pi", "theta", "sqrt(...)" or raw LaTeX commands into clean Unicode
 * so raw LaTeX or word-forms like "pi/2" or "2pi" never appear in plain text or fallback text.
 */
export function convertLatexToCleanUnicode(input: string): string {
  if (!input) return '';
  let s = recoverControlCharLatex(input);

  // Collapse double-escaped backslashes before LaTeX commands
  s = s.replace(/\\\\([a-zA-Z]+)/g, '\\$1');

  // Remove \left, \right, \big, \Big, \bigl, \bigr, \Bigl, \Bigr sizing prefixes
  s = s.replace(/\\(?:left|right|[bB]ig[lr]?)(?=[()[\]{}|.\\])/g, '');
  s = s.replace(/\\(?:left|right)\s*\./g, '');

  // Unwrap text/font macros (loop to handle nested braces)
  for (let pass = 0; pass < 3; pass++) {
    s = s.replace(
      /\\(?:text|textbf|textit|textrm|textsf|texttt|mathrm|mathbf|mathit|mathcal|mathbb|operatorname|mbox)\{([^{}]*)\}/g,
      '$1'
    );
  }

  // Replace Greek letters and symbols BEFORE fraction/sqrt unwrapping so \frac{\pi}{2} has π
  s = s
    .replace(/\\times(?![a-zA-Z])/g, '×')
    .replace(/\\cdot(?![a-zA-Z])/g, '·')
    .replace(/\\div(?![a-zA-Z])/g, '÷')
    .replace(/\\pm(?![a-zA-Z])/g, '±')
    .replace(/\\mp(?![a-zA-Z])/g, '∓')
    .replace(/\\le(?:q|qslant)?(?![a-zA-Z])/g, '≤')
    .replace(/\\ge(?:q|qslant)?(?![a-zA-Z])/g, '≥')
    .replace(/\\ne(?:q)?(?![a-zA-Z])/g, '≠')
    .replace(/\\approx(?![a-zA-Z])/g, '≈')
    .replace(/\\equiv(?![a-zA-Z])/g, '≡')
    .replace(/\\sim(?![a-zA-Z])/g, '∼')
    .replace(/\\simeq(?![a-zA-Z])/g, '≃')
    .replace(/\\cong(?![a-zA-Z])/g, '≅')
    .replace(/\\propto(?![a-zA-Z])/g, '∝')
    .replace(/\\infty(?![a-zA-Z])/g, '∞')
    .replace(/\\partial(?![a-zA-Z])/g, '∂')
    .replace(/\\nabla(?![a-zA-Z])/g, '∇')
    .replace(/\\forall(?![a-zA-Z])/g, '∀')
    .replace(/\\exists(?![a-zA-Z])/g, '∃')
    .replace(/\\notin(?![a-zA-Z])/g, '∉')
    .replace(/\\in(?![a-zA-Z])/g, '∈')
    .replace(/\\subseteq(?![a-zA-Z])/g, '⊆')
    .replace(/\\subset(?![a-zA-Z])/g, '⊂')
    .replace(/\\supseteq(?![a-zA-Z])/g, '⊇')
    .replace(/\\supset(?![a-zA-Z])/g, '⊃')
    .replace(/\\cup(?![a-zA-Z])/g, '∪')
    .replace(/\\cap(?![a-zA-Z])/g, '∩')
    .replace(/\\(?:emptyset|varnothing)(?![a-zA-Z])/g, '∅')
    .replace(/\\therefore(?![a-zA-Z])/g, '∴')
    .replace(/\\because(?![a-zA-Z])/g, '∵')
    .replace(/\\perp(?![a-zA-Z])/g, '⊥')
    .replace(/\\parallel(?![a-zA-Z])/g, '∥')
    .replace(/\\angle(?![a-zA-Z])/g, '∠')
    .replace(/\\triangle(?![a-zA-Z])/g, '△')
    .replace(/\\(?:rightarrow|to|longrightarrow)(?![a-zA-Z])/g, '→')
    .replace(/\\(?:leftarrow|longleftarrow)(?![a-zA-Z])/g, '←')
    .replace(/\\(?:leftrightarrow|rightleftharpoons)(?![a-zA-Z])/g, '⇌')
    .replace(/\\(?:Rightarrow|implies|Longrightarrow)(?![a-zA-Z])/g, '⇒')
    .replace(/\\(?:Leftarrow|Longleftarrow)(?![a-zA-Z])/g, '⇐')
    .replace(/\\(?:Leftrightarrow|iff|Longleftrightarrow)(?![a-zA-Z])/g, '⇔')
    .replace(/\\mapsto(?![a-zA-Z])/g, '↦')
    .replace(/\\uparrow(?![a-zA-Z])/g, '↑')
    .replace(/\\downarrow(?![a-zA-Z])/g, '↓')
    .replace(/\\int(?![a-zA-Z])/g, '∫')
    .replace(/\\iint(?![a-zA-Z])/g, '∬')
    .replace(/\\oint(?![a-zA-Z])/g, '∮')
    .replace(/\\sum(?![a-zA-Z])/g, '∑')
    .replace(/\\prod(?![a-zA-Z])/g, '∏')
    .replace(/\\Delta(?![a-zA-Z])/g, 'Δ')
    .replace(/\\Gamma(?![a-zA-Z])/g, 'Γ')
    .replace(/\\Theta(?![a-zA-Z])/g, 'Θ')
    .replace(/\\Lambda(?![a-zA-Z])/g, 'Λ')
    .replace(/\\Xi(?![a-zA-Z])/g, 'Ξ')
    .replace(/\\Pi(?![a-zA-Z])/g, 'Π')
    .replace(/\\Sigma(?![a-zA-Z])/g, 'Σ')
    .replace(/\\Upsilon(?![a-zA-Z])/g, 'Υ')
    .replace(/\\Phi(?![a-zA-Z])/g, 'Φ')
    .replace(/\\Psi(?![a-zA-Z])/g, 'Ψ')
    .replace(/\\Omega(?![a-zA-Z])/g, 'Ω')
    .replace(/\\alpha(?![a-zA-Z])/g, 'α')
    .replace(/\\beta(?![a-zA-Z])/g, 'β')
    .replace(/\\gamma(?![a-zA-Z])/g, 'γ')
    .replace(/\\delta(?![a-zA-Z])/g, 'δ')
    .replace(/\\(?:epsilon|varepsilon)(?![a-zA-Z])/g, 'ε')
    .replace(/\\zeta(?![a-zA-Z])/g, 'ζ')
    .replace(/\\eta(?![a-zA-Z])/g, 'η')
    .replace(/\\(?:theta|vartheta)(?![a-zA-Z])/g, 'θ')
    .replace(/\\iota(?![a-zA-Z])/g, 'ι')
    .replace(/\\kappa(?![a-zA-Z])/g, 'κ')
    .replace(/\\lambda(?![a-zA-Z])/g, 'λ')
    .replace(/\\mu(?![a-zA-Z])/g, 'μ')
    .replace(/\\nu(?![a-zA-Z])/g, 'ν')
    .replace(/\\xi(?![a-zA-Z])/g, 'ξ')
    .replace(/\\(?:pi|varpi)(?![a-zA-Z])/g, 'π')
    .replace(/\\(?:rho|varrho)(?![a-zA-Z])/g, 'ρ')
    .replace(/\\(?:sigma|varsigma)(?![a-zA-Z])/g, 'σ')
    .replace(/\\tau(?![a-zA-Z])/g, 'τ')
    .replace(/\\upsilon(?![a-zA-Z])/g, 'υ')
    .replace(/\\(?:phi|varphi)(?![a-zA-Z])/g, 'φ')
    .replace(/\\chi(?![a-zA-Z])/g, 'χ')
    .replace(/\\psi(?![a-zA-Z])/g, 'ψ')
    .replace(/\\omega(?![a-zA-Z])/g, 'ω')
    .replace(/\^\{\\circ\}|\^\\circ|\\degree(?![a-zA-Z])|\\circ(?![a-zA-Z])/g, '°')
    .replace(/\\prime(?![a-zA-Z])/g, '′')
    .replace(/\\%/g, '%')
    .replace(/\\[,;:!]|\\quad(?![a-zA-Z])|\\qquad(?![a-zA-Z])/g, ' ');

  // Convert standard trig/log/limit function macros
  s = s.replace(
    /\\(arcsin|arccos|arctan|sinh|cosh|tanh|sin|cos|tan|csc|sec|cot|ln|log|exp|lim|max|min|det|gcd|mod)(?![a-zA-Z])/g,
    '$1'
  );

  // Convert \sqrt[n]{x} and \sqrt{x} (looping for nested braces)
  for (let pass = 0; pass < 3; pass++) {
    s = s.replace(/\\sqrt\[([^{}[\]]+)\]\{([^{}]*)\}/g, (_m, root, inner) => {
      const sup = toUnicodeSuperscript(root.trim());
      const cleanInner = inner.trim();
      const body = /^[0-9a-zA-Zπθ]+$/.test(cleanInner) ? cleanInner : `(${cleanInner})`;
      return `${sup || `(${root})`}√${body}`;
    });
    s = s.replace(/\\sqrt\{([^{}]*)\}/g, (_m, inner) => {
      const cleanInner = inner.trim();
      return /^[0-9a-zA-Zπθ]+$/.test(cleanInner) ? `√${cleanInner}` : `√(${cleanInner})`;
    });
  }

  // Convert \frac{a}{b}, \dfrac{a}{b}, \tfrac{a}{b} (looping from innermost to outermost)
  for (let pass = 0; pass < 3; pass++) {
    s = s.replace(/\\(?:d|t)?frac\{([^{}]*)\}\{([^{}]*)\}/g, (_m, num, den) => {
      const n = num.trim();
      const d = den.trim();
      const simpleNum = /^[0-9a-zA-Zπθ√⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]+$/.test(n);
      const simpleDen = /^[0-9a-zA-Zπθ√⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]+$/.test(d);
      return `${simpleNum ? n : `(${n})`}/${simpleDen ? d : `(${d})`}`;
    });
  }

  // Convert \vec{x}, \hat{x}, \bar{x}, \overline{x}
  s = s
    .replace(/\\vec\{([^{}]*)\}/g, '$1⃗')
    .replace(/\\hat\{([^{}]*)\}/g, '$1̂')
    .replace(/\\(?:bar|overline)\{([^{}]*)\}/g, '$1̄');

  // Convert superscripts ^{...} and ^x
  s = s.replace(/\^\{([^{}]+)\}/g, (_m, exp) => {
    const u = toUnicodeSuperscript(exp.trim());
    return u !== null ? u : `^(${exp.trim()})`;
  });
  s = s.replace(/\^([0-9+-])/g, (_m, exp) => SUPERSCRIPT_MAP[exp] || `^${exp}`);

  // Convert subscripts _{...} and _x
  s = s.replace(/_\{([^{}]+)\}/g, (_m, sub) => {
    const u = toUnicodeSubscript(sub.trim());
    return u !== null ? u : `_${sub.trim()}`;
  });
  s = s.replace(/_([0-9a-z])/g, (_m, sub) => SUBSCRIPT_MAP[sub] || `_${sub}`);

  // Strip any remaining unknown backslash command prefix
  s = s.replace(/\\([a-zA-Z]+)/g, '$1');

  // Convert spelled-out "pi", "theta", "sqrt(...)" to real mathematical symbols
  s = replaceWordMathSymbols(s);

  return s;
}

/**
 * Replaces spelled-out math symbol words like "pi", "2pi", "pi/2", "3pi/4", "theta", "sqrt(x)"
 * with actual mathematical Unicode symbols (π, θ, √, Δ) so words like "pi" never appear instead of π.
 */
export function replaceWordMathSymbols(text: string): string {
  if (!text) return '';
  let s = text;

  // 1. Replace "pi" or "2pi" or "pi/2" or "3pi/4" (lowercase "pi" as standalone word or attached to digits,
  //    or capitalized "Pi"/"PI" when adjacent to numbers/operators)
  s = s.replace(/(?<![\\a-zA-Z])(\d*)pi(?![a-zA-Z])/g, '$1π');
  s = s.replace(/(?<![\\a-zA-Z])(\d+)Pi(?![a-zA-Z])/g, '$1π');
  s = s.replace(/(?<![\\a-zA-Z])Pi(?=\s*[/^*+\-=<>)\]}0-9])/g, 'π');

  // 2. Replace "theta" or "2theta" with θ
  s = s.replace(/(?<![\\a-zA-Z])(\d*)theta(?![a-zA-Z])/gi, '$1θ');

  // 3. Replace "sqrt(...)" with √(...)
  s = s.replace(/(?<![\\a-zA-Z])sqrt\s*\(([^()]+)\)/gi, (_m, inner) => {
    const trimmed = inner.trim();
    return /^[0-9a-zA-Zπθ]+$/.test(trimmed) ? `√${trimmed}` : `√(${trimmed})`;
  });

  // 4. Replace "Delta X" (e.g., Delta x, Delta H, Delta T, Delta t, Delta v, Delta G, Delta S, Delta E) with ΔX
  s = s.replace(/(?<![\\a-zA-Z])Delta\s+([a-zA-Z0-9])\b/g, 'Δ$1');

  return s;
}

/**
 * Normalizes a LaTeX formula string right before passing it to KaTeX.
 */
function prepareFormulaForKatex(rawFormula: string): string {
  let formula = recoverControlCharLatex(rawFormula)
    .replace(/\\\\([a-zA-Z]+)/g, '\\$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    // KaTeX does not support \degree by default; replace with ^\circ
    .replace(/\\degree(?![a-zA-Z])/g, '^\\circ')
    // If Gemini wrote bare "pi" or "2pi" or "theta" inside $...$ without a backslash, convert to \pi / \theta
    .replace(/(?<![\\a-zA-Z])(\d*)pi(?![a-zA-Z])/gi, '$1\\pi ')
    .replace(/(?<![\\a-zA-Z])(\d*)theta(?![a-zA-Z])/gi, '$1\\theta ')
    .replace(/(?<![\\a-zA-Z])sqrt\s*\(([^()]+)\)/gi, '\\sqrt{$1}');

  return formula.trim();
}

const NESTED_BRACES = '\\{(?:[^{}]|\\{(?:[^{}]|\\{[^{}]*\\})*\\})*\\}';
const STRUCTURAL_LATEX_TEST = new RegExp(
  `\\\\(?:d|t)?frac\\s*${NESTED_BRACES}\\s*${NESTED_BRACES}|\\\\sqrt(?:\\[[^\\]]*\\])?\\s*${NESTED_BRACES}|\\\\binom\\s*${NESTED_BRACES}\\s*${NESTED_BRACES}|\\\\(?:int|oint|sum|prod|lim)(?![a-zA-Z])|\\\\(?:vec|hat|bar|overline)\\s*${NESTED_BRACES}|\\^${NESTED_BRACES}|_${NESTED_BRACES}`
);

/**
 * Wraps bare structural LaTeX commands outside $...$ in $...$ and converts any remaining
 * bare LaTeX symbols or "pi" words into clean Unicode so raw LaTeX is never shown.
 */
export function normalizeBareLatexInTextSegment(segment: string): string {
  if (!segment) return '';

  let s = recoverControlCharLatex(segment);
  s = s.replace(/\\\\([a-zA-Z]+)/g, '\\$1');

  // 1. Unwrap plain \text{...} or \mathrm{...} not attached to superscripts/subscripts
  s = s.replace(
    /\\(?:text|textbf|textit|textrm|mathrm|mathbf|mathit)\{([^{}]*)\}(?![_^])/g,
    '$1'
  );

  // 2. If there are structural LaTeX commands (\frac, \sqrt, \int, \sum, etc.), wrap them in $...$
  if (STRUCTURAL_LATEX_TEST.test(s)) {
    // Strip any command tokens to count how many plain English words are in the segment
    const plainWords = s
      .replace(new RegExp(`\\\\[a-zA-Z]+(?:\\[[^\\]]*\\])?(?:\\s*${NESTED_BRACES})*`, 'g'), ' ')
      .replace(/[0-9+\-*/=<>^_(),.[\]|]+/g, ' ')
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 1 && !/^(?:sin|cos|tan|csc|sec|cot|ln|log|lim|pi|dx|dy|dt|du|dr|dtheta)$/i.test(w));

    if (plainWords.length === 0) {
      return `$${s.trim()}$`;
    }

    // Wrap individual structural LaTeX expressions inline (supporting nested braces)
    const inlineMathChunkRegex = new RegExp(
      `((?:(?:\\\\(?:sin|cos|tan|csc|sec|cot|arcsin|arccos|arctan|ln|log|lim)|[0-9a-zA-Zπθ.]+)\\s*(?:\\\\(?:times|cdot|left|right)\\s*)*)?(?:\\\\(?:d|t)?frac\\s*${NESTED_BRACES}\\s*${NESTED_BRACES}|\\\\binom\\s*${NESTED_BRACES}\\s*${NESTED_BRACES}|\\\\sqrt(?:\\[[^\\]]*\\])?\\s*${NESTED_BRACES}|\\\\(?:vec|hat|bar|overline)\\s*${NESTED_BRACES}|\\\\(?:int|oint|sum|prod|lim)(?:_\\{[^{}]*\\}|_[0-9a-zA-Z\\pi]+|\\^\\{[^{}]*\\}|\\^[0-9a-zA-Z\\pi]+)*|[0-9a-zA-Zπθ)]+(?:\\^${NESTED_BRACES}|_${NESTED_BRACES}|\\^[0-9+-]+)+)(?:\\s*(?:\\\\(?:pm|mp|times|cdot|div|leq?|geq?|neq?|approx|to|rightarrow)|[+\\-*/=<>])\\s*(?:\\\\(?:d|t)?frac\\s*${NESTED_BRACES}\\s*${NESTED_BRACES}|\\\\sqrt(?:\\[[^\\]]*\\])?\\s*${NESTED_BRACES}|\\\\(?:vec|hat|bar|overline)\\s*${NESTED_BRACES}|[0-9a-zA-Zπθ.^{}_+-]+))*)`,
      'g'
    );

    s = s.replace(inlineMathChunkRegex, (m) => `$${m.trim()}$`);
  }

  // 3. Split by any newly created $...$ blocks and convert all remaining outside text to clean Unicode
  const parts = s.split(/(\$[^$\n]+?\$)/g);
  return parts
    .map((p) => (p.startsWith('$') && p.endsWith('$') ? p : convertLatexToCleanUnicode(p)))
    .join('');
}

/**
 * Safely renders LaTeX code into styled HTML using KaTeX.
 * Handles:
 *  - Display block math: $$...$$ or \[...\]
 *  - Inline math: $...$ or \(...\)
 *  - Mixed text with embedded inline and block math
 */
export const LatexRenderer: React.FC<LatexRendererProps> = ({
  content,
  className = '',
  block = false,
}) => {
  if (!content) return null;

  // If explicit single formula block mode requested
  if (block) {
    const rawFormula = content
      .replace(/^(\$\$|\\\[)/, '')
      .replace(/(\$\$|\\\])$/, '')
      .trim();
    const cleanFormula = prepareFormulaForKatex(rawFormula);

    try {
      const html = katex.renderToString(cleanFormula, {
        displayMode: true,
        throwOnError: false,
        strict: false,
      });
      if (html && !html.includes('katex-error')) {
        return (
          <div
            className={`overflow-x-auto py-2 my-1 text-center ${className}`}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      }
    } catch {
      // Fall through to clean Unicode fallback
    }

    return (
      <div className={`overflow-x-auto py-2 my-1 text-center font-semibold ${className}`}>
        {convertLatexToCleanUnicode(rawFormula)}
      </div>
    );
  }

  // Parse mixed text with inline and display math
  const elements = parseLatexAndText(content);

  return (
    <span className={`inline-latex-container ${className}`}>
      {elements.map((el, idx) => {
        if (el.type === 'block-math') {
          return (
            <span
              key={idx}
              className="block overflow-x-auto py-2 my-1.5 text-center"
              dangerouslySetInnerHTML={{ __html: el.html || '' }}
            />
          );
        }
        if (el.type === 'inline-math') {
          return (
            <span
              key={idx}
              className="inline-block px-0.5 align-baseline"
              dangerouslySetInnerHTML={{ __html: el.html || '' }}
            />
          );
        }
        return <React.Fragment key={idx}>{el.text}</React.Fragment>;
      })}
    </span>
  );
};

interface ParsedSegment {
  type: 'text' | 'inline-math' | 'block-math';
  text?: string;
  html?: string;
}

/**
 * Tokenizes text containing both standard text and LaTeX formulas
 * ($...$, $$...$$, \(...\), \[...\])
 */
export function parseLatexAndText(rawText: string): ParsedSegment[] {
  if (!rawText) return [];

  // Normalize control chars and bare LaTeX outside $...$ first
  let prepared = recoverControlCharLatex(rawText)
    .replace(/\\\[([\s\S]+?)\\\]/g, (_m, inner) => `$$${inner.trim()}$$`)
    .replace(/\\\(([\s\S]+?)\\\)/g, (_m, inner) => `$${inner.trim()}$`);

  const initialSplit = prepared.split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g);
  prepared = initialSplit
    .map((seg) =>
      seg.startsWith('$') && seg.endsWith('$') ? seg : normalizeBareLatexInTextSegment(seg)
    )
    .join('');

  const segments: ParsedSegment[] = [];

  // Regex pattern matching:
  // 1. $$ ... $$ (display math)
  // 2. \[ ... \] (display math)
  // 3. $ ... $ (inline math - tolerant of inner whitespace)
  // 4. \( ... \) (inline math)
  const mathRegex = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|(?<!\\)\$[^$\n]+?\$|\\\([\s\S]+?\\\))/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = mathRegex.exec(prepared)) !== null) {
    const matchStart = match.index;
    const matchedText = match[0];

    // Push preceding plain text if any
    if (matchStart > lastIndex) {
      segments.push({
        type: 'text',
        text: convertLatexToCleanUnicode(prepared.substring(lastIndex, matchStart)),
      });
    }

    lastIndex = matchStart + matchedText.length;

    // Check display math vs inline math
    const isBlock = matchedText.startsWith('$$') || matchedText.startsWith('\\[');
    let formula = matchedText;

    if (matchedText.startsWith('$$') && matchedText.endsWith('$$')) {
      formula = matchedText.slice(2, -2).trim();
    } else if (matchedText.startsWith('\\[') && matchedText.endsWith('\\]')) {
      formula = matchedText.slice(2, -2).trim();
    } else if (matchedText.startsWith('\\(') && matchedText.endsWith('\\)')) {
      formula = matchedText.slice(2, -2).trim();
    } else if (matchedText.startsWith('$') && matchedText.endsWith('$')) {
      formula = matchedText.slice(1, -1).trim();
    }

    formula = prepareFormulaForKatex(formula);

    let html = '';
    try {
      html = katex.renderToString(formula, {
        displayMode: isBlock,
        throwOnError: false,
        strict: false,
      });
    } catch {
      html = '';
    }

    // If KaTeX produced an error span (katex-error), fallback to clean readable mathematical text
    if (!html || html.includes('katex-error')) {
      segments.push({
        type: 'text',
        text: convertLatexToCleanUnicode(formula),
      });
    } else {
      segments.push({
        type: isBlock ? 'block-math' : 'inline-math',
        html,
      });
    }
  }

  // Push remaining trailing text
  if (lastIndex < prepared.length) {
    segments.push({
      type: 'text',
      text: convertLatexToCleanUnicode(prepared.substring(lastIndex)),
    });
  }

  return segments;
}

/**
 * Utility to render a pure LaTeX equation string directly into HTML
 */
export function renderLatexToString(formula: string, displayMode = false): string {
  try {
    return katex.renderToString(prepareFormulaForKatex(formula), {
      displayMode,
      throwOnError: false,
      strict: false,
    });
  } catch {
    return convertLatexToCleanUnicode(formula);
  }
}
