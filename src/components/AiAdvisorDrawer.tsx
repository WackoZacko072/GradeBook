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
  X,
  Edit2,
  Menu,
  BookOpen,
  BookMarked,
  BookCheck,
} from 'lucide-react';
import type { ClassItem } from '../types/grade';
import type { NoteItem, NoteSource } from '../types/notebook';
import type { SlabItem } from '../types/slab';
import {
  streamSlateAiMessage,
  type ChatMessage,
} from '../utils/aiAdvisorService';
import { MarkdownRenderer } from './MarkdownRenderer';

interface AiAdvisorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  classes: ClassItem[];
  notes?: NoteItem[];
  sources?: NoteSource[];
  slabs?: SlabItem[];
  prefilledPrompt?: string;
  initialPrompt?: string;
  onClearPrefilledPrompt?: () => void;
  onNavigate?: (tab: 'gradebook' | 'notebook' | 'slab') => void;
  onNavigateToClass?: (id: string) => void;
  onNavigateToNote?: (id: string) => void;
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
  sources = [],
  slabs = [],
  prefilledPrompt,
  initialPrompt,
  onClearPrefilledPrompt,
  onNavigate,
}) => {
  const [sessions, setSessions] = useState<ChatSession[]>(() => loadInitialSessions());
  const [currentSessionId, setCurrentSessionId] = useState<string>(() => {
    const initial = loadInitialSessions();
    return initial[0]?.id || 'default';
  });

  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    return true;
  });
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
      if (window.innerWidth < 768) setIsSidebarOpen(false);
      return;
    }

    const fresh = createNewSession();
    setSessions((prev) => [fresh, ...prev]);
    setCurrentSessionId(fresh.id);
    setInputPrompt('');
    if (window.innerWidth < 768) setIsSidebarOpen(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // Switch to an existing session
  const handleSelectSession = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
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
    setStreamingText('');
    setErrorBanner(null);
    if (window.innerWidth < 768) setIsSidebarOpen(false);

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
    <div className="fixed inset-0 z-50 bg-[#FAFBFD] dark:bg-[#1e1f20] flex flex-col overflow-hidden animate-in fade-in duration-200">
      {/* Top Header Bar */}
      <header className="h-16 px-3 sm:px-6 bg-white dark:bg-[#282a2c] border-b border-slate-200/90 dark:border-[#3c4043] flex items-center justify-between flex-shrink-0 z-20 shadow-2xs">
        {/* Left: Gemini Gradebook Branding (Matches Google Notebook branding) */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div
            onClick={onClose}
            className="flex items-center gap-2 sm:gap-2.5 select-none cursor-pointer group"
            title="Return to Gemini Gradebook Workspace"
          >
            <img
              src="/gemini-gradebook-logo.png"
              alt="Gemini Gradebook"
              className="w-7 h-7 sm:w-8 sm:h-8 object-contain flex-shrink-0 group-hover:scale-105 transition-transform duration-200 drop-shadow-xs"
            />
            <span className="text-[18px] sm:text-[20px] font-medium tracking-tight text-slate-900 dark:text-white font-sans antialiased">
              Gemini Gradebook
            </span>
          </div>

          {/* Toggle sidebar button right next to title */}
          <button
            type="button"
            onClick={() => setIsSidebarOpen((prev) => !prev)}
            className="p-1.5 text-slate-500 dark:text-[#9aa0a6] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#303134] rounded-lg transition-colors cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center google-btn-press"
            title={isSidebarOpen ? 'Hide chats sidebar' : 'Show chats sidebar'}
            aria-label="Toggle sidebar menu"
          >
            <Menu className="w-4 h-4 stroke-[2.2]" />
          </button>
        </div>

        {/* Center: Current Chat Name with Rename Trigger */}
        <div className="hidden md:flex items-center gap-2 max-w-sm truncate">
          <div
            onClick={() => handleStartRename(currentSession)}
            className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-[#303134] hover:bg-slate-200/80 dark:hover:bg-[#3c4043] rounded-xl text-xs font-semibold text-slate-700 dark:text-[#e8eaed] cursor-pointer transition-colors border border-slate-200/70 dark:border-[#3c4043] group select-none google-btn-press"
            title="Click to rename this chat"
          >
            <span className="truncate max-w-[220px]">{currentSession.title}</span>
            <Edit2 className="w-3 h-3 text-slate-400 dark:text-[#9aa0a6] group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors flex-shrink-0" />
          </div>
        </div>

        {/* Right Actions: + New Chat */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleNewChat}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50/80 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-xl transition-colors cursor-pointer border border-blue-200/70 dark:border-blue-800 google-btn-press"
            title="Start a new chat"
          >
            <Plus className="w-4 h-4 text-blue-600 dark:text-blue-400 stroke-[2.4]" />
            <span className="hidden sm:inline">New Chat</span>
          </button>
        </div>
      </header>

      {/* Main Workspace with Visible / Toggleable Sidebar */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile Backdrop when Sidebar is Open */}
        {isSidebarOpen && (
          <div
            className="md:hidden fixed inset-0 top-16 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs z-30 animate-in fade-in duration-150"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Left Sidebar: Workspace Selection & Previous Chats */}
        <aside
          className={`${
            isSidebarOpen
              ? 'fixed inset-y-16 left-0 z-40 w-72 shadow-2xl flex md:static md:w-72 md:shadow-none'
              : 'hidden'
          } lg:w-80 border-r border-slate-200/90 dark:border-[#3c4043] bg-white dark:bg-[#282a2c] flex-col flex-shrink-0 h-full overflow-hidden transition-all`}
        >
          {/* Workspace Switcher Section */}
          <div className="p-3 border-b border-slate-100 dark:border-[#3c4043] bg-slate-50/80 dark:bg-[#1e1f20]/60">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-[#9aa0a6]">
                Workspace
              </span>
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                className="md:hidden p-1 text-slate-400 dark:text-[#9aa0a6] hover:text-slate-600 dark:hover:text-[#e8eaed] rounded-lg hover:bg-slate-200/60 dark:hover:bg-[#303134] transition-colors cursor-pointer"
                title="Hide sidebar"
                aria-label="Hide sidebar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  if (window.innerWidth < 768) setIsSidebarOpen(false);
                  if (onNavigate) {
                    onNavigate('gradebook');
                  } else {
                    onClose();
                  }
                }}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-[#c4c7c5] hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50/80 dark:hover:bg-blue-950/40 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-100/70 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-lg group-hover:bg-blue-200/70 dark:group-hover:bg-blue-900/60 transition-colors">
                    <BookOpen className="w-3.5 h-3.5 stroke-[2.2]" />
                  </div>
                  <span>Gradebook</span>
                </div>
                <span className="text-[10px] font-semibold text-slate-400 dark:text-[#9aa0a6] group-hover:text-blue-600 dark:group-hover:text-blue-400 bg-slate-200/60 dark:bg-[#303134] group-hover:bg-blue-100/70 dark:group-hover:bg-blue-950/60 px-2 py-0.5 rounded-full">
                  {classes.length} {classes.length === 1 ? 'class' : 'classes'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (window.innerWidth < 768) setIsSidebarOpen(false);
                  if (onNavigate) {
                    onNavigate('notebook');
                  } else {
                    onClose();
                  }
                }}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-[#c4c7c5] hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50/80 dark:hover:bg-indigo-950/40 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-100/70 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg group-hover:bg-indigo-200/70 dark:group-hover:bg-indigo-900/60 transition-colors">
                    <BookMarked className="w-3.5 h-3.5 stroke-[2.2]" />
                  </div>
                  <span>Notebook</span>
                </div>
                <span className="text-[10px] font-semibold text-slate-400 dark:text-[#9aa0a6] group-hover:text-indigo-600 dark:group-hover:text-indigo-400 bg-slate-200/60 dark:bg-[#303134] group-hover:bg-indigo-100/70 dark:group-hover:bg-indigo-950/60 px-2 py-0.5 rounded-full">
                  {notes.length} {notes.length === 1 ? 'note' : 'notes'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (window.innerWidth < 768) setIsSidebarOpen(false);
                  if (onNavigate) {
                    onNavigate('slab');
                  } else {
                    onClose();
                  }
                }}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-[#c4c7c5] hover:text-violet-700 dark:hover:text-violet-300 hover:bg-violet-50/80 dark:hover:bg-violet-950/40 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-violet-100/70 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 rounded-lg group-hover:bg-violet-200/70 dark:group-hover:bg-violet-900/60 transition-colors">
                    <BookCheck className="w-3.5 h-3.5 stroke-[2.2]" />
                  </div>
                  <span>Office</span>
                </div>
                <span className="text-[10px] font-semibold text-slate-400 dark:text-[#9aa0a6] group-hover:text-violet-600 dark:group-hover:text-violet-400 bg-slate-200/60 dark:bg-[#303134] group-hover:bg-violet-100/70 dark:group-hover:bg-violet-950/60 px-2 py-0.5 rounded-full">
                  {slabs.length} {slabs.length === 1 ? 'set' : 'sets'}
                </span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-[#c4c7c5] hover:text-slate-900 dark:hover:text-[#e8eaed] hover:bg-slate-200/50 dark:hover:bg-[#303134] transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-slate-200/70 dark:bg-[#303134] text-slate-600 dark:text-[#e8eaed] rounded-lg group-hover:bg-slate-300/70 dark:group-hover:bg-[#3c4043] transition-colors">
                    <Home className="w-3.5 h-3.5 stroke-[2.2]" />
                  </div>
                  <span>Back to Workspace</span>
                </div>
              </button>
            </div>
          </div>

          {/* New Chat Action Button */}
          <div className="p-3 pb-1">
            <button
              type="button"
              onClick={() => {
                handleNewChat();
                if (window.innerWidth < 768) setIsSidebarOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-600 hover:from-blue-700 hover:via-indigo-700 hover:to-sky-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer google-btn-press"
            >
              <Plus className="w-4 h-4 stroke-[2.6]" />
              <span>Start New Chat</span>
            </button>
          </div>

          {/* Previous Chats Section Header */}
          <div className="px-4 pt-3 pb-1 flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-[#9aa0a6] flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-slate-400 dark:text-[#9aa0a6]" />
              Previous Chats
            </span>
            <span className="text-[10px] font-semibold text-slate-400 dark:text-[#9aa0a6] bg-slate-100 dark:bg-[#303134] px-1.5 py-0.5 rounded-full">
              {sessions.length}
            </span>
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
                  onClick={() => {
                    if (!isEditing) {
                      handleSelectSession(session.id);
                      if (window.innerWidth < 768) setIsSidebarOpen(false);
                    }
                  }}
                  className={`group flex items-center justify-between p-2.5 rounded-xl text-xs cursor-pointer transition-all ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-900 dark:text-blue-200 font-bold border border-blue-200/70 dark:border-blue-800 shadow-2xs'
                      : 'text-slate-700 dark:text-[#c4c7c5] hover:bg-slate-100/80 dark:hover:bg-[#303134] hover:text-slate-900 dark:hover:text-[#e8eaed] border border-transparent'
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
                        className="w-full text-xs px-2 py-1 bg-white dark:bg-[#1e1f20] border border-blue-500 rounded-lg text-slate-900 dark:text-[#e8eaed] focus:outline-hidden shadow-2xs"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveRename(session.id)}
                        className="p-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-md transition-colors"
                        title="Save name"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelRename}
                        className="p-1 text-slate-400 dark:text-[#9aa0a6] hover:bg-slate-200 dark:hover:bg-[#303134] rounded-md transition-colors"
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
                            isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-[#9aa0a6]'
                          }`}
                        />
                        <span className="truncate">{session.title}</span>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        {msgCount > 0 && (
                          <span className="text-[10px] text-slate-400 dark:text-[#9aa0a6] group-hover:hidden">
                            {msgCount}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => handleStartRename(session, e)}
                          title="Rename chat"
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 dark:text-[#9aa0a6] hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-md transition-all cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSession(session.id, e)}
                          title="Delete chat"
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 dark:text-[#9aa0a6] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md transition-all cursor-pointer"
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
          <div className="p-3 bg-slate-50/80 dark:bg-[#1e1f20]/60 border-t border-slate-200/80 dark:border-[#3c4043] flex items-center justify-between text-[11px] text-slate-400 dark:text-[#9aa0a6]">
            <button
              type="button"
              onClick={handleClearAllSessions}
              className="text-slate-400 dark:text-[#9aa0a6] hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer text-[11px] font-medium"
            >
              Clear all chats
            </button>
            <span>Google Gemini</span>
          </div>
        </aside>

        {/* Right Main Chat Canvas */}
        <main className="flex-1 flex flex-col h-full min-w-0 bg-[#FAFBFD] dark:bg-[#1e1f20] overflow-hidden">
          {/* Error Banner */}
          {errorBanner && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border-b border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200 text-xs flex items-center justify-between flex-shrink-0 animate-in slide-in-from-top-2">
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
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6">
            <div className="max-w-4xl w-full mx-auto space-y-6">
              {currentSession.messages.length === 0 ? (
                /* Clean Gemini-Style Welcome Canvas */
                <div className="py-12 sm:py-16 px-4 flex flex-col items-center text-center max-w-xl mx-auto animate-in fade-in zoom-in-95 duration-200">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 text-white flex items-center justify-center mb-4 shadow-md shadow-blue-500/20">
                    <Sparkles className="w-7 h-7 stroke-[2.2]" />
                  </div>
                  <h2 className="font-extrabold text-slate-900 dark:text-[#e8eaed] text-2xl tracking-tight">
                    Meet Gemini
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-[#9aa0a6] mt-2 leading-relaxed">
                    Ask me anything about your grades, university admissions, course marks, or study sources. Powered by Google Gemini with live Gradebook intelligence.
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
                            : 'bg-white dark:bg-[#282a2c] border border-slate-200/90 dark:border-[#3c4043] text-slate-800 dark:text-[#e8eaed] p-5 sm:p-6 w-full max-w-3xl rounded-bl-xs'
                        }`}
                      >
                        {msg.role === 'user' ? (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        ) : (
                          <>
                            <MarkdownRenderer content={msg.content} />
                            <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-[#3c4043] text-[11px] text-slate-400 dark:text-[#9aa0a6]">
                              <span className="flex items-center gap-1.5 text-slate-400 dark:text-[#9aa0a6]">
                                <Sparkles className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                                <span>Gemini</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyMessage(msg.id, msg.content)}
                                className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-[#303134] font-semibold google-btn-press"
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
                        <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-[#303134] text-slate-600 dark:text-[#c4c7c5] flex items-center justify-center flex-shrink-0 mt-1">
                          <User className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Streaming live response bubble */}
                  {isLoading && streamingText && streamingText.length > 0 && (
                    <div className="flex gap-3 justify-start animate-in fade-in duration-150">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center flex-shrink-0 mt-1 shadow-2xs">
                        <Sparkles className="w-4 h-4 text-white stroke-[2.2]" />
                      </div>
                      <div className="bg-white dark:bg-[#282a2c] border border-slate-200/90 dark:border-[#3c4043] text-slate-800 dark:text-[#e8eaed] p-5 sm:p-6 w-full max-w-3xl rounded-2xl rounded-bl-xs shadow-2xs leading-relaxed">
                        <MarkdownRenderer content={streamingText} />
                        <span className="inline-block w-2 h-4 ml-1 bg-blue-500 rounded-xs animate-pulse align-middle" />
                      </div>
                    </div>
                  )}

                  {/* Thinking skeleton before first token */}
                  {isLoading && (!streamingText || streamingText.length === 0) && (
                    <div className="flex gap-3 justify-start animate-in fade-in duration-150">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center flex-shrink-0 mt-1 shadow-2xs animate-pulse">
                        <Sparkles className="w-4 h-4 text-white stroke-[2.2]" />
                      </div>
                      <div className="bg-white dark:bg-[#282a2c] border border-slate-200 dark:border-[#3c4043] rounded-2xl rounded-bl-xs p-4 shadow-2xs">
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
          <div className="p-4 sm:pb-6 bg-white/95 dark:bg-[#1e1f20]/95 backdrop-blur-md border-t border-slate-200/80 dark:border-[#3c4043] flex-shrink-0">
            <div className="max-w-4xl w-full mx-auto">
              <div className="relative flex items-center bg-slate-50 dark:bg-[#282a2c] hover:bg-slate-100/70 dark:hover:bg-[#282a2c] focus-within:bg-white dark:focus-within:bg-[#282a2c] focus-within:ring-2 focus-within:ring-blue-500 border border-slate-200 dark:border-[#3c4043] rounded-2xl transition-all p-1.5 shadow-2xs">
                <textarea
                  ref={inputRef}
                  rows={2}
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask Gemini anything (e.g. 'Look at my Economics sources and create a quiz', or 'what universities can I get with my grades?')..."
                  disabled={isLoading}
                  className="w-full resize-none pr-14 pl-3.5 py-2 text-xs sm:text-sm bg-transparent focus:outline-hidden text-slate-800 dark:text-[#e8eaed] placeholder-slate-400 dark:placeholder-[#9aa0a6] leading-relaxed min-h-[48px]"
                />
                <button
                  type="button"
                  disabled={!inputPrompt.trim() || isLoading}
                  onClick={() => handleSend()}
                  className="absolute right-3 bottom-3 p-2.5 bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-30 disabled:hover:from-blue-600 disabled:hover:to-indigo-600 text-white rounded-xl transition-all cursor-pointer shadow-xs google-btn-press"
                  aria-label="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-between gap-2 mt-2 px-1 text-[11px] text-slate-400 dark:text-[#9aa0a6]">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Gemini • Academic Co-Pilot</span>
                  <span>&bull;</span>
                  <span>Shift + Enter for new line</span>
                </div>
                <div className="hidden sm:block text-slate-400 dark:text-[#9aa0a6]">
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
