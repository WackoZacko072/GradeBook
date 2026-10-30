import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Sparkles,
  FileText,
  BookOpen,
  Lightbulb,
  BookMarked,
  Layers,
  HelpCircle,
  MessageSquare,
  Send,
  RotateCw,
  Copy,
  Check,
  Trash2,
  Presentation,
  File,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import type { NoteSource, SourceChatMessage } from '../../types/notebook';
import type { ClassItem } from '../../types/grade';
import { generateSourceSummary, askQuestionAboutSource } from '../../utils/notebookAiService';
import { MarkdownRenderer } from '../MarkdownRenderer';

interface SourceSummarizerViewProps {
  source: NoteSource;
  classes: ClassItem[];
  onBack: () => void;
  onUpdateSource: (updated: NoteSource) => void;
  onDeleteSource?: (sourceId: string) => void;
  onOpenCreateSlab: (options: {
    prompt: string;
    type: 'flashcards' | 'mcq' | 'both';
    sourceId: string;
  }) => void;
}

type SummarizerSection = 'summary' | 'concepts' | 'definitions' | 'qa' | 'raw';

export const SourceSummarizerView: React.FC<SourceSummarizerViewProps> = ({
  source,
  classes,
  onBack,
  onUpdateSource,
  onDeleteSource,
  onOpenCreateSlab,
}) => {
  const [activeSection, setActiveSection] = useState<SummarizerSection>('summary');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [copiedContent, setCopiedContent] = useState(false);

  // Document Q&A Chat State
  const [questionInput, setQuestionInput] = useState('');
  const [isAskingQuestion, setIsAskingQuestion] = useState(false);
  const [qaError, setQaError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Automatically generate AI summary if not yet generated for this source
  const autoTriggeredRef = useRef<string | null>(null);

  useEffect(() => {
    if (!source.aiSummary && !isGeneratingSummary && autoTriggeredRef.current !== source.id) {
      autoTriggeredRef.current = source.id;
      handleGenerateSummary();
    }
  }, [source.id, source.aiSummary]);

  // Scroll to bottom of Q&A chat when new messages arrive
  useEffect(() => {
    if (activeSection === 'qa') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [source.chatHistory, isAskingQuestion, activeSection]);

  const handleGenerateSummary = async () => {
    if (isGeneratingSummary) return;
    setIsGeneratingSummary(true);
    setSummaryError(null);

    try {
      const generated = await generateSourceSummary(source);
      onUpdateSource({
        ...source,
        aiSummary: generated,
        lastOpenedAt: Date.now(),
      });
    } catch (err: any) {
      console.error('Error generating source summary:', err);
      setSummaryError(err.message || 'Failed to generate AI summary. Please try again.');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleAskQuestion = async (e?: React.FormEvent, customPrompt?: string) => {
    e?.preventDefault();
    const trimmed = (customPrompt ?? questionInput).trim();
    if (!trimmed || isAskingQuestion) return;

    const userMsg: SourceChatMessage = {
      id: `q_${Date.now()}_user`,
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    };

    const existingHistory = source.chatHistory || [];
    const updatedHistoryWithUser = [...existingHistory, userMsg];

    if (!customPrompt) {
      setQuestionInput('');
    }
    setQaError(null);
    setIsAskingQuestion(true);

    // Optimistically save user question
    onUpdateSource({
      ...source,
      chatHistory: updatedHistoryWithUser,
      lastOpenedAt: Date.now(),
    });

    try {
      const answer = await askQuestionAboutSource(source, trimmed, existingHistory);
      const modelMsg: SourceChatMessage = {
        id: `q_${Date.now()}_model`,
        role: 'model',
        content: answer,
        timestamp: Date.now(),
      };
      onUpdateSource({
        ...source,
        chatHistory: [...updatedHistoryWithUser, modelMsg],
        lastOpenedAt: Date.now(),
      });
    } catch (err: any) {
      console.error('Error asking document question:', err);
      setQaError(err.message || 'Could not reach Gemini AI. Please try again.');
    } finally {
      setIsAskingQuestion(false);
    }
  };

  const handleClearChat = () => {
    onUpdateSource({
      ...source,
      chatHistory: [],
    });
  };

  const handleCopyContent = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedContent(true);
    setTimeout(() => setCopiedContent(false), 2000);
  };

  const assignedClass = classes.find((c) => c.id === source.classId);
  const wordCount =
    source.extractedWordCount || source.content.trim().split(/\s+/).filter(Boolean).length;

  const getSourceBadge = () => {
    const lowerName = source.name.toLowerCase();
    if (source.type === 'slides' || lowerName.includes('slide') || lowerName.includes('lecture')) {
      return {
        label: 'Lecture Slides',
        icon: <Presentation className="w-4 h-4 stroke-[2.2]" />,
        bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200/70 dark:border-amber-800/50',
      };
    }
    if (source.type === 'pdf' || lowerName.endsWith('.pdf')) {
      return {
        label: 'PDF Document',
        icon: <FileText className="w-4 h-4 stroke-[2.2]" />,
        bg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200/70 dark:border-rose-800/50',
      };
    }
    if (source.type === 'text') {
      return {
        label: 'Study Notes',
        icon: <BookOpen className="w-4 h-4 stroke-[2.2]" />,
        bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/70 dark:border-emerald-800/50',
      };
    }
    return {
      label: 'Course File',
      icon: <File className="w-4 h-4 stroke-[2.2]" />,
      bg: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-[#8ab4f8] border-blue-200/70 dark:border-blue-800/50',
    };
  };

  const badge = getSourceBadge();
  const summary = source.aiSummary;
  const chatHistory = source.chatHistory || [];

  const suggestedQuestions = [
    'What are the most likely exam questions from this material?',
    'Explain the hardest concept in simple terms with an example.',
    'Summarize all key formulas or mechanisms mentioned here.',
    'Create a quick 3-question mini check for me right now.',
  ];

  return (
    <div className="space-y-6 animate-fade-scale">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-[#18191b] rounded-3xl p-5 sm:p-7 border border-slate-200/90 dark:border-[#26282a] shadow-xs space-y-5">
        {/* Top Row: Back button + Quick Study Set Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-[#26282a]">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-600 dark:text-[#c4c7c5] hover:text-blue-600 dark:hover:text-[#8ab4f8] transition-colors cursor-pointer w-fit google-btn-press"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          {/* Connect naturally to existing AI Flashcard & Quiz feature */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                onOpenCreateSlab({
                  prompt: `Generate high-yield active recall flashcards covering key concepts and definitions from "${source.name}"`,
                  type: 'flashcards',
                  sourceId: source.id,
                })
              }
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-violet-50 dark:bg-violet-950/40 hover:bg-violet-100 dark:hover:bg-violet-900/50 text-violet-700 dark:text-[#c58af9] border border-violet-200/80 dark:border-violet-800/50 transition-all cursor-pointer google-btn-press shadow-2xs"
            >
              <Layers className="w-3.5 h-3.5 stroke-[2.2]" />
              <span>Generate Flashcards</span>
            </button>

            <button
              type="button"
              onClick={() =>
                onOpenCreateSlab({
                  prompt: `Generate challenging exam-style practice multiple-choice questions (MCQs) from "${source.name}"`,
                  type: 'mcq',
                  sourceId: source.id,
                })
              }
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-50 dark:bg-[#8ab4f8]/15 hover:bg-blue-100 dark:hover:bg-[#8ab4f8]/25 text-blue-700 dark:text-[#8ab4f8] border border-blue-200/80 dark:border-[#8ab4f8]/30 transition-all cursor-pointer google-btn-press shadow-2xs"
            >
              <HelpCircle className="w-3.5 h-3.5 stroke-[2.2]" />
              <span>Generate Practice Quiz</span>
            </button>

            <button
              type="button"
              onClick={() =>
                onOpenCreateSlab({
                  prompt: `Complete study set (Flashcards + Practice Quiz) grounded in "${source.name}"`,
                  type: 'both',
                  sourceId: source.id,
                })
              }
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xs transition-all cursor-pointer google-btn-press"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Full Study Set (Cards + Quiz)</span>
            </button>
          </div>
        </div>

        {/* Title & Metadata */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badge.bg}`}
              >
                {badge.icon}
                <span>{badge.label}</span>
              </span>

              {(assignedClass || source.className) && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-[#26282a] text-slate-700 dark:text-[#e8eaed]">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: assignedClass?.color || '#2563EB' }}
                  />
                  <span>{assignedClass?.name || source.className}</span>
                </span>
              )}

              <span className="text-xs text-slate-400 dark:text-[#9aa0a6] font-medium">
                {wordCount.toLocaleString()} words
                {source.fileSize ? ` • ${source.fileSize}` : ''}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-[#e8eaed] tracking-tight break-words">
              {source.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-[#9aa0a6]">
              AI Notes & Lecture Summarizer — Concise summaries, important concepts, key definitions, and interactive document Q&A
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto flex-shrink-0">
            <button
              type="button"
              disabled={isGeneratingSummary}
              onClick={handleGenerateSummary}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-[#e8eaed] bg-slate-100 dark:bg-[#202123] hover:bg-slate-200 dark:hover:bg-[#26282a] border border-slate-200/80 dark:border-[#26282a] transition-all cursor-pointer google-btn-press disabled:opacity-50"
              title="Regenerate AI Summary"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isGeneratingSummary ? 'animate-spin text-blue-600' : ''}`} />
              <span>{isGeneratingSummary ? 'Summarizing...' : summary ? 'Regenerate AI Summary' : 'Summarize Now'}</span>
            </button>

            {onDeleteSource && (
              <button
                type="button"
                onClick={() => onDeleteSource(source.id)}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                title="Delete Source"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Navigation Pills */}
        <div
          role="tablist"
          aria-label="AI Summarizer Sections"
          className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5 no-scrollbar"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeSection === 'summary'}
            onClick={() => setActiveSection('summary')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex-shrink-0 google-btn-press ${
              activeSection === 'summary'
                ? 'bg-blue-600 dark:bg-[#8ab4f8] text-white dark:text-[#0f0f10] shadow-xs'
                : 'bg-slate-100/80 dark:bg-[#202123] text-slate-600 dark:text-[#c4c7c5] hover:bg-slate-200/70 dark:hover:bg-[#26282a]'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Concise Summary</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeSection === 'concepts'}
            onClick={() => setActiveSection('concepts')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex-shrink-0 google-btn-press ${
              activeSection === 'concepts'
                ? 'bg-blue-600 dark:bg-[#8ab4f8] text-white dark:text-[#0f0f10] shadow-xs'
                : 'bg-slate-100/80 dark:bg-[#202123] text-slate-600 dark:text-[#c4c7c5] hover:bg-slate-200/70 dark:hover:bg-[#26282a]'
            }`}
          >
            <Lightbulb className="w-4 h-4" />
            <span>Important Concepts</span>
            {summary?.importantConcepts && summary.importantConcepts.length > 0 && (
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded-full ${
                  activeSection === 'concepts'
                    ? 'bg-white/20 text-current'
                    : 'bg-slate-200 dark:bg-[#26282a] text-slate-600 dark:text-[#9aa0a6]'
                }`}
              >
                {summary.importantConcepts.length}
              </span>
            )}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeSection === 'definitions'}
            onClick={() => setActiveSection('definitions')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex-shrink-0 google-btn-press ${
              activeSection === 'definitions'
                ? 'bg-blue-600 dark:bg-[#8ab4f8] text-white dark:text-[#0f0f10] shadow-xs'
                : 'bg-slate-100/80 dark:bg-[#202123] text-slate-600 dark:text-[#c4c7c5] hover:bg-slate-200/70 dark:hover:bg-[#26282a]'
            }`}
          >
            <BookMarked className="w-4 h-4" />
            <span>Key Definitions</span>
            {summary?.keyDefinitions && summary.keyDefinitions.length > 0 && (
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded-full ${
                  activeSection === 'definitions'
                    ? 'bg-white/20 text-current'
                    : 'bg-slate-200 dark:bg-[#26282a] text-slate-600 dark:text-[#9aa0a6]'
                }`}
              >
                {summary.keyDefinitions.length}
              </span>
            )}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeSection === 'qa'}
            onClick={() => setActiveSection('qa')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex-shrink-0 google-btn-press ${
              activeSection === 'qa'
                ? 'bg-blue-600 dark:bg-[#8ab4f8] text-white dark:text-[#0f0f10] shadow-xs'
                : 'bg-slate-100/80 dark:bg-[#202123] text-slate-600 dark:text-[#c4c7c5] hover:bg-slate-200/70 dark:hover:bg-[#26282a]'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Ask Questions</span>
            {chatHistory.length > 0 && (
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded-full ${
                  activeSection === 'qa'
                    ? 'bg-white/20 text-current'
                    : 'bg-slate-200 dark:bg-[#26282a] text-slate-600 dark:text-[#9aa0a6]'
                }`}
              >
                {chatHistory.length}
              </span>
            )}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeSection === 'raw'}
            onClick={() => setActiveSection('raw')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex-shrink-0 google-btn-press ${
              activeSection === 'raw'
                ? 'bg-blue-600 dark:bg-[#8ab4f8] text-white dark:text-[#0f0f10] shadow-xs'
                : 'bg-slate-100/80 dark:bg-[#202123] text-slate-600 dark:text-[#c4c7c5] hover:bg-slate-200/70 dark:hover:bg-[#26282a]'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Original Source</span>
          </button>
        </div>
      </div>

      {/* Error State Banner */}
      {summaryError && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 rounded-2xl flex items-center justify-between gap-4 text-xs sm:text-sm text-rose-800 dark:text-rose-300">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span>{summaryError}</span>
          </div>
          <button
            type="button"
            onClick={handleGenerateSummary}
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs cursor-pointer flex-shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton when Generating Summary */}
      {isGeneratingSummary && !summary && (
        <div className="bg-white dark:bg-[#18191b] rounded-3xl p-8 sm:p-12 border border-slate-200/90 dark:border-[#26282a] shadow-xs text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-[#8ab4f8]/15 text-blue-600 dark:text-[#8ab4f8] flex items-center justify-center mx-auto">
            <div className="w-6 h-6 rounded-full border-3 border-current border-t-transparent animate-spin" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-[#e8eaed]">
              Analyzing "{source.name}"...
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-[#9aa0a6]">
              Gemini is generating a concise summary, extracting important concepts, and identifying key definitions from your material.
            </p>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 1: CONCISE SUMMARY & KEY TAKEAWAYS                              */}
      {/* =================================================================== */}
      {activeSection === 'summary' && summary && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-scale">
          {/* Left 2 Columns: Executive Summary + Takeaways */}
          <div className="lg:col-span-2 space-y-6">
            {/* Executive Summary Card */}
            <div className="bg-white dark:bg-[#18191b] rounded-3xl p-6 sm:p-8 border border-slate-200/90 dark:border-[#26282a] shadow-xs space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-[#8ab4f8]/15 text-blue-600 dark:text-[#8ab4f8] flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-[#e8eaed]">
                      Concise Lecture & Note Summary
                    </h2>
                    <p className="text-xs text-slate-400 dark:text-[#9aa0a6]">
                      Synthesized directly from your uploaded document
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopyContent(summary.conciseSummary)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-[#202123] hover:bg-slate-200 dark:hover:bg-[#26282a] text-slate-700 dark:text-[#e8eaed] transition-colors cursor-pointer"
                >
                  {copiedContent ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedContent ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="text-sm sm:text-base leading-relaxed text-slate-700 dark:text-[#e8eaed] pt-2 border-t border-slate-100 dark:border-[#26282a]">
                <MarkdownRenderer content={summary.conciseSummary} />
              </div>
            </div>

            {/* Key Takeaways List */}
            {summary.keyTakeaways.length > 0 && (
              <div className="bg-white dark:bg-[#18191b] rounded-3xl p-6 sm:p-8 border border-slate-200/90 dark:border-[#26282a] shadow-xs space-y-4">
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-[#e8eaed] flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 dark:bg-[#8ab4f8]" />
                  <span>High-Yield Takeaways</span>
                </h3>

                <div className="space-y-3">
                  {summary.keyTakeaways.map((point, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3.5 p-4 rounded-2xl bg-slate-50/80 dark:bg-[#202123] border border-slate-100 dark:border-[#26282a]"
                    >
                      <span className="w-6 h-6 rounded-lg bg-blue-600 dark:bg-[#8ab4f8] text-white dark:text-[#0f0f10] font-extrabold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div className="text-xs sm:text-sm text-slate-800 dark:text-[#e8eaed] leading-relaxed flex-1">
                        <MarkdownRenderer content={point} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Quick Overview & Study Actions */}
          <div className="space-y-5">
            {/* Connect to Flashcards & Quizzes Card */}
            <div className="bg-gradient-to-br from-[#2052DE] via-[#2563EB] to-[#1D4ED8] dark:from-[#1e3a8a] dark:via-[#2563eb] dark:to-[#1e40af] text-white rounded-3xl p-6 shadow-xs space-y-4">
              <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center">
                <Layers className="w-6 h-6 text-white" />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-200">
                  Connected Study Engine
                </span>
                <h3 className="text-lg font-extrabold tracking-tight">
                  Turn This Material Into Active Recall
                </h3>
                <p className="text-xs text-blue-100/90 leading-relaxed">
                  Instantly generate interactive flashcards and multiple-choice quizzes directly from "{source.name}".
                </p>
              </div>

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() =>
                    onOpenCreateSlab({
                      prompt: `Create flashcards covering all key concepts and definitions from "${source.name}"`,
                      type: 'flashcards',
                      sourceId: source.id,
                    })
                  }
                  className="w-full py-2.5 px-4 bg-white text-blue-700 hover:bg-blue-50 font-bold text-xs rounded-xl shadow-xs flex items-center justify-between cursor-pointer transition-all google-btn-press"
                >
                  <span className="flex items-center gap-2">
                    <Layers className="w-4 h-4" />
                    <span>Create Flashcard Deck</span>
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onOpenCreateSlab({
                      prompt: `Create a practice multiple-choice quiz testing concepts from "${source.name}"`,
                      type: 'mcq',
                      sourceId: source.id,
                    })
                  }
                  className="w-full py-2.5 px-4 bg-white/15 hover:bg-white/25 text-white font-bold text-xs rounded-xl border border-white/20 flex items-center justify-between cursor-pointer transition-all google-btn-press"
                >
                  <span className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4" />
                    <span>Create Practice Quiz (MCQs)</span>
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Counts Preview Card */}
            <div className="bg-white dark:bg-[#18191b] rounded-3xl p-6 border border-slate-200/90 dark:border-[#26282a] shadow-xs space-y-4">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-[#e8eaed]">
                Extracted Study Breakdown
              </h3>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => setActiveSection('concepts')}
                  className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-[#202123] hover:bg-blue-50/60 dark:hover:bg-[#26282a] border border-slate-200/70 dark:border-[#26282a] flex items-center justify-between transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                      <Lightbulb className="w-4 h-4 stroke-[2.2]" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-[#e8eaed]">
                        Important Concepts
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-[#9aa0a6]">
                        Core mechanisms & formulas
                      </div>
                    </div>
                  </div>
                  <span className="text-sm font-extrabold text-blue-600 dark:text-[#8ab4f8]">
                    {summary.importantConcepts.length} →
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSection('definitions')}
                  className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-[#202123] hover:bg-blue-50/60 dark:hover:bg-[#26282a] border border-slate-200/70 dark:border-[#26282a] flex items-center justify-between transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <BookMarked className="w-4 h-4 stroke-[2.2]" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-[#e8eaed]">
                        Key Definitions
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-[#9aa0a6]">
                        Essential exam terminology
                      </div>
                    </div>
                  </div>
                  <span className="text-sm font-extrabold text-blue-600 dark:text-[#8ab4f8]">
                    {summary.keyDefinitions.length} →
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSection('qa')}
                  className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-[#202123] hover:bg-blue-50/60 dark:hover:bg-[#26282a] border border-slate-200/70 dark:border-[#26282a] flex items-center justify-between transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-[#c58af9] flex items-center justify-center">
                      <MessageSquare className="w-4 h-4 stroke-[2.2]" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-[#e8eaed]">
                        Ask Questions
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-[#9aa0a6]">
                        Interactive Q&A with this file
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-blue-600 dark:text-[#8ab4f8]">
                    Open →
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: IMPORTANT CONCEPTS                                           */}
      {/* =================================================================== */}
      {activeSection === 'concepts' && summary && (
        <div className="space-y-4 animate-fade-scale">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-[#e8eaed]">
                Important Concepts ({summary.importantConcepts.length})
              </h2>
              <p className="text-xs text-slate-500 dark:text-[#9aa0a6]">
                Core theories, mechanisms, and principles extracted from "{source.name}"
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                onOpenCreateSlab({
                  prompt: `Focus on the important concepts and mechanisms from "${source.name}"`,
                  type: 'mcq',
                  sourceId: source.id,
                })
              }
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer self-start sm:self-auto google-btn-press"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Quiz Me on These Concepts</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {summary.importantConcepts.map((concept, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-[#18191b] rounded-3xl p-6 border border-slate-200/90 dark:border-[#26282a] shadow-xs flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-extrabold text-xs flex items-center justify-center flex-shrink-0 border border-amber-200/60 dark:border-amber-800/40">
                      {idx + 1}
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-[#e8eaed]">
                      {concept.title}
                    </h3>
                  </div>

                  <div className="text-xs sm:text-sm text-slate-700 dark:text-[#c4c7c5] leading-relaxed">
                    <MarkdownRenderer content={concept.explanation} />
                  </div>
                </div>

                {concept.formulaOrExample && (
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#202123] border border-slate-200/70 dark:border-[#26282a] text-xs text-slate-800 dark:text-[#e8eaed]">
                    <span className="block text-[10px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-[#8ab4f8] mb-1">
                      Formula / Concrete Example
                    </span>
                    <MarkdownRenderer content={concept.formulaOrExample} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: KEY DEFINITIONS                                              */}
      {/* =================================================================== */}
      {activeSection === 'definitions' && summary && (
        <div className="space-y-4 animate-fade-scale">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-[#e8eaed]">
                Key Definitions ({summary.keyDefinitions.length})
              </h2>
              <p className="text-xs text-slate-500 dark:text-[#9aa0a6]">
                Essential terminology and vocabulary identified in "{source.name}"
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                onOpenCreateSlab({
                  prompt: `Create active recall flashcards for all key definitions and terminology in "${source.name}"`,
                  type: 'flashcards',
                  sourceId: source.id,
                })
              }
              className="px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer self-start sm:self-auto google-btn-press"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Turn Definitions into Flashcards</span>
            </button>
          </div>

          <div className="bg-white dark:bg-[#18191b] rounded-3xl border border-slate-200/90 dark:border-[#26282a] overflow-hidden shadow-xs divide-y divide-slate-100 dark:divide-[#26282a]">
            {summary.keyDefinitions.map((item, idx) => (
              <div
                key={idx}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-6 hover:bg-slate-50/70 dark:hover:bg-[#202123] transition-colors"
              >
                <div className="sm:w-64 flex-shrink-0">
                  <span className="text-sm font-extrabold text-slate-900 dark:text-[#e8eaed]">
                    {item.term}
                  </span>
                </div>
                <div className="flex-1 text-xs sm:text-sm text-slate-600 dark:text-[#c4c7c5] leading-relaxed">
                  <MarkdownRenderer content={item.definition} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 4: ASK QUESTIONS ABOUT THIS DOCUMENT                            */}
      {/* =================================================================== */}
      {activeSection === 'qa' && (
        <div className="bg-white dark:bg-[#18191b] rounded-3xl border border-slate-200/90 dark:border-[#26282a] shadow-xs overflow-hidden flex flex-col min-h-[520px] max-h-[720px] animate-fade-scale">
          {/* Chat Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-[#26282a] flex items-center justify-between bg-slate-50/60 dark:bg-[#202123]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-[#8ab4f8]/15 text-blue-600 dark:text-[#8ab4f8] flex items-center justify-center">
                <MessageSquare className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-[#e8eaed]">
                  Ask Questions About "{source.name}"
                </h2>
                <p className="text-xs text-slate-500 dark:text-[#9aa0a6]">
                  Answers are grounded directly in your uploaded slides, PDF, or notes
                </p>
              </div>
            </div>

            {chatHistory.length > 0 && (
              <button
                type="button"
                onClick={handleClearChat}
                className="text-xs font-semibold text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                Clear Q&A
              </button>
            )}
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {chatHistory.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-8 space-y-5">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-[#8ab4f8]/15 text-blue-600 dark:text-[#8ab4f8] flex items-center justify-center">
                  <Sparkles className="w-7 h-7" />
                </div>
                <div className="max-w-md space-y-1">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-[#e8eaed]">
                    Ask anything about this document
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-[#9aa0a6]">
                    Need clarification on a slide, a step-by-step derivation, or practice questions from a specific section? Ask below:
                  </p>
                </div>

                {/* Suggested Prompt Chips */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-2xl w-full pt-2">
                  {suggestedQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleAskQuestion(undefined, q)}
                      className="text-left p-3.5 rounded-2xl bg-slate-50 dark:bg-[#202123] hover:bg-blue-50 dark:hover:bg-[#26282a] border border-slate-200/80 dark:border-[#26282a] text-xs font-semibold text-slate-700 dark:text-[#e8eaed] transition-all cursor-pointer google-btn-press"
                    >
                      "{q}"
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              chatHistory.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white font-medium rounded-br-xs'
                        : 'bg-slate-100 dark:bg-[#202123] text-slate-800 dark:text-[#e8eaed] border border-slate-200/70 dark:border-[#26282a] rounded-bl-xs'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    ) : (
                      <MarkdownRenderer content={msg.content} />
                    )}
                  </div>
                </div>
              ))
            )}

            {isAskingQuestion && (
              <div className="flex justify-start">
                <div className="bg-slate-100 dark:bg-[#202123] border border-slate-200/70 dark:border-[#26282a] rounded-2xl px-4 py-3 text-xs text-slate-500 dark:text-[#9aa0a6] flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                  <span>Reading "{source.name}" and formulating answer...</span>
                </div>
              </div>
            )}

            {qaError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 rounded-xl text-xs text-rose-700 dark:text-rose-300">
                {qaError}
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => handleAskQuestion(e)}
            className="p-3.5 sm:p-4 border-t border-slate-100 dark:border-[#26282a] bg-slate-50/60 dark:bg-[#202123] flex items-center gap-2.5"
          >
            <input
              type="text"
              value={questionInput}
              onChange={(e) => setQuestionInput(e.target.value)}
              disabled={isAskingQuestion}
              placeholder={`Ask a question about ${source.name}...`}
              className="flex-1 text-xs sm:text-sm px-4 py-3 bg-white dark:bg-[#131314] border border-slate-200 dark:border-[#26282a] rounded-xl text-slate-900 dark:text-[#e8eaed] placeholder-slate-400 dark:placeholder-[#5f6368] focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={!questionInput.trim() || isAskingQuestion}
              className="px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer google-btn-press"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Ask</span>
            </button>
          </form>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 5: ORIGINAL SOURCE CONTENT                                      */}
      {/* =================================================================== */}
      {activeSection === 'raw' && (
        <div className="bg-white dark:bg-[#18191b] rounded-3xl p-6 sm:p-8 border border-slate-200/90 dark:border-[#26282a] shadow-xs space-y-4 animate-fade-scale">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-[#e8eaed]">
                Extracted Document Text
              </h2>
              <p className="text-xs text-slate-500 dark:text-[#9aa0a6]">
                {wordCount.toLocaleString()} words extracted from {source.name}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleCopyContent(source.content)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-[#202123] hover:bg-slate-200 dark:hover:bg-[#26282a] text-slate-700 dark:text-[#e8eaed] cursor-pointer"
            >
              {copiedContent ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedContent ? 'Copied!' : 'Copy Full Text'}</span>
            </button>
          </div>

          <div className="p-4 sm:p-6 rounded-2xl bg-slate-50 dark:bg-[#0f0f10] border border-slate-200/70 dark:border-[#26282a] max-h-[540px] overflow-y-auto font-mono text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-[#e8eaed] whitespace-pre-wrap select-text">
            {source.content}
          </div>
        </div>
      )}
    </div>
  );
};
