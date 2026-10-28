import React from 'react';
import { LatexRenderer } from './LatexRenderer';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const blocks = splitIntoBlocks(content);

  return (
    <div className="space-y-2.5 text-xs sm:text-[13px] text-slate-800 dark:text-[#e8eaed] leading-relaxed overflow-hidden">
      {blocks.map((block, index) => {
        // Display Math Block ($$...$$ or \[...\])
        if (block.type === 'mathblock') {
          return (
            <div
              key={index}
              className="my-3 p-3 bg-slate-50/80 dark:bg-[#0f0f10] rounded-xl border border-slate-200/90 dark:border-[#26282a] overflow-x-auto text-center shadow-2xs"
            >
              <LatexRenderer content={block.content} block />
            </div>
          );
        }

        if (block.type === 'heading') {
          if (block.level === 1) {
            return (
              <h3
                key={index}
                className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-[#e8eaed] mt-3.5 mb-1.5 border-b border-slate-200 dark:border-[#26282a] pb-1"
              >
                {renderInline(block.content)}
              </h3>
            );
          }
          if (block.level === 2) {
            return (
              <h4
                key={index}
                className="text-xs sm:text-sm font-extrabold text-blue-700 dark:text-blue-400 mt-3 mb-1"
              >
                {renderInline(block.content)}
              </h4>
            );
          }
          if (block.level === 3) {
            return (
              <h5
                key={index}
                className="text-xs sm:text-sm font-bold text-slate-900 dark:text-[#e8eaed] mt-2.5 mb-1"
              >
                {renderInline(block.content)}
              </h5>
            );
          }
          // level 4, 5, 6
          return (
            <h6
              key={index}
              className="text-xs font-bold text-slate-800 dark:text-[#e8eaed] mt-2 mb-0.5"
            >
              {renderInline(block.content)}
            </h6>
          );
        }

        if (block.type === 'table') {
          const headers = block.headers || [];
          const rows = block.rows || [];
          return (
            <div key={index} className="my-2.5 overflow-x-auto rounded-xl border border-slate-200 dark:border-[#26282a] shadow-2xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/80 dark:bg-[#0f0f10] border-b border-slate-200 dark:border-[#26282a]">
                    {headers.map((h, i) => (
                      <th key={i} className="px-3 py-2 font-bold text-slate-700 dark:text-[#e8eaed]">
                        {renderInline(h)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#26282a] bg-white dark:bg-[#18191b]">
                  {rows.map((row, rIndex) => (
                    <tr key={rIndex} className="hover:bg-slate-50/80 dark:hover:bg-[#202123] transition-colors">
                      {row.map((cell, cIndex) => (
                        <td key={cIndex} className="px-3 py-1.5 text-slate-700 dark:text-[#c4c7c5]">
                          {renderInline(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        if (block.type === 'list') {
          const items = block.items || [];
          return (
            <ul key={index} className="space-y-1.5 my-2 pl-1 list-none">
              {items.map((item, i) => {
                const isChecked = item.startsWith('[x] ') || item.startsWith('[X] ');
                const isUnchecked = item.startsWith('[ ] ');

                if (isChecked || isUnchecked) {
                  const todoText = item.replace(/^\[[ xX]\]\s*/, '');
                  return (
                    <li key={i} className="flex items-start gap-2.5 text-slate-700 dark:text-[#c4c7c5]">
                      <span
                        className={`w-4 h-4 rounded-md mt-0.5 flex items-center justify-center flex-shrink-0 border text-[11px] font-bold ${
                          isChecked
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-slate-300 dark:border-[#5f6368] bg-white dark:bg-[#0f0f10] shadow-2xs'
                        }`}
                      >
                        {isChecked ? '✓' : ''}
                      </span>
                      <span className={isChecked ? 'line-through text-slate-400 dark:text-[#9aa0a6]' : ''}>
                        {renderInline(todoText)}
                      </span>
                    </li>
                  );
                }

                return (
                  <li key={i} className="flex items-start gap-2 text-slate-700 dark:text-[#c4c7c5]">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                    <span>{renderInline(item)}</span>
                  </li>
                );
              })}
            </ul>
          );
        }

        if (block.type === 'quote') {
          const raw = block.content.trim();
          const isIdea = raw.startsWith('💡');
          const isWarning = raw.startsWith('⚠️');

          if (isIdea) {
            return (
              <div
                key={index}
                className="my-3 p-3.5 bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/90 dark:border-amber-900/60 text-amber-950 dark:text-amber-200 rounded-xl text-xs sm:text-[13px] shadow-2xs leading-relaxed"
              >
                {renderInline(block.content)}
              </div>
            );
          }

          if (isWarning) {
            return (
              <div
                key={index}
                className="my-3 p-3.5 bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200/90 dark:border-rose-900/60 text-rose-950 dark:text-rose-200 rounded-xl text-xs sm:text-[13px] shadow-2xs leading-relaxed"
              >
                {renderInline(block.content)}
              </div>
            );
          }

          return (
            <div
              key={index}
              className="my-2.5 p-3 bg-blue-50/70 dark:bg-blue-950/40 border-l-4 border-blue-600 dark:border-blue-400 text-blue-950 dark:text-blue-200 rounded-r-xl text-xs sm:text-[13px] shadow-2xs"
            >
              {renderInline(block.content)}
            </div>
          );
        }

        if (block.type === 'codeblock') {
          if (block.lang === 'latex' || block.lang === 'math' || block.lang === 'tex') {
            return (
              <div
                key={index}
                className="my-3 p-3 bg-slate-50/80 dark:bg-[#0f0f10] rounded-xl border border-slate-200/90 dark:border-[#26282a] overflow-x-auto text-center shadow-2xs"
              >
                <LatexRenderer content={block.content} block />
              </div>
            );
          }
          return (
            <pre
              key={index}
              className="my-2 p-3 bg-slate-900 dark:bg-[#0f0f10] text-slate-100 rounded-xl font-mono text-[11px] overflow-x-auto border border-transparent dark:border-[#26282a]"
            >
              <code>{block.content}</code>
            </pre>
          );
        }

        // Paragraph
        return (
          <p key={index} className="text-slate-700 dark:text-[#e8eaed]">
            {renderInline(block.content)}
          </p>
        );
      })}
    </div>
  );
};

// ==========================================
// Parsing Blocks
// ==========================================

interface Block {
  type: 'paragraph' | 'heading' | 'list' | 'table' | 'quote' | 'codeblock' | 'mathblock';
  content: string;
  level?: number;
  items?: string[];
  headers?: string[];
  rows?: string[][];
  lang?: string;
}

function splitIntoBlocks(text: string): Block[] {
  const lines = text.split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // 1. Fenced code block or latex block
    if (trimmed.startsWith('```')) {
      const lang = trimmed.replace(/^```/, '').trim().toLowerCase();
      let codeContent = '';
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeContent += lines[i] + '\n';
        i++;
      }
      blocks.push({ type: 'codeblock', content: codeContent.trim(), lang });
      i++;
      continue;
    }

    // 2. Standalone Display Math block: $$ ... $$ across lines or on single line
    if (trimmed.startsWith('$$')) {
      let mathContent = trimmed;
      if (mathContent.length > 2 && mathContent.slice(2).includes('$$')) {
        // Single line $$...$$
        blocks.push({ type: 'mathblock', content: mathContent });
        i++;
        continue;
      }
      // Multiline $$
      i++;
      while (i < lines.length) {
        mathContent += '\n' + lines[i];
        if (lines[i].trim().endsWith('$$') || lines[i].includes('$$')) {
          i++;
          break;
        }
        i++;
      }
      blocks.push({ type: 'mathblock', content: mathContent });
      continue;
    }

    // 3. Markdown Table
    if (rawLine.includes('|') && lines[i + 1] && lines[i + 1].includes('|') && lines[i + 1].includes('-')) {
      const headers = rawLine
        .split('|')
        .map((s) => s.trim())
        .filter((s, idx, arr) => (idx > 0 && idx < arr.length - 1) || (arr.length === 2 && s.length > 0));
      i += 2; // skip header and separator row

      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes('|')) {
        const rowCells = lines[i]
          .split('|')
          .map((s) => s.trim())
          .filter((s, idx, arr) => (idx > 0 && idx < arr.length - 1) || (arr.length === 2 && s.length > 0));
        if (rowCells.length > 0) rows.push(rowCells);
        i++;
      }
      blocks.push({ type: 'table', content: '', headers, rows });
      continue;
    }

    // 4. Headings: 1 to 6 hash marks (e.g., #, ##, ###, ####, #####, ######)
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      // Strip any trailing # if present
      const cleanHeading = headingMatch[2].replace(/\s+#+$/, '').trim();
      blocks.push({ type: 'heading', level, content: cleanHeading });
      i++;
      continue;
    }

    // 5. Blockquote
    if (trimmed.startsWith('> ') || trimmed === '>') {
      blocks.push({ type: 'quote', content: trimmed.replace(/^>\s*/, '').trim() });
      i++;
      continue;
    }

    // 6. Bullet or Numbered List
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || /^\d+[.)]\s/.test(trimmed)) {
      const items: string[] = [];
      while (
        i < lines.length &&
        (lines[i].trim().startsWith('* ') ||
          lines[i].trim().startsWith('- ') ||
          /^\d+[.)]\s/.test(lines[i].trim()))
      ) {
        // Strip bullet / number prefix
        const itemText = lines[i].trim().replace(/^(\*|-|\d+[.)])\s+/, '');
        // Also strip any accidental heading prefix inside the list item, e.g. "### Question 1" -> "Question 1"
        const cleanItem = itemText.replace(/^#{1,6}\s+/, '');
        items.push(cleanItem);
        i++;
      }
      blocks.push({ type: 'list', content: '', items });
      continue;
    }

    // 7. Blank line
    if (!trimmed) {
      i++;
      continue;
    }

    // 8. Paragraph: clean up any stray leading # so users don't see random hashtags
    const cleanParagraph = trimmed.replace(/^#{1,6}\s+/, '');
    blocks.push({ type: 'paragraph', content: cleanParagraph });
    i++;
  }

  return blocks;
}

// ==========================================
// Inline Formatting & LaTeX Tokenizer
// ==========================================

/**
 * Normalizes text where bold/italic tags cross over LaTeX boundaries,
 * e.g., "**Formula: $E=mc^2$**" -> "**Formula:** $E=mc^2$"
 * This prevents math delimiters from splitting bold pairs and leaving stray asterisks.
 */
function replaceBareLatexOutsideMath(segment: string): string {
  if (!segment) return '';

  // 1. Unwrap plain \text{...} or \mathrm{...} not attached to superscripts/subscripts
  let s = segment.replace(/\\(?:text|mathrm|mathbf|textit)\{([^}]*)\}(?![_^])/g, '$1');

  // 2. Wrap bare structural LaTeX commands (\frac, \sqrt, \binom, etc.) in $...$ so KaTeX renders them
  if (/\\(?:frac|sqrt|binom|int|sum|prod|lim|vec|hat|bar|overline)\b|\^\{[^}]+\}|_\{[^}]+\}/.test(s)) {
    const wordCount = s.replace(/\\[a-zA-Z]+(\{[^}]*\})*/g, '').trim().split(/\s+/).filter(Boolean).length;
    if (wordCount <= 4) {
      return `$${s.trim()}$`;
    }
    s = s.replace(
      /((?:[0-9a-zA-Z.]+\s*\\(?:times|cdot)\s*)?(?:\\(?:frac|binom)\{[^}]*\}\{[^}]*\}|\\(?:sqrt|vec|hat|bar|overline)\{[^}]*\}|[0-9a-zA-Z)]+(?:\^\{[^}]+\}|_\{[^}]+\}|\^[0-9+-]+)+)(?:\s*[+\-*/=<>]\s*(?:\\(?:frac|binom)\{[^}]*\}\{[^}]*\}|\\(?:sqrt|vec|hat|bar|overline)\{[^}]*\}|[0-9a-zA-Z.^{}_+-]+))*)/g,
      (m) => `$${m.trim()}$`
    );
  }

  // 3. Replace any remaining standalone bare LaTeX symbols with clean Unicode characters
  s = s
    .replace(/\\times\b/g, '×')
    .replace(/\\cdot\b/g, '·')
    .replace(/\\div\b/g, '÷')
    .replace(/\\pm\b/g, '±')
    .replace(/\\mp\b/g, '∓')
    .replace(/\\le(?:q)?\b/g, '≤')
    .replace(/\\ge(?:q)?\b/g, '≥')
    .replace(/\\ne(?:q)?\b/g, '≠')
    .replace(/\\approx\b/g, '≈')
    .replace(/\\equiv\b/g, '≡')
    .replace(/\\propto\b/g, '∝')
    .replace(/\\infty\b/g, '∞')
    .replace(/\\(?:rightarrow|to)\b/g, '→')
    .replace(/\\leftarrow\b/g, '←')
    .replace(/\\(?:leftrightarrow|rightleftharpoons)\b/g, '⇌')
    .replace(/\\Rightarrow\b/g, '⇒')
    .replace(/\\Delta\b/g, 'Δ')
    .replace(/\\alpha\b/g, 'α')
    .replace(/\\beta\b/g, 'β')
    .replace(/\\gamma\b/g, 'γ')
    .replace(/\\delta\b/g, 'δ')
    .replace(/\\(?:epsilon|varepsilon)\b/g, 'ε')
    .replace(/\\theta\b/g, 'θ')
    .replace(/\\lambda\b/g, 'λ')
    .replace(/\\mu\b/g, 'μ')
    .replace(/\\nu\b/g, 'ν')
    .replace(/\\pi\b/g, 'π')
    .replace(/\\rho\b/g, 'ρ')
    .replace(/\\sigma\b/g, 'σ')
    .replace(/\\tau\b/g, 'τ')
    .replace(/\\(?:phi|varphi)\b/g, 'φ')
    .replace(/\\omega\b/g, 'ω')
    .replace(/\\Omega\b/g, 'Ω')
    .replace(/\\degree\b|\^\\circ/g, '°')
    .replace(/\\%/g, '%');

  return s;
}

function normalizeMathAsterisks(text: string): string {
  if (!text) return '';

  // 0. Recover control characters if \frac, \beta, \theta, \text were unescaped in saved JSON
  let normalized = text
    .replace(/\f(rac|orall|lat|box)/g, '\\f$1')
    .replace(/[\b](eta|inom|oxed|ar|egin|f|ig|m|mod|owtie|ullet)/g, '\\b$1')
    .replace(/\t(heta|imes|ext|o|an|au|riangle|ilde|op|frac)/g, '\\t$1');

  // 1. Normalize \[ ... \] to $$ ... $$ and \( ... \) to $ ... $
  normalized = normalized
    .replace(/\\\[([\s\S]+?)\\\]/g, (_m, inner) => `$$${inner.trim()}$$`)
    .replace(/\\\(([\s\S]+?)\\\)/g, (_m, inner) => `$${inner.trim()}$`);

  // 2. Normalize double-escaped commands like \\frac -> \frac
  normalized = normalized.replace(/\\\\([a-zA-Z]+)/g, '\\$1');

  // 3. Normalize spaced math like $ x $ -> $x$
  normalized = normalized.replace(/\$(?!\$)\s*([^$\n]+?)\s*\$(?!\$)/g, (_m, inner) => `$${inner.trim()}$`);

  // 3b. Convert any bare LaTeX commands outside $...$ blocks so raw LaTeX is never displayed
  const mathSplitRegex = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g;
  const segments = normalized.split(mathSplitRegex);
  normalized = segments
    .map((seg) => (seg.startsWith('$') && seg.endsWith('$') ? seg : replaceBareLatexOutsideMath(seg)))
    .join('');

  // 4. Bold wrapping math: **prefix $math$ suffix**
  normalized = normalized.replace(
    /\*\*([^*$\n]*?)(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)([^*$\n]*?)\*\*/g,
    (_match, p1, math, p2) => {
      const b1 = p1.trim() ? `**${p1.trim()}** ` : '';
      const b2 = p2.trim() ? ` **${p2.trim()}**` : '';
      return `${b1}${math}${b2}`.trim();
    }
  );

  // 5. Single asterisk italic wrapping math: *prefix $math$ suffix*
  normalized = normalized.replace(
    /(?<!\*)\*([^*$\n]+?)(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)([^*$\n]*?)\*(?!\*)/g,
    (_match, p1, math, p2) => {
      const i1 = p1.trim() ? `*${p1.trim()}* ` : '';
      const i2 = p2.trim() ? ` *${p2.trim()}*` : '';
      return `${i1}${math}${i2}`.trim();
    }
  );

  return normalized;
}

/**
 * Handles inline formatting: LaTeX math ($...$, $$...$$), **bold**, *italic*, `code`, etc.
 */
function renderInline(text: string): React.ReactNode {
  // Normalize math and delimiters first
  const normalized = normalizeMathAsterisks(text);

  // Check if text contains LaTeX math
  const hasLatex = normalized.includes('$');

  if (!hasLatex) {
    return renderFormattingOnly(normalized);
  }

  // Tokenize math ($$...$$ or $...$) vs non-math
  const mathRegex = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyIdx = 0;

  while ((match = mathRegex.exec(normalized)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <React.Fragment key={keyIdx++}>
          {renderFormattingOnly(normalized.substring(lastIndex, match.index))}
        </React.Fragment>
      );
    }

    parts.push(
      <LatexRenderer key={keyIdx++} content={match[0]} />
    );

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < normalized.length) {
    parts.push(
      <React.Fragment key={keyIdx++}>
        {renderFormattingOnly(normalized.substring(lastIndex))}
      </React.Fragment>
    );
  }

  return <>{parts}</>;
}

/**
 * Robust Markdown inline formatting:
 * - Bold + Italic: ***text***
 * - Bold: **text** or __text__
 * - Italic: *text* or _text_
 * - Inline Code: `code`
 * - Strips any stray orphaned asterisks (e.g. dangling ** or *) so they never pollute the text
 */
function renderFormattingOnly(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let keyIndex = 0;

  while (remaining.length > 0) {
    // 1. Inline code: `code`
    const codeMatch = remaining.match(/^(.*?)`([^`]+)`(.*)/s);
    // 2. Bold + Italic: ***text***
    const boldItalicMatch = remaining.match(/^(.*?)\*\*\*([^*]+)\*\*\*(.*)/s);
    // 3. Bold: **text**
    const boldMatch = remaining.match(/^(.*?)\*\*([^*]+)\*\*(.*)/s);
    // 4. Italic: *text*
    const italicMatch = remaining.match(/^(.*?)(?<!\*)\*([^*]+)\*(?!\*)(.*)/s);

    // Pick whichever match starts earliest in the string
    type MatchCandidate = { type: string; before: string; content: string; after: string; start: number };
    const candidates: MatchCandidate[] = [];

    if (codeMatch) {
      candidates.push({ type: 'code', before: codeMatch[1], content: codeMatch[2], after: codeMatch[3], start: codeMatch[1].length });
    }
    if (boldItalicMatch) {
      candidates.push({ type: 'boldItalic', before: boldItalicMatch[1], content: boldItalicMatch[2], after: boldItalicMatch[3], start: boldItalicMatch[1].length });
    }
    if (boldMatch) {
      candidates.push({ type: 'bold', before: boldMatch[1], content: boldMatch[2], after: boldMatch[3], start: boldMatch[1].length });
    }
    if (italicMatch) {
      candidates.push({ type: 'italic', before: italicMatch[1], content: italicMatch[2], after: italicMatch[3], start: italicMatch[1].length });
    }

    if (candidates.length === 0) {
      // No more paired markdown tags found.
      // Clean up any stray dangling asterisks like stray "** " or " *"
      const cleaned = remaining.replace(/\*{1,3}/g, '');
      if (cleaned) {
        parts.push(cleaned);
      }
      break;
    }

    // Sort by earliest match in the string
    candidates.sort((a, b) => a.start - b.start);
    const best = candidates[0];

    // Push preceding text (cleaned of any stray unclosed asterisks)
    if (best.before) {
      const cleanBefore = best.before.replace(/\*{1,3}/g, '');
      if (cleanBefore) parts.push(cleanBefore);
    }

    if (best.type === 'code') {
      parts.push(
        <code
          key={keyIndex++}
          className="px-1.5 py-0.5 bg-slate-100 dark:bg-[#0f0f10] text-blue-700 dark:text-blue-400 font-mono text-[11px] rounded-md border border-slate-200 dark:border-[#26282a]"
        >
          {best.content}
        </code>
      );
    } else if (best.type === 'boldItalic') {
      parts.push(
        <strong key={keyIndex++} className="font-extrabold italic text-slate-900 dark:text-white">
          {best.content}
        </strong>
      );
    } else if (best.type === 'bold') {
      parts.push(
        <strong key={keyIndex++} className="font-bold text-slate-900 dark:text-white">
          {best.content}
        </strong>
      );
    } else if (best.type === 'italic') {
      parts.push(
        <em key={keyIndex++} className="italic text-slate-800 dark:text-[#e8eaed]">
          {best.content}
        </em>
      );
    }

    remaining = best.after;
  }

  return <>{parts}</>;
}
