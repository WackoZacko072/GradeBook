import React from 'react';
import { LatexRenderer } from './LatexRenderer';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const blocks = splitIntoBlocks(content);

  return (
    <div className="space-y-2.5 text-xs sm:text-[13px] text-slate-800 leading-relaxed overflow-hidden">
      {blocks.map((block, index) => {
        // Display Math Block ($$...$$ or \[...\])
        if (block.type === 'mathblock') {
          return (
            <div
              key={index}
              className="my-3 p-3 bg-slate-50/80 rounded-xl border border-slate-200/90 overflow-x-auto text-center shadow-2xs"
            >
              <LatexRenderer content={block.content} block />
            </div>
          );
        }

        if (block.type === 'heading') {
          if (block.level === 1) {
            return (
              <h3 key={index} className="text-sm sm:text-base font-extrabold text-slate-900 mt-3 mb-1 border-b border-slate-200 pb-1">
                {renderInline(block.content)}
              </h3>
            );
          }
          if (block.level === 2) {
            return (
              <h4 key={index} className="text-xs sm:text-sm font-bold text-slate-900 mt-2.5 mb-1 text-blue-700">
                {renderInline(block.content)}
              </h4>
            );
          }
          return (
            <h5 key={index} className="text-xs font-bold text-slate-900 mt-2 mb-0.5">
              {renderInline(block.content)}
            </h5>
          );
        }

        if (block.type === 'table') {
          const headers = block.headers || [];
          const rows = block.rows || [];
          return (
            <div key={index} className="my-2.5 overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/80 border-b border-slate-200">
                    {headers.map((h, i) => (
                      <th key={i} className="px-3 py-2 font-bold text-slate-700">
                        {renderInline(h)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {rows.map((row, rIndex) => (
                    <tr key={rIndex} className="hover:bg-slate-50/80 transition-colors">
                      {row.map((cell, cIndex) => (
                        <td key={cIndex} className="px-3 py-1.5 text-slate-700">
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
                    <li key={i} className="flex items-start gap-2.5 text-slate-700">
                      <span
                        className={`w-4 h-4 rounded-md mt-0.5 flex items-center justify-center flex-shrink-0 border text-[11px] font-bold ${
                          isChecked
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-slate-300 bg-white shadow-2xs'
                        }`}
                      >
                        {isChecked ? '✓' : ''}
                      </span>
                      <span className={isChecked ? 'line-through text-slate-400' : ''}>
                        {renderInline(todoText)}
                      </span>
                    </li>
                  );
                }

                return (
                  <li key={i} className="flex items-start gap-2 text-slate-700">
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
                className="my-3 p-3.5 bg-amber-50/80 border border-amber-200/90 text-amber-950 rounded-xl text-xs sm:text-[13px] shadow-2xs leading-relaxed"
              >
                {renderInline(block.content)}
              </div>
            );
          }

          if (isWarning) {
            return (
              <div
                key={index}
                className="my-3 p-3.5 bg-rose-50/80 border border-rose-200/90 text-rose-950 rounded-xl text-xs sm:text-[13px] shadow-2xs leading-relaxed"
              >
                {renderInline(block.content)}
              </div>
            );
          }

          return (
            <div
              key={index}
              className="my-2.5 p-3 bg-blue-50/70 border-l-4 border-blue-600 text-blue-950 rounded-r-xl text-xs sm:text-[13px] shadow-2xs"
            >
              {renderInline(block.content)}
            </div>
          );
        }

        if (block.type === 'codeblock') {
          // If codeblock specifies latex or math, render as math
          if (block.lang === 'latex' || block.lang === 'math' || block.lang === 'tex') {
            return (
              <div
                key={index}
                className="my-3 p-3 bg-slate-50/80 rounded-xl border border-slate-200/90 overflow-x-auto text-center shadow-2xs"
              >
                <LatexRenderer content={block.content} block />
              </div>
            );
          }
          return (
            <pre
              key={index}
              className="my-2 p-3 bg-slate-900 text-slate-100 rounded-xl font-mono text-[11px] overflow-x-auto"
            >
              <code>{block.content}</code>
            </pre>
          );
        }

        return (
          <p key={index} className="text-slate-700">
            {renderInline(block.content)}
          </p>
        );
      })}
    </div>
  );
};

// ==========================================
// Parsing Helpers
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
    const line = lines[i];

    // Fenced code block or latex block
    if (line.trim().startsWith('```')) {
      const lang = line.trim().replace(/^```/, '').trim().toLowerCase();
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

    // Standalone Display Math block: $$ ... $$ across lines or on single line
    if (line.trim().startsWith('$$')) {
      let mathContent = line.trim();
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

    // Markdown Table
    if (line.includes('|') && lines[i + 1] && lines[i + 1].includes('|') && lines[i + 1].includes('-')) {
      const headers = line
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

    // Headings
    if (line.startsWith('### ')) {
      blocks.push({ type: 'heading', level: 3, content: line.replace('### ', '').trim() });
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      blocks.push({ type: 'heading', level: 2, content: line.replace('## ', '').trim() });
      i++;
      continue;
    }
    if (line.startsWith('# ')) {
      blocks.push({ type: 'heading', level: 1, content: line.replace('# ', '').trim() });
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      blocks.push({ type: 'quote', content: line.replace('> ', '').trim() });
      i++;
      continue;
    }

    // Bullet List
    if (line.trim().startsWith('* ') || line.trim().startsWith('- ') || /^\d+\.\s/.test(line.trim())) {
      const items: string[] = [];
      while (
        i < lines.length &&
        (lines[i].trim().startsWith('* ') ||
          lines[i].trim().startsWith('- ') ||
          /^\d+\.\s/.test(lines[i].trim()))
      ) {
        items.push(lines[i].trim().replace(/^(\*|-|\d+\.)\s+/, ''));
        i++;
      }
      blocks.push({ type: 'list', content: '', items });
      continue;
    }

    // Blank line
    if (!line.trim()) {
      i++;
      continue;
    }

    // Paragraph
    blocks.push({ type: 'paragraph', content: line.trim() });
    i++;
  }

  return blocks;
}

/**
 * Handles inline formatting: LaTeX math ($...$, \(...\)), **bold**, *italic*, `code`, etc.
 */
function renderInline(text: string): React.ReactNode {
  // First, check if text contains LaTeX math
  const hasLatex = /(\$|\\\(|\\\[)/.test(text);

  if (!hasLatex) {
    return renderFormattingOnly(text);
  }

  // Tokenize math vs non-math
  const mathRegex = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|(?<!\\)\$(?!\s)(.+?)(?<!\s)\$|\\\([\s\S]+?\\\))/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyIdx = 0;

  while ((match = mathRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <React.Fragment key={keyIdx++}>
          {renderFormattingOnly(text.substring(lastIndex, match.index))}
        </React.Fragment>
      );
    }

    parts.push(
      <LatexRenderer key={keyIdx++} content={match[0]} />
    );

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(
      <React.Fragment key={keyIdx++}>
        {renderFormattingOnly(text.substring(lastIndex))}
      </React.Fragment>
    );
  }

  return <>{parts}</>;
}

/**
 * Handles standard bold, italic, code formatting
 */
function renderFormattingOnly(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let keyIndex = 0;

  while (remaining.length > 0) {
    // Check for bold: **text**
    const boldMatch = remaining.match(/^(.*?)\*\*(.*?)\*\*(.*)/s);
    // Check for inline code: `code`
    const codeMatch = remaining.match(/^(.*?)`([^`]+)`(.*)/s);

    if (boldMatch && (!codeMatch || boldMatch[1].length <= codeMatch[1].length)) {
      if (boldMatch[1]) {
        parts.push(boldMatch[1]);
      }
      parts.push(
        <strong key={keyIndex++} className="font-bold text-slate-900">
          {boldMatch[2]}
        </strong>
      );
      remaining = boldMatch[3];
    } else if (codeMatch) {
      if (codeMatch[1]) {
        parts.push(codeMatch[1]);
      }
      parts.push(
        <code
          key={keyIndex++}
          className="px-1.5 py-0.5 bg-slate-100 text-blue-700 font-mono text-[11px] rounded-md border border-slate-200"
        >
          {codeMatch[2]}
        </code>
      );
      remaining = codeMatch[3];
    } else {
      parts.push(remaining);
      break;
    }
  }

  return <>{parts}</>;
}
