import React, { useState, useEffect, useRef } from 'react';
import type { ClassItem } from './types/grade';
import type { NoteItem, NoteSource } from './types/notebook';
import type { SlabItem, SlabType } from './types/slab';
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

  // Notebook notes state (legacy fallback)
  const [notes, setNotes] = useState<NoteItem[]>(() => getInitialNotes());
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  // Sources Hub state (replaces notetaking)
  const [sources, setSources] = useState<NoteSource[]>(() => getInitialSources());

  // External Slab creation modal config (triggered from Sources Hub)
  const [slabModalConfig, setSlabModalConfig] = useState<{
    prompt?: string;
    type?: SlabType;
    sourceIds?: string[];
  } | undefined>(undefined);
  const [isCreateSlabForced, setIsCreateSlabForced] = useState(false);

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

  // Open Create Slab Modal preselected with source
  const handleOpenCreateSlabFromSource = (options: {
    prompt: string;
    type: 'flashcards' | 'mcq' | 'both';
    sourceId: string;
  }) => {
    setSlabModalConfig({
      prompt: options.prompt,
      type: options.type,
      sourceIds: [options.sourceId],
    });
    setIsCreateSlabForced(true);
    setSlideDirection('right');
    setActiveTab('slab');
    setSelectedSlabId(null);
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
        noteCount={sources.length}
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
          sources={sources}
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
            handleTabChange('notebook');
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
                  sources={sources}
                  classes={classes}
                  selectedSlabId={selectedSlabId}
                  initialCreateConfig={slabModalConfig}
                  isCreateModalForcedOpen={isCreateSlabForced}
                  onCloseCreateModalForced={() => setIsCreateSlabForced(false)}
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
                  sources={sources}
                  classes={classes}
                  onAddSource={handleAddSource}
                  onUpdateSource={handleUpdateSource}
                  onDeleteSource={handleDeleteSource}
                  onAddClass={handleQuickAddClass}
                  onOpenSlateAi={(prompt) => handleOpenAiAdvisor(prompt)}
                  onOpenCreateSlab={handleOpenCreateSlabFromSource}
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
        noteCount={sources.length}
        slabCount={slabs.length}
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
        sources={sources}
        slabs={slabs}
        initialPrompt={prefilledAdvisorPrompt}
        onNavigate={(tab) => {
          setSlideDirection('right');
          setActiveTab(tab);
          if (tab === 'gradebook') setSelectedClassId(null);
          if (tab === 'notebook') setSelectedNoteId(null);
          if (tab === 'slab') setSelectedSlabId(null);
          setIsAiAdvisorOpen(false);
        }}
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
