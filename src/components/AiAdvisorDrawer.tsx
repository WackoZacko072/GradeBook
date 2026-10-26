import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Sparkles,
  Send,
  Trash2,
  User,
  AlertCircle,
  Copy,
  Check,
  BookMarked,
  Layers,
  Plus,
  Compass,
} from 'lucide-react';
import type { ClassItem } from '../types/grade';
import type { NoteItem } from '../types/notebook';
import {
  sendSlateAiMessage,
  type ChatMessage,
} from '../utils/aiAdvisorService';
import { MarkdownRenderer } from './MarkdownRenderer';

interface AiAdvisorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  classes: ClassItem[];
  notes?: NoteItem[];
  prefilledPrompt?: string;
  onClearPrefilledPrompt?: () => void;
}

interface StarterPromptCategory {
  title: string;
  items: {
    icon: string;
    label: string;
    prompt: string;
  }[];
}

const STARTER_CATEGORIES: StarterPromptCategory[] = [
  {
    title: '📝 Quizzes & MCQ Generation',
    items: [
      {
        icon: '📝',
        label: 'Look at my Economics notes and create a mcq',
        prompt:
          'Look at my Economics notes (and any attached course files) and create a 5-question multiple choice quiz with answers and clear explanations.',
      },
      {
        icon: '📐',
        label: 'Quiz me on my hardest course formulas',
        prompt:
          'Find my course with the lowest grade or steepest curve. Extract its key formulas and create a 4-question conceptual quiz testing my retention.',
      },
    ],
  },
  {
    title: '🎓 University Admissions & Roadmap',
    items: [
      {
        icon: '🎓',
        label: 'What universities can I get with my grades?',
        prompt:
          'Analyze my current GradeSlate GPA and course marks. What universities and programs (e.g., UBC, U of T, McGill, Waterloo, US Top 30/50) can I get into with my grades, and what are my admission odds?',
      },
      {
        icon: '🏛️',
        label: 'Competitive admission profile breakdown',
        prompt:
          'Evaluate my GPA against top-tier engineering and business admission averages. Where are my application weak points, and what courses should I prioritize raising?',
      },
    ],
  },
  {
    title: '📈 Grade Strategy & Optimization',
    items: [
      {
        icon: '💡',
        label: 'How can I raise my lowest grade to an A?',
        prompt:
          'Look at my lowest performing class. What specific assignments or categories are pulling me down, and what is the exact mathematical path to raise it to an A?',
      },
      {
        icon: '🎯',
        label: 'What do I need on my finals for my target GPA?',
        prompt:
          'Calculate what scores I need on all remaining upcoming assignments and final exams to achieve my target grade in each course and hit a competitive GPA.',
      },
    ],
  },
  {
    title: '🧠 Study Tools & Flashcards',
    items: [
      {
        icon: '🧠',
        label: 'Generate Flashcards from my Notes',
        prompt:
          'Scan my notes library and generate 5 high-yield study flashcards with front prompt and back explanation for my upcoming tests.',
      },
      {
        icon: '⚡',
        label: 'Scan notes for high-frequency exam traps',
        prompt:
          'Analyze my notes and syllabus files. Identify the 3 most common misconceptions or exam traps students make in these topics.',
      },
    ],
  },
];

// Flat list for quick reference
const ALL_STARTERS = STARTER_CATEGORIES.flatMap((c) => c.items);

const LOCAL_CHAT_HISTORY_KEY = 'gradeslate_slate_ai_chat_v1';

