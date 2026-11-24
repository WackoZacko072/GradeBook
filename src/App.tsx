import React, { useState, useEffect, useRef } from 'react';
import type { ClassItem } from './types/grade';
import type { NoteItem, NoteSource } from './types/notebook';
import type { TodoItem, TodoList } from './types/todo';
import {
  getInitialClasses,
  subscribeToUserClasses,
  saveUserClasses,
  loadGuestClasses,
  saveGuestClasses,
} from './utils/gradebookService';
import {
  getInitialNotes,
  subscribeToUserNotes,
  loadGuestNotes,
} from './utils/notebookService';
import {
  getInitialSources,
  subscribeToUserSources,
  saveUserSources,
  loadGuestSources,
  saveGuestSources,
} from './utils/sourceService';
import { useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { ClassDetail } from './components/ClassDetail';
import { NotebookView } from './components/Notebook/NotebookView';
import { TodoView } from './components/Todo/TodoView';
import { AddClassModal } from './components/AddClassModal';
import { TranscriptModal } from './components/TranscriptModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import {
  AiAdvisorDrawer,
  loadInitialSessions,
  createNewSession,
  SESSIONS_STORAGE_KEY,
  type ChatSession,
} from './components/AiAdvisorDrawer';
import { subscribeToGradingScale, applyCloudGradingScale } from './utils/gradeCalculations';
import {
  setActiveSettingsUserId,
  subscribeToUserSettings,
  saveUserSettings,
} from './utils/userSettingsService';
import {
  getInitialTodos,
  getInitialTodoLists,
  subscribeToUserTodos,
  saveUserTodos,
  saveUserTodoLists,
  loadGuestTodos,
  saveGuestTodos,
  loadGuestTodoLists,
  saveGuestTodoLists,
} from './utils/todoService';

const TAB_INDEX_MAP: Record<'gradebook' | 'notebook' | 'todo' | 'gemini', number> = {
  gradebook: 0,
  notebook: 1,
  todo: 2,
  gemini: 3,
};

