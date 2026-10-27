import React from 'react';
import katex from 'katex';

interface LatexRendererProps {
  content: string;
  className?: string;
  block?: boolean;
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
    const cleanFormula = content
      .replace(/^(\$\$|\\\[)/, '')
      .replace(/(\$\$|\\\])$/, '')
      .trim();

    try {
      const html = katex.renderToString(cleanFormula, {
        displayMode: true,
        throwOnError: false,
      });
      return (
        <div
          className={`overflow-x-auto py-2 my-1 text-center ${className}`}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    } catch {
      return <pre className="font-mono text-xs text-rose-600">{content}</pre>;
    }
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

  const segments: ParsedSegment[] = [];

  // Regex pattern matching:
  // 1. $$ ... $$ (display math)
  // 2. \[ ... \] (display math)
  // 3. $ ... $ (inline math - excluding currency like $100)
  // 4. \( ... \) (inline math)
  const mathRegex = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|(?<!\\)\$(?!\s)(.+?)(?<!\s)\$|\\\([\s\S]+?\\\))/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = mathRegex.exec(rawText)) !== null) {
    const matchStart = match.index;
    const matchedText = match[0];

    // Push preceding plain text if any
    if (matchStart > lastIndex) {
      segments.push({
        type: 'text',
        text: rawText.substring(lastIndex, matchStart),
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

    // Sanitize escaped backslashes and HTML entities inside LaTeX
    formula = formula
      .replace(/\\\\([a-zA-Z]+)/g, '\\$1')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');

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
      const cleanFallback = formula
        .replace(/\\(?:text|mathrm|mathbf|mathit)\{([^}]+)\}/g, '$1')
        .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
        .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
        .replace(/\\cdot/g, '·')
        .replace(/\\times/g, '×')
        .replace(/\\pm/g, '±')
        .replace(/\\le(?:q)?/g, '≤')
        .replace(/\\ge(?:q)?/g, '≥')
        .replace(/\\neq/g, '≠')
        .replace(/\\approx/g, '≈')
        .replace(/\\infty/g, '∞')
        .replace(/\\Delta/g, 'Δ')
        .replace(/\\pi/g, 'π')
        .replace(/\\theta/g, 'θ')
        .replace(/\\alpha/g, 'α')
        .replace(/\\beta/g, 'β')
        .replace(/\\lambda/g, 'λ')
        .replace(/\\sigma/g, 'σ')
        .replace(/\\([a-zA-Z]+)/g, '$1');

      segments.push({
        type: 'text',
        text: cleanFallback,
      });
    } else {
      segments.push({
        type: isBlock ? 'block-math' : 'inline-math',
        html,
      });
    }
  }

  // Push remaining trailing text
  if (lastIndex < rawText.length) {
    segments.push({
      type: 'text',
      text: rawText.substring(lastIndex),
    });
  }

  return segments;
}

/**
 * Utility to render a pure LaTeX equation string directly into HTML
 */
export function renderLatexToString(formula: string, displayMode = false): string {
  try {
    return katex.renderToString(formula, {
      displayMode,
      throwOnError: false,
    });
  } catch {
    return formula;
  }
}
