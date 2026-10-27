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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
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
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // View mode state (grid vs list)
  const [internalViewMode, setInternalViewMode] = useState<'grid' | 'list'>('grid');
  const viewMode = controlledViewMode ?? internalViewMode;

  const handleSetViewMode = (mode: 'grid' | 'list') => {
    setInternalViewMode(mode);
    onToggleViewMode?.(mode);
  };

  // Google account popover state
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatusInfo>(() => getSyncStatus());
  const [isForceSyncing, setIsForceSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Subscribe to live sync status from gradebookService
  useEffect(() => {
    const unsubscribe = subscribeToSyncStatus((status) => {
      setSyncStatus(status);
    });
    return () => unsubscribe();
  }, []);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) {
        setIsUserMenuOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(target)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    <header className="sticky top-0 z-30 bg-[#FAFBFD]/95 dark:bg-[#0f0f10]/95 backdrop-blur-md transition-colors duration-250 select-none">
      <div className="w-full px-3 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Left: Gemini Gradebook Branding (Matches NotebookLM screenshot layout) */}
        <div
          onClick={() => {
            onChangeTab('gradebook');
            onSelectOverview?.();
          }}
          className="flex items-center gap-2.5 sm:gap-3 cursor-pointer select-none flex-shrink-0 group"
          title="Gemini Gradebook"
        >
          <img
            src="/gemini-gradebook-logo.png"
            alt="Gemini Gradebook"
            className="w-7 h-7 sm:w-[30px] sm:h-[30px] object-contain flex-shrink-0 group-hover:scale-105 transition-transform duration-200 drop-shadow-xs"
          />
          <span
            className="text-[19px] sm:text-[21px] font-medium tracking-tight text-slate-900 dark:text-[#f8f9fa] antialiased select-none"
            style={{ fontFamily: "'Google Sans', 'Google Sans Text', sans-serif" }}
          >
            Gemini Gradebook
          </span>
        </div>

        {/* Right: Search Gradebook, View Toggle, Settings, Apps Icon, and Google Account Avatar */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {/* Search Gradebook Pill Input */}
          <div className="relative" ref={searchContainerRef}>
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 dark:text-[#9aa0a6] absolute left-3.5 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onFocus={() => setIsSearchOpen(true)}
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
                placeholder="Search gradebook"
                className="w-36 sm:w-56 md:w-64 lg:w-72 h-10 pl-9 pr-8 text-xs sm:text-sm bg-slate-100/90 dark:bg-[#18191b] hover:dark:bg-[#202123] focus:dark:bg-[#18191b] text-slate-900 dark:text-[#e8eaed] placeholder-slate-400 dark:placeholder-[#9aa0a6] rounded-full border border-slate-200/80 dark:border-[#26282a] focus:outline-none focus:ring-1 focus:ring-blue-500/50 dark:focus:ring-[#8ab4f8]/50 transition-all shadow-2xs"
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

          {/* Grid / List Layout Toggle Pill (Matches NotebookLM screenshot) */}
          <div className="hidden sm:flex items-center bg-slate-100/90 dark:bg-[#18191b] border border-slate-200/80 dark:border-[#26282a] rounded-full p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => handleSetViewMode('grid')}
              className={`p-1.5 rounded-full transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-[#26282a] text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-400 dark:text-[#9aa0a6] hover:text-slate-700 dark:hover:text-[#e8eaed]'
              }`}
              title="Grid view"
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
              title="List view"
              aria-label="List view"
            >
              <List className="w-4 h-4 stroke-[2]" />
            </button>
          </div>

          {/* Settings Gear Icon (Opens Firebase Config & Settings Modal) */}
          <button
            type="button"
            onClick={onOpenFirebaseConfig}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-[#18191b] text-slate-600 dark:text-[#9aa0a6] hover:text-slate-900 dark:hover:text-[#e8eaed] transition-colors cursor-pointer google-btn-press"
            title="Settings & Firebase"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5 stroke-[1.8]" />
          </button>

          {/* Google Apps 9-Dot Launcher Icon */}
          <button
            type="button"
            onClick={onOpenTranscript}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-[#18191b] text-slate-600 dark:text-[#9aa0a6] hover:text-slate-900 dark:hover:text-[#e8eaed] transition-colors cursor-pointer google-btn-press"
            title="Academic Tools & Transcript"
            aria-label="Academic Tools"
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

          {/* Google Account Profile Button with Cyan/Blue Gradient Ring */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
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
  );
};
