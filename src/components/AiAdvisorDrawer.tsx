import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Trash2,
  User,
  AlertCircle,
  Copy,
  Check,
  Plus,
  MessageSquare,
  X,
  Edit2,
} from 'lucide-react';
import type { ClassItem } from '../types/grade';
import type { NoteItem, NoteSource } from '../types/notebook';
import type { SlabItem } from '../types/slab';
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
  slabs?: SlabItem[];
  sessions?: ChatSession[];
  currentSessionId?: string;
  onUpdateSessions?: React.Dispatch<React.SetStateAction<ChatSession[]>>;
  onSelectSession?: (id: string) => void;
  prefilledPrompt?: string;
  initialPrompt?: string;
  onClearPrefilledPrompt?: () => void;
  onNavigate?: (tab: 'gradebook' | 'notebook' | 'slab' | 'gemini') => void;
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
    <div className="flex flex-col h-[calc(100vh-145px)] md:h-[calc(100vh-110px)] bg-white dark:bg-[#18191b] rounded-3xl border border-slate-200/80 dark:border-[#26282a] shadow-2xs overflow-hidden transition-colors">
      {/* Chat Session Top Bar */}
      <div className="px-4 sm:px-6 py-3 border-b border-slate-100 dark:border-[#26282a] flex items-center justify-between gap-3 flex-shrink-0 bg-slate-50/50 dark:bg-[#202123]/50">
        <div className="flex items-center gap-2 min-w-0">
          <MessageSquare className="w-4 h-4 text-blue-600 dark:text-[#8ab4f8] flex-shrink-0" />
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
                className="text-xs sm:text-sm font-bold px-2.5 py-1 bg-white dark:bg-[#0f0f10] border border-blue-500 rounded-lg text-slate-900 dark:text-[#e8eaed] focus:outline-hidden"
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
              className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-800 dark:text-[#e8eaed] hover:text-blue-600 dark:hover:text-[#8ab4f8] transition-colors truncate cursor-pointer group"
              title="Click to rename chat"
            >
              <span className="truncate max-w-[200px] sm:max-w-xs">{currentSession.title}</span>
              <Edit2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-[#8ab4f8] flex-shrink-0" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {sessions.length > 1 && (
            <button
              type="button"
              onClick={() => handleDeleteSession(currentSession.id)}
              className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
              title="Delete current chat"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={handleNewChat}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 dark:text-[#8ab4f8] bg-blue-50 dark:bg-[#8ab4f8]/15 hover:bg-blue-100 dark:hover:bg-[#8ab4f8]/25 rounded-xl transition-colors cursor-pointer google-btn-press"
            title="Start a new chat"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>New Chat</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {errorBanner && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border-b border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200 text-xs flex items-center justify-between flex-shrink-0">
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
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 bg-[#FAFBFD]/50 dark:bg-[#0f0f10]/40">
        <div className="max-w-4xl w-full mx-auto space-y-6">
          {currentSession.messages.length === 0 ? (
            /* Clean Gemini-Style Welcome Canvas */
            <div className="py-12 sm:py-16 px-4 flex flex-col items-center text-center max-w-xl mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-4">
                <img src="/gemini-icon.png" alt="Gemini" className="w-11 h-11 object-contain" />
              </div>
              <h2
                className="font-semibold text-slate-900 dark:text-[#e8eaed] text-2xl tracking-tight"
                style={{ fontFamily: "'Google Sans', sans-serif" }}
              >
                Ask Gemini
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-[#9aa0a6] mt-2 leading-relaxed">
                Ask anything about your grades, university admissions, course marks, or study sources.
              </p>
            </div>
          ) : (
            /* Conversation Message Stream */
            <>
              {currentSession.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'model' && (
                    <div className="w-8 h-8 rounded-xl bg-transparent flex items-center justify-center flex-shrink-0 mt-1">
                      <img src="/gemini-icon.png" alt="Gemini" className="w-6 h-6 object-contain" />
                    </div>
                  )}

                  <div
                    className={`rounded-2xl shadow-2xs relative group leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white p-4 max-w-2xl text-xs sm:text-sm font-medium rounded-br-xs'
                        : 'bg-white dark:bg-[#18191b] border border-slate-200/90 dark:border-[#26282a] text-slate-800 dark:text-[#e8eaed] p-5 sm:p-6 w-full max-w-3xl rounded-bl-xs'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <>
                        <MarkdownRenderer content={msg.content} />
                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-[#26282a] text-[11px] text-slate-400 dark:text-[#9aa0a6]">
                          <span className="flex items-center gap-1.5 text-slate-400 dark:text-[#9aa0a6]">
                            <img src="/gemini-icon.png" alt="Gemini" className="w-3.5 h-3.5 object-contain" />
                            <span>Gemini</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyMessage(msg.id, msg.content)}
                            className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-[#202123] font-semibold google-btn-press"
                          >
                            {copiedId === msg.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
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
                    <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-[#202123] text-slate-600 dark:text-[#c4c7c5] flex items-center justify-center flex-shrink-0 mt-1">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))}

              {/* Streaming live response bubble */}
              {isLoading && streamingText && streamingText.length > 0 && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-xl bg-transparent flex items-center justify-center flex-shrink-0 mt-1">
                    <img src="/gemini-icon.png" alt="Gemini" className="w-6 h-6 object-contain" />
                  </div>
                  <div className="bg-white dark:bg-[#18191b] border border-slate-200/90 dark:border-[#26282a] text-slate-800 dark:text-[#e8eaed] p-5 sm:p-6 w-full max-w-3xl rounded-2xl rounded-bl-xs shadow-2xs leading-relaxed">
                    <MarkdownRenderer content={streamingText} />
                    <span className="inline-block w-2 h-4 ml-1 bg-blue-500 rounded-xs animate-pulse align-middle" />
                  </div>
                </div>
              )}

              {/* Thinking skeleton before first token */}
              {isLoading && (!streamingText || streamingText.length === 0) && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-xl bg-transparent flex items-center justify-center flex-shrink-0 mt-1">
                    <img src="/gemini-icon.png" alt="Gemini" className="w-6 h-6 object-contain animate-pulse" />
                  </div>
                  <div className="bg-white dark:bg-[#18191b] border border-slate-200 dark:border-[#26282a] rounded-2xl rounded-bl-xs p-4 shadow-2xs">
                    <div className="flex items-center gap-2.5 text-slate-600 dark:text-[#c4c7c5] text-xs font-medium">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-600 dark:bg-blue-400 animate-ping" />
                      <span>Gemini is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </div>

      {/* Bottom Prompt Input Area */}
      <div className="p-3 sm:p-4 bg-white dark:bg-[#18191b] border-t border-slate-200/80 dark:border-[#26282a] flex-shrink-0">
        <div className="max-w-4xl w-full mx-auto">
          <div className="relative flex items-center bg-slate-50 dark:bg-[#0f0f10] hover:bg-slate-100/70 dark:hover:bg-[#121314] focus-within:bg-white dark:focus-within:bg-[#0f0f10] focus-within:ring-2 focus-within:ring-blue-500 border border-slate-200 dark:border-[#26282a] rounded-2xl transition-all p-1.5 shadow-2xs">
            <textarea
              ref={inputRef}
              rows={2}
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Gemini anything..."
              disabled={isLoading}
              className="w-full resize-none pr-14 pl-3.5 py-2 text-xs sm:text-sm bg-transparent focus:outline-hidden text-slate-800 dark:text-[#e8eaed] placeholder-slate-400 dark:placeholder-[#9aa0a6] leading-relaxed min-h-[48px]"
            />
            <button
              type="button"
              disabled={!inputPrompt.trim() || isLoading}
              onClick={() => handleSend()}
              className="absolute right-3 bottom-3 p-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-30 disabled:hover:bg-blue-600 text-white rounded-xl transition-all cursor-pointer shadow-xs google-btn-press"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const SlateAiModal = AiAdvisorDrawer;
