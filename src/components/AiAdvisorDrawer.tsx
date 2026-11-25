import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowUp,
  Trash2,
  AlertCircle,
  Copy,
  Check,
  Plus,
  X,
  Edit2,
} from 'lucide-react';
import type { ClassItem } from '../types/grade';
import type { NoteItem, NoteSource } from '../types/notebook';
import {
  streamSlateAiMessage,
  type ChatMessage,
} from '../utils/aiAdvisorService';
import { MarkdownRenderer } from './MarkdownRenderer';

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export const SESSIONS_STORAGE_KEY = 'gradeslate_slate_ai_sessions_v2';
const LEGACY_STORAGE_KEY = 'gradeslate_slate_ai_chat_v1';

export function createNewSession(): ChatSession {
  return {
    id: 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    title: 'New Chat',
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function loadInitialSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }

  // Migrate legacy single-chat if present
  try {
    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyRaw) {
      const legacyMsgs: ChatMessage[] = JSON.parse(legacyRaw);
      if (Array.isArray(legacyMsgs) && legacyMsgs.length > 0) {
        const firstUser = legacyMsgs.find((m) => m.role === 'user');
        const title = firstUser
          ? firstUser.content.slice(0, 32).trim() + (firstUser.content.length > 32 ? '...' : '')
          : 'Previous Chat';
        return [
          {
            id: 'session_legacy_' + Date.now(),
            title,
            messages: legacyMsgs,
            createdAt: legacyMsgs[0]?.timestamp || Date.now(),
            updatedAt: legacyMsgs[legacyMsgs.length - 1]?.timestamp || Date.now(),
          },
        ];
      }
    }
  } catch {
    // ignore
  }

  return [createNewSession()];
}

interface AiAdvisorDrawerProps {
  isOpen?: boolean;
  onClose?: () => void;
  classes: ClassItem[];
  notes?: NoteItem[];
  sources?: NoteSource[];
  sessions?: ChatSession[];
  currentSessionId?: string;
  onUpdateSessions?: React.Dispatch<React.SetStateAction<ChatSession[]>>;
  onSelectSession?: (id: string) => void;
  prefilledPrompt?: string;
  initialPrompt?: string;
  onClearPrefilledPrompt?: () => void;
  onNavigate?: (tab: 'gradebook' | 'notebook' | 'todo' | 'gemini') => void;
  onNavigateToClass?: (id: string) => void;
  onNavigateToNote?: (id: string) => void;
}

