import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  X,
  LayoutGrid,
  List,
  Settings,
  FileText,
  CloudUpload,
  AlertTriangle,
  User,
  Sun,
  Moon,
  LogOut,
  CheckCircle2,
  ShieldCheck,
  HelpCircle,
  Pencil,
  GraduationCap,
  Menu,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ModalPortal } from './ModalPortal';
import {
  subscribeToSyncStatus,
  getSyncStatus,
  forceSyncToCloud,
  type SyncStatusInfo,
} from '../utils/gradebookService';
import { calculateClassAverage } from '../utils/gradeCalculations';
import type { ClassItem } from '../types/grade';

interface HeaderProps {
  activeTab: 'gradebook' | 'notebook' | 'slab';
  onChangeTab: (tab: 'gradebook' | 'notebook' | 'slab') => void;
  classes: ClassItem[];
  onSelectClass?: (id: string) => void;
  onSelectOverview?: () => void;
  noteCount?: number;
  slabCount?: number;
  onOpenTranscript: () => void;
  onOpenFirebaseConfig: () => void;
  onOpenMobileDrawer?: () => void;
  onOpenAiAdvisor?: () => void;
  viewMode?: 'grid' | 'list';
  onToggleViewMode?: (mode: 'grid' | 'list') => void;
  isSidebarCollapsed?: 'expanded' | 'collapsed';
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onChangeTab,
  classes,
  onSelectClass,
  onSelectOverview,
  noteCount: _noteCount = 0,
  slabCount: _slabCount = 0,
  onOpenTranscript,
  onOpenFirebaseConfig,
  onOpenMobileDrawer: _onOpenMobileDrawer,
  viewMode: controlledViewMode,
  onToggleViewMode,
  isSidebarCollapsed = 'expanded',
  onToggleSidebar,
}) => {
  const { user, isConfigured, signInWithGoogle, logout, authError } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Search state for "Search gradebook"
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // View mode state (grid vs list)
  const [internalViewMode, setInternalViewMode] = useState<'grid' | 'list'>('grid');
  const viewMode = controlledViewMode ?? internalViewMode;

  const handleSetViewMode = (mode: 'grid' | 'list') => {
    setInternalViewMode(mode);
    onToggleViewMode?.(mode);
  };

  // Dropdown states
  const [isAppsMenuOpen, setIsAppsMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  const appsMenuRef = useRef<HTMLDivElement>(null);
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Sync state
  const [syncStatus, setSyncStatus] = useState<SyncStatusInfo>(() => getSyncStatus());
  const [isForceSyncing, setIsForceSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Subscribe to live sync status from gradebookService
  useEffect(() => {
    const unsubscribe = subscribeToSyncStatus((status) => {
      setSyncStatus(status);
    });
    return () => unsubscribe();
  }, []);

  // Close menus on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setIsUserMenuOpen(false);
      }
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(target)) {
        setIsSettingsOpen(false);
      }
      if (appsMenuRef.current && !appsMenuRef.current.contains(target)) {
        setIsAppsMenuOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(target)) {
        setIsSearchOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsUserMenuOpen(false);
        setIsSettingsOpen(false);
        setIsAppsMenuOpen(false);
        setIsSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Exclusive toggle helpers
  const toggleAppsMenu = () => {
    setIsAppsMenuOpen((prev) => !prev);
    setIsSettingsOpen(false);
    setIsUserMenuOpen(false);
    setIsSearchOpen(false);
  };

  const toggleSettingsMenu = () => {
    setIsSettingsOpen((prev) => !prev);
    setIsAppsMenuOpen(false);
    setIsUserMenuOpen(false);
    setIsSearchOpen(false);
  };

  const toggleUserMenu = () => {
    setIsUserMenuOpen((prev) => !prev);
    setIsAppsMenuOpen(false);
    setIsSettingsOpen(false);
    setIsSearchOpen(false);
  };

  const handleForceSync = async () => {
    if (!user) return;
    setIsForceSyncing(true);
    setSyncFeedback(null);
    const res = await forceSyncToCloud(user.uid, classes);
    setIsForceSyncing(false);
    if (res.success) {
      setSyncFeedback('Synced to Cloud!');
      setTimeout(() => setSyncFeedback(null), 3500);
    } else {
      setSyncFeedback(res.error || 'Sync failed');
    }
  };

  // Filter matching classes by name or code
  const trimmedQuery = searchQuery.trim().toLowerCase();
  const matchingClasses = trimmedQuery
    ? classes.filter((c) => {
        return (
          c.name.toLowerCase().includes(trimmedQuery) ||
          (c.code && c.code.toLowerCase().includes(trimmedQuery))
        );
      })
    : [];

  const handleSelectClassItem = (classId: string) => {
    if (onSelectClass) {
      onSelectClass(classId);
    }
    onChangeTab('gradebook');
    setSearchQuery('');
    setIsSearchOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-[#FAFBFD]/95 dark:bg-[#0f0f10]/95 backdrop-blur-md transition-colors duration-250 select-none">
        <div className="w-full px-3 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Left: YouTube-style Sidebar Toggle + Gemini Gradebook Branding */}
          <div className="flex items-center gap-1 sm:gap-2.5 min-w-0 flex-shrink">
            {onToggleSidebar && (
              <button
                type="button"
                onClick={onToggleSidebar}
                className="hidden md:flex p-2 text-slate-500 hover:text-slate-900 dark:text-[#9aa0a6] dark:hover:text-[#e8eaed] hover:bg-slate-200/60 dark:hover:bg-[#202123] rounded-full transition-colors cursor-pointer google-btn-press -ml-1 flex-shrink-0"
                title={isSidebarCollapsed === 'collapsed' ? 'Expand sidebar' : 'Collapse sidebar'}
                aria-label="Toggle navigation drawer"
              >
                <Menu className="w-5 h-5 stroke-[2]" />
              </button>
            )}

            <div
              onClick={() => {
                onChangeTab('gradebook');
                onSelectOverview?.();
              }}
              className="flex items-center gap-2 sm:gap-3 cursor-pointer select-none flex-shrink min-w-0 group"
              title="Gemini Gradebook"
            >
              <img
                src="/gemini-gradebook-logo.png"
                alt="Gemini Gradebook"
                className="w-7 h-7 sm:w-[30px] sm:h-[30px] object-contain flex-shrink-0 group-hover:scale-105 transition-transform duration-200 drop-shadow-xs"
              />
              <span
                className="text-[17px] sm:text-[21px] font-medium tracking-tight text-slate-900 dark:text-[#f8f9fa] antialiased select-none truncate"
                style={{ fontFamily: "'Google Sans', 'Google Sans Text', sans-serif" }}
              >
                Gemini Gradebook
              </span>
            </div>
          </div>

          {/* Right: Search Gradebook, View Toggle, Settings Dropdown, 9-Dots Google Apps, Avatar */}
          <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
            {/* Search Gradebook Pill Input */}
            <div className="relative" ref={searchContainerRef}>
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-slate-400 dark:text-[#9aa0a6] absolute left-3.5 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onFocus={() => {
                    setIsSearchOpen(true);
                    setIsAppsMenuOpen(false);
                    setIsSettingsOpen(false);
                    setIsUserMenuOpen(false);
                  }}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsSearchOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && matchingClasses.length > 0) {
                      handleSelectClassItem(matchingClasses[0].id);
                      searchInputRef.current?.blur();
                    } else if (e.key === 'Escape') {
                      setIsSearchOpen(false);
                      searchInputRef.current?.blur();
                    }
                  }}
                  placeholder="Search"
                  className="w-24 xs:w-32 sm:w-56 md:w-64 lg:w-72 h-10 pl-9 pr-7 sm:pr-8 text-xs sm:text-sm bg-slate-100/90 dark:bg-[#18191b] hover:dark:bg-[#202123] focus:dark:bg-[#18191b] text-slate-900 dark:text-[#e8eaed] placeholder-slate-400 dark:placeholder-[#9aa0a6] rounded-full border border-slate-200/80 dark:border-[#26282a] focus:outline-none focus:ring-1 focus:ring-blue-500/50 dark:focus:ring-[#8ab4f8]/50 transition-all shadow-2xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      searchInputRef.current?.focus();
                    }}
                    className="absolute right-3 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-[#e8eaed] cursor-pointer"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Search Dropdown Results Popup */}
              {isSearchOpen && trimmedQuery.length > 0 && (
                <div className="absolute right-0 sm:left-0 sm:right-auto w-72 sm:w-80 md:w-96 top-full mt-2 bg-white dark:bg-[#18191b] rounded-2xl border border-slate-200/90 dark:border-[#26282a] shadow-2xl p-2 z-50 animate-fade-scale overflow-hidden">
                  <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 dark:text-[#80868b] uppercase tracking-wider border-b border-slate-100 dark:border-[#26282a]">
                    Classes ({matchingClasses.length})
                  </div>

                  <div className="max-h-72 overflow-y-auto py-1 space-y-0.5">
                    {matchingClasses.length > 0 ? (
                      matchingClasses.map((c) => {
                        const calc = calculateClassAverage(c);
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => handleSelectClassItem(c.id)}
                            className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-100/80 dark:hover:bg-[#202123] flex items-center justify-between cursor-pointer transition-colors group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 pr-2">
                              <span
                                className="w-3 h-3 rounded-full flex-shrink-0 shadow-2xs"
                                style={{ backgroundColor: c.color || '#3b82f6' }}
                              />
                              <div className="min-w-0">
                                <div className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-[#e8eaed] truncate group-hover:text-blue-600 dark:group-hover:text-[#8ab4f8]">
                                  {c.name}
                                </div>
                                {c.code && (
                                  <div className="text-[11px] text-slate-400 dark:text-[#9aa0a6] truncate">
                                    {c.code}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <span className="text-xs font-bold text-slate-700 dark:text-[#e8eaed]">
                                {calc.average.toFixed(1)}%
                              </span>
                              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-[#8ab4f8]">
                                {calc.letterGrade}
                              </span>
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="py-6 px-3 text-center">
                        <p className="text-xs text-slate-500 dark:text-[#9aa0a6]">
                          No classes found matching{' '}
                          <span className="font-semibold text-slate-800 dark:text-[#e8eaed]">
                            "{searchQuery}"
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Grid / List Layout Toggle Pill (Controls Dashboard Layout) */}
            <div className="hidden sm:flex items-center bg-slate-100/90 dark:bg-[#18191b] border border-slate-200/80 dark:border-[#26282a] rounded-full p-1 shadow-2xs">
              <button
                type="button"
                onClick={() => handleSetViewMode('grid')}
                className={`p-1.5 rounded-full transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-[#26282a] text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-400 dark:text-[#9aa0a6] hover:text-slate-700 dark:hover:text-[#e8eaed]'
                }`}
                title="Grid view (Card grid)"
                aria-label="Grid view"
              >
                <LayoutGrid className="w-4 h-4 stroke-[2]" />
              </button>
              <button
                type="button"
                onClick={() => handleSetViewMode('list')}
                className={`p-1.5 rounded-full transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-[#26282a] text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-400 dark:text-[#9aa0a6] hover:text-slate-700 dark:hover:text-[#e8eaed]'
                }`}
                title="List view (Compact table)"
                aria-label="List view"
              >
                <List className="w-4 h-4 stroke-[2]" />
              </button>
            </div>

            {/* Settings Gear Dropdown (Includes Appearance, Help, Firebase, Transcript) */}
            <div className="relative" ref={settingsMenuRef}>
              <button
                type="button"
                onClick={toggleSettingsMenu}
                className={`p-2 rounded-full hover:bg-slate-100 dark:hover:bg-[#18191b] transition-colors cursor-pointer google-btn-press ${
                  isSettingsOpen
                    ? 'bg-slate-100 dark:bg-[#18191b] text-blue-600 dark:text-[#8ab4f8]'
                    : 'text-slate-600 dark:text-[#9aa0a6] hover:text-slate-900 dark:hover:text-[#e8eaed]'
                }`}
                title="Settings & Tools"
                aria-label="Settings"
              >
                <Settings className="w-5 h-5 stroke-[1.8]" />
              </button>

              {isSettingsOpen && (
                <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white dark:bg-[#18191b] rounded-2xl shadow-2xl border border-slate-200/90 dark:border-[#26282a] py-3 px-3 z-50 animate-fade-scale">
                  <div className="px-3 pb-2 border-b border-slate-100 dark:border-[#26282a]">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-[#e8eaed]">Settings</h3>
                    <p className="text-[11px] text-slate-400 dark:text-[#9aa0a6]">Preferences & Gradebook configuration</p>
                  </div>

                  <div className="py-2 space-y-1">
                    {/* Appearance toggle item */}
                    <div className="px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#121314] border border-slate-200/60 dark:border-[#26282a] flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        {theme === 'dark' ? (
                          <Moon className="w-4 h-4 text-purple-400" />
                        ) : (
                          <Sun className="w-4 h-4 text-amber-500" />
                        )}
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-[#e8eaed]">Appearance</p>
                          <p className="text-[10px] text-slate-400 dark:text-[#9aa0a6]">
                            {theme === 'dark' ? 'Dark theme' : 'Light theme'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={toggleTheme}
                        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white dark:bg-[#202123] text-slate-700 dark:text-[#e8eaed] border border-slate-200 dark:border-[#26282a] shadow-2xs hover:bg-slate-100 dark:hover:bg-[#26282a] transition-all cursor-pointer google-btn-press"
                      >
                        {theme === 'dark' ? 'Light' : 'Dark'}
                      </button>
                    </div>

                    {/* Help item */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsSettingsOpen(false);
                        setIsHelpModalOpen(true);
                      }}
                      className="w-full text-left px-3 py-2.5 text-xs text-slate-800 dark:text-[#e8eaed] hover:bg-slate-100/80 dark:hover:bg-[#202123] rounded-xl flex items-center gap-3 cursor-pointer transition-colors google-btn-press"
                    >
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
                        <HelpCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold">Help & Calculations</div>
                        <div className="text-[10px] text-slate-400 dark:text-[#9aa0a6]">
                          How weighted grades and GPAs work
                        </div>
                      </div>
                    </button>

                    {/* Firebase & Cloud Settings */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsSettingsOpen(false);
                        onOpenFirebaseConfig();
                      }}
                      className="w-full text-left px-3 py-2.5 text-xs text-slate-800 dark:text-[#e8eaed] hover:bg-slate-100/80 dark:hover:bg-[#202123] rounded-xl flex items-center gap-3 cursor-pointer transition-colors google-btn-press"
                    >
                      <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                        <Settings className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold">Cloud & Firebase Setup</div>
                        <div className="text-[10px] text-slate-400 dark:text-[#9aa0a6]">
                          Keys, Firestore rules, and remote sync
                        </div>
                      </div>
                    </button>

                    {/* Official Academic Transcript */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsSettingsOpen(false);
                        onOpenTranscript();
                      }}
                      className="w-full text-left px-3 py-2.5 text-xs text-slate-800 dark:text-[#e8eaed] hover:bg-slate-100/80 dark:hover:bg-[#202123] rounded-xl flex items-center gap-3 cursor-pointer transition-colors google-btn-press"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-[#8ab4f8] flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold">Academic Transcript</div>
                        <div className="text-[10px] text-slate-400 dark:text-[#9aa0a6]">
                          Export printable official PDF
                        </div>
                      </div>
                    </button>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-[#26282a] px-3 flex items-center justify-between text-[10px] text-slate-400 dark:text-[#80868b]">
                    <span>Gemini Gradebook v1.0</span>
                    <span className="font-medium">Client-side Encrypted</span>
                  </div>
                </div>
              )}
            </div>

            {/* Google Apps 9-Dot Launcher Dropdown (Matches Screenshot Exactly) */}
            <div className="relative" ref={appsMenuRef}>
              <button
                type="button"
                onClick={toggleAppsMenu}
                className={`p-2 rounded-full hover:bg-slate-100 dark:hover:bg-[#18191b] transition-colors cursor-pointer google-btn-press ${
                  isAppsMenuOpen
                    ? 'bg-slate-100 dark:bg-[#18191b] text-blue-600 dark:text-[#8ab4f8]'
                    : 'text-slate-600 dark:text-[#9aa0a6] hover:text-slate-900 dark:hover:text-[#e8eaed]'
                }`}
                title="Google Apps"
                aria-label="Google Apps"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <circle cx="5" cy="5" r="2" />
                  <circle cx="12" cy="5" r="2" />
                  <circle cx="19" cy="5" r="2" />
                  <circle cx="5" cy="12" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="19" cy="12" r="2" />
                  <circle cx="5" cy="19" r="2" />
                  <circle cx="12" cy="19" r="2" />
                  <circle cx="19" cy="19" r="2" />
                </svg>
              </button>

              {/* Google Apps Popover Container */}
              {isAppsMenuOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-[336px] bg-[#282a2d] text-white rounded-[28px] shadow-2xl border border-white/10 p-3 z-50 animate-fade-scale overflow-hidden select-none">
                  {/* Top "Your favorites" elevated dark container matching Google UI */}
                  <div className="bg-[#1b1c1e] rounded-[22px] p-3.5 mb-2 border border-white/5">
                    <div className="flex items-center justify-between mb-3 px-1">
                      <span className="text-sm font-medium text-[#e3e3e3]" style={{ fontFamily: "'Google Sans', Roboto, sans-serif" }}>
                        Your favorites
                      </span>
                      <a
                        href="https://about.google/products/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-7 h-7 rounded-full bg-[#2a2b2e] hover:bg-[#383a3e] flex items-center justify-center text-[#c4c7c5] transition-colors cursor-pointer"
                        title="Edit favorites"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </a>
                    </div>

                    {/* 3x3 Grid of Favorites */}
                    <div className="grid grid-cols-3 gap-y-2 gap-x-1">
                      {/* 1. Account */}
                      <a
                        href="https://myaccount.google.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center justify-center p-2 rounded-2xl hover:bg-white/10 transition-colors group cursor-pointer"
                      >
                        <div className="w-10 h-10 rounded-full bg-black border border-white/10 flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform">
                          {user?.photoURL ? (
                            <img src={user.photoURL} alt="Account" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-5 h-5 text-slate-300" />
                          )}
                        </div>
                        <span className="text-xs text-[#e8eaed] mt-1.5 font-normal truncate">
                          Account
                        </span>
                      </a>

                      {/* 2. Drive */}
                      <a
                        href="https://drive.google.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center justify-center p-2 rounded-2xl hover:bg-white/10 transition-colors group cursor-pointer"
                      >
                        <div className="w-10 h-10 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <svg viewBox="0 0 87.3 78" className="w-9 h-9">
                            <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                            <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                            <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                            <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                            <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                            <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                          </svg>
                        </div>
                        <span className="text-xs text-[#e8eaed] mt-1.5 font-normal truncate">
                          Drive
                        </span>
                      </a>

                      {/* 3. Gmail */}
                      <a
                        href="https://mail.google.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center justify-center p-2 rounded-2xl hover:bg-white/10 transition-colors group cursor-pointer"
                      >
                        <div className="w-10 h-10 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <svg viewBox="0 0 48 48" className="w-9 h-9">
                            <path fill="#4caf50" d="M45,16.2l-5,2.75v18.05c0,1.66-1.34,3-3,3h-5V23.5L24,29.8l-8,-6.3V40H11c-1.66,0-3-1.34-3-3V18.95l-5-2.75C1.84,15.54,1,16.38,1,17.5v21.5c0,3.31,2.69,6,6,6h34c3.31,0,6-2.69,6-6V17.5C47,16.38,46.16,15.54,45,16.2z"/>
                            <path fill="#f44336" d="M41,10.5v8.45l-17,11.9l-17,-11.9V10.5c0,-1.66,1.34,-3,3,-3h28C39.66,7.5,41,8.84,41,10.5z"/>
                          </svg>
                        </div>
                        <span className="text-xs text-[#e8eaed] mt-1.5 font-normal truncate">
                          Gmail
                        </span>
                      </a>

                      {/* 4. YouTube */}
                      <a
                        href="https://youtube.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center justify-center p-2 rounded-2xl hover:bg-white/10 transition-colors group cursor-pointer"
                      >
                        <div className="w-10 h-10 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <svg viewBox="0 0 48 48" className="w-9 h-9">
                            <rect x="4" y="11" width="40" height="26" rx="8" fill="#ff0000"/>
                            <path d="M20 18l11 6-11 6v-12z" fill="#ffffff"/>
                          </svg>
                        </div>
                        <span className="text-xs text-[#e8eaed] mt-1.5 font-normal truncate">
                          YouTube
                        </span>
                      </a>

                      {/* 5. Gemini */}
                      <a
                        href="https://gemini.google.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center justify-center p-2 rounded-2xl hover:bg-white/10 transition-colors group cursor-pointer"
                      >
                        <div className="w-10 h-10 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <img src="/gemini-icon.png" alt="Gemini" className="w-9 h-9 object-contain" />
                        </div>
                        <span className="text-xs text-[#e8eaed] mt-1.5 font-normal truncate">
                          Gemini
                        </span>
                      </a>

                      {/* 6. Maps */}
                      <a
                        href="https://maps.google.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center justify-center p-2 rounded-2xl hover:bg-white/10 transition-colors group cursor-pointer"
                      >
                        <div className="w-10 h-10 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <svg viewBox="0 0 48 48" className="w-9 h-9">
                            <path fill="#4285f4" d="M24 4C14.06 4 6 12.06 6 22c0 6.64 3.73 12.42 9.24 15.48L24 44l8.76-6.52C38.27 34.42 42 28.64 42 22 42 12.06 33.94 4 24 4z"/>
                            <path fill="#34a853" d="M6 22c0 6.64 3.73 12.42 9.24 15.48L24 44V22H6z"/>
                            <path fill="#fbbc04" d="M24 4v18h18C42 12.06 33.94 4 24 4z"/>
                            <path fill="#ea4335" d="M24 4C14.06 4 6 12.06 6 22h18V4z"/>
                            <circle cx="24" cy="18" r="6" fill="#ffffff"/>
                          </svg>
                        </div>
                        <span className="text-xs text-[#e8eaed] mt-1.5 font-normal truncate">
                          Maps
                        </span>
                      </a>

                      {/* 7. Search */}
                      <a
                        href="https://google.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center justify-center p-2 rounded-2xl hover:bg-white/10 transition-colors group cursor-pointer"
                      >
                        <div className="w-10 h-10 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <svg viewBox="0 0 24 24" className="w-8 h-8">
                            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                            <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.02 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                          </svg>
                        </div>
                        <span className="text-xs text-[#e8eaed] mt-1.5 font-normal truncate">
                          Search
                        </span>
                      </a>

                      {/* 8. Calendar */}
                      <a
                        href="https://calendar.google.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center justify-center p-2 rounded-2xl hover:bg-white/10 transition-colors group cursor-pointer"
                      >
                        <div className="w-10 h-10 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <svg viewBox="0 0 48 48" className="w-9 h-9">
                            <rect x="5" y="5" width="38" height="38" rx="10" fill="#1a73e8"/>
                            <rect x="12" y="3" width="5" height="6" rx="2.5" fill="#ffffff"/>
                            <rect x="31" y="3" width="5" height="6" rx="2.5" fill="#ffffff"/>
                            <text x="24" y="33" fill="#ffffff" fontSize="21" fontWeight="bold" fontFamily="'Google Sans', Roboto, sans-serif" textAnchor="middle">31</text>
                          </svg>
                        </div>
                        <span className="text-xs text-[#e8eaed] mt-1.5 font-normal truncate">
                          Calendar
                        </span>
                      </a>

                      {/* 9. News */}
                      <a
                        href="https://news.google.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center justify-center p-2 rounded-2xl hover:bg-white/10 transition-colors group cursor-pointer"
                      >
                        <div className="w-10 h-10 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <svg viewBox="0 0 48 48" className="w-9 h-9">
                            <rect x="18" y="7" width="22" height="22" rx="4" fill="#ea4335" transform="rotate(8 29 18)"/>
                            <rect x="14" y="9" width="22" height="22" rx="4" fill="#fbbc04" transform="rotate(-6 25 20)"/>
                            <rect x="16" y="11" width="22" height="22" rx="4" fill="#34a853"/>
                            <rect x="7" y="13" width="26" height="24" rx="5" fill="#1a73e8"/>
                            <rect x="11" y="18" width="7" height="6" rx="1.5" fill="#ffffff"/>
                            <rect x="21" y="18" width="8" height="2" rx="1" fill="#ffffff"/>
                            <rect x="21" y="22" width="8" height="2" rx="1" fill="#ffffff"/>
                            <rect x="11" y="27" width="18" height="2" rx="1" fill="#ffffff"/>
                            <rect x="11" y="31" width="13" height="2" rx="1" fill="#ffffff"/>
                          </svg>
                        </div>
                        <span className="text-xs text-[#e8eaed] mt-1.5 font-normal truncate">
                          News
                        </span>
                      </a>
                    </div>
                  </div>

                  {/* Below Favorites: More Google apps matching media_1793127154024.png */}
                  <div className="grid grid-cols-3 gap-y-2 gap-x-1 pt-1 pb-1">
                    {/* 10. Photos */}
                    <a
                      href="https://photos.google.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center justify-center p-2 rounded-2xl hover:bg-white/10 transition-colors group cursor-pointer"
                    >
                      <div className="w-10 h-10 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <svg viewBox="0 0 48 48" className="w-9 h-9">
                          <path fill="#ea4335" d="M24 4c-5.52 0-10 4.48-10 10v10h10c5.52 0 10-4.48 10-10s-4.48-10-10-10z"/>
                          <path fill="#fbbc04" d="M44 24c0-5.52-4.48-10-10-10H24v10c0 5.52 4.48 10 10 10s10-4.48 10-10z"/>
                          <path fill="#34a853" d="M24 44c5.52 0 10-4.48 10-10V24H24c-5.52 0-10 4.48-10 10s4.48 10 10 10z"/>
                          <path fill="#4285f4" d="M4 24c0 5.52 4.48 10 10 10h10V24c0-5.52-4.48-10-10-10S4 18.48 4 24z"/>
                        </svg>
                      </div>
                      <span className="text-xs text-[#e8eaed] mt-1.5 font-normal truncate">
                        Photos
                      </span>
                    </a>

                    {/* 11. Meet */}
                    <a
                      href="https://meet.google.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center justify-center p-2 rounded-2xl hover:bg-white/10 transition-colors group cursor-pointer"
                    >
                      <div className="w-10 h-10 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <svg viewBox="0 0 48 48" className="w-9 h-9">
                          <rect x="4" y="10" width="24" height="28" rx="8" fill="#ffba00"/>
                          <path d="M28 19l13-7.5c1.4-.8 3.2.2 3.2 1.8v21.4c0 1.6-1.8 2.6-3.2 1.8L28 29v-10z" fill="#ff9800"/>
                          <circle cx="12" cy="19" r="2.5" fill="#ffffff" opacity="0.9"/>
                        </svg>
                      </div>
                      <span className="text-xs text-[#e8eaed] mt-1.5 font-normal truncate">
                        Meet
                      </span>
                    </a>

                    {/* 12. Translate */}
                    <a
                      href="https://translate.google.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center justify-center p-2 rounded-2xl hover:bg-white/10 transition-colors group cursor-pointer"
                    >
                      <div className="w-10 h-10 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <svg viewBox="0 0 48 48" className="w-9 h-9">
                          <rect x="18" y="14" width="24" height="24" rx="7" fill="#80868b"/>
                          <rect x="6" y="10" width="24" height="24" rx="7" fill="#1a73e8"/>
                          <text x="18" y="27" fill="#ffffff" fontSize="15" fontWeight="bold" fontFamily="'Google Sans', Roboto, sans-serif" textAnchor="middle">G</text>
                          <text x="30" y="31" fill="#ffffff" fontSize="13" fontWeight="bold" fontFamily="'Noto Sans', sans-serif" textAnchor="middle">文</text>
                        </svg>
                      </div>
                      <span className="text-xs text-[#e8eaed] mt-1.5 font-normal truncate">
                        Translate
                      </span>
                    </a>

                    {/* 13. Play */}
                    <a
                      href="https://play.google.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center justify-center p-2 rounded-2xl hover:bg-white/10 transition-colors group cursor-pointer"
                    >
                      <div className="w-10 h-10 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <svg viewBox="0 0 48 48" className="w-9 h-9">
                          <rect x="7" y="7" width="34" height="34" rx="10" fill="#7c8cf8"/>
                          <rect x="10" y="7" width="31" height="34" rx="10" fill="#5865f2" opacity="0.6"/>
                          <path d="M21 16l12 8-12 8v-16z" fill="#ffffff"/>
                        </svg>
                      </div>
                      <span className="text-xs text-[#e8eaed] mt-1.5 font-normal truncate">
                        Play
                      </span>
                    </a>

                    {/* 14. Sheets */}
                    <a
                      href="https://sheets.google.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center justify-center p-2 rounded-2xl hover:bg-white/10 transition-colors group cursor-pointer"
                    >
                      <div className="w-10 h-10 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <svg viewBox="0 0 48 48" className="w-9 h-9">
                          <rect x="6" y="8" width="36" height="32" rx="8" fill="#0f9d58"/>
                          <path d="M12 24h24M24 14v20" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round"/>
                        </svg>
                      </div>
                      <span className="text-xs text-[#e8eaed] mt-1.5 font-normal truncate">
                        Sheets
                      </span>
                    </a>

                    {/* 15. Docs */}
                    <a
                      href="https://docs.google.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center justify-center p-2 rounded-2xl hover:bg-white/10 transition-colors group cursor-pointer"
                    >
                      <div className="w-10 h-10 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <svg viewBox="0 0 48 48" className="w-9 h-9">
                          <path d="M10 6h18l12 12v22a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4V10a4 4 0 0 1 4-4z" fill="#2684fc"/>
                          <path d="M28 6v12h12" fill="#80b5fc" opacity="0.7"/>
                          <rect x="14" y="26" width="16" height="3" rx="1.5" fill="#ffffff"/>
                          <rect x="14" y="33" width="16" height="3" rx="1.5" fill="#ffffff"/>
                        </svg>
                      </div>
                      <span className="text-xs text-[#e8eaed] mt-1.5 font-normal truncate">
                        Docs
                      </span>
                    </a>
                  </div>

                  <a
                    href="https://about.google/products/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-center py-2 text-xs font-medium text-blue-400 hover:text-blue-300 hover:bg-white/5 rounded-xl transition-colors mt-1"
                  >
                    More from Google
                  </a>
                </div>
              )}
            </div>

            {/* Google Account Profile Button with Cyan/Blue Gradient Ring */}
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={toggleUserMenu}
                className="flex items-center justify-center p-[2px] rounded-full bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-500 hover:scale-105 focus:outline-hidden focus:ring-2 focus:ring-blue-500/50 transition-all cursor-pointer google-btn-press shadow-xs flex-shrink-0"
                aria-label="Google Account"
                title={user ? (user.displayName || user.email || 'Google Account') : 'Google Account / Profile'}
              >
                <div className="rounded-full overflow-hidden bg-white dark:bg-[#0f0f10] p-[1.5px]">
                  {user ? (
                    user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName || 'Google Account'}
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-600 text-white font-bold text-xs sm:text-sm flex items-center justify-center">
                        {(user.displayName || user.email || 'U')[0].toUpperCase()}
                      </div>
                    )
                  ) : (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-100 dark:bg-[#18191b] text-slate-600 dark:text-[#e8eaed] flex items-center justify-center">
                      <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 dark:text-[#9aa0a6]" />
                    </div>
                  )}
                </div>
              </button>

              {/* Google Account Popover Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-white dark:bg-[#18191b] rounded-3xl shadow-2xl border border-slate-200/90 dark:border-[#26282a] py-4 px-4 z-50 animate-fade-scale">
                  {/* Centered Google User Card */}
                  <div className="flex flex-col items-center text-center pb-4 border-b border-slate-100 dark:border-[#26282a]">
                    {user ? (
                      user.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt={user.displayName || 'User'}
                          className="w-16 h-16 rounded-full object-cover border-2 border-slate-200 dark:border-[#383a3d] shadow-xs mb-2"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-blue-600 text-white font-bold text-2xl flex items-center justify-center shadow-xs mb-2">
                          {(user.displayName || user.email || 'U')[0].toUpperCase()}
                        </div>
                      )
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-[#202123] text-slate-600 dark:text-slate-300 flex items-center justify-center border border-slate-200 dark:border-[#26282a] mb-2">
                        <User className="w-8 h-8 text-slate-400 dark:text-[#9aa0a6]" />
                      </div>
                    )}

                    <p className="font-bold text-sm text-slate-900 dark:text-[#e8eaed] truncate max-w-[240px]">
                      {user ? (user.displayName || 'Google User') : 'Guest Student'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-[#9aa0a6] truncate max-w-[240px] mt-0.5">
                      {user ? user.email : 'Local offline storage'}
                    </p>

                    <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-[#202123] text-slate-700 dark:text-[#c4c7c5] border border-slate-200/80 dark:border-[#26282a]">
                      {user ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Google Account Connected</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                          <span>Private Guest Mode</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Google-like Action List */}
                  <div className="py-2 space-y-1">
                    {/* Official Academic Transcript */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenTranscript();
                      }}
                      className="w-full text-left px-3.5 py-2.5 text-xs text-slate-800 dark:text-[#e8eaed] hover:bg-slate-100/80 dark:hover:bg-[#202123] rounded-2xl flex items-center gap-3 cursor-pointer font-medium transition-colors google-btn-press"
                    >
                      <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-[#8ab4f8] flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold">Academic Transcript</div>
                        <div className="text-[10px] text-slate-400 dark:text-[#9aa0a6]">Export printable official PDF</div>
                      </div>
                    </button>

                    {/* Sync action if user */}
                    {user && (
                      <button
                        type="button"
                        disabled={isForceSyncing}
                        onClick={handleForceSync}
                        className="w-full text-left px-3.5 py-2.5 text-xs text-slate-800 dark:text-[#e8eaed] hover:bg-slate-100/80 dark:hover:bg-[#202123] rounded-2xl flex items-center justify-between cursor-pointer font-medium transition-colors google-btn-press"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
                            <CloudUpload className={`w-4 h-4 ${isForceSyncing ? 'animate-bounce' : ''}`} />
                          </div>
                          <div>
                            <div className="font-bold">{isForceSyncing ? 'Syncing...' : 'Sync Cloud Database'}</div>
                            <div className="text-[10px] text-slate-400 dark:text-[#9aa0a6]">Save updates to Firestore</div>
                          </div>
                        </div>
                        {syncFeedback && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold ml-2 truncate max-w-[90px]">
                            {syncFeedback}
                          </span>
                        )}
                      </button>
                    )}

                    {/* Sign In button if guest */}
                    {!user && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          if (isConfigured) {
                            signInWithGoogle();
                          } else {
                            onOpenFirebaseConfig();
                          }
                        }}
                        className="w-full text-left px-3.5 py-2.5 text-xs text-blue-700 dark:text-[#8ab4f8] hover:bg-blue-50/80 dark:hover:bg-[#202123] rounded-2xl flex items-center gap-3 cursor-pointer font-bold transition-colors google-btn-press"
                      >
                        <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4" viewBox="0 0 24 24">
                            <path
                              fill="#4285F4"
                              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                            />
                            <path
                              fill="#34A853"
                              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                            />
                            <path
                              fill="#FBBC05"
                              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.02 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                            />
                            <path
                              fill="#EA4335"
                              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                            />
                          </svg>
                        </div>
                        <div>
                          <div>Sign in with Google</div>
                          <div className="text-[10px] text-slate-400 dark:text-[#9aa0a6] font-normal">Sync across all your devices</div>
                        </div>
                      </button>
                    )}

                    {/* Settings */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenFirebaseConfig();
                      }}
                      className="w-full text-left px-3.5 py-2.5 text-xs text-slate-700 dark:text-[#c4c7c5] hover:bg-slate-100/80 dark:hover:bg-[#202123] rounded-2xl flex items-center gap-3 cursor-pointer transition-colors google-btn-press"
                    >
                      <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-[#202123] text-slate-500 dark:text-[#9aa0a6] flex items-center justify-center flex-shrink-0">
                        <Settings className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-[#e8eaed]">Settings & Firebase</div>
                        <div className="text-[10px] text-slate-400 dark:text-[#9aa0a6]">Keys and Firestore setup</div>
                      </div>
                    </button>

                    {/* Appearance Toggle */}
                    <div className="px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-[#121314] border border-slate-200/60 dark:border-[#26282a] flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        {theme === 'dark' ? (
                          <Moon className="w-4 h-4 text-purple-400" />
                        ) : (
                          <Sun className="w-4 h-4 text-amber-500" />
                        )}
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-[#e8eaed]">Appearance</p>
                          <p className="text-[10px] text-slate-400 dark:text-[#9aa0a6]">
                            {theme === 'dark' ? 'Dark theme' : 'Light theme'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={toggleTheme}
                        className="px-2.5 py-1 text-xs font-bold rounded-xl bg-white dark:bg-[#202123] text-slate-700 dark:text-[#e8eaed] border border-slate-200 dark:border-[#26282a] shadow-2xs hover:bg-slate-100 dark:hover:bg-[#26282a] transition-all cursor-pointer google-btn-press"
                      >
                        {theme === 'dark' ? 'Light' : 'Dark'}
                      </button>
                    </div>
                  </div>

                  {/* Sign Out Button (Google Style) */}
                  {user && (
                    <div className="pt-2 border-t border-slate-100 dark:border-[#26282a] mt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          logout();
                        }}
                        className="w-full py-2 px-3 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors google-btn-press"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign out of all accounts</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sync Warning Banner if Firestore returned an error */}
        {user && syncStatus.state === 'error' && syncStatus.errorMessage && (
          <div className="bg-amber-50 dark:bg-amber-950/50 border-t border-amber-200 dark:border-amber-900/60 px-4 py-2 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <span className="font-medium">
                {syncStatus.errorMessage.includes('Permission Denied')
                  ? 'Firestore Security Rules are blocking sync across devices.'
                  : syncStatus.errorMessage}
              </span>
            </div>
            <button
              type="button"
              onClick={onOpenFirebaseConfig}
              className="ml-3 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg cursor-pointer flex-shrink-0 text-[11px] google-btn-press"
            >
              View Rules & Fix
            </button>
          </div>
        )}

        {/* Auth Error Banner */}
        {authError && (
          <div className="bg-rose-50 dark:bg-rose-950/50 border-t border-rose-200 dark:border-rose-900/60 px-4 py-2 text-xs text-rose-700 dark:text-rose-200 flex items-center justify-between">
            <span className="line-clamp-2">{authError}</span>
            <button
              type="button"
              onClick={onOpenFirebaseConfig}
              className="underline font-bold hover:text-rose-900 dark:hover:text-rose-100 cursor-pointer ml-3 flex-shrink-0"
            >
              Check Settings
            </button>
          </div>
        )}
      </header>

      {/* Gradebook Calculation & Help Modal */}
      <ModalPortal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
        maxWidth="max-w-2xl"
        aria-labelledby="help-modal-title"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/10 bg-slate-50/70 dark:bg-white/5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-[#8ab4f8] flex items-center justify-center border border-blue-100 dark:border-blue-900/50">
              <GraduationCap className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <h3 id="help-modal-title" className="font-bold text-base text-slate-900 dark:text-[#e8eaed]" style={{ fontFamily: "'Google Sans', sans-serif" }}>
                How Grades Are Calculated
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#9aa0a6]">Official Academic Calculation Rules</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsHelpModalOpen(false)}
            className="w-9 h-9 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#202123] flex items-center justify-center transition-colors cursor-pointer google-btn-press"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-3.5 text-xs text-slate-600 dark:text-[#c4c7c5] max-h-[60vh] overflow-y-auto">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#202123] border border-slate-200/60 dark:border-[#26282a]">
            <h4 className="font-bold text-sm text-slate-900 dark:text-[#e8eaed] mb-1">1. Weighted Category Averages</h4>
            <p className="leading-relaxed">Each category (e.g. Homework 20%, Exams 50%) computes the arithmetic mean of its graded items. Ungraded or blank scores never count as zeros.</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#202123] border border-slate-200/60 dark:border-[#26282a]">
            <h4 className="font-bold text-sm text-slate-900 dark:text-[#e8eaed] mb-1">2. Unstarted / Empty Categories</h4>
            <p className="leading-relaxed">Empty categories default to 100% contribution so that early in the semester, unfinished categories do not artificially depress your grade.</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#202123] border border-slate-200/60 dark:border-[#26282a]">
            <h4 className="font-bold text-sm text-slate-900 dark:text-[#e8eaed] mb-1">3. Cumulative GPA Scale</h4>
            <p className="leading-relaxed">Weighted GPA is calculated on the standard 4.0 scale (A+ / A = 4.0, A- = 3.7, B+ = 3.3, B = 3.0, B- = 2.7, C+ = 2.3, C = 2.0, D = 1.0, F = 0.0) weighted by course credit hours.</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#202123] border border-slate-200/60 dark:border-[#26282a]">
            <h4 className="font-bold text-sm text-slate-900 dark:text-[#e8eaed] mb-1">4. Cloud Synchronization</h4>
            <p className="leading-relaxed">Sign in with your Google Account anytime to enable real-time device synchronization through Cloud Firestore.</p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 flex justify-end flex-shrink-0">
          <button
            type="button"
            onClick={() => setIsHelpModalOpen(false)}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs cursor-pointer transition-all google-btn-press shadow-sm"
          >
            Got it
          </button>
        </div>
      </ModalPortal>
    </>
  );
};
