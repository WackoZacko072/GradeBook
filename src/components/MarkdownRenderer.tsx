import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const blocks = splitIntoBlocks(content);

  return (
    <div className="space-y-2.5 text-xs sm:text-[13px] text-slate-800 leading-relaxed overflow-hidden">
      {blocks.map((block, index) => {
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
            <ul key={index} className="space-y-1 my-1.5 pl-3 list-none">
              {items.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-slate-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                  <span>{renderInline(item)}</span>
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === 'quote') {
          return (
            <div
              key={index}
              className="my-2 p-2.5 bg-blue-50/70 border-l-3 border-blue-500 text-blue-900 rounded-r-xl text-xs"
            >
              {renderInline(block.content)}
            </div>
          );
        }

        if (block.type === 'codeblock') {
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
  type: 'paragraph' | 'heading' | 'list' | 'table' | 'quote' | 'codeblock';
  content: string;
  level?: number;
  items?: string[];
  headers?: string[];
  rows?: string[][];
}

function splitIntoBlocks(text: string): Block[] {
  const lines = text.split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.trim().startsWith('```')) {
      let codeContent = '';
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeContent += lines[i] + '\n';
        i++;
      }
      blocks.push({ type: 'codeblock', content: codeContent.trim() });
      i++;
      continue;
    }

    // Markdown Table
    if (line.includes('|') && lines[i + 1] && lines[i + 1].includes('|') && lines[i + 1].includes('-')) {
      const headers = line
        .split('|')
        .map((s) => s.trim())
        .filter((s, idx, arr) => idx > 0 && idx < arr.length - 1 || (arr.length === 2 && s.length > 0));
      i += 2; // skip header and separator row

      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes('|')) {
        const rowCells = lines[i]
          .split('|')
          .map((s) => s.trim())
          .filter((s, idx, arr) => idx > 0 && idx < arr.length - 1 || (arr.length === 2 && s.length > 0));
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
 * Handles inline formatting: **bold**, *italic*, `code`, etc.
 */
function renderInline(text: string): React.ReactNode {
  // Split tokens by **bold** and `code`
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