export const AiAdvisorDrawer: React.FC<AiAdvisorDrawerProps> = ({
  isOpen = true,
  classes,
  notes = [],
  sources = [],
  sessions: controlledSessions,
  currentSessionId: controlledSessionId,
  onUpdateSessions,
  onSelectSession,
  prefilledPrompt,
  initialPrompt,
  onClearPrefilledPrompt,
}) => {
  const [internalSessions, setInternalSessions] = useState<ChatSession[]>(() => loadInitialSessions());
  const [internalSessionId, setInternalSessionId] = useState<string>(() => {
    const initial = loadInitialSessions();
    return initial[0]?.id || 'default';
  });

  const sessions = controlledSessions ?? internalSessions;
  const setSessions = onUpdateSessions ?? setInternalSessions;
  const currentSessionId = controlledSessionId ?? internalSessionId;
  const setCurrentSessionId = onSelectSession ?? setInternalSessionId;

  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitle, setEditingTitle] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  // Current active session
  const currentSession =
    sessions.find((s) => s.id === currentSessionId) ||
    sessions[0] ||
    createNewSession();

  // Save sessions to localStorage when uncontrolled
  useEffect(() => {
    if (!controlledSessions) {
      try {
        localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
      } catch {
        // ignore
      }
    }
  }, [sessions, controlledSessions]);

  // Scroll to bottom on new message or live streaming token
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentSession.messages, isLoading, streamingText, isOpen]);

  // Handle prefilled prompt from other components
  useEffect(() => {
    const promptToUse = prefilledPrompt || initialPrompt;
    if (promptToUse && isOpen) {
      setInputPrompt(promptToUse);
      if (onClearPrefilledPrompt) onClearPrefilledPrompt();
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [prefilledPrompt, initialPrompt, isOpen, onClearPrefilledPrompt]);

  // Auto-resize textarea vertically as input changes (including reset after send)
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    if (!inputPrompt) {
      el.style.height = '44px';
      el.style.overflowY = 'hidden';
      return;
    }
    el.style.height = 'auto';
    const maxH = 240;
    el.style.height = `${Math.min(el.scrollHeight, maxH)}px`;
    el.style.overflowY = el.scrollHeight > maxH ? 'auto' : 'hidden';
  }, [inputPrompt]);

  if (!isOpen) return null;

  // Start a new chat session
  const handleNewChat = () => {
    if (currentSession.messages.length === 0) {
      setInputPrompt('');
      inputRef.current?.focus();
      return;
    }

    const fresh = createNewSession();
    setSessions((prev) => [fresh, ...prev]);
    setCurrentSessionId(fresh.id);
    setInputPrompt('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // Delete a session
  const handleDeleteSession = (sessionId: string) => {
    setSessions((prev) => {
      const remaining = prev.filter((s) => s.id !== sessionId);
      if (remaining.length === 0) {
        const fresh = createNewSession();
        setCurrentSessionId(fresh.id);
        return [fresh];
      }
      if (currentSessionId === sessionId) {
        setCurrentSessionId(remaining[0].id);
      }
      return remaining;
    });
  };

  // Rename active session
  const handleStartRename = () => {
    setIsEditingTitle(true);
    setEditingTitle(currentSession.title);
    setTimeout(() => editInputRef.current?.focus(), 50);
  };

  const handleSaveRename = () => {
    const finalTitle = editingTitle.trim() || 'Untitled Chat';
    setSessions((prev) =>
      prev.map((s) => (s.id === currentSession.id ? { ...s, title: finalTitle, updatedAt: Date.now() } : s))
    );
    setIsEditingTitle(false);
  };

  // Update messages in the current session
  const updateSessionMessages = (
    sessionId: string,
    newMessages: ChatMessage[],
    updatedTitle?: string
  ) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === sessionId) {
          return {
            ...s,
            messages: newMessages,
            title: updatedTitle || s.title,
            updatedAt: Date.now(),
          };
        }
        return s;
      })
    );
  };

  // Send message handler
  const handleSend = async (textToSend?: string) => {
    const prompt = (textToSend || inputPrompt).trim();
    if (!prompt || isLoading) return;

    const userMessage: ChatMessage = {
      id: 'msg_' + Date.now(),
      role: 'user',
      content: prompt,
      timestamp: Date.now(),
    };

    const updatedMessages = [...currentSession.messages, userMessage];

    // Auto-generate title from first message
    const isFirstMessage = currentSession.messages.length === 0;
    const newTitle =
      isFirstMessage && currentSession.title === 'New Chat'
        ? prompt.slice(0, 36).trim() + (prompt.length > 36 ? '...' : '')
        : currentSession.title;

    updateSessionMessages(currentSession.id, updatedMessages, newTitle);
    setInputPrompt('');
    setIsLoading(true);
    setStreamingText('');
    setErrorBanner(null);

    try {
      const reply = await streamSlateAiMessage(
        prompt,
        currentSession.messages,
        classes,
        notes,
        (accumulated) => {
          setStreamingText(accumulated);
        },
        undefined,
        sources
      );

      const aiMessage: ChatMessage = {
        id: 'msg_' + (Date.now() + 1),
        role: 'model',
        content: reply,
        timestamp: Date.now(),
      };
      updateSessionMessages(currentSession.id, [...updatedMessages, aiMessage], newTitle);
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
      setStreamingText(null);
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
    <div className="flex flex-col h-full w-full bg-[#FAFBFD] dark:bg-[#0f0f10] transition-colors">
      {/* Minimal Gemini-style Top Bar */}
      <div className="px-4 sm:px-8 py-2.5 flex items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {isEditingTitle ? (
            <div className="flex items-center gap-1.5">
              <input
                ref={editInputRef}
                type="text"
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveRename();
                  if (e.key === 'Escape') setIsEditingTitle(false);
                }}
                onBlur={handleSaveRename}
                className="text-sm font-medium px-2.5 py-1 bg-white dark:bg-[#1e1f20] border border-blue-500 rounded-lg text-slate-900 dark:text-[#e8eaed] focus:outline-hidden"
              />
              <button
                type="button"
                onClick={handleSaveRename}
                className="p-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-md cursor-pointer"
                title="Save chat title"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsEditingTitle(false)}
                className="p-1 text-slate-400 hover:bg-slate-200 dark:hover:bg-[#26282a] rounded-md cursor-pointer"
                title="Cancel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleStartRename}
              className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-[#c4c7c5] hover:text-slate-950 dark:hover:text-[#e8eaed] transition-colors truncate cursor-pointer group py-1 px-2 rounded-lg hover:bg-slate-200/50 dark:hover:bg-[#1e1f20]"
              title="Click to rename chat"
            >
              <span className="truncate max-w-[200px] sm:max-w-xs">{currentSession.title}</span>
              <Edit2 className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {sessions.length > 1 && (
            <button
              type="button"
              onClick={() => handleDeleteSession(currentSession.id)}
              className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-200/60 dark:hover:bg-[#1e1f20] rounded-full transition-colors cursor-pointer"
              title="Delete current chat"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={handleNewChat}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-[#e3e3e3] bg-[#eef2f6] dark:bg-[#1e1f20] hover:bg-slate-200/80 dark:hover:bg-[#282a2c] rounded-full transition-colors cursor-pointer google-btn-press"
            title="Start a new chat"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>New chat</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {errorBanner && (
        <div className="max-w-3xl w-full mx-auto px-4 mb-2 flex-shrink-0">
          <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-2xl text-rose-900 dark:text-rose-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
              <span className="leading-relaxed">{errorBanner}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorBanner(null)}
              className="text-rose-800 dark:text-rose-300 font-bold hover:text-rose-950 dark:hover:text-rose-100 text-xs ml-2 cursor-pointer flex-shrink-0"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Messages Scroll Area (Edge-to-Edge Canvas like actual Gemini) */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 pt-2 pb-6">
        <div className="max-w-3xl w-full mx-auto h-full flex flex-col">
          {currentSession.messages.length === 0 ? (
            /* Clean Gemini-Style Welcome Canvas */
            <div className="my-auto py-10 px-2 flex flex-col items-start sm:items-center sm:text-center max-w-2xl mx-auto w-full">
              <div className="flex items-center gap-3 mb-3">
                <img src="/gemini-icon.png" alt="Gemini" className="w-9 h-9 object-contain" />
                <h2
                  className="font-medium text-3xl sm:text-4xl tracking-tight bg-gradient-to-r from-[#4285F4] via-[#9B72CB] to-[#D96570] bg-clip-text text-transparent"
                  style={{ fontFamily: "'Google Sans', sans-serif" }}
                >
                  Hello, Student
                </h2>
              </div>
              <p className="text-base sm:text-xl font-normal text-slate-500 dark:text-[#9aa0a6] mb-8">
                How can I help with your classes or studying today?
              </p>

              {/* Quick Suggestion Chips */}
              <div className="flex flex-wrap sm:justify-center gap-2.5 w-full">
                {[
                  'How are my grades looking?',
                  'What do I need on my final?',
                  'Help me build a study plan',
                  'Summarize my study sources',
                ].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => handleSend(chip)}
                    className="px-4 py-2.5 rounded-2xl bg-[#f0f4f9] dark:bg-[#1e1f20] hover:bg-[#e3e9f2] dark:hover:bg-[#282a2c] text-xs sm:text-sm font-medium text-slate-700 dark:text-[#e3e3e3] transition-colors cursor-pointer google-btn-press"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Conversation Message Stream */
            <div className="space-y-8 py-4">
              {currentSession.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start gap-4'}`}
                >
                  {msg.role === 'model' && (
                    <div className="w-7 h-7 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <img src="/gemini-icon.png" alt="Gemini" className="w-6 h-6 object-contain" />
                    </div>
                  )}

                  {msg.role === 'user' ? (
                    <div className="bg-[#e9eef6] dark:bg-[#282a2c] text-slate-900 dark:text-[#e3e3e3] px-5 py-3.5 rounded-3xl rounded-tr-sm max-w-[85%] sm:max-w-[75%] text-sm leading-relaxed">
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  ) : (
                    <div className="flex-1 min-w-0 text-slate-800 dark:text-[#e3e3e3] leading-relaxed group">
                      <MarkdownRenderer content={msg.content} />
                      <div className="flex items-center gap-2 mt-3 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => handleCopyMessage(msg.id, msg.content)}
                          className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-[#9aa0a6] hover:text-slate-900 dark:hover:text-[#e3e3e3] transition-colors cursor-pointer px-2.5 py-1.5 rounded-full hover:bg-slate-200/60 dark:hover:bg-[#1e1f20]"
                          title="Copy response"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Streaming live response */}
              {isLoading && streamingText && streamingText.length > 0 && (
                <div className="flex justify-start gap-4">
                  <div className="w-7 h-7 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <img src="/gemini-icon.png" alt="Gemini" className="w-6 h-6 object-contain" />
                  </div>
                  <div className="flex-1 min-w-0 text-slate-800 dark:text-[#e3e3e3] leading-relaxed">
                    <MarkdownRenderer content={streamingText} />
                    <span className="inline-block w-2 h-4 ml-1 bg-blue-500 rounded-xs animate-pulse align-middle" />
                  </div>
                </div>
              )}

              {/* Thinking indicator before first token */}
              {isLoading && (!streamingText || streamingText.length === 0) && (
                <div className="flex justify-start gap-4 items-center">
                  <div className="w-7 h-7 flex items-center justify-center flex-shrink-0">
                    <img src="/gemini-icon.png" alt="Gemini" className="w-6 h-6 object-contain animate-spin" style={{ animationDuration: '2.5s' }} />
                  </div>
                  <span className="text-sm text-slate-500 dark:text-[#9aa0a6] font-medium">
                    Thinking...
                  </span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Bottom Floating Gemini Pill Input */}
      <div className="px-4 sm:px-6 pb-3.5 pt-1.5 flex-shrink-0">
        <div className="max-w-4xl w-full mx-auto">
          <div className="relative flex items-end bg-[#f0f4f9] dark:bg-[#1e1f20] focus-within:bg-white dark:focus-within:bg-[#242628] border border-slate-200/70 dark:border-[#333537] rounded-[30px] transition-all px-5 py-3 shadow-2xs">
            <textarea
              ref={inputRef}
              rows={1}
              value={inputPrompt}
              onChange={(e) => {
                setInputPrompt(e.target.value);
                const el = e.target;
                el.style.height = 'auto';
                const maxH = 240;
                el.style.height = `${Math.min(el.scrollHeight, maxH)}px`;
                el.style.overflowY = el.scrollHeight > maxH ? 'auto' : 'hidden';
              }}
              onKeyDown={handleKeyDown}
              placeholder="Ask Gemini"
              disabled={isLoading}
              style={{ height: '44px' }}
              className="w-full resize-none pr-12 pl-1 py-2 text-[15px] bg-transparent focus:outline-hidden text-slate-900 dark:text-[#e3e3e3] placeholder-slate-500 dark:placeholder-[#9aa0a6] leading-relaxed min-h-[44px] max-h-[240px] overflow-y-hidden"
            />
            <button
              type="button"
              disabled={!inputPrompt.trim() || isLoading}
              onClick={() => handleSend()}
              className="absolute right-3 bottom-3 w-10 h-10 flex items-center justify-center bg-[#0b57d0] hover:bg-[#0842a0] dark:bg-[#a8c7fa] dark:hover:bg-[#8ab4f8] disabled:opacity-30 text-white dark:text-[#041e49] rounded-full transition-all cursor-pointer google-btn-press"
              aria-label="Send message"
            >
              <ArrowUp className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
          <p className="text-[11px] text-center text-slate-400 dark:text-[#80868b] mt-2">
            Gemini can make mistakes, so double-check important grade calculations.
          </p>
        </div>
      </div>
    </div>
  );
};

export const SlateAiModal = AiAdvisorDrawer;
