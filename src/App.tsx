import React, { useState, useEffect, useRef } from 'react';
import type { ClassItem } from './types/grade';
import type { NoteItem } from './types/notebook';
import type { SlabItem } from './types/slab';
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
import { useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { ClassDetail } from './components/ClassDetail';
import { NotebookView } from './components/Notebook/NotebookView';
import { SlabView } from './components/Slab/SlabView';
import { AddClassModal } from './components/AddClassModal';
import { TranscriptModal } from './components/TranscriptModal';
import { FirebaseConfigModal } from './components/FirebaseConfigModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { AiAdvisorDrawer } from './components/AiAdvisorDrawer';

const SLABS_STORAGE_KEY = 'gradeslate_slabs_v1';

function loadLocalSlabs(): SlabItem[] {
  try {
    const saved = localStorage.getItem(SLABS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Filter out any mock/demo slabs
        return parsed.filter((s: SlabItem) => s && s.id !== 'slab_demo_micro_1' && !s.id.startsWith('slab_demo_'));
      }
    }
  } catch (e) {
    console.warn('Failed to parse saved slabs', e);
  }
  return [];
}

const TAB_INDEX_MAP: Record<'gradebook' | 'notebook' | 'slab', number> = {
  gradebook: 0,
  notebook: 1,
  slab: 2,
};

