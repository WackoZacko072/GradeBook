import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Trash2,
  User,
  AlertCircle,
  Copy,
  Check,
  Plus,
  Home,
  MessageSquare,
  PanelLeft,
  X,
  Edit2,
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

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

const SESSIONS_STORAGE_KEY = 'gradeslate_slate_ai_sessions_v2';
const LEGACY_STORAGE_KEY = 'gradeslate_slate_ai_chat_v1';

function createNewSession(): ChatSession {
  return {
    id: 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    title: 'New Chat',
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function loadInitialSessions(): ChatSession[] {
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

export const AiAdvisorDrawer: React.FC<AiAdvisorDrawerProps> = ({
  isOpen,
  onClose,
  classes,
  notes = [],
  prefilledPrompt,
  onClearPrefilledPrompt,
}) => {
  const [sessions, setSessions] = useState<ChatSession[]>(() => loadInitialSessions());
  const [currentSessionId, setCurrentSessionId] = useState<string>(() => {
    const initial = loadInitialSessions();
    return initial[0]?.id || 'default';
  });

  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  // Current active session
  const currentSession =
    sessions.find((s) => s.id === currentSessionId) ||
    sessions[0] ||
    createNewSession();

  // Save sessions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
    } catch {
      // ignore
    }
  }, [sessions]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentSession.messages, isLoading, isOpen]);

  // Handle prefilled prompt from other components
  useEffect(() => {
    if (prefilledPrompt && isOpen) {
      setInputPrompt(prefilledPrompt);
      if (onClearPrefilledPrompt) onClearPrefilledPrompt();
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [prefilledPrompt, isOpen, onClearPrefilledPrompt]);

  // Handle ESC key to return home
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

  // Start a new chat session
  const handleNewChat = () => {
    // If the current session is already empty, just focus input
    if (currentSession.messages.length === 0) {
      setInputPrompt('');
      inputRef.current?.focus();
      setIsSidebarOpenMobile(false);
      return;
    }

    const fresh = createNewSession();
    setSessions((prev) => [fresh, ...prev]);
    setCurrentSessionId(fresh.id);
    setInputPrompt('');
    setIsSidebarOpenMobile(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // Switch to an existing session
  const handleSelectSession = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setIsSidebarOpenMobile(false);
  };

  // Delete a session
  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
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

  // Clear all sessions
  const handleClearAllSessions = () => {
    if (confirm('Are you sure you want to delete all previous chats?')) {
      const fresh = createNewSession();
      setSessions([fresh]);
      setCurrentSessionId(fresh.id);
      localStorage.removeItem(SESSIONS_STORAGE_KEY);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
  };

  // Rename a session
  const handleStartRename = (session: ChatSession, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingSessionId(session.id);
    setEditingTitle(session.title);
    setTimeout(() => editInputRef.current?.focus(), 50);
  };

  const handleSaveRename = (sessionId: string) => {
    const finalTitle = editingTitle.trim() || 'Untitled Chat';
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, title: finalTitle, updatedAt: Date.now() } : s))
    );
    setEditingSessionId(null);
  };

  const handleCancelRename = () => {
    setEditingSessionId(null);
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
    setErrorBanner(null);
    setIsSidebarOpenMobile(false);

    try {
      const reply = await sendSlateAiMessage(prompt, currentSession.messages, classes, notes);
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
      {/* Top Header Bar */}
      <header className="h-16 px-4 sm:px-6 bg-white border-b border-slate-200/90 flex items-center justify-between flex-shrink-0 z-20 shadow-2xs">
        {/* Left: Branding & Mobile Sidebar Toggle */}
        <div className="flex items-center gap-3">
          {/* Mobile Sidebar Toggle */}
          <button
            type="button"
            onClick={() => setIsSidebarOpenMobile(!isSidebarOpenMobile)}
            className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Toggle Previous Chats"
            aria-label="Toggle Previous Chats"
          >
            <PanelLeft className="w-5 h-5" />
          </button>

          <div
            onClick={onClose}
            className="flex items-center gap-2.5 select-none cursor-pointer"
            title="Return to GradeSlate Home"
          >
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
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Academic Co-Pilot & Strategist • Whole Gradebook Analyzer
              </p>
            </div>
          </div>
        </div>

        {/* Center: Current Chat Name with Rename Trigger */}
        <div className="hidden md:flex items-center gap-2 max-w-sm truncate">
          <div
            onClick={() => handleStartRename(currentSession)}
            className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200/80 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer transition-colors border border-slate-200/70 group select-none"
            title="Click to rename this chat"
          >
            <span className="truncate max-w-[220px]">{currentSession.title}</span>
            <Edit2 className="w-3 h-3 text-slate-400 group-hover:text-blue-600 transition-colors flex-shrink-0" />
          </div>
        </div>

        {/* Right Actions: + New Chat & Home Button */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* New Chat Button */}
          <button
            type="button"
            onClick={handleNewChat}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-blue-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer border border-slate-200/80"
            title="Start a new chat"
          >
            <Plus className="w-4 h-4 text-blue-600" />
            <span className="hidden sm:inline">New Chat</span>
          </button>

          {/* Home Button (Returns to GradeSlate Home) */}
          <button
            type="button"
            onClick={onClose}
            title="Return to GradeSlate Home"
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Home</span>
          </button>
        </div>
      </header>

      {/* Main Workspace with Visible Sidebar */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar: Previous Chats */}
        <aside
          className={`${
            isSidebarOpenMobile ? 'fixed inset-y-16 left-0 z-40 w-72 shadow-2xl flex' : 'hidden'
          } md:flex md:static w-72 lg:w-80 border-r border-slate-200/90 bg-white flex-col flex-shrink-0 h-full overflow-hidden`}
        >
          {/* Sidebar Top: New Chat & Header */}
          <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
            <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
              Previous Chats
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleNewChat}
                className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                title="New Chat"
              >
                <Plus className="w-4 h-4" />
              </button>
              {isSidebarOpenMobile && (
                <button
                  type="button"
                  onClick={() => setIsSidebarOpenMobile(false)}
                  className="md:hidden p-1.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Previous Chats List */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
            {sessions.map((session) => {
              const isActive = session.id === currentSession.id;
              const isEditing = session.id === editingSessionId;
              const msgCount = session.messages.length;

              return (
                <div
                  key={session.id}
                  onClick={() => !isEditing && handleSelectSession(session.id)}
                  className={`group flex items-center justify-between p-2.5 rounded-xl text-xs cursor-pointer transition-all ${
                    isActive
                      ? 'bg-blue-50 text-blue-900 font-bold border border-blue-200/70 shadow-2xs'
                      : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900 border border-transparent'
                  }`}
                >
                  {isEditing ? (
                    <div
                      className="flex items-center gap-1 w-full"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        ref={editInputRef}
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRename(session.id);
                          if (e.key === 'Escape') handleCancelRename();
                        }}
                        onBlur={() => handleSaveRename(session.id)}
                        className="w-full text-xs px-2 py-1 bg-white border border-blue-500 rounded-lg text-slate-900 focus:outline-hidden shadow-2xs"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveRename(session.id)}
                        className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                        title="Save name"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelRename}
                        className="p-1 text-slate-400 hover:bg-slate-200 rounded-md transition-colors"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                        <MessageSquare
                          className={`w-3.5 h-3.5 flex-shrink-0 ${
                            isActive ? 'text-blue-600' : 'text-slate-400'
                          }`}
                        />
                        <span className="truncate">{session.title}</span>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        {msgCount > 0 && (
                          <span className="text-[10px] text-slate-400 group-hover:hidden">
                            {msgCount}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => handleStartRename(session, e)}
                          title="Rename chat"
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSession(session.id, e)}
                          title="Delete chat"
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Sidebar Footer */}
          <div className="p-3 bg-slate-50/80 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-400">
            <button
              type="button"
              onClick={handleClearAllSessions}
              className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer text-[11px] font-medium"
            >
              Clear all chats
            </button>
            <span>Google Gemini</span>
          </div>
        </aside>

        {/* Right Main Chat Canvas */}
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

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6">
            <div className="max-w-4xl w-full mx-auto space-y-6">
              {currentSession.messages.length === 0 ? (
                /* Clean Gemini-Style Welcome Canvas */
                <div className="py-12 sm:py-16 px-4 flex flex-col items-center text-center max-w-xl mx-auto animate-in fade-in zoom-in-95 duration-200">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 text-white flex items-center justify-center mb-4 shadow-md shadow-blue-500/20">
                    <Sparkles className="w-7 h-7 stroke-[2.2]" />
                  </div>
                  <h2 className="font-extrabold text-slate-900 text-2xl tracking-tight">
                    Meet Slate AI
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
                    Ask me anything about your grades, university admissions, course marks, or study notes. Powered by Google Gemini with live GradeSlate intelligence.
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
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center flex-shrink-0 mt-1 shadow-2xs">
                          <Sparkles className="w-4 h-4 text-white stroke-[2.2]" />
                        </div>
                      )}

                      <div
                        className={`rounded-2xl shadow-2xs relative group leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-blue-600 text-white p-4 max-w-2xl text-xs sm:text-sm font-medium rounded-br-xs'
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
                                <span>Slate AI</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyMessage(msg.id, msg.content)}
                                className="flex items-center gap-1 hover:text-blue-600 transition-colors cursor-pointer px-2 py-1 rounded-lg hover:bg-slate-100 font-semibold"
                              >
                                {copiedId === msg.id ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    <span className="text-emerald-600">Copied!</span>
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
                          <span>Slate AI is thinking...</span>
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

              <div className="flex items-center justify-between gap-2 mt-2 px-1 text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Slate AI • Academic Co-Pilot</span>
                  <span>&bull;</span>
                  <span>Shift + Enter for new line</span>
                </div>
                <div className="hidden sm:block text-slate-400">
                  Google Gemini Powered
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
