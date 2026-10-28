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
}) => {
  const { user, isConfigured, signInWithGoogle, logout, authError } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Search state for "Search gradebook"
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [viewportRect, setViewportRect] = useState<{ height: number; offsetTop: number } | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);

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
        setIsMobileSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Track visualViewport for mobile keyboard docking and auto-focus mobile search input
  useEffect(() => {
    if (!isMobileSearchOpen) {
      setViewportRect(null);
      return;
    }

    const timer = setTimeout(() => {
      mobileSearchInputRef.current?.focus();
    }, 50);

    const vv = window.visualViewport;
    if (!vv) {
      return () => clearTimeout(timer);
    }

    const updateViewport = () => {
      setViewportRect({
        height: vv.height,
        offsetTop: vv.offsetTop,
      });
    };

    updateViewport();
    vv.addEventListener('resize', updateViewport);
    vv.addEventListener('scroll', updateViewport);
    return () => {
      clearTimeout(timer);
      vv.removeEventListener('resize', updateViewport);
      vv.removeEventListener('scroll', updateViewport);
    };
  }, [isMobileSearchOpen]);

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

  const openMobileSearch = () => {
    setIsAppsMenuOpen(false);
    setIsSettingsOpen(false);
    setIsUserMenuOpen(false);
    setIsSearchOpen(false);
    setIsMobileSearchOpen(true);
  };

  const closeMobileSearch = () => {
    setIsMobileSearchOpen(false);
    setSearchQuery('');
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
  const mobileDisplayClasses = trimmedQuery ? matchingClasses : classes;

  const handleSelectClassItem = (classId: string) => {
    if (onSelectClass) {
      onSelectClass(classId);
    }
    onChangeTab('gradebook');
    setSearchQuery('');
    setIsSearchOpen(false);
    setIsMobileSearchOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-[#FAFBFD]/95 dark:bg-[#0f0f10]/95 backdrop-blur-md transition-colors duration-250 select-none">
        <div className="w-full px-5 sm:px-7 h-16 flex items-center justify-between gap-3">
          {/* Left: Gemini Gradebook Branding (title-only on mobile, logo + title on desktop) */}
          <div className="flex items-center min-w-0 flex-shrink">
            <div
              onClick={() => {
                onChangeTab('gradebook');
                onSelectOverview?.();
              }}
              className="flex items-center gap-2.5 sm:gap-3 cursor-pointer select-none flex-shrink min-w-0 group"
              title="Gemini Gradebook"
            >
              <img
                src="/gemini-gradebook-logo.png"
                alt="Gemini Gradebook"
                className="hidden sm:block w-[27px] h-[27px] object-contain flex-shrink-0 -translate-y-[0.5px] group-hover:scale-105 transition-transform duration-200"
              />
              <span
                className="text-[21px] sm:text-[23px] font-medium tracking-[-0.015em] leading-none text-slate-900 dark:text-[#f8f9fa] antialiased select-none truncate"
                style={{ fontFamily: "'Google Sans', 'Google Sans Text', sans-serif" }}
              >
                Gemini Gradebook
              </span>
            </div>
          </div>

          {/* Right: Mobile Magnifying Glass / Desktop Search Pill, View Toggle, Settings, 9-Dots (desktop), Avatar */}
          <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
            {/* Mobile Magnifying Glass Button */}
            <button
              type="button"
              onClick={openMobileSearch}
              className="sm:hidden p-2 rounded-full text-slate-600 dark:text-[#9aa0a6] hover:text-slate-900 dark:hover:text-[#e8eaed] hover:bg-slate-100 dark:hover:bg-[#18191b] transition-colors cursor-pointer google-btn-press"
              title="Search classes"
              aria-label="Search classes"
            >
              <Search className="w-5 h-5 stroke-[1.8]" />
            </button>

            {/* Desktop Search Gradebook Pill Input */}
            <div className="hidden sm:block relative" ref={searchContainerRef}>
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

            {/* Google Apps 9-Dot Launcher Dropdown (Desktop only, hidden on mobile) */}
            <div className="hidden sm:block relative" ref={appsMenuRef}>
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
                        className="w-12 h-8 rounded-full bg-[#3c4043] hover:bg-[#4a4e52] flex items-center justify-center text-[#e3e3e3] transition-colors cursor-pointer"
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

                      {/* 2. Drive (Rounded gradient triangle matching screenshot) */}
                      <a
                        href="https://drive.google.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center justify-center p-2 rounded-2xl hover:bg-white/10 transition-colors group cursor-pointer"
                      >
                        <div className="w-10 h-10 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <svg viewBox="0 0 48 48" className="w-9 h-9">
                            <defs>
                              <linearGradient id="gg-drive-green" x1="0%" y1="100%" x2="80%" y2="0%">
                                <stop offset="0%" stopColor="#5ec8ff" />
                                <stop offset="45%" stopColor="#00b359" />
                                <stop offset="100%" stopColor="#00a651" />
                              </linearGradient>
                              <linearGradient id="gg-drive-blue" x1="0%" y1="30%" x2="100%" y2="90%">
                                <stop offset="0%" stopColor="#1a78ff" />
                                <stop offset="70%" stopColor="#3b82f6" />
                                <stop offset="100%" stopColor="#999cff" />
                              </linearGradient>
                              <linearGradient id="gg-drive-yellow" x1="20%" y1="0%" x2="80%" y2="100%">
                                <stop offset="0%" stopColor="#ffd633" />
                                <stop offset="100%" stopColor="#fbbc04" />
                              </linearGradient>
                            </defs>
                            {/* Top Green Lobe */}
                            <path
                              fill="url(#gg-drive-green)"
                              d="M17.2 9.5C19.2 6 23.8 5 27.5 6.8c1.8.9 3.3 2.5 4.3 4.3l3.2 5.6-15.5 8.8H9.2l8-16z"
                            />
                            {/* Bottom-Left Blue Lobe */}
                            <path
                              fill="url(#gg-drive-blue)"
                              d="M9.2 25.5h10.3l8.8 15.5H14.5c-4.2 0-7.8-2.8-8.8-6.8-.6-2.5 0-5.2 1.5-7.4l2-1.3z"
                            />
                            {/* Right Yellow Lobe */}
                            <path
                              fill="url(#gg-drive-yellow)"
                              d="M35 16.7l6.8 11.8c2.2 3.8.9 8.7-2.9 10.9-1.2.7-2.6 1.1-4 1.1h-6.6l-4.3-15 11-8.8z"
                            />
                            {/* Center dark triangle cutout */}
                            <path fill="#1b1c1e" d="M19.5 25.5h9l-4.5 7.8-4.5-7.8z" />
                          </svg>
                        </div>
                        <span className="text-xs text-[#e8eaed] mt-1.5 font-normal truncate">
                          Drive
                        </span>
                      </a>

                      {/* 3. Gmail (Smooth gradient M ribbon matching screenshot) */}
                      <a
                        href="https://mail.google.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center justify-center p-2 rounded-2xl hover:bg-white/10 transition-colors group cursor-pointer"
                      >
                        <div className="w-10 h-10 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <svg viewBox="0 0 48 48" className="w-9 h-9">
                            <defs>
                              <linearGradient id="gg-gmail-left" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#ff6ca8" />
                                <stop offset="35%" stopColor="#ff4438" />
                                <stop offset="100%" stopColor="#ff3b30" />
                              </linearGradient>
                              <linearGradient id="gg-gmail-right" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#ffca22" />
                                <stop offset="38%" stopColor="#00b359" />
                                <stop offset="72%" stopColor="#00a8ff" />
                                <stop offset="100%" stopColor="#1a6bff" />
                              </linearGradient>
                              <linearGradient id="gg-gmail-v" x1="0%" y1="30%" x2="100%" y2="30%">
                                <stop offset="0%" stopColor="#ff6ca8" />
                                <stop offset="35%" stopColor="#ff4438" />
                                <stop offset="70%" stopColor="#ff5e1a" />
                                <stop offset="100%" stopColor="#ffca22" />
                              </linearGradient>
                            </defs>
                            {/* Left vertical leg */}
                            <path
                              fill="url(#gg-gmail-left)"
                              d="M5 13.5C5 10.2 8.8 8.3 11.5 10.3L15.5 13.3V36c0 2.2-1.8 4-4 4h-3c-1.9 0-3.5-1.6-3.5-3.5V13.5z"
                            />
                            {/* Right vertical leg */}
                            <path
                              fill="url(#gg-gmail-right)"
                              d="M43 13.5c0-3.3-3.8-5.2-6.5-3.2l-4 3V36c0 2.2 1.8 4 4 4h3c1.9 0 3.5-1.6 3.5-3.5V13.5z"
                            />
                            {/* Center M chevron ribbon */}
                            <path
                              fill="url(#gg-gmail-v)"
                              d="M6.4 10.8c1.6-1.9 4.4-2.2 6.4-.7L24 18.6l11.2-8.5c2-1.5 4.8-1.2 6.4.7 1.6 1.9 1.2 4.8-.8 6.3l-14.2 10.8c-1.5 1.2-3.7 1.2-5.2 0L7.2 17.1c-2-1.5-2.4-4.4-.8-6.3z"
                            />
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
                            <path
                              fill="#FF0000"
                              d="M43.2 13.9c-.46-1.73-1.82-3.09-3.55-3.55C36.52 9.5 24 9.5 24 9.5s-12.52 0-15.65.85c-1.73.46-3.09 1.82-3.55 3.55C4 17.03 4 24 4 24s0 6.97.8 10.1c.46 1.73 1.82 3.09 3.55 3.55 3.13.85 15.65.85 15.65.85s12.52 0 15.65-.85c1.73-.46 3.09-1.82 3.55-3.55.8-3.13.8-10.1.8-10.1s0-6.97-.8-10.1z"
                            />
                            <path fill="#FFFFFF" d="M20 30.2V17.8L30.8 24 20 30.2z" />
                          </svg>
                        </div>
                        <span className="text-xs text-[#e8eaed] mt-1.5 font-normal truncate">
                          YouTube
                        </span>
                      </a>

                      {/* 5. Gemini (4-color gradient star matching screenshot) */}
                      <a
                        href="https://gemini.google.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center justify-center p-2 rounded-2xl hover:bg-white/10 transition-colors group cursor-pointer"
                      >
                        <div className="w-10 h-10 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <svg viewBox="0 0 48 48" className="w-9 h-9">
                            <defs>
                              <radialGradient id="gg-gemini-tl" cx="22%" cy="22%" r="55%">
                                <stop offset="0%" stopColor="#ff5252" />
                                <stop offset="55%" stopColor="#ea4335" stopOpacity="0.85" />
                                <stop offset="100%" stopColor="#4285f4" stopOpacity="0" />
                              </radialGradient>
                              <radialGradient id="gg-gemini-bl" cx="22%" cy="78%" r="55%">
                                <stop offset="0%" stopColor="#34a853" />
                                <stop offset="45%" stopColor="#fbbc04" stopOpacity="0.85" />
                                <stop offset="100%" stopColor="#4285f4" stopOpacity="0" />
                              </radialGradient>
                              <linearGradient id="gg-gemini-base" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#669df6" />
                                <stop offset="55%" stopColor="#4285f4" />
                                <stop offset="100%" stopColor="#1a73e8" />
                              </linearGradient>
                            </defs>
                            <path
                              fill="url(#gg-gemini-base)"
                              d="M24 3C24 14.6 14.6 24 3 24c11.6 0 21 9.4 21 21 0-11.6 9.4-21 21-21-11.6 0-21-9.4-21-21z"
                            />
                            <path
                              fill="url(#gg-gemini-tl)"
                              d="M24 3C24 14.6 14.6 24 3 24c11.6 0 21 9.4 21 21 0-11.6 9.4-21 21-21-11.6 0-21-9.4-21-21z"
                            />
                            <path
                              fill="url(#gg-gemini-bl)"
                              d="M24 3C24 14.6 14.6 24 3 24c11.6 0 21 9.4 21 21 0-11.6 9.4-21 21-21-11.6 0-21-9.4-21-21z"
                            />
                          </svg>
                        </div>
                        <span className="text-xs text-[#e8eaed] mt-1.5 font-normal truncate">
                          Gemini
                        </span>
                      </a>

                      {/* 6. Maps (Smooth gradient pin matching screenshot) */}
                      <a
                        href="https://maps.google.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center justify-center p-2 rounded-2xl hover:bg-white/10 transition-colors group cursor-pointer"
                      >
                        <div className="w-10 h-10 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <svg viewBox="0 0 48 48" className="w-9 h-9">
                            <defs>
                              <linearGradient id="gg-maps-vert" x1="15%" y1="10%" x2="65%" y2="95%">
                                <stop offset="0%" stopColor="#ff3b30" />
                                <stop offset="38%" stopColor="#ffb81a" />
                                <stop offset="72%" stopColor="#00b359" />
                                <stop offset="100%" stopColor="#00a651" />
                              </linearGradient>
                              <radialGradient id="gg-maps-tr" cx="72%" cy="18%" r="58%">
                                <stop offset="0%" stopColor="#2684ff" />
                                <stop offset="48%" stopColor="#8c6bff" stopOpacity="0.85" />
                                <stop offset="100%" stopColor="#00b359" stopOpacity="0" />
                              </radialGradient>
                            </defs>
                            <path
                              fill="url(#gg-maps-vert)"
                              fillRule="evenodd"
                              d="M24 4C14.6 4 7 11.6 7 21c0 10.8 13.8 21.5 15.8 23 .7.5 1.7.5 2.4 0C27.2 42.5 41 31.8 41 21c0-9.4-7.6-17-17-17zm0 10.2a6.8 6.8 0 1 1 0 13.6 6.8 6.8 0 0 1 0-13.6z"
                            />
                            <path
                              fill="url(#gg-maps-tr)"
                              fillRule="evenodd"
                              d="M24 4C14.6 4 7 11.6 7 21c0 10.8 13.8 21.5 15.8 23 .7.5 1.7.5 2.4 0C27.2 42.5 41 31.8 41 21c0-9.4-7.6-17-17-17zm0 10.2a6.8 6.8 0 1 1 0 13.6 6.8 6.8 0 0 1 0-13.6z"
                            />
                          </svg>
                        </div>
                        <span className="text-xs text-[#e8eaed] mt-1.5 font-normal truncate">
                          Maps
                        </span>
                      </a>

                      {/* 7. Search (Smooth gradient Google G logo) */}
                      <a
                        href="https://google.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center justify-center p-2 rounded-2xl hover:bg-white/10 transition-colors group cursor-pointer"
                      >
                        <div className="w-10 h-10 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <svg viewBox="0 0 48 48" className="w-9 h-9">
                            <defs>
                              <linearGradient id="gg-search-top" x1="80%" y1="0%" x2="0%" y2="85%">
                                <stop offset="0%" stopColor="#ea4335" />
                                <stop offset="55%" stopColor="#ff5252" />
                                <stop offset="100%" stopColor="#fbbc04" />
                              </linearGradient>
                              <linearGradient id="gg-search-bot" x1="0%" y1="20%" x2="90%" y2="90%">
                                <stop offset="0%" stopColor="#fbbc04" />
                                <stop offset="50%" stopColor="#34a853" />
                                <stop offset="100%" stopColor="#4285f4" />
                              </linearGradient>
                            </defs>
                            <path
                              fill="url(#gg-search-top)"
                              d="M24 11.5c3.5 0 6.6 1.2 9.1 3.5l6.8-6.8C35.8 4.4 30.4 2 24 2 12.8 2 3.4 9.6 1 20l8 6.2c1.8-8.4 9.2-14.7 15-14.7z"
                            />
                            <path
                              fill="url(#gg-search-bot)"
                              d="M9 26.2l-8-6.2C.3 22 0 23 0 24c0 12.2 9.8 22 22 22 6.2 0 11.8-2.2 15.8-6l-7.6-5.9c-2.1 1.4-4.9 2.3-8.2 2.3-7.6 0-13.9-5.1-15.9-12.1L9 26.2z"
                            />
                            <path
                              fill="#4285f4"
                              d="M45.6 20H24v8.8h12.4c-.9 3.4-3.1 6.1-6.2 7.8l7.6 5.9C42.6 38.1 46 31.7 46 24c0-1.4-.1-2.7-.4-4z"
                            />
                          </svg>
                        </div>
                        <span className="text-xs text-[#e8eaed] mt-1.5 font-normal truncate">
                          Search
                        </span>
                      </a>

                      {/* 8. Calendar (Pinched squircle badge with sky-blue cap, lavender glow & white 31) */}
                      <a
                        href="https://calendar.google.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center justify-center p-2 rounded-2xl hover:bg-white/10 transition-colors group cursor-pointer"
                      >
                        <div className="w-10 h-10 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <svg viewBox="0 0 48 48" className="w-9 h-9">
                            <defs>
                              <linearGradient id="gg-cal-bg" x1="50%" y1="0%" x2="50%" y2="100%">
                                <stop offset="0%" stopColor="#8c88ff" />
                                <stop offset="30%" stopColor="#4285f4" />
                                <stop offset="100%" stopColor="#1e78ff" />
                              </linearGradient>
                            </defs>
                            {/* Top sky-blue calendar page edge */}
                            <rect x="13" y="5" width="22" height="10" rx="4" fill="#9be0ff" />
                            {/* Main pinched squircle calendar body */}
                            <path
                              fill="url(#gg-cal-bg)"
                              d="M15 8h18c4.4 0 8 3.6 8 8 0 3.2-.8 5.8-.8 9s.8 5.8.8 9c0 4.4-3.6 8-8 8H15c-4.4 0-8-3.6-8-8 0-3.2.8-5.8.8-9s-.8-5.8-.8-9c0-4.4 3.6-8 8-8z"
                            />
                            <text
                              x="24"
                              y="31.5"
                              fill="#ffffff"
                              fontSize="18.5"
                              fontWeight="500"
                              fontFamily="'Google Sans', Roboto, Arial, sans-serif"
                              textAnchor="middle"
                            >
                              31
                            </text>
                          </svg>
                        </div>
                        <span className="text-xs text-[#e8eaed] mt-1.5 font-normal truncate">
                          Calendar
                        </span>
                      </a>

                      {/* 9. News (Top green card, left tilted yellow card, right tilted red card, front blue G= card) */}
                      <a
                        href="https://news.google.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center justify-center p-2 rounded-2xl hover:bg-white/10 transition-colors group cursor-pointer"
                      >
                        <div className="w-10 h-10 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <svg viewBox="0 0 48 48" className="w-9 h-9">
                            {/* Back centered green card */}
                            <rect x="12" y="6.5" width="24" height="14" rx="2" fill="#00a651" />
                            {/* Left tilted yellow card */}
                            <rect
                              x="6"
                              y="12"
                              width="24"
                              height="17"
                              rx="2"
                              fill="#ffbe26"
                              transform="rotate(-16 18 20)"
                            />
                            {/* Right tilted red card */}
                            <rect
                              x="19"
                              y="13"
                              width="23"
                              height="18"
                              rx="2"
                              fill="#f24b3f"
                              transform="rotate(14 30 22)"
                            />
                            {/* Front Blue Card */}
                            <rect x="8" y="16.5" width="31" height="23.5" rx="2.5" fill="#377ef6" />
                            {/* White G on left */}
                            <text
                              x="16.8"
                              y="33"
                              fill="#ffffff"
                              fontSize="14"
                              fontWeight="700"
                              fontFamily="'Google Sans', Roboto, Arial, sans-serif"
                              textAnchor="middle"
                            >
                              G
                            </text>
                            {/* 3 White Horizontal Lines on right */}
                            <rect x="24.5" y="22.5" width="10" height="2.4" rx="1.2" fill="#ffffff" />
                            <rect x="24.5" y="27.2" width="10" height="2.4" rx="1.2" fill="#ffffff" />
                            <rect x="24.5" y="32" width="10" height="2.4" rx="1.2" fill="#ffffff" />
                          </svg>
                        </div>
                        <span className="text-xs text-[#e8eaed] mt-1.5 font-normal truncate">
                          News
                        </span>
                      </a>
                    </div>
                  </div>

                  {/* Below Favorites: More Google apps */}
                  <div className="grid grid-cols-3 gap-y-2 gap-x-1 pt-1 pb-1">
                    {/* 10. Photos (Smooth gradient 4-petal pinwheel matching screenshot) */}
                    <a
                      href="https://photos.google.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center justify-center p-2 rounded-2xl hover:bg-white/10 transition-colors group cursor-pointer"
                    >
                      <div className="w-10 h-10 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <svg viewBox="0 0 48 48" className="w-9 h-9">
                          <defs>
                            <linearGradient id="gg-photos-top" x1="50%" y1="100%" x2="50%" y2="0%">
                              <stop offset="0%" stopColor="#ff66b2" />
                              <stop offset="55%" stopColor="#ff4438" />
                              <stop offset="100%" stopColor="#ff3b30" />
                            </linearGradient>
                            <linearGradient id="gg-photos-right" x1="0%" y1="50%" x2="100%" y2="50%">
                              <stop offset="0%" stopColor="#9999ff" />
                              <stop offset="55%" stopColor="#4285f4" />
                              <stop offset="100%" stopColor="#1a78ff" />
                            </linearGradient>
                            <linearGradient id="gg-photos-bottom" x1="50%" y1="0%" x2="50%" y2="100%">
                              <stop offset="0%" stopColor="#66ccff" />
                              <stop offset="50%" stopColor="#00b359" />
                              <stop offset="100%" stopColor="#00994d" />
                            </linearGradient>
                            <linearGradient id="gg-photos-left" x1="100%" y1="50%" x2="0%" y2="50%">
                              <stop offset="0%" stopColor="#ffdd44" />
                              <stop offset="100%" stopColor="#ffbe1a" />
                            </linearGradient>
                          </defs>
                          {/* Top Red-Pink Petal (bulges right) */}
                          <path fill="url(#gg-photos-top)" d="M24 4c5.5 0 10 4.5 10 10s-4.5 10-10 10V4z" />
                          {/* Right Lavender-Blue Petal (bulges down) */}
                          <path fill="url(#gg-photos-right)" d="M44 24c0 5.5-4.5 10-10 10s-10-4.5-10-10h20z" />
                          {/* Bottom Cyan-Green Petal (bulges left) */}
                          <path fill="url(#gg-photos-bottom)" d="M24 44c-5.5 0-10-4.5-10-10s4.5-10 10-10v20z" />
                          {/* Left Yellow Petal (bulges up) */}
                          <path fill="url(#gg-photos-left)" d="M4 24c0-5.5 4.5-10 10-10s10 4.5 10 10H4z" />
                        </svg>
                      </div>
                      <span className="text-xs text-[#e8eaed] mt-1.5 font-normal truncate">
                        Photos
                      </span>
                    </a>

                    {/* 11. Meet (Yellow body with large top-left curve, pink right glow, white dot & orange lens) */}
                    <a
                      href="https://meet.google.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center justify-center p-2 rounded-2xl hover:bg-white/10 transition-colors group cursor-pointer"
                    >
                      <div className="w-10 h-10 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <svg viewBox="0 0 48 48" className="w-9 h-9">
                          <defs>
                            <radialGradient id="gg-meet-glow" cx="95%" cy="55%" r="55%">
                              <stop offset="0%" stopColor="#ffb3d1" />
                              <stop offset="55%" stopColor="#ffd026" stopOpacity="0.9" />
                              <stop offset="100%" stopColor="#ffca1a" stopOpacity="1" />
                            </radialGradient>
                          </defs>
                          {/* Right Orange Lens Trapezoid */}
                          <path
                            fill="#fca120"
                            d="M31 18.5l9.5-5.8c1.5-.9 3.5.2 3.5 2v18.6c0 1.8-2 2.9-3.5 2L31 29.5v-11z"
                          />
                          {/* Left Camera Body (large rounded top-left corner) */}
                          <path
                            fill="url(#gg-meet-glow)"
                            d="M16 9.5h11.5c2.8 0 5 2.2 5 5v19c0 2.8-2.2 5-5 5H10c-2.8 0-5-2.2-5-5V20.5c0-6.1 4.9-11 11-11z"
                          />
                          {/* Crisp white circle at bottom-left */}
                          <circle cx="12" cy="31.5" r="3" fill="#ffffff" />
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
                          <path fill="#e8eaed" d="M18 11h22a4 4 0 0 1 4 4v24a4 4 0 0 1-4 4H24l-6-16V11z" />
                          <path fill="#174ea6" d="M24 43l5-8h-9l4 8z" />
                          <path fill="#4285f4" d="M8 5h18l8 30H8a4 4 0 0 1-4-4V9a4 4 0 0 1 4-4z" />
                          <text
                            x="16.5"
                            y="25.5"
                            fill="#ffffff"
                            fontSize="15.5"
                            fontWeight="700"
                            fontFamily="'Google Sans', Roboto, Arial, sans-serif"
                            textAnchor="middle"
                          >
                            G
                          </text>
                          <text
                            x="33.5"
                            y="33.5"
                            fill="#5f6368"
                            fontSize="13.5"
                            fontWeight="700"
                            fontFamily="'Google Sans', 'Noto Sans', sans-serif"
                            textAnchor="middle"
                          >
                            文
                          </text>
                        </svg>
                      </div>
                      <span className="text-xs text-[#e8eaed] mt-1.5 font-normal truncate">
                        Translate
                      </span>
                    </a>

                    {/* 13. Vids / Play (Stacked purple-blue cards with play button matching screenshot) */}
                    <a
                      href="https://docs.google.com/videos"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center justify-center p-2 rounded-2xl hover:bg-white/10 transition-colors group cursor-pointer"
                    >
                      <div className="w-10 h-10 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <svg viewBox="0 0 48 48" className="w-9 h-9">
                          <defs>
                            <linearGradient id="gg-vids-front" x1="0%" y1="50%" x2="100%" y2="50%">
                              <stop offset="0%" stopColor="#6ba8ff" />
                              <stop offset="100%" stopColor="#726bff" />
                            </linearGradient>
                          </defs>
                          {/* Back-left light periwinkle card */}
                          <rect x="6" y="13" width="20" height="22" rx="6" fill="#d8e2ff" />
                          {/* Middle-left lavender card */}
                          <rect x="10" y="10" width="22" height="28" rx="6.5" fill="#b3c5ff" />
                          {/* Front blue-violet rounded card */}
                          <rect x="14.5" y="7" width="25.5" height="34" rx="7.5" fill="url(#gg-vids-front)" />
                          {/* White Play Triangle */}
                          <path fill="#ffffff" d="M24 18.5v11l8.5-5.5-8.5-5.5z" />
                        </svg>
                      </div>
                      <span className="text-xs text-[#e8eaed] mt-1.5 font-normal truncate">
                        Vids
                      </span>
                    </a>

                    {/* 14. Sheets (Green-to-cyan gradient horizontal card with dark green right tab & white cross) */}
                    <a
                      href="https://sheets.google.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center justify-center p-2 rounded-2xl hover:bg-white/10 transition-colors group cursor-pointer"
                    >
                      <div className="w-10 h-10 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <svg viewBox="0 0 48 48" className="w-9 h-9">
                          <defs>
                            <linearGradient id="gg-sheets-bg" x1="0%" y1="50%" x2="100%" y2="50%">
                              <stop offset="0%" stopColor="#00b359" />
                              <stop offset="55%" stopColor="#00b862" />
                              <stop offset="100%" stopColor="#6bd0ff" />
                            </linearGradient>
                          </defs>
                          {/* Right dark green tab */}
                          <rect x="35" y="13" width="8" height="22" rx="3.5" fill="#008a45" />
                          {/* Main horizontal green-to-cyan rounded rectangle */}
                          <rect x="5" y="10" width="34" height="28" rx="5.5" fill="url(#gg-sheets-bg)" />
                          {/* White intersecting grid cross */}
                          <rect x="8.5" y="17" width="19" height="3" rx="1.5" fill="#ffffff" />
                          <rect x="12.5" y="13" width="3" height="17" rx="1.5" fill="#ffffff" />
                        </svg>
                      </div>
                      <span className="text-xs text-[#e8eaed] mt-1.5 font-normal truncate">
                        Sheets
                      </span>
                    </a>

                    {/* 15. Docs (Blue-to-lavender folded document with light sky-blue corner & two white bars) */}
                    <a
                      href="https://docs.google.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center justify-center p-2 rounded-2xl hover:bg-white/10 transition-colors group cursor-pointer"
                    >
                      <div className="w-10 h-10 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <svg viewBox="0 0 48 48" className="w-9 h-9">
                          <defs>
                            <linearGradient id="gg-docs-bg" x1="50%" y1="0%" x2="30%" y2="100%">
                              <stop offset="0%" stopColor="#1e78ff" />
                              <stop offset="68%" stopColor="#3b82f6" />
                              <stop offset="100%" stopColor="#a8a4ff" />
                            </linearGradient>
                          </defs>
                          <path
                            fill="url(#gg-docs-bg)"
                            d="M14 5h13l12 12v20a6 6 0 0 1-6 6H14a6 6 0 0 1-6-6V11a6 6 0 0 1 6-6z"
                          />
                          {/* Light sky-blue folded corner */}
                          <path fill="#74bfff" d="M27 5l12 12h-8a4 4 0 0 1-4-4V5z" />
                          <rect x="15" y="28.5" width="14.5" height="3" rx="1.5" fill="#ffffff" />
                          <rect x="15" y="34.5" width="10" height="3" rx="1.5" fill="#ffffff" />
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

      {/* Mobile Class Search Popup (Matches NotebookLM mobile search reference) */}
      {isMobileSearchOpen && (
        <div
          className="fixed left-0 right-0 z-50 sm:hidden bg-[#FAFBFD] dark:bg-[#1b1c1f] flex flex-col select-none"
          style={
            viewportRect
              ? {
                  top: `${viewportRect.offsetTop}px`,
                  height: `${viewportRect.height}px`,
                }
              : {
                  top: 0,
                  bottom: 0,
                }
          }
        >
          {/* Scrollable Class Cards List */}
          <div className="flex-1 overflow-y-auto px-4 pt-3 pb-2 space-y-2.5">
            {mobileDisplayClasses.length > 0 ? (
              mobileDisplayClasses.map((c) => {
                const calc = calculateClassAverage(c);
                const totalAssessments = c.categories.reduce(
                  (sum, cat) => sum + cat.assessments.length,
                  0
                );
                const baseColor = c.color || '#3b82f6';
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelectClassItem(c.id)}
                    className="w-full text-left rounded-[22px] px-4 py-3.5 flex items-center justify-between gap-3 transition-transform active:scale-[0.99] cursor-pointer"
                    style={{
                      backgroundColor:
                        theme === 'dark'
                          ? `color-mix(in srgb, ${baseColor} 15%, #2b2d31)`
                          : `color-mix(in srgb, ${baseColor} 12%, #f1f5f9)`,
                    }}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          backgroundColor:
                            theme === 'dark'
                              ? `color-mix(in srgb, ${baseColor} 28%, #1e1f22)`
                              : `color-mix(in srgb, ${baseColor} 20%, #ffffff)`,
                        }}
                      >
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: baseColor }}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[16px] font-normal text-slate-900 dark:text-[#f1f3f4] leading-snug truncate">
                          {c.name}
                        </div>
                        <div className="text-[12px] text-slate-500 dark:text-[#a8abb0] mt-0.5 truncate">
                          {c.code ? `${c.code} • ` : ''}
                          {totalAssessments} {totalAssessments === 1 ? 'assessment' : 'assessments'} •{' '}
                          {calc.average.toFixed(1)}%
                        </div>
                      </div>
                    </div>

                    <div className="w-10 h-10 rounded-full bg-slate-900/10 dark:bg-[#1e1f22]/85 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-medium text-slate-800 dark:text-[#e8eaed]">
                        {calc.letterGrade}
                      </span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center px-6 py-12">
                <p className="text-sm text-slate-500 dark:text-[#9aa0a6]">
                  No classes found matching{' '}
                  <span className="font-medium text-slate-900 dark:text-[#e8eaed]">
                    "{searchQuery}"
                  </span>
                </p>
              </div>
            )}
          </div>

          {/* Bottom Search Input Bar + Cancel Button (docked above keyboard) */}
          <div className="px-4 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] bg-[#FAFBFD] dark:bg-[#1b1c1f] flex items-center gap-3 flex-shrink-0">
            <div className="flex-1 h-11 rounded-full border border-slate-300 dark:border-[#5f6368] bg-white dark:bg-[#1b1c1f] px-4 flex items-center gap-2.5">
              <Search className="w-4 h-4 text-slate-500 dark:text-[#e8eaed] flex-shrink-0" />
              <input
                ref={mobileSearchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && mobileDisplayClasses.length > 0) {
                    handleSelectClassItem(mobileDisplayClasses[0].id);
                  } else if (e.key === 'Escape') {
                    closeMobileSearch();
                  }
                }}
                placeholder="Search by class title"
                className="w-full bg-transparent text-[15px] text-slate-900 dark:text-[#e8eaed] placeholder-slate-400 dark:placeholder-[#9aa0a6] focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    mobileSearchInputRef.current?.focus();
                  }}
                  className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-[#e8eaed] cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={closeMobileSearch}
              className="text-[14px] font-medium text-slate-700 dark:text-[#e8eaed] px-1.5 py-2 cursor-pointer flex-shrink-0"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

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
