import React, { useState, useEffect, useRef } from 'react';
import type { ClassItem } from './types/grade';
import type { NoteItem } from './types/notebook';
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
  saveUserNotes,
  loadGuestNotes,
  saveGuestNotes,
} from './utils/notebookService';
import { INITIAL_DEMO_CLASSES } from './utils/sampleData';
import { INITIAL_DEMO_NOTES } from './utils/sampleNotebookData';
import { useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { ClassDetail } from './components/ClassDetail';
import { NotebookView } from './components/Notebook/NotebookView';
import { AddClassModal } from './components/AddClassModal';
import { TranscriptModal } from './components/TranscriptModal';
import { FirebaseConfigModal } from './components/FirebaseConfigModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { AiAdvisorDrawer } from './components/AiAdvisorDrawer';
import { Sparkles } from 'lucide-react';

export const App: React.FC = () => {
  const { user, loading: authLoading } = useAuth();

  // Top level active tab: Gradebook vs Notebook
  const [activeTab, setActiveTab] = useState<'gradebook' | 'notebook'>('gradebook');

  // Gradebook classes state
  const [classes, setClasses] = useState<ClassItem[]>(() => getInitialClasses());
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  // Notebook notes state
  const [notes, setNotes] = useState<NoteItem[]>(() => getInitialNotes());
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  const [_isDataLoaded, setIsDataLoaded] = useState(false);

  // Modals & Navigation state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isTranscriptModalOpen, setIsTranscriptModalOpen] = useState(false);
  const [isFirebaseConfigOpen, setIsFirebaseConfigOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // AI Advisor Drawer state
  const [isAiAdvisorOpen, setIsAiAdvisorOpen] = useState(false);
  const [prefilledAdvisorPrompt, setPrefilledAdvisorPrompt] = useState<string | undefined>(undefined);

  // Scroll ref for main content
  const mainContentRef = useRef<HTMLElement>(null);

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

  // Scroll to top when active class or active note changes
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
      setSelectedClassId(null);
    }
  };

  // Load demo classes
  const handleLoadDemoData = () => {
    setClasses(INITIAL_DEMO_CLASSES);
    if (user) {
      saveUserClasses(user.uid, INITIAL_DEMO_CLASSES);
    } else {
      saveGuestClasses(INITIAL_DEMO_CLASSES);
    }
  };

  // Notes handlers
  const handleAddNote = (newNote: NoteItem) => {
    setNotes((prev) => {
      const next = [newNote, ...prev];
      if (user) saveUserNotes(user.uid, next);
      else saveGuestNotes(next);
      return next;
    });
    setSelectedNoteId(newNote.id);
    setActiveTab('notebook');
    setIsMobileDrawerOpen(false);
  };

  const handleUpdateNote = (updated: NoteItem) => {
    setNotes((prev) => {
      const next = prev.map((n) => (n.id === updated.id ? updated : n));
      if (user) saveUserNotes(user.uid, next);
      else saveGuestNotes(next);
      return next;
    });
  };

  const handleDeleteNote = (id: string) => {
    setNotes((prev) => {
      const next = prev.filter((n) => n.id !== id);
      if (user) saveUserNotes(user.uid, next);
      else saveGuestNotes(next);
      return next;
    });
    if (selectedNoteId === id) {
      setSelectedNoteId(null);
    }
  };

  const handleLoadDemoNotes = () => {
    setNotes(INITIAL_DEMO_NOTES);
    if (user) {
      saveUserNotes(user.uid, INITIAL_DEMO_NOTES);
    } else {
      saveGuestNotes(INITIAL_DEMO_NOTES);
    }
  };

  const handleOpenAiAdvisor = (prompt?: string) => {
    if (prompt) {
      setPrefilledAdvisorPrompt(prompt);
    }
    setIsAiAdvisorOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#FAFBFD] text-[#0F172A] flex flex-col font-sans">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        onChangeTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'gradebook') setSelectedClassId(null);
          if (tab === 'notebook') setSelectedNoteId(null);
        }}
        classes={classes}
        noteCount={notes.length}
        onOpenTranscript={() => setIsTranscriptModalOpen(true)}
        onOpenFirebaseConfig={() => setIsFirebaseConfigOpen(true)}
        onOpenMobileDrawer={() => setIsMobileDrawerOpen(true)}
        onOpenAiAdvisor={() => handleOpenAiAdvisor()}
      />

      {/* App Body: Full width flex layout */}
      <div className="flex-1 w-full bg-[#FAFBFD] flex overflow-hidden">
        {/* Left Sidebar (Desktop + Mobile Drawer) */}
        <Sidebar
          activeTab={activeTab}
          onChangeTab={(tab) => {
            setActiveTab(tab);
            if (tab === 'gradebook') setSelectedClassId(null);
            if (tab === 'notebook') setSelectedNoteId(null);
          }}
          classes={classes}
          notes={notes}
          selectedClassId={selectedClassId}
          selectedNoteId={selectedNoteId}
          onSelectOverview={() => {
            setActiveTab('gradebook');
            setSelectedClassId(null);
          }}
          onSelectClass={(id) => {
            setActiveTab('gradebook');
            setSelectedClassId(id);
          }}
          onSelectNote={(id) => {
            setActiveTab('notebook');
            setSelectedNoteId(id);
          }}
          onOpenAddClass={() => setIsAddModalOpen(true)}
          onCreateNote={() => {
            const newNote: NoteItem = {
              id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              title: 'Untitled Note',
              icon: '📝',
              content: '',
              sources: [],
              multipleChoice: [],
              longAnswer: [],
              flashcards: [],
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };
            handleAddNote(newNote);
          }}
          onOpenSlateAi={() => handleOpenAiAdvisor()}
          isMobileOpen={isMobileDrawerOpen}
          onMobileClose={() => setIsMobileDrawerOpen(false)}
        />

        {/* Main Content Area */}
        <main
          ref={mainContentRef}
          className="flex-1 min-h-[calc(100vh-64px)] overflow-y-auto bg-[#FAFBFD] pb-24 md:pb-8"
        >
          <div className="w-full max-w-[1140px] mx-auto px-4 sm:px-8 lg:px-10 py-5 sm:py-8">
            {activeTab === 'notebook' ? (
              <NotebookView
                notes={notes}
                classes={classes}
                selectedNoteId={selectedNoteId}
                onSelectNote={(id) => setSelectedNoteId(id)}
                onAddNote={handleAddNote}
                onUpdateNote={handleUpdateNote}
                onDeleteNote={handleDeleteNote}
                onLoadDemoNotes={handleLoadDemoNotes}
                onOpenSlateAi={(prompt) => handleOpenAiAdvisor(prompt)}
              />
            ) : activeClass ? (
              <ClassDetail
                classItem={activeClass}
                onBack={() => setSelectedClassId(null)}
                onUpdateClass={handleUpdateClass}
                onDeleteClass={handleDeleteClass}
                onOpenAiAdvisor={(prompt) => handleOpenAiAdvisor(prompt)}
              />
            ) : (
              <Dashboard
                classes={classes}
                onSelectClass={(id) => setSelectedClassId(id)}
                onOpenAddClass={() => setIsAddModalOpen(true)}
                onLoadDemoData={handleLoadDemoData}
                onOpenFirebaseConfig={() => setIsFirebaseConfigOpen(true)}
                onOpenAiAdvisor={(prompt) => handleOpenAiAdvisor(prompt)}
              />
            )}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Docked on phones) */}
      <MobileBottomNav
        activeTab={activeTab}
        onChangeTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'gradebook') setSelectedClassId(null);
          if (tab === 'notebook') setSelectedNoteId(null);
        }}
        selectedClassId={selectedClassId}
        classCount={classes.length}
        noteCount={notes.length}
        onSelectOverview={() => {
          setActiveTab('gradebook');
          setSelectedClassId(null);
        }}
        onOpenMobileDrawer={() => setIsMobileDrawerOpen(true)}
        onOpenAddClass={() => setIsAddModalOpen(true)}
        onOpenAddNote={() => {
          const newNote: NoteItem = {
            id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            title: 'Untitled Note',
            content: '',
            sources: [],
            multipleChoice: [],
            longAnswer: [],
            flashcards: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          handleAddNote(newNote);
        }}
        onOpenTranscript={() => setIsTranscriptModalOpen(true)}
        onOpenAiAdvisor={() => handleOpenAiAdvisor()}
      />

      {/* Modals */}
      <AddClassModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddClass={handleAddClass}
      />

      <TranscriptModal
        isOpen={isTranscriptModalOpen}
        onClose={() => setIsTranscriptModalOpen(false)}
        classes={classes}
        defaultStudentName={user?.displayName || undefined}
      />

      <FirebaseConfigModal
        isOpen={isFirebaseConfigOpen}
        onClose={() => setIsFirebaseConfigOpen(false)}
      />

      {/* Slate AI Floating Button */}
      <button
        type="button"
        onClick={() => handleOpenAiAdvisor()}
        title="Slate AI — Gemini Academic Co-Pilot"
        aria-label="Open Slate AI"
        className="fixed bottom-20 md:bottom-6 right-5 md:right-7 z-40 px-3.5 py-2.5 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 hover:from-blue-700 hover:via-indigo-700 hover:to-sky-600 active:scale-95 text-white shadow-lg hover:shadow-xl shadow-blue-600/30 flex items-center gap-2 transition-all cursor-pointer group border border-white/30"
      >
        <Sparkles className="w-5 h-5 text-white stroke-[2.2] group-hover:scale-110 transition-transform duration-200" />
        <span className="font-extrabold text-xs hidden sm:inline tracking-tight">Slate AI</span>
      </button>

      {/* Slate AI Drawer */}
      <AiAdvisorDrawer
        isOpen={isAiAdvisorOpen}
        onClose={() => setIsAiAdvisorOpen(false)}
        classes={classes}
        notes={notes}
        prefilledPrompt={prefilledAdvisorPrompt}
        onClearPrefilledPrompt={() => setPrefilledAdvisorPrompt(undefined)}
        onNavigate={(tab) => {
          setActiveTab(tab);
          if (tab === 'gradebook') setSelectedClassId(null);
          if (tab === 'notebook') setSelectedNoteId(null);
          setIsAiAdvisorOpen(false);
        }}
      />
    </div>
  );
};

export default App;
