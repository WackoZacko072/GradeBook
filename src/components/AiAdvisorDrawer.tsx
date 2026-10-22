import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Sparkles,
  Send,
  Trash2,
  KeyRound,
  ExternalLink,
  Bot,
  User,
  Zap,
  Brain,
  AlertCircle,
  Settings2,
  GraduationCap,
} from 'lucide-react';
import type { ClassItem } from '../types/grade';
import {
  getGeminiApiKey,
  saveGeminiApiKey,
  clearGeminiApiKey,
  isGeminiKeyConfigured,
  getSelectedGeminiModel,
  saveSelectedGeminiModel,
  sendAdvisorMessage,
  type GeminiModel,
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
  const [_apiKey, setApiKey] = useState(() => getGeminiApiKey());
  const [hasKey, setHasKey] = useState(() => isGeminiKeyConfigured());
  const [model, setModel] = useState<GeminiModel>(() => getSelectedGeminiModel());
  const [showKeySetup, setShowKeySetup] = useState(false);
  const [inputKey, setInputKey] = useState('');
  const [keyError, setKeyError] = useState<string | null>(null);

  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

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

  const handleSaveKey = () => {
    if (!inputKey.trim()) {
      setKeyError('Please paste your Gemini API key');
      return;
    }
    saveGeminiApiKey(inputKey.trim());
    setApiKey(inputKey.trim());
    setHasKey(true);
    setShowKeySetup(false);
    setKeyError(null);
    setInputKey('');
  };

  const handleModelChange = (newModel: GeminiModel) => {
    setModel(newModel);
    saveSelectedGeminiModel(newModel);
  };

  const handleClearHistory = () => {
    if (confirm('Clear advisor chat history?')) {
      setMessages([]);
      localStorage.removeItem(LOCAL_CHAT_HISTORY_KEY);
    }
  };

  const handleSend = async (textToSend?: string) => {
    const prompt = (textToSend || inputPrompt).trim();
    if (!prompt || isLoading) return;

    if (!hasKey) {
      setShowKeySetup(true);
      return;
    }

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
      const reply = await sendAdvisorMessage(prompt, messages, classes, model);
      const aiMessage: ChatMessage = {
        id: 'msg_' + (Date.now() + 1),
        role: 'model',
        content: reply,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (err: any) {
      if (err.message === 'MISSING_API_KEY' || err.message === 'INVALID_API_KEY') {
        setShowKeySetup(true);
        setErrorBanner('Your Gemini API Key is invalid or missing. Please update it below.');
      } else if (err.message === 'QUOTA_EXCEEDED') {
        setErrorBanner('Gemini API rate limit reached. Please wait a few seconds, or try switching to Gemini Flash.');
      } else {
        setErrorBanner(err.message || 'Failed to generate response. Please check your network or try again.');
      }
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
        {/* Header */}
        <div className="p-4 border-b border-slate-200/80 bg-slate-50/70 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-sm tracking-tight">AI Academic Advisor</h3>
                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-md uppercase tracking-wider">
                  Live
                </span>
              </div>
              <p className="text-[11px] text-slate-500">What-if analysis & admissions strategist</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Model toggle button */}
            <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg text-[10px] font-semibold">
              <button
                type="button"
                onClick={() => handleModelChange('gemini-1.5-flash')}
                className={`px-2 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                  model === 'gemini-1.5-flash'
                    ? 'bg-white text-blue-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Lightning-fast responses (Free tier)"
              >
                <Zap className="w-2.5 h-2.5" />
                <span>Flash</span>
              </button>
              <button
                type="button"
                onClick={() => handleModelChange('gemini-1.5-pro')}
                className={`px-2 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                  model === 'gemini-1.5-pro'
                    ? 'bg-white text-purple-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Deeper reasoning and detailed admissions breakdowns"
              >
                <Brain className="w-2.5 h-2.5" />
                <span>Pro</span>
              </button>
            </div>

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

            {/* Settings / API Key button */}
            <button
              type="button"
              onClick={() => setShowKeySetup(!showKeySetup)}
              title="API Key Settings"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                showKeySetup || !hasKey
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Settings2 className="w-4 h-4" />
            </button>

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

        {/* API Key Setup Banner / Modal */}
        {(showKeySetup || !hasKey) && (
          <div className="p-4 bg-slate-900 text-white border-b border-slate-800 animate-in fade-in duration-150 flex-shrink-0">
            <div className="flex items-start gap-2.5 mb-2.5">
              <KeyRound className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-white">Google Gemini API Key</h4>
                <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                  Connect your key to power real-time What-If calculations, admissions analysis, and GPA projections.
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="password"
                value={inputKey}
                onChange={(e) => {
                  setInputKey(e.target.value);
                  setKeyError(null);
                }}
                placeholder={hasKey ? '•••••••••••••••••••• (Key saved)' : 'Paste Gemini API key (AIzaSy...)'}
                className="flex-1 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono text-white placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-blue-400"
              />
              <button
                type="button"
                onClick={handleSaveKey}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer flex-shrink-0"
              >
                Save
              </button>
            </div>

            {keyError && <p className="text-[11px] text-rose-400 mt-1.5">{keyError}</p>}

            <div className="flex items-center justify-between mt-2.5 text-[11px] text-slate-400">
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-blue-400 hover:text-blue-300 underline font-medium inline-flex items-center gap-1"
              >
                <span>Get a free Gemini API Key from Google AI Studio</span>
                <ExternalLink className="w-3 h-3" />
              </a>

              {hasKey && (
                <button
                  type="button"
                  onClick={() => {
                    clearGeminiApiKey();
                    setApiKey('');
                    setHasKey(false);
                  }}
                  className="text-rose-400 hover:text-rose-300 text-[10px] font-semibold underline cursor-pointer"
                >
                  Remove Key
                </button>
              )}
            </div>
          </div>
        )}

        {/* Error notification banner */}
        {errorBanner && (
          <div className="p-3 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{errorBanner}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorBanner(null)}
              className="text-rose-600 font-bold hover:text-rose-800 text-xs ml-2 cursor-pointer"
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
                I dynamically inspect your live courses, category weights, completed scores, and remaining exams to formulate exact grade strategies.
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
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-2xs">
                      <Bot className="w-4 h-4" />
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
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5 animate-pulse">
                    <Sparkles className="w-4 h-4" />
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
            <span>Powered by Google Gemini ({model === 'gemini-1.5-pro' ? 'Pro' : 'Flash'})</span>
            <span>Live Gradebook Injected</span>
          </div>
        </div>
      </div>
    </div>
  );
};
