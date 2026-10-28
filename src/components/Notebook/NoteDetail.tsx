import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Trash2,
  Check,
  Eye,
  Edit3,
  Columns,
  Bold,
  Italic,
  List,
  ListOrdered,
  CheckSquare,
  Code,
  Sigma,
  Lightbulb,
  Paperclip,
  BookOpen,
  Clock,
  FileText,
  ChevronDown,
} from 'lucide-react';
import { ModalPortal } from '../ModalPortal';
import type { NoteItem, NoteSource } from '../../types/notebook';
import type { ClassItem } from '../../types/grade';
import { MarkdownRenderer } from '../MarkdownRenderer';
import { SourcesSection } from './SourcesSection';

interface NoteDetailProps {
  note: NoteItem;
  classes?: ClassItem[];
  onBack: () => void;
  onUpdateNote: (updated: NoteItem) => void;
  onDeleteNote: (id: string) => void;
  onOpenSlateAi?: (prompt?: string) => void;
}

const NOTE_ICONS = ['📝', '📈', '📐', '🧪', '🧬', '🏛️', '📚', '💡', '⚡', '📊', '⚖️', '🌍'];

export const NoteDetail: React.FC<NoteDetailProps> = ({
  note,
  classes = [],
  onBack,
  onUpdateNote,
  onDeleteNote,
  onOpenSlateAi,
}) => {
  // Title & Content state
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [selectedClassId, setSelectedClassId] = useState(note.classId || '');
  const [icon, setIcon] = useState(note.icon || '📝');

  // UI state
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [viewMode, setViewMode] = useState<'write' | 'split' | 'preview'>('write');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const [showSourcesPanel, setShowSourcesPanel] = useState(false);

  // Debounce timer refs
  const titleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync state whenever note.id changes
  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
    setSelectedClassId(note.classId || '');
    setIcon(note.icon || '📝');
    setSaveStatus('saved');
  }, [note.id]);

  // Clean up debounce timers
  useEffect(() => {
    return () => {
      if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
      if (contentDebounceRef.current) clearTimeout(contentDebounceRef.current);
    };
  }, []);

  // --------------------------------------------------------------------------
  // Title Handlers (Instant auto-saving & onBlur)
  // --------------------------------------------------------------------------
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    setSaveStatus('saving');

    if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
    titleDebounceRef.current = setTimeout(() => {
      onUpdateNote({
        ...note,
        title: newTitle.trim() || 'Untitled Note',
        updatedAt: Date.now(),
      });
      setSaveStatus('saved');
    }, 400);
  };

  const handleTitleBlur = () => {
    if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
    const finalTitle = title.trim() || 'Untitled Note';
    setTitle(finalTitle);
    onUpdateNote({
      ...note,
      title: finalTitle,
      updatedAt: Date.now(),
    });
    setSaveStatus('saved');
  };

  // --------------------------------------------------------------------------
  // Content Handlers (Debounced auto-saving & onBlur)
  // --------------------------------------------------------------------------
  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setSaveStatus('saving');

    if (contentDebounceRef.current) clearTimeout(contentDebounceRef.current);
    contentDebounceRef.current = setTimeout(() => {
      onUpdateNote({
        ...note,
        content: newContent,
        updatedAt: Date.now(),
      });
      setSaveStatus('saved');
    }, 450);
  };

  const handleContentBlur = () => {
    if (contentDebounceRef.current) clearTimeout(contentDebounceRef.current);
    onUpdateNote({
      ...note,
      content,
      updatedAt: Date.now(),
    });
    setSaveStatus('saved');
  };

  // --------------------------------------------------------------------------
  // Class Association Handler
  // --------------------------------------------------------------------------
  const handleClassChange = (newClassId: string) => {
    setSelectedClassId(newClassId);
    const matched = classes.find((c) => c.id === newClassId);
    onUpdateNote({
      ...note,
      classId: newClassId || undefined,
      className: matched ? matched.name : undefined,
      updatedAt: Date.now(),
    });
  };

  // --------------------------------------------------------------------------
  // Icon Picker Handler
  // --------------------------------------------------------------------------
  const handleSelectIcon = (newIcon: string) => {
    setIcon(newIcon);
    setIsIconPickerOpen(false);
    onUpdateNote({
      ...note,
      icon: newIcon,
      updatedAt: Date.now(),
    });
  };

  // --------------------------------------------------------------------------
  // Note-Taking Friendly Keyboard Mechanics (Notion-like list continuation, Tab)
  // --------------------------------------------------------------------------
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const { selectionStart, selectionEnd, value } = textarea;

    // 1. Tab Key: Indent 2 spaces without losing focus
    if (e.key === 'Tab') {
      e.preventDefault();
      if (!e.shiftKey) {
        const next = value.substring(0, selectionStart) + '  ' + value.substring(selectionEnd);
        handleContentChange(next);
        setTimeout(() => {
          textarea.setSelectionRange(selectionStart + 2, selectionStart + 2);
        }, 0);
      }
      return;
    }

    // 2. Enter Key: Smart continuation for lists & checklists
    if (e.key === 'Enter') {
      const lastNewLine = value.lastIndexOf('\n', selectionStart - 1);
      const currentLine = value.substring(lastNewLine + 1, selectionStart);

      // A) Checkbox: "- [ ] " or "- [x] "
      const todoMatch = currentLine.match(/^(\s*-\s*\[[ xX]?\]\s*)(.*)$/);
      if (todoMatch) {
        e.preventDefault();
        const prefix = todoMatch[1];
        const textAfter = todoMatch[2];

        if (!textAfter.trim()) {
          // Empty checkbox -> exit list
          const next = value.substring(0, lastNewLine + 1) + value.substring(selectionStart);
          handleContentChange(next);
          setTimeout(() => {
            textarea.setSelectionRange(lastNewLine + 1, lastNewLine + 1);
          }, 0);
        } else {
          // Continue unchecked todo item
          const nextPrefix = '\n' + prefix.replace(/\[[xX]\]/, '[ ]');
          const next = value.substring(0, selectionStart) + nextPrefix + value.substring(selectionEnd);
          handleContentChange(next);
          setTimeout(() => {
            const pos = selectionStart + nextPrefix.length;
            textarea.setSelectionRange(pos, pos);
          }, 0);
        }
        return;
      }

      // B) Numbered list: "1. "
      const numMatch = currentLine.match(/^(\s*)(\d+)\.\s+(.*)$/);
      if (numMatch) {
        e.preventDefault();
        const indent = numMatch[1];
        const num = parseInt(numMatch[2], 10);
        const textAfter = numMatch[3];

        if (!textAfter.trim()) {
          // Empty numbered item -> exit list
          const next = value.substring(0, lastNewLine + 1) + value.substring(selectionStart);
          handleContentChange(next);
          setTimeout(() => {
            textarea.setSelectionRange(lastNewLine + 1, lastNewLine + 1);
          }, 0);
        } else {
          // Continue numbered list
          const nextPrefix = `\n${indent}${num + 1}. `;
          const next = value.substring(0, selectionStart) + nextPrefix + value.substring(selectionEnd);
          handleContentChange(next);
          setTimeout(() => {
            const pos = selectionStart + nextPrefix.length;
            textarea.setSelectionRange(pos, pos);
          }, 0);
        }
        return;
      }

      // C) Bullet list: "- " or "* "
      const bulletMatch = currentLine.match(/^(\s*(?:-|\*)\s+)(.*)$/);
      if (bulletMatch) {
        e.preventDefault();
        const prefix = bulletMatch[1];
        const textAfter = bulletMatch[2];

        if (!textAfter.trim()) {
          // Empty bullet -> exit list
          const next = value.substring(0, lastNewLine + 1) + value.substring(selectionStart);
          handleContentChange(next);
          setTimeout(() => {
            textarea.setSelectionRange(lastNewLine + 1, lastNewLine + 1);
          }, 0);
        } else {
          // Continue bullet list
          const nextPrefix = '\n' + prefix;
          const next = value.substring(0, selectionStart) + nextPrefix + value.substring(selectionEnd);
          handleContentChange(next);
          setTimeout(() => {
            const pos = selectionStart + nextPrefix.length;
            textarea.setSelectionRange(pos, pos);
          }, 0);
        }
        return;
      }
    }
  };

  // Helper to insert markdown or LaTeX at cursor
  const handleInsertSnippet = (before: string, after: string = '', defaultPlaceholder: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = textarea.value;
    const selectedText = currentText.substring(start, end) || defaultPlaceholder;

    const replacement = `${before}${selectedText}${after}`;
    const nextContent = currentText.substring(0, start) + replacement + currentText.substring(end);

    handleContentChange(nextContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 0);
  };

  // Update sources
  const handleUpdateSources = (sources: NoteSource[]) => {
    onUpdateNote({
      ...note,
      sources,
      updatedAt: Date.now(),
    });
  };

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));
  const currentClass = classes.find((c) => c.id === selectedClassId);

  return (
    <div className="space-y-5 animate-fade-scale">
      {/* Top Navigation & Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/90 dark:border-[#26282a]">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-[#202123] hover:bg-slate-200/80 dark:hover:bg-[#26282a] text-slate-700 dark:text-[#e8eaed] text-xs font-semibold rounded-xl transition-all cursor-pointer min-h-[36px] google-btn-press"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>All Notes</span>
          </button>

          {/* Real-time Save Indicator */}
          <div className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-[#9aa0a6] pl-1">
            {saveStatus === 'saving' ? (
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Saving...
              </span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Saved
              </span>
            )}
          </div>
        </div>

        {/* Top Right Actions */}
        <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-auto">
          {/* Ask Slate AI Button */}
          {onOpenSlateAi && (
            <button
              type="button"
              onClick={() => {
                const effectiveSubject = currentClass ? currentClass.name : (title || 'my notes');
                onOpenSlateAi(`Look at my ${effectiveSubject} notes and create a mcq`);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs font-medium shadow-xs transition-all cursor-pointer min-h-[36px] google-btn-press"
            >
              <img src="/gemini-icon.png" alt="Gemini" className="w-3.5 h-3.5 object-contain" />
              <span>Ask Gemini</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            title="Delete this note"
            className="flex items-center gap-1.5 px-3 py-1.5 text-slate-500 dark:text-[#9aa0a6] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl text-xs font-semibold transition-all cursor-pointer min-h-[36px] google-btn-press"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Delete</span>
          </button>
        </div>
      </div>

      {/* Notion Page Header Canvas */}
      <div className="bg-white dark:bg-[#18191b] border border-slate-200/90 dark:border-[#26282a] rounded-2xl p-5 sm:p-7 shadow-2xs space-y-4">
        {/* Icon & Title Row */}
        <div className="flex items-start gap-3">
          {/* Notion Emoji / Icon Picker */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsIconPickerOpen(!isIconPickerOpen)}
              title="Change note icon"
              className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-[#0f0f10] hover:bg-slate-200/80 dark:hover:bg-[#202123] flex items-center justify-center text-2xl transition-all cursor-pointer select-none border border-slate-200/80 dark:border-[#26282a] google-btn-press"
            >
              {icon}
            </button>

            {isIconPickerOpen && (
              <div className="absolute top-13 left-0 z-30 p-2.5 bg-white dark:bg-[#18191b] border border-slate-200 dark:border-[#26282a] rounded-2xl shadow-xl flex gap-1.5 flex-wrap w-48 animate-in zoom-in-95 duration-150">
                {NOTE_ICONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleSelectIcon(emoji)}
                    className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-[#202123] flex items-center justify-center text-lg cursor-pointer transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Effortless Notion Title Input (Auto-saves on keystroke & blur) */}
          <div className="flex-1">
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              onBlur={handleTitleBlur}
              placeholder="Untitled Note..."
              className="w-full text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-[#e8eaed] bg-transparent border-none outline-hidden tracking-tight placeholder-slate-300 dark:placeholder-[#5f6368] focus:ring-0 leading-tight"
            />
          </div>
        </div>

        {/* Notion Database Properties Bar */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 border-t border-slate-100 dark:border-[#26282a] text-xs text-slate-600 dark:text-[#c4c7c5]">
          {/* Property 1: Class Tag Selector */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400 dark:text-[#9aa0a6] flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5 text-slate-400 dark:text-[#9aa0a6]" />
              Class:
            </span>
            <select
              value={selectedClassId}
              onChange={(e) => handleClassChange(e.target.value)}
              className="bg-slate-100 dark:bg-[#0f0f10] hover:bg-slate-200/80 dark:hover:bg-[#202123] text-slate-800 dark:text-[#e8eaed] font-bold px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-[#26282a] cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            >
              <option value="">General (No Class)</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>

          {/* Property 2: Files & Uploads Toggle */}
          <button
            type="button"
            onClick={() => setShowSourcesPanel(!showSourcesPanel)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold border transition-colors cursor-pointer google-btn-press ${
              (note.sources?.length || 0) > 0 || showSourcesPanel
                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-[#8ab4f8] border-blue-200 dark:border-blue-800/40'
                : 'bg-slate-100 dark:bg-[#0f0f10] text-slate-600 dark:text-[#c4c7c5] border-slate-200/80 dark:border-[#26282a] hover:bg-slate-200/80 dark:hover:bg-[#202123]'
            }`}
          >
            <Paperclip className="w-3.5 h-3.5" />
            <span>
              {note.sources?.length || 0} {note.sources?.length === 1 ? 'Class File' : 'Class Files'}
            </span>
            <ChevronDown
              className={`w-3 h-3 transition-transform ${showSourcesPanel ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Property 3: Word Count & Read Time */}
          <div className="flex items-center gap-2 text-slate-400 dark:text-[#9aa0a6] text-[11px] hidden md:flex">
            <span className="flex items-center gap-1">
              <FileText className="w-3 h-3" />
              {wordCount.toLocaleString()} words
            </span>
            <span>&bull;</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {readingTime} min read
            </span>
          </div>
        </div>

        {/* Collapsible Class & Note File Uploads Panel */}
        {showSourcesPanel && (
          <div className="pt-3 border-t border-slate-100 dark:border-[#26282a] animate-in slide-in-from-top-2 duration-150">
            <SourcesSection
              sources={note.sources || []}
              onUpdateSources={handleUpdateSources}
            />
          </div>
        )}
      </div>

      {/* Notion-Style Full-Width Canvas */}
      <div className="w-full space-y-4">
        <div className="bg-white dark:bg-[#18191b] border border-slate-200 dark:border-[#26282a] rounded-2xl shadow-2xs overflow-hidden flex flex-col">
          {/* Sticky Notion Formatting & View Mode Toolbar */}
          <div className="px-3.5 py-2 bg-slate-50 dark:bg-[#242526] border-b border-slate-200 dark:border-[#26282a] flex items-center justify-between gap-2 flex-wrap">
            {/* Left Toolbar: View Mode Switches */}
            <div className="flex items-center p-0.5 bg-slate-200/80 dark:bg-[#0f0f10] rounded-lg">
              <button
                type="button"
                onClick={() => setViewMode('write')}
                title="Focused note-taking mode"
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer google-btn-press ${
                  viewMode === 'write'
                    ? 'bg-white dark:bg-[#202123] text-blue-700 dark:text-[#8ab4f8] shadow-2xs'
                    : 'text-slate-600 dark:text-[#c4c7c5] hover:text-slate-900 dark:hover:text-[#e8eaed]'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Write</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('split')}
                title="Side-by-side live formatted preview"
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer google-btn-press ${
                  viewMode === 'split'
                    ? 'bg-white dark:bg-[#202123] text-blue-700 dark:text-[#8ab4f8] shadow-2xs'
                    : 'text-slate-600 dark:text-[#c4c7c5] hover:text-slate-900 dark:hover:text-[#e8eaed]'
                }`}
              >
                <Columns className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Split</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('preview')}
                title="Formatted interactive preview"
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer google-btn-press ${
                  viewMode === 'preview'
                    ? 'bg-white dark:bg-[#202123] text-blue-700 dark:text-[#8ab4f8] shadow-2xs'
                    : 'text-slate-600 dark:text-[#c4c7c5] hover:text-slate-900 dark:hover:text-[#e8eaed]'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview</span>
              </button>
            </div>

            {/* Middle Toolbar: Notion Formatting Buttons (Available in write & split) */}
            {viewMode !== 'preview' && (
              <div className="flex items-center gap-1 text-slate-600 dark:text-[#c4c7c5] flex-wrap">
                {/* Headings */}
                <button
                  type="button"
                  onClick={() => handleInsertSnippet('# ', '', 'Heading 1')}
                  title="Heading 1 (# )"
                  className="p-1 hover:bg-slate-200 dark:hover:bg-[#202123] rounded-md transition-colors cursor-pointer text-xs font-bold"
                >
                  H1
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertSnippet('## ', '', 'Heading 2')}
                  title="Heading 2 (## )"
                  className="p-1 hover:bg-slate-200 dark:hover:bg-[#202123] rounded-md transition-colors cursor-pointer text-xs font-bold"
                >
                  H2
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertSnippet('### ', '', 'Heading 3')}
                  title="Heading 3 (### )"
                  className="p-1 hover:bg-slate-200 dark:hover:bg-[#202123] rounded-md transition-colors cursor-pointer text-xs font-bold"
                >
                  H3
                </button>

                <div className="w-[1px] h-4 bg-slate-200 dark:bg-[#26282a] mx-0.5" />

                {/* Bold, Italic, Strikethrough, Code */}
                <button
                  type="button"
                  onClick={() => handleInsertSnippet('**', '**', 'bold text')}
                  title="Bold (**text**)"
                  className="p-1 hover:bg-slate-200 dark:hover:bg-[#202123] rounded-md transition-colors cursor-pointer"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertSnippet('*', '*', 'italic text')}
                  title="Italic (*text*)"
                  className="p-1 hover:bg-slate-200 dark:hover:bg-[#202123] rounded-md transition-colors cursor-pointer"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertSnippet('`', '`', 'code')}
                  title="Inline Code (`code`)"
                  className="p-1 hover:bg-slate-200 dark:hover:bg-[#202123] rounded-md transition-colors cursor-pointer"
                >
                  <Code className="w-3.5 h-3.5" />
                </button>

                <div className="w-[1px] h-4 bg-slate-200 dark:bg-[#26282a] mx-0.5" />

                {/* Bullet list, Numbered list, Todo Checklist */}
                <button
                  type="button"
                  onClick={() => handleInsertSnippet('- ', '', 'Bullet point')}
                  title="Bullet List (- )"
                  className="p-1 hover:bg-slate-200 dark:hover:bg-[#202123] rounded-md transition-colors cursor-pointer"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertSnippet('1. ', '', 'Numbered point')}
                  title="Numbered List (1. )"
                  className="p-1 hover:bg-slate-200 dark:hover:bg-[#202123] rounded-md transition-colors cursor-pointer"
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertSnippet('- [ ] ', '', 'Checklist task')}
                  title="Notion Checklist (- [ ] )"
                  className="p-1 hover:bg-blue-100 dark:hover:bg-blue-950/40 text-blue-700 dark:text-[#8ab4f8] rounded-md transition-colors cursor-pointer"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                </button>

                <div className="w-[1px] h-4 bg-slate-200 dark:bg-[#26282a] mx-0.5" />

                {/* Notion Callout & LaTeX */}
                <button
                  type="button"
                  onClick={() =>
                    handleInsertSnippet('> 💡 **Key Concept**: ', '\n', 'Important definition or takeaway')
                  }
                  title="Notion Callout Box (> 💡 )"
                  className="p-1 hover:bg-amber-100 dark:hover:bg-amber-950/40 text-amber-700 dark:text-amber-400 rounded-md transition-colors cursor-pointer"
                >
                  <Lightbulb className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertSnippet('$$', '$$', 'E = mc^2')}
                  title="KaTeX Math Formula ($$formula$$)"
                  className="flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-[#8ab4f8] hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-md text-[11px] font-bold border border-blue-200 dark:border-blue-800/40 cursor-pointer"
                >
                  <Sigma className="w-3 h-3" />
                  <span>$Math$</span>
                </button>
              </div>
            )}
          </div>

          {/* Editor Canvas: Write, Split, or Preview */}
          {viewMode === 'write' ? (
            <div className="p-4 sm:p-7 min-h-[460px] flex flex-col">
              <textarea
                ref={textareaRef}
                id="note-editor-textarea"
                rows={22}
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                onBlur={handleContentBlur}
                onKeyDown={handleKeyDown}
                placeholder="Type your notes naturally... Hit Enter on bullets or checkboxes (- [ ]) for automatic continuation, or write formulas like $E=mc^2$ or $$\text{PED}=\frac{\%\Delta Q}{\%\Delta P}$$."
                className="w-full flex-1 text-sm sm:text-base font-sans text-slate-800 dark:text-[#e8eaed] placeholder-slate-400 dark:placeholder-[#5f6368] focus:outline-hidden resize-y min-h-[420px] leading-relaxed bg-transparent"
              />
            </div>
          ) : viewMode === 'split' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-[#26282a] min-h-[460px]">
              {/* Left Split: Editor */}
              <div className="p-4 sm:p-5 flex flex-col min-w-0">
                <textarea
                  ref={textareaRef}
                  rows={22}
                  value={content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  onBlur={handleContentBlur}
                  onKeyDown={handleKeyDown}
                  placeholder="Type notes on left, see live render on right..."
                  className="w-full flex-1 text-xs sm:text-sm font-mono text-slate-800 dark:text-[#e8eaed] placeholder-slate-400 dark:placeholder-[#5f6368] focus:outline-hidden resize-none min-h-[420px] leading-relaxed bg-transparent"
                />
              </div>
              {/* Right Split: Live KaTeX & Markdown Rendering */}
              <div className="p-4 sm:p-6 overflow-y-auto bg-[#FAFBFD] dark:bg-[#0f0f10] min-h-[420px] min-w-0">
                {content.trim() ? (
                  <MarkdownRenderer content={content} />
                ) : (
                  <p className="text-xs text-slate-400 dark:text-[#9aa0a6] italic">Live preview will appear here...</p>
                )}
              </div>
            </div>
          ) : (
            <div className="p-6 sm:p-8 min-h-[460px] overflow-y-auto bg-[#FAFBFD] dark:bg-[#0f0f10]">
              {content.trim() ? (
                <MarkdownRenderer content={content} />
              ) : (
                <p className="text-xs text-slate-400 dark:text-[#9aa0a6] italic">
                  Nothing typed yet. Switch back to Write mode to take notes.
                </p>
              )}
            </div>
          )}

          {/* Bottom Editor Bar */}
          <div className="px-4 py-2 bg-slate-50 dark:bg-[#242526] border-t border-slate-100 dark:border-[#26282a] flex items-center justify-between text-[11px] text-slate-400 dark:text-[#9aa0a6]">
            <span className="flex items-center gap-1.5">
              <span>Tab = Indent</span>
              <span>&bull;</span>
              <span>Enter = Auto List</span>
              <span>&bull;</span>
              <span>KaTeX ($...$) Supported</span>
            </span>
            <span>Notion-Style Canvas</span>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ModalPortal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        maxWidth="max-w-md"
        className="p-6 text-center"
      >
        <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-3">
          <Trash2 className="w-6 h-6 stroke-[2.2]" />
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-[#e8eaed]" style={{ fontFamily: "'Google Sans', sans-serif" }}>
          Delete this note?
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-[#9aa0a6] mt-1.5 leading-relaxed">
          Are you sure you want to delete <span className="font-bold text-slate-800 dark:text-[#e8eaed]">"{note.title}"</span>? This will permanently remove its notes and attached class files.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(false)}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 dark:text-[#c4c7c5] hover:bg-slate-100 dark:hover:bg-[#202123] rounded-xl cursor-pointer google-btn-press"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onDeleteNote(note.id);
              onBack();
            }}
            className="px-5 py-2 text-xs sm:text-sm font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs cursor-pointer google-btn-press"
          >
            Delete Note
          </button>
        </div>
      </ModalPortal>
    </div>
  );
};
