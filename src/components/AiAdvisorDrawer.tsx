import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Sparkles,
  Send,
  Trash2,
  User,
  AlertCircle,
  GraduationCap,
  Key,
  Check,
} from 'lucide-react';
import type { ClassItem } from '../types/grade';
import {
  sendAdvisorMessage,
  saveGeminiApiKey,
  clearGeminiApiKey,
  GEMINI_STORAGE_KEY,
  type ChatMessage,
} from '../utils/aiAdvisorService';
import { MarkdownRenderer } from './MarkdownRenderer';

interface AiAdvisorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  classes: ClassItem[];
  prefilledPrompt?: string;
  onClearPrefilledPrompt?: () => void;
}

const STARTER_PROMPTS = [
  {
    icon: '💡',
    label: 'How can I raise my lowest grade?',
    prompt: 'Look at my lowest performing class. What specific assignments or categories are pulling me down, and what is the exact mathematical path to raise it?',
  },
  {
    icon: '🎯',
    label: 'What do I need on my finals for my target GPA?',
    prompt: 'Calculate what scores I need on all remaining upcoming assignments and final exams to achieve my target grade in each course and hit a competitive GPA.',
  },
  {
    icon: '⚖️',
    label: 'Which upcoming assignments have the highest leverage?',
    prompt: 'Rank all upcoming and ungraded assignments across all my courses by their percentage weight and leverage on my final course grades.',
  },
  {
    icon: '🎓',
    label: 'What university programs can I get into with my grades?',
    prompt: 'Analyze my current GPA and grades. What university programs (e.g. UBC, U of T, McGill, competitive Canadian/US programs like Computer Science or Engineering) can I get into, and what are my admission odds?',
  },
  {
    icon: '📋',
    label: 'Full Gradebook Audit & Action Plan',
    prompt: 'Give me a comprehensive academic audit: breakdown my strengths, weaknesses, GPA projection, and a prioritized study action plan for the rest of the term.',
  },
];

const LOCAL_CHAT_HISTORY_KEY = 'gradebook_advisor_chat_v1';

