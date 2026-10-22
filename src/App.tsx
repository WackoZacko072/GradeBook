import React, { useState, useEffect, useRef } from 'react';
import type { ClassItem } from './types/grade';
import {
  getInitialClasses,
  subscribeToUserClasses,
  saveUserClasses,
  loadGuestClasses,
  saveGuestClasses,
} from './utils/gradebookService';
import { INITIAL_DEMO_CLASSES } from './utils/sampleData';
import { useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { ClassDetail } from './components/ClassDetail';
import { AddClassModal } from './components/AddClassModal';
import { BackupModal } from './components/BackupModal';
import { FirebaseConfigModal } from './components/FirebaseConfigModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { AiAdvisorDrawer } from './components/AiAdvisorDrawer';
import { Sparkles } from 'lucide-react';

export const App: React.FC = () => {
  const { user, loading: authLoading } = useAuth();

  // Initialize classes immediately on mount so page refresh NEVER loses data
  const [classes, setClasses] = useState<ClassItem[]>(() => getInitialClasses());
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [_isDataLoaded, setIsDataLoaded] = useState(false);

  // Modals & Navigation state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isFirebaseConfigOpen, setIsFirebaseConfigOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // AI Advisor Drawer state
  const [isAiAdvisorOpen, setIsAiAdvisorOpen] = useState(false);
  const [prefilledAdvisorPrompt, setPrefilledAdvisorPrompt] = useState<string | undefined>(undefined);

  // Scroll ref for main content
  const mainContentRef = useRef<HTMLElement>(null);

  // Real-time synchronization: subscribe to user classes in Firestore
  // Automatically syncs computer and phone seamlessly without data loss!
  useEffect(() => {
    let unsubscribeUser: (() => void) | null = null;

    if (authLoading) return;

    if (user) {
      // Authenticated user: real-time live sync across devices
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
      // Unauthenticated guest: load local guest classes
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

  // Scroll to top when active class changes
  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [selectedClassId]);

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
    setSelectedClassId(newClass.id); // Open newly created class directly
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

  // Restore backup
  const handleRestoreClasses = (restored: ClassItem[]) => {
    setClasses(restored);
    if (user) saveUserClasses(user.uid, restored);
    else saveGuestClasses(restored);
    if (selectedClassId && !restored.some((c) => c.id === selectedClassId)) {
      setSelectedClassId(null);
    }
  };

  // Load demo data
  const handleLoadDemoData = () => {
    setClasses(INITIAL_DEMO_CLASSES);
    if (user) {
      saveUserClasses(user.uid, INITIAL_DEMO_CLASSES);
    } else {
      saveGuestClasses(INITIAL_DEMO_CLASSES);
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
        classes={classes}
        onOpenBackup={() => setIsBackupModalOpen(true)}
        onOpenFirebaseConfig={() => setIsFirebaseConfigOpen(true)}
        onOpenMobileDrawer={() => setIsMobileDrawerOpen(true)}
        onOpenAiAdvisor={() => handleOpenAiAdvisor()}
      />

      {/* App Body: Full width flex layout */}
      <div className="flex-1 w-full bg-[#FAFBFD] flex overflow-hidden">
        {/* Left Sidebar (Desktop + Mobile Drawer) */}
        <Sidebar
          classes={classes}
          selectedClassId={selectedClassId}
          onSelectOverview={() => setSelectedClassId(null)}
          onSelectClass={(id) => setSelectedClassId(id)}
          onOpenAddClass={() => setIsAddModalOpen(true)}
          isMobileOpen={isMobileDrawerOpen}
          onMobileClose={() => setIsMobileDrawerOpen(false)}
        />

        {/* Main Content Area */}
        <main
          ref={mainContentRef}
          className="flex-1 min-h-[calc(100vh-64px)] overflow-y-auto bg-[#FAFBFD] pb-24 md:pb-8"
        >
          <div className="w-full max-w-[1080px] mx-auto px-4 sm:px-8 lg:px-12 py-5 sm:py-8">
            {activeClass ? (
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
        selectedClassId={selectedClassId}
        classCount={classes.length}
        onSelectOverview={() => setSelectedClassId(null)}
        onOpenMobileDrawer={() => setIsMobileDrawerOpen(true)}
        onOpenAddClass={() => setIsAddModalOpen(true)}
        onOpenBackup={() => setIsBackupModalOpen(true)}
        onOpenAiAdvisor={() => handleOpenAiAdvisor()}
      />

      {/* Modals */}
      <AddClassModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddClass={handleAddClass}
      />

      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        classes={classes}
        onRestoreClasses={handleRestoreClasses}
      />

      <FirebaseConfigModal
        isOpen={isFirebaseConfigOpen}
        onClose={() => setIsFirebaseConfigOpen(false)}
      />

      {/* Small floating AI symbol in corner - matching the blue & white logo */}
      <button
        type="button"
        onClick={() => handleOpenAiAdvisor()}
        title="AI Academic Advisor"
        aria-label="Open AI Academic Advisor"
        className="fixed bottom-20 md:bottom-6 right-5 md:right-7 z-40 w-12 h-12 md:w-13 md:h-13 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white shadow-lg hover:shadow-xl shadow-blue-600/30 flex items-center justify-center transition-all cursor-pointer group border-2 border-white"
      >
        <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-white stroke-[2.2] group-hover:scale-110 transition-transform duration-200" />
      </button>

      {/* AI Academic Advisor Drawer */}
      <AiAdvisorDrawer
        isOpen={isAiAdvisorOpen}
        onClose={() => setIsAiAdvisorOpen(false)}
        classes={classes}
        prefilledPrompt={prefilledAdvisorPrompt}
        onClearPrefilledPrompt={() => setPrefilledAdvisorPrompt(undefined)}
      />
    </div>
  );
};

export default App;
