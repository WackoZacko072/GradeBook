import React, { useState, useEffect } from 'react';
import type { ClassItem } from './types/grade';
import { loadClasses, saveClasses } from './utils/storage';
import { INITIAL_DEMO_CLASSES } from './utils/sampleData';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { ClassDetail } from './components/ClassDetail';
import { AddClassModal } from './components/AddClassModal';
import { BackupModal } from './components/BackupModal';

export const App: React.FC = () => {
  const [classes, setClasses] = useState<ClassItem[]>(() => loadClasses());
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  // Auto-save to LocalStorage whenever classes change
  useEffect(() => {
    saveClasses(classes);
  }, [classes]);

  // Active selected class
  const activeClass = classes.find((c) => c.id === selectedClassId) || null;

  // Add class handler
  const handleAddClass = (newClass: ClassItem) => {
    setClasses((prev) => [newClass, ...prev]);
    setSelectedClassId(newClass.id); // Open newly created class directly
  };

  // Update full class (categories, assessments, weights)
  const handleUpdateClass = (updated: ClassItem) => {
    setClasses((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    );
  };

  // Restore backup
  const handleRestoreClasses = (restored: ClassItem[]) => {
    setClasses(restored);
    if (selectedClassId && !restored.some((c) => c.id === selectedClassId)) {
      setSelectedClassId(null);
    }
  };

  // Load demo data
  const handleLoadDemoData = () => {
    setClasses(INITIAL_DEMO_CLASSES);
  };

  return (
    <div className="min-h-screen bg-[#FAFBFD] text-[#0F172A] flex flex-col font-sans">
      {/* Top Header */}
      <Header onOpenBackup={() => setIsBackupModalOpen(true)} />

      {/* App Body: Full width flex layout */}
      <div className="flex-1 w-full bg-[#FAFBFD] flex overflow-hidden">
        {/* Left Sidebar (Taskbar) - docked to the side of the window */}
        <Sidebar
          classes={classes}
          selectedClassId={selectedClassId}
          onSelectOverview={() => setSelectedClassId(null)}
          onSelectClass={(id) => setSelectedClassId(id)}
          onOpenAddClass={() => setIsAddModalOpen(true)}
        />

        {/* Main Content Area - spans the rest of the window */}
        <main className="flex-1 min-h-[calc(100vh-64px)] overflow-y-auto bg-[#FAFBFD]">
          {/* Centered Interface Container */}
          <div className="w-full max-w-[1080px] mx-auto px-6 sm:px-8 lg:px-12 py-8">
            {activeClass ? (
              <ClassDetail
                classItem={activeClass}
                onBack={() => setSelectedClassId(null)}
                onUpdateClass={handleUpdateClass}
                onDeleteClass={(id) => {
                  setClasses((prev) => prev.filter((c) => c.id !== id));
                  setSelectedClassId(null);
                }}
              />
            ) : (
              <Dashboard
                classes={classes}
                onSelectClass={(id) => setSelectedClassId(id)}
                onOpenAddClass={() => setIsAddModalOpen(true)}
                onLoadDemoData={handleLoadDemoData}
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
    </div>
  );
};

export default App;