export const AiAdvisorDrawer: React.FC<AiAdvisorDrawerProps> = ({
  isOpen,
  onClose,
  classes,
  prefilledPrompt,
  onClearPrefilledPrompt,
}) => {
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [isKeyConfigOpen, setIsKeyConfigOpen] = useState(false);
  const [customKeyInput, setCustomKeyInput] = useState(() => {
    try {
      return localStorage.getItem(GEMINI_STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });
  const [keySavedFeedback, setKeySavedFeedback] = useState(false);

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

  if (!isOpen) return null;

  const handleClearHistory = () => {
    if (confirm('Clear advisor chat history?')) {
      setMessages([]);
      localStorage.removeItem(LOCAL_CHAT_HISTORY_KEY);
    }
  };

  const handleSaveCustomKey = () => {
    if (customKeyInput.trim()) {
      saveGeminiApiKey(customKeyInput.trim());
      setKeySavedFeedback(true);
      setTimeout(() => {
        setKeySavedFeedback(false);
        setIsKeyConfigOpen(false);
      }, 1500);
    } else {
      clearGeminiApiKey();
      setIsKeyConfigOpen(false);
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

    try {
      const reply = await sendAdvisorMessage(prompt, messages, classes);
      const aiMessage: ChatMessage = {
        id: 'msg_' + (Date.now() + 1),
        role: 'model',
        content: reply,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (err: any) {
      console.error('AI Advisor error:', err);
      let msg = err.message || 'Failed to generate response. Please try again.';
      if (msg === 'QUOTA_EXCEEDED') {
        msg = 'Gemini API rate limit reached. Please wait a few seconds and try again.';
      } else if (msg === 'INVALID_API_KEY') {
        msg = 'The provided Gemini API key is invalid. Please check your key in Settings.';
      }
      setErrorBanner(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Dimmed backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-250 border-l border-slate-200">
        {/* Header - matching blue & white logo identity */}
        <div className="p-4 border-b border-slate-200/80 bg-slate-50/70 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs flex-shrink-0">
              <Sparkles className="w-4 h-4 text-white stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-sm tracking-tight">AI Academic Advisor</h3>
                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-md uppercase tracking-wider">
                  Live Context
                </span>
              </div>
              <p className="text-[11px] text-slate-500">What-if analysis & admissions strategist</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Optional API Key Settings */}
            <button
              type="button"
              onClick={() => setIsKeyConfigOpen(!isKeyConfigOpen)}
              title="API Key Configuration"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isKeyConfigOpen ? 'bg-blue-100 text-blue-700' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Key className="w-4 h-4" />
            </button>

            {/* Clear chat history */}
            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleClearHistory}
                title="Clear conversation"
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Expandable Optional API Key Settings Box */}
        {isKeyConfigOpen && (
          <div className="p-3.5 bg-blue-50/70 border-b border-blue-200/80 animate-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-blue-600" />
                Gemini API Key (Optional)
              </span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-blue-600 hover:underline font-semibold"
              >
                Get Free Gemini Key ↗
              </a>
            </div>
            <p className="text-[11px] text-slate-600 mb-2 leading-relaxed">
              By default, the advisor runs using the built-in project key or local math engine. If you have your own Gemini Pro / AI Studio key, enter it below:
            </p>
            <div className="flex items-center gap-2">
              <input
                type="password"
                value={customKeyInput}
                onChange={(e) => setCustomKeyInput(e.target.value)}
                placeholder="AIzaSy..."
                className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
              />
              <button
                type="button"
                onClick={handleSaveCustomKey}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              >
                {keySavedFeedback ? <Check className="w-3.5 h-3.5" /> : null}
                <span>{keySavedFeedback ? 'Saved!' : 'Save'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Error notification banner if any */}
        {errorBanner && (
          <div className="p-3 bg-rose-50 border-b border-rose-200 text-rose-900 text-xs flex items-center justify-between">
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

        {/* Messages scroll area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#FAFBFD]">
          {messages.length === 0 ? (
            <div className="py-6 px-2 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-500/10 to-indigo-500/20 border border-blue-200/60 flex items-center justify-center text-blue-600 mb-3 shadow-2xs">
                <GraduationCap className="w-6 h-6" />
              </div>
              <h4 className="font-extrabold text-slate-900 text-sm">Welcome to your Academic Advisor</h4>
              <p className="text-xs text-slate-500 max-w-xs mt-1 leading-relaxed">
                I dynamically read your live courses, category weights, completed scores, and remaining exams to formulate exact grade strategies.
              </p>

              {/* Quick Starter Chips */}
              <div className="w-full mt-6 space-y-2 text-left">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
                  Suggested Questions:
                </p>
                {STARTER_PROMPTS.map((starter, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSend(starter.prompt)}
                    className="w-full text-left p-3 bg-white hover:bg-blue-50/70 border border-slate-200/80 hover:border-blue-300 rounded-xl transition-all shadow-2xs group cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{starter.icon}</span>
                      <span className="font-bold text-xs text-slate-800 group-hover:text-blue-700">
                        {starter.label}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'model' && (
                    <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-2xs">
                      <Sparkles className="w-4 h-4 text-white stroke-[2.2]" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 shadow-2xs text-xs ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-xs font-medium'
                        : 'bg-white border border-slate-200/90 text-slate-800 rounded-bl-xs'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    ) : (
                      <MarkdownRenderer content={msg.content} />
                    )}
                  </div>

                  {msg.role === 'user' && (
                    <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-2.5 justify-start">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-2xs animate-pulse">
                    <Sparkles className="w-4 h-4 text-white stroke-[2.2]" />
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-xs p-3.5 shadow-2xs">
                    <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                      <div className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                      <span>Calculating grade formulas & analyzing data...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Bottom Input Area */}
        <div className="p-3.5 bg-white border-t border-slate-200 flex-shrink-0">
          <div className="relative flex items-center">
            <textarea
              ref={inputRef}
              rows={2}
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about What-If grades, finals, GPA, or university admissions..."
              disabled={isLoading}
              className="w-full resize-none pr-12 pl-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800 placeholder-slate-400"
            />
            <button
              type="button"
              disabled={!inputPrompt.trim() || isLoading}
              onClick={() => handleSend()}
              className="absolute right-2.5 p-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-30 disabled:hover:bg-blue-600 text-white rounded-lg transition-all cursor-pointer shadow-xs"
              aria-label="Send message"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center justify-between mt-2 px-1 text-[10px] text-slate-400">
            <span>Powered by Gemini</span>
            <span>Live Gradebook Injected</span>
          </div>
        </div>
      </div>
    </div>
  );
};