export const App: React.FC = () => {
  const { user, loading: authLoading } = useAuth();

  // Top level active tab: Gradebook vs Notebook vs Slab
  const [activeTab, setActiveTab] = useState<'gradebook' | 'notebook' | 'slab'>('gradebook');
  const [slideDirection, setSlideDirection] = useState<'right' | 'left'>('right');

  // Gradebook classes state
  const [classes, setClasses] = useState<ClassItem[]>(() => getInitialClasses());
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  // Notebook notes state
  const [notes, setNotes] = useState<NoteItem[]>(() => getInitialNotes());
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  // Slab flashcards and MCQ state
  const [slabs, setSlabs] = useState<SlabItem[]>(() => loadLocalSlabs());
  const [selectedSlabId, setSelectedSlabId] = useState<string | null>(null);

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

  // Handle Tab Switch with Directional Slide Transition
  const handleTabChange = (nextTab: 'gradebook' | 'notebook' | 'slab') => {
    if (nextTab === activeTab) return;
    const prevIdx = TAB_INDEX_MAP[activeTab];
    const nextIdx = TAB_INDEX_MAP[nextTab];
    setSlideDirection(nextIdx > prevIdx ? 'right' : 'left');
    setActiveTab(nextTab);
    if (nextTab === 'gradebook') setSelectedClassId(null);
    if (nextTab === 'notebook') setSelectedNoteId(null);
    if (nextTab === 'slab') setSelectedSlabId(null);
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

  // Save Slabs to localStorage whenever updated
  useEffect(() => {
    try {
      localStorage.setItem(SLABS_STORAGE_KEY, JSON.stringify(slabs));
    } catch (e) {
      console.warn('Failed to save slabs to localStorage', e);
    }
  }, [slabs]);

  // Scroll to top when active class, active note, or active slab changes
  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [selectedClassId, selectedNoteId, selectedSlabId, activeTab]);

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

  // Notes handlers
  const handleAddNote = (newNote: NoteItem) => {
    setNotes((prev) => {
      const next = [newNote, ...prev];
      if (user) saveUserNotes(user.uid, next);
      else saveGuestNotes(next);
      return next;
    });
    setSlideDirection('right');
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
      setSlideDirection('left');
      setSelectedNoteId(null);
    }
  };

  // Slab handlers (Interactive Flashcards & MCQ Study Sets)
  const handleAddSlab = (newSlab: SlabItem) => {
    setSlabs((prev) => [newSlab, ...prev]);
    setSlideDirection('right');
    setSelectedSlabId(newSlab.id);
    setActiveTab('slab');
    setIsMobileDrawerOpen(false);
  };

  const handleUpdateSlab = (updated: SlabItem) => {
    setSlabs((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  };

  const handleDeleteSlab = (id: string) => {
    setSlabs((prev) => prev.filter((s) => s.id !== id));
    if (selectedSlabId === id) {
      setSlideDirection('left');
      setSelectedSlabId(null);
    }
  };

  const handleOpenAiAdvisor = (prompt?: string) => {
    if (prompt) {
      setPrefilledAdvisorPrompt(prompt);
    }
    setIsAiAdvisorOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#FAFBFD] dark:bg-[#1e1f20] text-[#0F172A] dark:text-[#e8eaed] flex flex-col font-sans transition-colors duration-250">
      {/* Top Header with Sliding Taskbar Indicator & Dark Mode Toggle */}
      <Header
        activeTab={activeTab}
        onChangeTab={handleTabChange}
        classes={classes}
        noteCount={notes.length}
        slabCount={slabs.length}
        onOpenTranscript={() => setIsTranscriptModalOpen(true)}
        onOpenFirebaseConfig={() => setIsFirebaseConfigOpen(true)}
        onOpenMobileDrawer={() => setIsMobileDrawerOpen(true)}
        onOpenAiAdvisor={() => handleOpenAiAdvisor()}
      />

      {/* App Body: Full width flex layout */}
      <div className="flex-1 w-full bg-[#FAFBFD] dark:bg-[#1e1f20] flex overflow-hidden transition-colors duration-250">
        {/* Left Sidebar (Desktop + Mobile Drawer) */}
        <Sidebar
          activeTab={activeTab}
          onChangeTab={handleTabChange}
          classes={classes}
          notes={notes}
          slabs={slabs}
          selectedClassId={selectedClassId}
          selectedNoteId={selectedNoteId}
          selectedSlabId={selectedSlabId}
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
          onSelectSlab={(id) => {
            setSlideDirection(id ? 'right' : 'left');
            setActiveTab('slab');
            setSelectedSlabId(id);
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
          onCreateSlab={() => {
            setSlideDirection('right');
            setActiveTab('slab');
            setSelectedSlabId(null);
          }}
          onOpenSlateAi={() => handleOpenAiAdvisor()}
          isMobileOpen={isMobileDrawerOpen}
          onMobileClose={() => setIsMobileDrawerOpen(false)}
        />

        {/* Main Content Area with Sliding Over Transition */}
        <main
          ref={mainContentRef}
          className="flex-1 min-h-[calc(100vh-64px)] overflow-y-auto bg-[#FAFBFD] dark:bg-[#1e1f20] pb-24 md:pb-8 transition-colors duration-250"
        >
          <div className="w-full max-w-[1140px] mx-auto px-4 sm:px-8 lg:px-10 py-5 sm:py-8">
            <div
              key={activeTab + (selectedClassId || '') + (selectedNoteId || '') + (selectedSlabId || '')}
              className={slideDirection === 'right' ? 'animate-slide-right' : 'animate-slide-left'}
            >
              {activeTab === 'slab' ? (
                <SlabView
                  slabs={slabs}
                  notes={notes}
                  selectedSlabId={selectedSlabId}
                  onSelectSlab={(id) => {
                    setSlideDirection(id ? 'right' : 'left');
                    setSelectedSlabId(id);
                  }}
                  onAddSlab={handleAddSlab}
                  onUpdateSlab={handleUpdateSlab}
                  onDeleteSlab={handleDeleteSlab}
                />
              ) : activeTab === 'notebook' ? (
                <NotebookView
                  notes={notes}
                  classes={classes}
                  selectedNoteId={selectedNoteId}
                  onSelectNote={(id) => {
                    setSlideDirection(id ? 'right' : 'left');
                    setSelectedNoteId(id);
                  }}
                  onAddNote={handleAddNote}
                  onUpdateNote={handleUpdateNote}
                  onDeleteNote={handleDeleteNote}
                  onOpenSlateAi={(prompt) => handleOpenAiAdvisor(prompt)}
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
                  onSelectClass={(id) => {
                    setSlideDirection('right');
                    setSelectedClassId(id);
                  }}
                  onOpenAddClass={() => setIsAddModalOpen(true)}
                  onOpenFirebaseConfig={() => setIsFirebaseConfigOpen(true)}
                  onOpenAiAdvisor={(prompt) => handleOpenAiAdvisor(prompt)}
                />
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Docked on phones) */}
      <MobileBottomNav
        activeTab={activeTab}
        onChangeTab={handleTabChange}
        selectedClassId={selectedClassId}
        classCount={classes.length}
        noteCount={notes.length}
        slabCount={slabs.length}
        onSelectOverview={() => {
          setSlideDirection('left');
          setActiveTab('gradebook');
          setSelectedClassId(null);
        }}
        onOpenMobileDrawer={() => setIsMobileDrawerOpen(true)}
        onOpenAddClass={() => setIsAddModalOpen(true)}
        onOpenAddNote={() => {
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
        onOpenAddSlab={() => {
          setSlideDirection('right');
          setActiveTab('slab');
          setSelectedSlabId(null);
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

      <FirebaseConfigModal
        isOpen={isFirebaseConfigOpen}
        onClose={() => setIsFirebaseConfigOpen(false)}
      />

      {/* AI Advisor Drawer */}
      <AiAdvisorDrawer
        isOpen={isAiAdvisorOpen}
        onClose={() => setIsAiAdvisorOpen(false)}
        classes={classes}
        notes={notes}
        initialPrompt={prefilledAdvisorPrompt}
        onNavigateToClass={(id: string) => {
          setSlideDirection('right');
          setActiveTab('gradebook');
          setSelectedClassId(id);
          setIsAiAdvisorOpen(false);
        }}
        onNavigateToNote={(id: string) => {
          setSlideDirection('right');
          setActiveTab('notebook');
          setSelectedNoteId(id);
          setIsAiAdvisorOpen(false);
        }}
      />
    </div>
  );
};

export default App;