export const AiAdvisorDrawer: React.FC<AiAdvisorDrawerProps> = ({
  isOpen,
  onClose,
  classes,
  notes = [],
  prefilledPrompt,
  onClearPrefilledPrompt,
}) => {
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);

  // Load chat history from localStorage
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_CHAT_HISTORY_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Save chat history
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_CHAT_HISTORY_KEY, JSON.stringify(messages));
    } catch {
      // ignore
    }
  }, [messages]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen]);

  // Handle prefilled prompt from other components
  useEffect(() => {
    if (prefilledPrompt && isOpen) {
      setInputPrompt(prefilledPrompt);
      if (onClearPrefilledPrompt) onClearPrefilledPrompt();
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [prefilledPrompt, isOpen, onClearPrefilledPrompt]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleClearHistory = () => {
    if (confirm('Clear advisor chat history?')) {
      setMessages([]);
      localStorage.removeItem(LOCAL_CHAT_HISTORY_KEY);
    }
  };

  const handleSend = async (textToSend?: string) => {
    const prompt = (textToSend || inputPrompt).trim();
    if (!prompt || isLoading) return;

    const userMessage: ChatMessage = {
      id: 'msg_' + Date.now(),
      role: 'user',
      content: prompt,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputPrompt('');
    setIsLoading(true);
    setErrorBanner(null);
    setIsSidebarOpenMobile(false);

    try {
      const reply = await sendSlateAiMessage(prompt, messages, classes, notes);
      const aiMessage: ChatMessage = {
        id: 'msg_' + (Date.now() + 1),
        role: 'model',
        content: reply,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (err: any) {
      console.error('Slate AI error:', err);
      let msg = err.message || 'Failed to generate response. Please try again.';
      if (msg === 'QUOTA_EXCEEDED') {
        msg = 'Gemini API rate limit reached. Please wait a few seconds and try again.';
      } else if (msg === 'INVALID_API_KEY') {
        msg = 'Gemini API key is invalid or expired.';
      }
      setErrorBanner(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#FAFBFD] flex flex-col overflow-hidden animate-in fade-in duration-200">
      {/* Full-Screen Top Navigation Bar */}
      <header className="h-16 px-4 sm:px-6 bg-white border-b border-slate-200/90 flex items-center justify-between flex-shrink-0 z-20 shadow-2xs">
        {/* Left: Branding & Status */}
        <div className="flex items-center gap-3">
          {/* Mobile Sidebar Toggle */}
          <button
            type="button"
            onClick={() => setIsSidebarOpenMobile(!isSidebarOpenMobile)}
            className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Toggle Prompts & Grounding"
            aria-label="Toggle Prompts & Grounding"
          >
            <Compass className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5 select-none">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-xs flex-shrink-0">
              <Sparkles className="w-4 h-4 text-white stroke-[2.4]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base text-slate-900 tracking-tight">
                  gradeslate<span className="text-blue-600">.</span>
                </span>
                <span className="text-slate-300 font-light">/</span>
                <span className="font-extrabold text-slate-800 text-sm">Slate AI</span>
                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-extrabold rounded-md uppercase tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                  Gemini Live
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Whole Gradebook & Notes Academic Co-Pilot • Admissions & MCQ Strategist
              </p>
            </div>
          </div>
        </div>

        {/* Center: Live Grounding Badge */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-blue-50/80 border border-blue-100 rounded-full text-xs text-blue-700">
          <Layers className="w-3.5 h-3.5 text-blue-600" />
          <span className="font-bold">{classes.length} Classes Synced</span>
          <span className="text-blue-300">•</span>
          <BookMarked className="w-3.5 h-3.5 text-indigo-600" />
          <span className="font-bold">{notes.length} Study Notes Grounded</span>
        </div>

        {/* Right Actions: New Chat, Clear & Exit Full Screen */}
        <div className="flex items-center gap-2">
          {/* New Chat Button */}
          <button
            type="button"
            onClick={() => {
              if (messages.length > 0) {
                if (confirm('Start a new chat? (Previous messages will be archived)')) {
                  setMessages([]);
                  localStorage.removeItem(LOCAL_CHAT_HISTORY_KEY);
                }
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Start new conversation"
          >
            <Plus className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">New Chat</span>
          </button>

          {/* Clear conversation if any messages */}
          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleClearHistory}
              title="Clear conversation"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {/* Exit Full Screen Button */}
          <button
            type="button"
            onClick={onClose}
            title="Exit Full Screen (Esc)"
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <span>Exit Full Screen</span>
            <X className="w-4 h-4 text-white" />
            <kbd className="hidden md:inline-block text-[9px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 font-mono">
              ESC
            </kbd>
          </button>
        </div>
      </header>

      {/* Main Two-Panel Full-Screen Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar: Knowledge Grounding & Prompt Library */}
        <aside
          className={`${
            isSidebarOpenMobile ? 'fixed inset-y-16 left-0 z-40 w-80 shadow-2xl flex' : 'hidden'
          } md:flex md:static w-80 lg:w-88 border-r border-slate-200/90 bg-white flex-col flex-shrink-0 h-full overflow-y-auto`}
        >
          {/* Mobile Drawer Header */}
          <div className="md:hidden p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <span className="text-xs font-bold text-slate-700">Knowledge & Prompts</span>
            <button
              type="button"
              onClick={() => setIsSidebarOpenMobile(false)}
              className="p-1 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-6 flex-1">
            {/* Grounded Context Card */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  Active Grounding
                </span>
                <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Live
                </span>
              </div>

              {/* Connected Classes Chips */}
              <div>
                <p className="text-[11px] font-semibold text-slate-700 mb-1.5">
                  Classes ({classes.length}):
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {classes.length === 0 ? (
                    <span className="text-[11px] text-slate-400 italic">No classes yet</span>
                  ) : (
                    classes.map((cls) => (
                      <span
                        key={cls.id}
                        className="px-2 py-0.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-[11px] font-medium shadow-2xs"
                      >
                        {cls.name}
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* Connected Notes Chips */}
              <div>
                <p className="text-[11px] font-semibold text-slate-700 mb-1.5">
                  Study Notes ({notes.length}):
                </p>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {notes.length === 0 ? (
                    <span className="text-[11px] text-slate-400 italic">No notes yet</span>
                  ) : (
                    notes.slice(0, 8).map((note) => (
                      <span
                        key={note.id}
                        className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-lg text-[11px] font-medium truncate max-w-[150px]"
                      >
                        {note.icon || '📝'} {note.title}
                      </span>
                    ))
                  )}
                  {notes.length > 8 && (
                    <span className="text-[10px] text-slate-400 self-center">
                      +{notes.length - 8} more
                    </span>
                  )}
                </div>
              </div>

              <p className="text-[10px] text-slate-400 leading-relaxed border-t border-slate-200/60 pt-2">
                Slate AI searches your actual grades, categories, and notes before generating responses.
              </p>
            </div>

            {/* Categorized Prompt Library */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  Prompt Library
                </span>
                <span className="text-[10px] text-blue-600 font-semibold">1-Click Run</span>
              </div>

              {STARTER_CATEGORIES.map((category, catIdx) => (
                <div key={catIdx} className="space-y-1.5">
                  <h4 className="text-xs font-bold text-slate-700 px-1">{category.title}</h4>
                  <div className="space-y-1.5">
                    {category.items.map((item, itemIdx) => (
                      <button
                        key={itemIdx}
                        type="button"
                        onClick={() => handleSend(item.prompt)}
                        className="w-full text-left p-2.5 bg-white hover:bg-blue-50/70 border border-slate-200/80 hover:border-blue-300 rounded-xl transition-all shadow-2xs group cursor-pointer"
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-sm flex-shrink-0 mt-0.5">{item.icon}</span>
                          <span className="font-semibold text-xs text-slate-800 group-hover:text-blue-700 leading-snug">
                            {item.label}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Left Sidebar Footer */}
          <div className="p-3 bg-slate-50 border-t border-slate-200/80 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Google Gemini 2.5 Grounded</span>
            <span>GradeSlate Pro</span>
          </div>
        </aside>

        {/* Right Main Full-Width Chat Canvas */}
        <main className="flex-1 flex flex-col h-full min-w-0 bg-[#FAFBFD] overflow-hidden">
          {/* Error Banner */}
          {errorBanner && (
            <div className="p-3 bg-rose-50 border-b border-rose-200 text-rose-900 text-xs flex items-center justify-between flex-shrink-0 animate-in slide-in-from-top-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span className="leading-relaxed">{errorBanner}</span>
              </div>
              <button
                type="button"
                onClick={() => setErrorBanner(null)}
                className="text-rose-800 font-bold hover:text-rose-950 text-xs ml-2 cursor-pointer flex-shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Chat Messages Scroll Canvas */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6">
            <div className="max-w-4xl w-full mx-auto space-y-6">
              {messages.length === 0 ? (
                /* Grand Gemini-style Hero Screen */
                <div className="py-8 sm:py-12 px-4 flex flex-col items-center text-center max-w-2xl mx-auto animate-in fade-in zoom-in-95 duration-200">
                  <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 text-white flex items-center justify-center mb-4 shadow-lg shadow-blue-500/25">
                    <Sparkles className="w-8 h-8 stroke-[2.2]" />
                  </div>
                  <h2 className="font-black text-slate-900 text-2xl sm:text-3xl tracking-tight">
                    Meet Slate AI
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed max-w-lg">
                    Your full-screen academic co-pilot and strategist. Powered by Gemini with real-time access to all your <strong>grades</strong>, <strong>course weights</strong>, and <strong>study notes</strong>.
                  </p>

                  {/* Quick Starter Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full mt-8 text-left">
                    {ALL_STARTERS.slice(0, 4).map((starter, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSend(starter.prompt)}
                        className="p-4 bg-white hover:bg-blue-50/60 border border-slate-200 hover:border-blue-300 rounded-2xl transition-all shadow-2xs hover:shadow-xs group cursor-pointer"
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-xl flex-shrink-0 p-2 bg-slate-50 rounded-xl group-hover:bg-blue-100 transition-colors">
                            {starter.icon}
                          </span>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-xs text-slate-900 group-hover:text-blue-700 leading-snug">
                              {starter.label}
                            </h4>
                            <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                              {starter.prompt}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Message Stream */
                <>
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.role === 'model' && (
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center flex-shrink-0 mt-1 shadow-2xs">
                          <Sparkles className="w-4 h-4 text-white stroke-[2.2]" />
                        </div>
                      )}

                      <div
                        className={`rounded-2xl shadow-2xs relative group leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-blue-600 text-white p-4 max-w-2xl text-sm font-medium rounded-br-xs'
                            : 'bg-white border border-slate-200/90 text-slate-800 p-5 sm:p-6 w-full max-w-3xl rounded-bl-xs'
                        }`}
                      >
                        {msg.role === 'user' ? (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        ) : (
                          <>
                            <MarkdownRenderer content={msg.content} />
                            <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
                              <span className="flex items-center gap-1.5 text-slate-400">
                                <Sparkles className="w-3 h-3 text-blue-500" />
                                <span>Slate AI • Gemini Response</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyMessage(msg.id, msg.content)}
                                className="flex items-center gap-1 hover:text-blue-600 transition-colors cursor-pointer px-2 py-1 rounded-lg hover:bg-slate-100 font-semibold"
                              >
                                {copiedId === msg.id ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    <span className="text-emerald-600">Copied to Clipboard!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </>
                        )}
                      </div>

                      {msg.role === 'user' && (
                        <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-600 flex items-center justify-center flex-shrink-0 mt-1">
                          <User className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex gap-3 justify-start animate-in fade-in duration-150">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center flex-shrink-0 mt-1 shadow-2xs animate-pulse">
                        <Sparkles className="w-4 h-4 text-white stroke-[2.2]" />
                      </div>
                      <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-xs p-4 shadow-2xs">
                        <div className="flex items-center gap-2.5 text-slate-600 text-xs font-medium">
                          <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping" />
                          <span>Slate AI is scanning your gradebook & notes...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>
          </div>

          {/* Floating Bottom Input Area */}
          <div className="p-4 sm:pb-6 bg-white/95 backdrop-blur-md border-t border-slate-200/80 flex-shrink-0">
            <div className="max-w-4xl w-full mx-auto">
              <div className="relative flex items-center bg-slate-50 hover:bg-slate-100/70 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500 border border-slate-200 rounded-2xl transition-all p-1.5 shadow-2xs">
                <textarea
                  ref={inputRef}
                  rows={2}
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask Slate AI anything (e.g. 'Look at my Economics notes and create a mcq', or 'what universities can I get with my grades?')..."
                  disabled={isLoading}
                  className="w-full resize-none pr-14 pl-3.5 py-2 text-xs sm:text-sm bg-transparent focus:outline-hidden text-slate-800 placeholder-slate-400 leading-relaxed min-h-[48px]"
                />
                <button
                  type="button"
                  disabled={!inputPrompt.trim() || isLoading}
                  onClick={() => handleSend()}
                  className="absolute right-3 bottom-3 p-2.5 bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-30 disabled:hover:from-blue-600 disabled:hover:to-indigo-600 text-white rounded-xl transition-all cursor-pointer shadow-xs"
                  aria-label="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 mt-2 px-1 text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>⚡ Slate AI • Full Academic Co-Pilot</span>
                  <span>&bull;</span>
                  <span>Shift + Enter for new line</span>
                </div>
                <div className="hidden sm:flex items-center gap-2 text-slate-500">
                  <span>{classes.length} Classes</span>
                  <span>&bull;</span>
                  <span>{notes.length} Notes Injected</span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export const SlateAiModal = AiAdvisorDrawer;
