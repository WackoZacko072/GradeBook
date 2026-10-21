import React, { useState, useEffect, useRef } from 'react';
import type { ClassItem } from './types/grade';
import {
  getInitialClasses,
  loadUserClasses,
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

export const App: React.FC = () => {
  const { user, loading: authLoading } = useAuth();

  // Initialize classes immediately on mount so page refresh NEVER loses data
  const [classes, setClasses] = useState<ClassItem[]>(() => getInitialClasses());
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const initialLoadDoneRef = useRef(false);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isFirebaseConfigOpen, setIsFirebaseConfigOpen] = useState(false);

  // Load classes whenever user changes (or auth initializes)
  useEffect(() => {
    let isCancelled = false;

    async function loadData() {
      if (user) {
        // Authenticated user: load from cloud/cache
        const userClasses = await loadUserClasses(user.uid, user.email, user.displayName);
        if (!isCancelled) {
          setClasses(userClasses);
          setIsDataLoaded(true);
          initialLoadDoneRef.current = true;
        }
      } else {
        // Unauthenticated guest: load local guest classes
        const guestClasses = loadGuestClasses();
        if (!isCancelled) {
          setClasses(guestClasses);
          setIsDataLoaded(true);
          initialLoadDoneRef.current = true;
        }
      }
    }

    if (!authLoading) {
      loadData();
    }

    return () => {
      isCancelled = true;
    };
  }, [user, authLoading]);

  // Save classes whenever they are modified (only after initial data load has finished)
  useEffect(() => {
    if (!initialLoadDoneRef.current && !isDataLoaded) return;

    if (user) {
      saveUserClasses(user.uid, classes);
    } else {
      saveGuestClasses(classes);
    }
  }, [classes, user, isDataLoaded]);

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

  return (
    <div className="min-h-screen bg-[#FAFBFD] text-[#0F172A] flex flex-col font-sans">
      {/* Top Header */}
      <Header
        onOpenBackup={() => setIsBackupModalOpen(true)}
        onOpenFirebaseConfig={() => setIsFirebaseConfigOpen(true)}
      />

      {/* App Body: Full width flex layout */}
      <div className="flex-1 w-full bg-[#FAFBFD] flex overflow-hidden">
        {/* Left Sidebar (Taskbar) */}
        <Sidebar
          classes={classes}
          selectedClassId={selectedClassId}
          onSelectOverview={() => setSelectedClassId(null)}
          onSelectClass={(id) => setSelectedClassId(id)}
          onOpenAddClass={() => setIsAddModalOpen(true)}
        />

        {/* Main Content Area */}
        <main className="flex-1 min-h-[calc(100vh-64px)] overflow-y-auto bg-[#FAFBFD]">
          <div className="w-full max-w-[1080px] mx-auto px-6 sm:px-8 lg:px-12 py-8">
            {activeClass ? (
              <ClassDetail
                classItem={activeClass}
                onBack={() => setSelectedClassId(null)}
                onUpdateClass={handleUpdateClass}
                onDeleteClass={(id) => {
                  setClasses((prev) => {
                    const next = prev.filter((c) => c.id !== id);
                    if (user) saveUserClasses(user.uid, next);
                    else saveGuestClasses(next);
                    return next;
                  });
                  setSelectedClassId(null);
                }}
              />
            ) : (
              <Dashboard
                classes={classes}
                onSelectClass={(id) => setSelectedClassId(id)}
                onOpenAddClass={() => setIsAddModalOpen(true)}
                onLoadDemoData={handleLoadDemoData}
                onOpenFirebaseConfig={() => setIsFirebaseConfigOpen(true)}
              />
            )}
          </div>
        </main>
      </div>

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
    </div>
  );
};

export default App;