export const App: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { setTheme } = useTheme();

  // Top level active tab: Gradebook vs Notebook vs To-Do vs Gemini
  const [activeTab, setActiveTab] = useState<'gradebook' | 'notebook' | 'todo' | 'gemini'>('gradebook');
  const [slideDirection, setSlideDirection] = useState<'right' | 'left'>('right');

  // Gradebook classes state
  const [classes, setClasses] = useState<ClassItem[]>(() => getInitialClasses());
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  // Notebook notes state (legacy fallback)
  const [notes, setNotes] = useState<NoteItem[]>(() => getInitialNotes());
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  // Sources Hub state (replaces notetaking)
  const [sources, setSources] = useState<NoteSource[]>(() => getInitialSources());

  // To-Do tasks and lists state
  const [todos, setTodos] = useState<TodoItem[]>(() => getInitialTodos());
  const [todoLists, setTodoLists] = useState<TodoList[]>(() => {
    const saved = getInitialTodoLists();
    if (saved !== null) return saved;
    return getInitialClasses().map((c) => ({
      id: c.id,
      name: c.name,
      color: c.color || '#2563EB',
      createdAt: c.createdAt || Date.now(),
    }));
  });

  const [_isDataLoaded, setIsDataLoaded] = useState(false);
  const [_gradingScaleTick, setGradingScaleTick] = useState(0);

  useEffect(() => {
    return subscribeToGradingScale(() => {
      setGradingScaleTick((prev) => prev + 1);
    });
  }, []);

  // Modals & Navigation state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isTranscriptModalOpen, setIsTranscriptModalOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // AI Advisor / Gemini Chat state
  const [chatSessions, setChatSessions] = useState<ChatSession[]>(() => loadInitialSessions());
  const [currentChatSessionId, setCurrentChatSessionId] = useState<string>(() => {
    const initial = loadInitialSessions();
    return initial[0]?.id || 'default';
  });
  const [prefilledAdvisorPrompt, setPrefilledAdvisorPrompt] = useState<string | undefined>(undefined);

  useEffect(() => {
    try {
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(chatSessions));
    } catch {
      // ignore
    }
  }, [chatSessions]);

  // Dashboard layout view mode (grid cards vs list rows)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    return (localStorage.getItem('gemini_gradebook_view_mode') as 'grid' | 'list') || 'grid';
  });

  const handleToggleViewMode = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('gemini_gradebook_view_mode', mode);
    void saveUserSettings({ viewMode: mode });
  };

  // YouTube-style collapsible desktop sidebar
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<'expanded' | 'collapsed'>(() => {
    return (localStorage.getItem('gradeslate_sidebar_collapsed') as 'expanded' | 'collapsed') || 'expanded';
  });

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = prev === 'expanded' ? 'collapsed' : 'expanded';
      localStorage.setItem('gradeslate_sidebar_collapsed', next);
      void saveUserSettings({ sidebarCollapsed: next });
      return next;
    });
  };

  // Sync account settings (grading scale, theme, viewMode, sidebar) across all devices
  useEffect(() => {
    if (authLoading) return;
    setActiveSettingsUserId(user?.uid || null);
    if (!user) return;

    const unsubscribeSettings = subscribeToUserSettings(user.uid, (cloudSettings) => {
      if (Array.isArray(cloudSettings.gradingScale) && cloudSettings.gradingScale.length > 0) {
        applyCloudGradingScale(cloudSettings.gradingScale);
      }
      if (cloudSettings.theme === 'light' || cloudSettings.theme === 'dark') {
        setTheme(cloudSettings.theme, false);
      }
      if (cloudSettings.viewMode === 'grid' || cloudSettings.viewMode === 'list') {
        setViewMode(cloudSettings.viewMode);
        localStorage.setItem('gemini_gradebook_view_mode', cloudSettings.viewMode);
      }
      if (cloudSettings.sidebarCollapsed === 'expanded' || cloudSettings.sidebarCollapsed === 'collapsed') {
        setIsSidebarCollapsed(cloudSettings.sidebarCollapsed);
        localStorage.setItem('gradeslate_sidebar_collapsed', cloudSettings.sidebarCollapsed);
      }
    });

    return () => {
      unsubscribeSettings();
    };
  }, [user, authLoading]);

  // Real-time synchronization for To-Do tasks and lists
  useEffect(() => {
    let unsubscribeTodos: (() => void) | null = null;
    if (authLoading) return;

    if (user) {
      unsubscribeTodos = subscribeToUserTodos(
        user.uid,
        (cloudTodos) => {
          setTodos(cloudTodos);
        },
        (cloudLists) => {
          setTodoLists(cloudLists);
        }
      );
    } else {
      setTodos(loadGuestTodos());
      const guestLists = loadGuestTodoLists();
      if (guestLists !== null) {
        setTodoLists(guestLists);
      }
    }

    return () => {
      if (unsubscribeTodos) {
        unsubscribeTodos();
      }
    };
  }, [user, authLoading]);

  // Scroll ref for main content
  const mainContentRef = useRef<HTMLElement>(null);

  // Handle Tab Switch with Directional Slide Transition
  const handleTabChange = (nextTab: 'gradebook' | 'notebook' | 'todo' | 'gemini') => {
    if (nextTab === activeTab) return;
    const prevIdx = TAB_INDEX_MAP[activeTab];
    const nextIdx = TAB_INDEX_MAP[nextTab];
    setSlideDirection(nextIdx > prevIdx ? 'right' : 'left');
    setActiveTab(nextTab);
    if (nextTab === 'gradebook') setSelectedClassId(null);
    if (nextTab === 'notebook') setSelectedNoteId(null);
  };

  // Real-time synchronization for Classes: subscribe in Firestore
  useEffect(() => {
    let unsubscribeUser: (() => void) | null = null;
    if (authLoading) return;

    if (user) {
      unsubscribeUser = subscribeToUserClasses(
        user.uid,
        (cloudClasses) => {
          setClasses(cloudClasses);
          setIsDataLoaded(true);
        },
        user.email,
        user.displayName
      );
    } else {
      const guestClasses = loadGuestClasses();
      setClasses(guestClasses);
      setIsDataLoaded(true);
    }

    return () => {
      if (unsubscribeUser) {
        unsubscribeUser();
      }
    };
  }, [user, authLoading]);

  // Real-time synchronization for Sources: subscribe in Firestore
  useEffect(() => {
    let unsubscribeSources: (() => void) | null = null;
    if (authLoading) return;

    if (user) {
      unsubscribeSources = subscribeToUserSources(user.uid, (cloudSources) => {
        setSources(cloudSources);
      });
    } else {
      const guestSources = loadGuestSources();
      setSources(guestSources);
    }

    return () => {
      if (unsubscribeSources) {
        unsubscribeSources();
      }
    };
  }, [user, authLoading]);

  // Real-time synchronization for Notebook Notes: subscribe in Firestore
  useEffect(() => {
    let unsubscribeNotes: (() => void) | null = null;
    if (authLoading) return;

    if (user) {
      unsubscribeNotes = subscribeToUserNotes(user.uid, (cloudNotes) => {
        setNotes(cloudNotes);
      });
    } else {
      const guestNotes = loadGuestNotes();
      setNotes(guestNotes);
    }

    return () => {
      if (unsubscribeNotes) {
        unsubscribeNotes();
      }
    };
  }, [user, authLoading]);

  // Scroll to top when active class, active note, or active tab changes
  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [selectedClassId, selectedNoteId, activeTab]);

  // Active selected class
  const activeClass = classes.find((c) => c.id === selectedClassId) || null;

  // Add class handler
  const handleAddClass = (newClass: ClassItem) => {
    setClasses((prev) => {
      const next = [newClass, ...prev];
      if (user) saveUserClasses(user.uid, next);
      else saveGuestClasses(next);
      return next;
    });
    setSlideDirection('right');
    setSelectedClassId(newClass.id);
    setActiveTab('gradebook');
    setIsMobileDrawerOpen(false);
  };

  // Update full class (categories, assessments, weights)
  const handleUpdateClass = (updated: ClassItem) => {
    setClasses((prev) => {
      const next = prev.map((c) => (c.id === updated.id ? updated : c));
      if (user) saveUserClasses(user.uid, next);
      else saveGuestClasses(next);
      return next;
    });
  };

  // Delete class
  const handleDeleteClass = (id: string) => {
    setClasses((prev) => {
      const next = prev.filter((c) => c.id !== id);
      if (user) saveUserClasses(user.uid, next);
      else saveGuestClasses(next);
      return next;
    });
    if (selectedClassId === id) {
      setSlideDirection('left');
      setSelectedClassId(null);
    }
  };

  // Sources handlers (replaces notetaking with Sources Hub)
  const handleAddSource = (newSource: NoteSource) => {
    setSources((prev) => {
      const next = [newSource, ...prev];
      if (user) saveUserSources(user.uid, next);
      else saveGuestSources(next);
      return next;
    });
  };

  const handleUpdateSource = (updated: NoteSource) => {
    setSources((prev) => {
      const next = prev.map((s) => (s.id === updated.id ? updated : s));
      if (user) saveUserSources(user.uid, next);
      else saveGuestSources(next);
      return next;
    });
  };

  const handleDeleteSource = (id: string) => {
    setSources((prev) => {
      const next = prev.filter((s) => s.id !== id);
      if (user) saveUserSources(user.uid, next);
      else saveGuestSources(next);
      return next;
    });
  };

  // Quick-create class from sources hub
  const handleQuickAddClass = (name: string, color?: string) => {
    const newClass: ClassItem = {
      id: `class_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name,
      code: name.substring(0, 6).toUpperCase(),
      color: color || '#8b5cf6',
      credits: 3,
      categories: [
        { id: `cat_1_${Date.now()}`, name: 'Assignments', weight: 40, assessments: [] },
        { id: `cat_2_${Date.now()}`, name: 'Exams', weight: 60, assessments: [] },
      ],
      createdAt: Date.now(),
    };
    handleAddClass(newClass);
  };

  const persistTodos = (nextTodos: TodoItem[]) => {
    if (user) {
      void saveUserTodos(user.uid, nextTodos);
    } else {
      saveGuestTodos(nextTodos);
    }
  };

  const handleAddTodo = (newTodo: TodoItem) => {
    setTodos((prev) => {
      const next = [newTodo, ...prev];
      persistTodos(next);
      return next;
    });
  };

  const handleUpdateTodo = (updatedTodo: TodoItem) => {
    setTodos((prev) => {
      const next = prev.map((t) => (t.id === updatedTodo.id ? updatedTodo : t));
      persistTodos(next);
      return next;
    });
  };

  const handleDeleteTodo = (id: string) => {
    setTodos((prev) => {
      const next = prev.filter((t) => t.id !== id);
      persistTodos(next);
      return next;
    });
  };

  const persistTodoLists = (nextLists: TodoList[]) => {
    if (user) {
      void saveUserTodoLists(user.uid, nextLists);
    } else {
      saveGuestTodoLists(nextLists);
    }
  };

  const handleAddTodoList = (newList: TodoList) => {
    setTodoLists((prev) => {
      const next = [...prev, newList];
      persistTodoLists(next);
      return next;
    });
  };

  const handleDeleteTodoList = (listId: string) => {
    setTodoLists((prev) => {
      const next = prev.filter((l) => l.id !== listId);
      persistTodoLists(next);
      return next;
    });
    setTodos((prev) => {
      const next = prev.filter((t) => t.classId !== listId);
      persistTodos(next);
      return next;
    });
  };

  const handleReorderTodoLists = (newLists: TodoList[]) => {
    setTodoLists(newLists);
    persistTodoLists(newLists);
  };

  const handleReorderTodos = (newTodos: TodoItem[]) => {
    setTodos(newTodos);
    persistTodos(newTodos);
  };

  const handleClearCompletedTodos = () => {
    setTodos((prev) => {
      const next = prev.filter((t) => !t.completed);
      persistTodos(next);
      return next;
    });
  };

  const handleOpenAiAdvisor = (prompt?: string) => {
    if (prompt) {
      setPrefilledAdvisorPrompt(prompt);
    }
    setSlideDirection('right');
    setActiveTab('gemini');
  };

  const handleCreateChatSession = () => {
    const current = chatSessions.find((s) => s.id === currentChatSessionId) || chatSessions[0];
    if (current && current.messages.length === 0) {
      setCurrentChatSessionId(current.id);
      setActiveTab('gemini');
      return;
    }
    const fresh = createNewSession();
    setChatSessions((prev) => [fresh, ...prev]);
    setCurrentChatSessionId(fresh.id);
    setActiveTab('gemini');
  };

  const handleRenameChatSession = (sessionId: string, title: string) => {
    setChatSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, title, updatedAt: Date.now() } : s))
    );
  };

  const handleDeleteChatSession = (sessionId: string) => {
    setChatSessions((prev) => {
      const remaining = prev.filter((s) => s.id !== sessionId);
      if (remaining.length === 0) {
        const fresh = createNewSession();
        setCurrentChatSessionId(fresh.id);
        return [fresh];
      }
      if (currentChatSessionId === sessionId) {
        setCurrentChatSessionId(remaining[0].id);
      }
      return remaining;
    });
  };

  return (
    <div className="min-h-screen bg-[#FAFBFD] dark:bg-[#0f0f10] text-[#0F172A] dark:text-[#f8f9fa] flex flex-col font-sans transition-colors duration-250">
      {/* Top Header matching Google NotebookLM style */}
      <Header
        activeTab={activeTab}
        onChangeTab={handleTabChange}
        classes={classes}
        onSelectClass={(id) => {
          setSlideDirection('right');
          setActiveTab('gradebook');
          setSelectedClassId(id);
        }}
        onSelectOverview={() => {
          setSlideDirection('left');
          setActiveTab('gradebook');
          setSelectedClassId(null);
        }}
        noteCount={sources.length}
        onOpenTranscript={() => setIsTranscriptModalOpen(true)}
        onOpenMobileDrawer={() => setIsMobileDrawerOpen(true)}
        onOpenAiAdvisor={() => handleOpenAiAdvisor()}
        viewMode={viewMode}
        onToggleViewMode={handleToggleViewMode}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={handleToggleSidebar}
      />

      {/* App Body: Full width flex layout */}
      <div className="flex-1 w-full bg-[#FAFBFD] dark:bg-[#0f0f10] flex overflow-hidden transition-colors duration-250">
        {/* Left Sidebar (Desktop + Mobile Drawer) */}
        <Sidebar
          activeTab={activeTab}
          onChangeTab={handleTabChange}
          classes={classes}
          notes={notes}
          sources={sources}
          todos={todos}
          todoLists={todoLists}
          chatSessions={chatSessions}
          selectedClassId={selectedClassId}
          selectedNoteId={selectedNoteId}
          selectedChatSessionId={currentChatSessionId}
          onSelectOverview={() => {
            setSlideDirection('left');
            setActiveTab('gradebook');
            setSelectedClassId(null);
          }}
          onSelectClass={(id) => {
            setSlideDirection('right');
            setActiveTab('gradebook');
            setSelectedClassId(id);
          }}
          onSelectNote={(id) => {
            setSlideDirection(id ? 'right' : 'left');
            setActiveTab('notebook');
            setSelectedNoteId(id);
          }}
          onSelectChatSession={(id) => {
            setCurrentChatSessionId(id);
            setActiveTab('gemini');
          }}
          onOpenAddClass={() => setIsAddModalOpen(true)}
          onCreateNote={() => {
            handleTabChange('notebook');
          }}
          onCreateChatSession={handleCreateChatSession}
          onRenameChatSession={handleRenameChatSession}
          onDeleteChatSession={handleDeleteChatSession}
          onOpenSlateAi={() => handleOpenAiAdvisor()}
          isMobileOpen={isMobileDrawerOpen}
          onMobileClose={() => setIsMobileDrawerOpen(false)}
          isCollapsed={isSidebarCollapsed === 'collapsed'}
          onToggleCollapse={handleToggleSidebar}
        />

        {/* Main Content Area with Sliding Over Transition */}
        <main
          ref={mainContentRef}
          className={`flex-1 bg-[#FAFBFD] dark:bg-[#0f0f10] transition-colors duration-250 ${
            activeTab === 'gemini'
              ? 'h-[calc(100vh-64px)] overflow-hidden pb-[68px] md:pb-0'
              : 'min-h-[calc(100vh-64px)] overflow-y-auto pb-24 md:pb-8'
          }`}
        >
          {activeTab === 'gemini' ? (
            <AiAdvisorDrawer
              isOpen={true}
              classes={classes}
              notes={notes}
              sources={sources}
              sessions={chatSessions}
              currentSessionId={currentChatSessionId}
              onUpdateSessions={setChatSessions}
              onSelectSession={setCurrentChatSessionId}
              initialPrompt={prefilledAdvisorPrompt}
              onClearPrefilledPrompt={() => setPrefilledAdvisorPrompt(undefined)}
            />
          ) : (
            <div className="w-full max-w-[1840px] mx-auto px-3 sm:px-6 md:px-8 xl:px-10 py-4 sm:py-7 transition-all duration-300">
              <div
                key={activeTab + (selectedClassId || '') + (selectedNoteId || '')}
                className={slideDirection === 'right' ? 'animate-slide-right' : 'animate-slide-left'}
              >
                {activeTab === 'notebook' ? (
                  <NotebookView
                    sources={sources}
                    classes={classes}
                    onAddSource={handleAddSource}
                    onUpdateSource={handleUpdateSource}
                    onDeleteSource={handleDeleteSource}
                    onAddClass={handleQuickAddClass}
                    onOpenSlateAi={(prompt) => handleOpenAiAdvisor(prompt)}
                  />
                ) : activeTab === 'todo' ? (
                  <TodoView
                    lists={todoLists}
                    todos={todos}
                    viewMode={viewMode}
                    onAddList={handleAddTodoList}
                    onDeleteList={handleDeleteTodoList}
                    onReorderLists={handleReorderTodoLists}
                    onAddTodo={handleAddTodo}
                    onUpdateTodo={handleUpdateTodo}
                    onDeleteTodo={handleDeleteTodo}
                    onReorderTodos={handleReorderTodos}
                    onClearCompleted={handleClearCompletedTodos}
                  />
                ) : activeClass ? (
                  <ClassDetail
                    classItem={activeClass}
                    onBack={() => {
                      setSlideDirection('left');
                      setSelectedClassId(null);
                    }}
                    onUpdateClass={handleUpdateClass}
                    onDeleteClass={handleDeleteClass}
                    onOpenAiAdvisor={(prompt) => handleOpenAiAdvisor(prompt)}
                  />
                ) : (
                  <Dashboard
                    classes={classes}
                    todos={todos}
                    todoLists={todoLists}
                    onSelectClass={(id) => {
                      setSlideDirection('right');
                      setSelectedClassId(id);
                    }}
                    onOpenAddClass={() => setIsAddModalOpen(true)}
                    onOpenAiAdvisor={(prompt) => handleOpenAiAdvisor(prompt)}
                    onToggleTodo={handleUpdateTodo}
                    onOpenTodo={() => handleTabChange('todo')}
                    viewMode={viewMode}
                  />
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Docked on phones) */}
      <MobileBottomNav
        activeTab={activeTab}
        onChangeTab={handleTabChange}
        selectedClassId={selectedClassId}
        classCount={classes.length}
        noteCount={sources.length}
        todoCount={todos.filter((t) => !t.completed).length}
        onSelectOverview={() => {
          setSlideDirection('left');
          setActiveTab('gradebook');
          setSelectedClassId(null);
        }}
        onOpenMobileDrawer={() => setIsMobileDrawerOpen(true)}
        onOpenAddClass={() => setIsAddModalOpen(true)}
        onOpenAddNote={() => {
          handleTabChange('notebook');
        }}
        onOpenTranscript={() => setIsTranscriptModalOpen(true)}
        onOpenAiAdvisor={() => handleOpenAiAdvisor()}
      />

      {/* Modals & Drawers */}
      <AddClassModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddClass={handleAddClass}
      />

      <TranscriptModal
        isOpen={isTranscriptModalOpen}
        onClose={() => setIsTranscriptModalOpen(false)}
        classes={classes}
      />
    </div>
  );
};

export default App;
