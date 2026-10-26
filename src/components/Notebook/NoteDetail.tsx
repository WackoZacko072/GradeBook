import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Trash2,
  Check,
  HelpCircle,
  Layers,
  Sparkles,
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
  LayoutTemplate,
} from 'lucide-react';
import type {
  NoteItem,
  NoteSource,
  MultipleChoiceQuestion,
  LongAnswerQuestion,
  FlashcardItem,
} from '../../types/notebook';
import type { ClassItem } from '../../types/grade';
import { MarkdownRenderer } from '../MarkdownRenderer';
import { SourcesSection } from './SourcesSection';
import { QuestionBankView } from './QuestionBankView';
import { FlashcardsView } from './FlashcardsView';

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
  const [studyTab, setStudyTab] = useState<'questions' | 'flashcards'>('questions');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
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

  // Insert Notion-style templates
  const handleInsertTemplate = (templateType: 'cornell' | 'lecture' | 'exam' | 'analysis') => {
    setIsTemplatesOpen(false);
    let templateText = '';

    if (templateType === 'lecture') {
      templateText = `\n\n## 🎯 Key Objectives
- [ ] Understand the primary thesis & core definitions
- [ ] Master formula derivations and boundary conditions

## 📝 Main Lecture Notes
### 1. Fundamental Principles
Enter main points, theorems, and explanations here...

### 2. Equations & Formulas
$$\\text{Formula} = \\text{Variable}_1 \\times \\text{Variable}_2$$

## 💡 Key Takeaway
> 💡 **Core Insight**: Write your 1-2 sentence core conclusion here.

## 📌 Review Questions
- What are the assumptions behind this model?
- How does changing the key parameter alter the final outcome?`;
    } else if (templateType === 'cornell') {
      templateText = `\n\n## ⚖️ Cornell Notes Structure
### Cues & Keywords
- **Topic Keyword 1**: Core definition or prompt
- **Formula Name**: Relevant relationship

### Notes & Derivations
- Detailed explanation of mechanism...
- Step-by-step problem breakdown:
  1. Identify given variables
  2. Set up boundary equation
  3. Solve for target output

## 💡 Summary (In your own words)
> 💡 Write a concise 3-4 sentence summary synthesizing this lecture.`;
    } else if (templateType === 'exam') {
      templateText = `\n\n## 📈 High-Yield Exam Review & Formula Sheet
### 1. Essential Formulas
$$\\text{Equation 1}: x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$

### 2. High-Frequency Exam Traps
> ⚠️ **Common Trap**: Make sure units are consistently converted before substituting into equations.

### 3. Study Checklist
- [ ] Concept definitions memorized
- [ ] Formula derivations practiced
- [ ] Practice MCQs completed with Slate AI
- [ ] 3 past exam problem sets solved`;
    } else if (templateType === 'analysis') {
      templateText = `\n\n## 📊 Analytical & Case Breakdown
### 1. Market / System Dynamics
- **Baseline State**: Equilibrium condition $Q_d = Q_s$
- **Distortion / Intervention**: External shocks, taxes, subsidies, or constraints

### 2. Mathematical Impact
$$\\text{Efficiency Loss} = \\frac{1}{2} \\times \\Delta P \\times \\Delta Q$$

### 3. Policy & Real-World Implication
> 💡 **Takeaway**: Evaluates trade-offs between equity and economic efficiency.`;
    }

    const next = content + templateText;
    handleContentChange(next);
  };

  // Update sources
  const handleUpdateSources = (sources: NoteSource[]) => {
    onUpdateNote({
      ...note,
      sources,
      updatedAt: Date.now(),
    });
  };

  // Update questions
  const handleUpdateQuestions = (
    multipleChoice: MultipleChoiceQuestion[],
    longAnswer: LongAnswerQuestion[]
  ) => {
    onUpdateNote({
      ...note,
      multipleChoice,
      longAnswer,
      updatedAt: Date.now(),
    });
  };

  // Update flashcards
  const handleUpdateFlashcards = (flashcards: FlashcardItem[]) => {
    onUpdateNote({
      ...note,
      flashcards,
      updatedAt: Date.now(),
    });
  };

  const totalQuestions = (note.multipleChoice?.length || 0) + (note.longAnswer?.length || 0);
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  // Find assigned class name
  const currentClass = classes.find((c) => c.id === selectedClassId);

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Navigation & Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/90">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold rounded-xl transition-all cursor-pointer min-h-[36px]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>All Notes</span>
          </button>

          {/* Real-time Save Indicator */}
          <div className="flex items-center gap-1 text-[11px] text-slate-400 pl-1">
            {saveStatus === 'saving' ? (
              <span className="flex items-center gap-1 text-amber-600 font-medium animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Saving...
              </span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-600 font-medium">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
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
              title="Create MCQs or Ask Slate AI about this note"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer min-h-[36px]"
            >
              <Sparkles className="w-3.5 h-3.5 text-white stroke-[2.2]" />
              <span>Ask Slate AI</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            title="Delete this note"
            className="flex items-center gap-1.5 px-3 py-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold transition-all cursor-pointer min-h-[36px]"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Delete</span>
          </button>
        </div>
      </div>

      {/* Notion Page Header Canvas */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-7 shadow-2xs space-y-4">
        {/* Icon & Title Row */}
        <div className="flex items-start gap-3">
          {/* Notion Emoji / Icon Picker */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsIconPickerOpen(!isIconPickerOpen)}
              title="Change note icon"
              className="w-11 h-11 rounded-2xl bg-slate-100 hover:bg-slate-200/80 flex items-center justify-center text-2xl transition-all cursor-pointer select-none border border-slate-200/80"
            >
              {icon}
            </button>

            {isIconPickerOpen && (
              <div className="absolute top-13 left-0 z-30 p-2.5 bg-white border border-slate-200 rounded-2xl shadow-xl flex gap-1.5 flex-wrap w-48 animate-in zoom-in-95 duration-150">
                {NOTE_ICONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleSelectIcon(emoji)}
                    className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-lg cursor-pointer transition-colors"
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
              className="w-full text-2xl sm:text-3xl font-extrabold text-slate-900 bg-transparent border-none outline-hidden tracking-tight placeholder-slate-300 focus:ring-0 leading-tight"
            />
          </div>
        </div>

        {/* Notion Database Properties Bar */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
          {/* Property 1: Class Tag Selector */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400 flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5 text-slate-400" />
              Class:
            </span>
            <select
              value={selectedClassId}
              onChange={(e) => handleClassChange(e.target.value)}
              className="bg-slate-100 hover:bg-slate-200/80 text-slate-800 font-bold px-2.5 py-1 rounded-lg border border-slate-200/80 cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-blue-500"
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
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold border transition-colors cursor-pointer ${
              (note.sources?.length || 0) > 0 || showSourcesPanel
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-slate-100 text-slate-600 border-slate-200/80 hover:bg-slate-200/80'
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
          <div className="flex items-center gap-2 text-slate-400 text-[11px] hidden md:flex">
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

          {/* Property 4: Slate AI Prompt Quick Chip */}
          {onOpenSlateAi && currentClass && (
            <button
              type="button"
              onClick={() => onOpenSlateAi(`Look at my ${currentClass.name} notes and create a mcq`)}
              className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold hover:underline flex items-center gap-1 ml-auto cursor-pointer"
            >
              <Sparkles className="w-3 h-3" />
              Create MCQs for {currentClass.name}
            </button>
          )}
        </div>

        {/* Collapsible Class & Note File Uploads Panel */}
        {showSourcesPanel && (
          <div className="pt-3 border-t border-slate-100 animate-in slide-in-from-top-2 duration-150">
            <SourcesSection
              sources={note.sources || []}
              onUpdateSources={handleUpdateSources}
            />
          </div>
        )}
      </div>

      {/* Main Two-Column Layout (Note Canvas on Left, Study Studio on Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Notion-like Editor (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden flex flex-col">
            {/* Sticky Notion Formatting & View Mode Toolbar */}
            <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 flex-wrap">
              {/* Left Toolbar: View Mode Switches */}
              <div className="flex items-center p-0.5 bg-slate-200/80 rounded-lg">
                <button
                  type="button"
                  onClick={() => setViewMode('write')}
                  title="Focused note-taking mode"
                  className={`flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                    viewMode === 'write'
                      ? 'bg-white text-blue-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Write</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('split')}
                  title="Side-by-side live formatted preview"
                  className={`flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                    viewMode === 'split'
                      ? 'bg-white text-blue-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Columns className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Split</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('preview')}
                  title="Formatted interactive preview"
                  className={`flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                    viewMode === 'preview'
                      ? 'bg-white text-blue-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview</span>
                </button>
              </div>

              {/* Middle Toolbar: Notion Formatting Buttons (Available in write & split) */}
              {viewMode !== 'preview' && (
                <div className="flex items-center gap-1 text-slate-600 flex-wrap">
                  {/* Headings */}
                  <button
                    type="button"
                    onClick={() => handleInsertSnippet('# ', '', 'Heading 1')}
                    title="Heading 1 (# )"
                    className="p-1 hover:bg-slate-200 rounded-md transition-colors cursor-pointer text-xs font-bold"
                  >
                    H1
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertSnippet('## ', '', 'Heading 2')}
                    title="Heading 2 (## )"
                    className="p-1 hover:bg-slate-200 rounded-md transition-colors cursor-pointer text-xs font-bold"
                  >
                    H2
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertSnippet('### ', '', 'Heading 3')}
                    title="Heading 3 (### )"
                    className="p-1 hover:bg-slate-200 rounded-md transition-colors cursor-pointer text-xs font-bold"
                  >
                    H3
                  </button>

                  <div className="w-[1px] h-4 bg-slate-200 mx-0.5" />

                  {/* Bold, Italic, Strikethrough, Code */}
                  <button
                    type="button"
                    onClick={() => handleInsertSnippet('**', '**', 'bold text')}
                    title="Bold (**text**)"
                    className="p-1 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertSnippet('*', '*', 'italic text')}
                    title="Italic (*text*)"
                    className="p-1 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                  >
                    <Italic className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertSnippet('`', '`', 'code')}
                    title="Inline Code (`code`)"
                    className="p-1 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                  >
                    <Code className="w-3.5 h-3.5" />
                  </button>

                  <div className="w-[1px] h-4 bg-slate-200 mx-0.5" />

                  {/* Bullet list, Numbered list, Todo Checklist */}
                  <button
                    type="button"
                    onClick={() => handleInsertSnippet('- ', '', 'Bullet point')}
                    title="Bullet List (- )"
                    className="p-1 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertSnippet('1. ', '', 'Numbered point')}
                    title="Numbered List (1. )"
                    className="p-1 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                  >
                    <ListOrdered className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertSnippet('- [ ] ', '', 'Checklist task')}
                    title="Notion Checklist (- [ ] )"
                    className="p-1 hover:bg-blue-100 text-blue-700 rounded-md transition-colors cursor-pointer"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                  </button>

                  <div className="w-[1px] h-4 bg-slate-200 mx-0.5" />

                  {/* Notion Callout & LaTeX */}
                  <button
                    type="button"
                    onClick={() =>
                      handleInsertSnippet('> 💡 **Key Concept**: ', '\n', 'Important definition or takeaway')
                    }
                    title="Notion Callout Box (> 💡 )"
                    className="p-1 hover:bg-amber-100 text-amber-700 rounded-md transition-colors cursor-pointer"
                  >
                    <Lightbulb className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertSnippet('$$', '$$', 'E = mc^2')}
                    title="KaTeX Math Formula ($$formula$$)"
                    className="flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-md text-[11px] font-bold border border-blue-200 cursor-pointer"
                  >
                    <Sigma className="w-3 h-3" />
                    <span>$Math$</span>
                  </button>
                </div>
              )}

              {/* Right Toolbar: Notion Templates Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsTemplatesOpen(!isTemplatesOpen)}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-md transition-colors cursor-pointer"
                >
                  <LayoutTemplate className="w-3.5 h-3.5 text-blue-600" />
                  <span className="hidden sm:inline">Templates</span>
                  <ChevronDown className="w-3 h-3" />
                </button>

                {isTemplatesOpen && (
                  <div className="absolute right-0 top-8 z-30 w-56 p-1.5 bg-white border border-slate-200 rounded-xl shadow-xl space-y-1 animate-in zoom-in-95 duration-150">
                    <button
                      type="button"
                      onClick={() => handleInsertTemplate('lecture')}
                      className="w-full text-left p-2 hover:bg-blue-50 rounded-lg text-xs transition-colors cursor-pointer"
                    >
                      <div className="font-bold text-slate-800">📚 Lecture Notes</div>
                      <div className="text-[10px] text-slate-400">Objectives, notes & key takeaways</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertTemplate('cornell')}
                      className="w-full text-left p-2 hover:bg-blue-50 rounded-lg text-xs transition-colors cursor-pointer"
                    >
                      <div className="font-bold text-slate-800">⚖️ Cornell Method</div>
                      <div className="text-[10px] text-slate-400">Cues, derivations & summary</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertTemplate('exam')}
                      className="w-full text-left p-2 hover:bg-blue-50 rounded-lg text-xs transition-colors cursor-pointer"
                    >
                      <div className="font-bold text-slate-800">📈 Exam Prep & Formulas</div>
                      <div className="text-[10px] text-slate-400">Formulas, common traps & checklist</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertTemplate('analysis')}
                      className="w-full text-left p-2 hover:bg-blue-50 rounded-lg text-xs transition-colors cursor-pointer"
                    >
                      <div className="font-bold text-slate-800">📊 Analytical & Case Notes</div>
                      <div className="text-[10px] text-slate-400">Market dynamics & equations</div>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Editor Canvas: Write, Split, or Preview */}
            {viewMode === 'write' ? (
              <div className="p-4 sm:p-6 min-h-[420px] flex flex-col">
                <textarea
                  ref={textareaRef}
                  id="note-editor-textarea"
                  rows={20}
                  value={content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  onBlur={handleContentBlur}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your notes naturally... Hit Enter on bullets or checkboxes (- [ ]) for automatic continuation, or write formulas like $E=mc^2$ or $$\\text{PED}=\\frac{\\%\\Delta Q}{\\%\\Delta P}$$."
                  className="w-full flex-1 text-sm sm:text-base font-sans text-slate-800 placeholder-slate-400 focus:outline-hidden resize-y min-h-[380px] leading-relaxed"
                />
              </div>
            ) : viewMode === 'split' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 min-h-[420px]">
                {/* Left Split: Editor */}
                <div className="p-4 flex flex-col">
                  <textarea
                    ref={textareaRef}
                    rows={20}
                    value={content}
                    onChange={(e) => handleContentChange(e.target.value)}
                    onBlur={handleContentBlur}
                    onKeyDown={handleKeyDown}
                    placeholder="Type notes on left, see live render on right..."
                    className="w-full flex-1 text-xs sm:text-sm font-mono text-slate-800 placeholder-slate-400 focus:outline-hidden resize-none leading-relaxed"
                  />
                </div>
                {/* Right Split: Live KaTeX & Markdown Rendering */}
                <div className="p-4 sm:p-5 overflow-y-auto bg-[#FAFBFD] min-h-[380px]">
                  {content.trim() ? (
                    <MarkdownRenderer content={content} />
                  ) : (
                    <p className="text-xs text-slate-400 italic">Live preview will appear here...</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-6 min-h-[420px] overflow-y-auto bg-[#FAFBFD]">
                {content.trim() ? (
                  <MarkdownRenderer content={content} />
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    Nothing typed yet. Switch back to Write mode to take notes.
                  </p>
                )}
              </div>
            )}

            {/* Bottom Editor Bar */}
            <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
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

        {/* Right Column: Study Studio (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
            {/* Study Studio Header & Tabs */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-2xs">
                  <Sparkles className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Study Studio</h3>
                  <p className="text-[10px] text-slate-500">AI-generated from note & sources</p>
                </div>
              </div>

              {/* Tab Switcher: Question Bank vs Flashcards */}
              <div className="flex items-center p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setStudyTab('questions')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    studyTab === 'questions'
                      ? 'bg-white text-blue-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Questions ({totalQuestions})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStudyTab('flashcards')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    studyTab === 'flashcards'
                      ? 'bg-white text-blue-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Flashcards ({note.flashcards?.length || 0})</span>
                </button>
              </div>
            </div>

            {/* Active Study Tool */}
            {studyTab === 'questions' ? (
              <QuestionBankView
                noteTitle={note.title}
                noteContent={note.content}
                sources={note.sources || []}
                multipleChoice={note.multipleChoice || []}
                longAnswer={note.longAnswer || []}
                onUpdateQuestions={handleUpdateQuestions}
              />
            ) : (
              <FlashcardsView
                noteTitle={note.title}
                noteContent={note.content}
                sources={note.sources || []}
                flashcards={note.flashcards || []}
                onUpdateFlashcards={handleUpdateFlashcards}
              />
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs"
            onClick={() => setIsDeleteModalOpen(false)}
          />
          <div className="relative bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 z-10 animate-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900">Delete this note?</h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Are you sure you want to delete <span className="font-bold text-slate-800">"{note.title}"</span>? This will permanently remove its notes, sources, question bank, and flashcards.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteNote(note.id);
                  onBack();
                }}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs cursor-pointer"
              >
                Delete Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
