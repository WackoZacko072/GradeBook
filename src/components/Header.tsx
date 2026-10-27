import React, { useState, useRef, useEffect } from 'react';
import {
  BookOpen,
  ShieldCheck,
  CheckCircle2,
  FileText,
  LogOut,
  Settings,
  Menu,
  CloudUpload,
  AlertTriangle,
  User,
  BookMarked,
  BookCheck,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  subscribeToSyncStatus,
  getSyncStatus,
  forceSyncToCloud,
  type SyncStatusInfo,
} from '../utils/gradebookService';
import type { ClassItem } from '../types/grade';

interface HeaderProps {
  activeTab: 'gradebook' | 'notebook' | 'slab';
  onChangeTab: (tab: 'gradebook' | 'notebook' | 'slab') => void;
  classes: ClassItem[];
  noteCount?: number;
  slabCount?: number;
  onOpenTranscript: () => void;
  onOpenFirebaseConfig: () => void;
  onOpenMobileDrawer?: () => void;
  onOpenAiAdvisor?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onChangeTab,
  classes,
  noteCount = 0,
  slabCount = 0,
  onOpenTranscript,
  onOpenFirebaseConfig,
  onOpenMobileDrawer,
}) => {
  const { user, isConfigured, signInWithGoogle, logout, authError } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatusInfo>(() => getSyncStatus());
  const [isForceSyncing, setIsForceSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Dynamic sliding indicator for Top Taskbar
  const navRef = useRef<HTMLElement>(null);
  const gradebookTabRef = useRef<HTMLButtonElement>(null);
  const notebookTabRef = useRef<HTMLButtonElement>(null);
  const slabTabRef = useRef<HTMLButtonElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 4, width: 90 });

  // Update sliding indicator whenever active tab or item counts change
  useEffect(() => {
    const tabMap = {
      gradebook: gradebookTabRef.current,
      notebook: notebookTabRef.current,
      slab: slabTabRef.current,
    };
    const activeEl = tabMap[activeTab];
    const navEl = navRef.current;
    if (activeEl && navEl) {
      const activeRect = activeEl.getBoundingClientRect();
      const navRect = navEl.getBoundingClientRect();
      setIndicatorStyle({
        left: activeRect.left - navRect.left,
        width: activeRect.width,
      });
    }
  }, [activeTab, noteCount, slabCount]);

  // Subscribe to live sync status from gradebookService
  useEffect(() => {
    const unsubscribe = subscribeToSyncStatus((status) => {
      setSyncStatus(status);
    });
    return () => unsubscribe();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
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

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#1e1f20]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-[#3c4043] transition-colors duration-250">
      <div className="relative w-full px-3 sm:px-6 h-16 flex items-center justify-between">
        {/* Left: Mobile Menu Toggle + Gemini Gradebook Logo */}
        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0 z-20">
          {/* Hamburger toggle for mobile drawer */}
          <button
            type="button"
            onClick={onOpenMobileDrawer}
            className="md:hidden p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#353739] rounded-xl transition-colors cursor-pointer min-h-[42px] min-w-[42px] flex items-center justify-center -ml-1 google-btn-press"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div
            onClick={() => onChangeTab('gradebook')}
            className="flex items-center gap-2.5 cursor-pointer select-none group"
            title="Gemini Gradebook"
          >
            <img
              src="/gemini-gradebook-logo.png"
              alt="Gemini Gradebook"
              className="w-8 h-8 sm:w-9 sm:h-9 object-contain flex-shrink-0 group-hover:scale-105 transition-transform duration-200"
            />
            <span className="font-bold text-base sm:text-lg text-slate-900 dark:text-[#e8eaed] tracking-tight transition-colors">
              Gemini Gradebook
            </span>
          </div>
        </div>

        {/* Center: Primary Task Bar (Desktop only: hidden on mobile to eliminate clutter) */}
        <nav
          ref={navRef}
          aria-label="Main taskbar tabs"
          className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center p-1 bg-slate-100/90 dark:bg-[#282a2c] rounded-xl border border-slate-200/80 dark:border-[#3c4043] shadow-2xs z-10 select-none"
        >
          {/* Google Material 3 Animated Sliding Indicator */}
          <div
            className="absolute top-1 bottom-1 rounded-lg bg-white dark:bg-[#353739] shadow-xs pointer-events-none transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)]"
            style={{
              left: `${indicatorStyle.left}px`,
              width: `${indicatorStyle.width}px`,
            }}
          />

          {/* Gradebook Tab */}
          <button
            ref={gradebookTabRef}
            type="button"
            onClick={() => onChangeTab('gradebook')}
            className={`relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-colors duration-200 cursor-pointer ${
              activeTab === 'gradebook'
                ? 'text-blue-700 dark:text-[#8ab4f8]'
                : 'text-slate-600 dark:text-[#9aa0a6] hover:text-slate-900 dark:hover:text-[#e8eaed]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>Gradebook</span>
          </button>

          {/* Notebook Tab */}
          <button
            ref={notebookTabRef}
            type="button"
            onClick={() => onChangeTab('notebook')}
            className={`relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-colors duration-200 cursor-pointer ${
              activeTab === 'notebook'
                ? 'text-indigo-700 dark:text-[#c58af9]'
                : 'text-slate-600 dark:text-[#9aa0a6] hover:text-slate-900 dark:hover:text-[#e8eaed]'
            }`}
          >
            <BookMarked className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>Notebook</span>
            {noteCount > 0 && (
              <span className="inline-flex px-1.5 py-0.2 bg-indigo-100 dark:bg-purple-900/40 text-indigo-700 dark:text-purple-300 text-[10px] font-extrabold rounded-full">
                {noteCount}
              </span>
            )}
          </button>

          {/* Office Tab (renamed from Slab) */}
          <button
            ref={slabTabRef}
            type="button"
            onClick={() => onChangeTab('slab')}
            className={`relative z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-colors duration-200 cursor-pointer ${
              activeTab === 'slab'
                ? 'text-violet-700 dark:text-[#c58af9]'
                : 'text-slate-600 dark:text-[#9aa0a6] hover:text-slate-900 dark:hover:text-[#e8eaed]'
            }`}
          >
            <BookCheck className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>Office</span>
            {slabCount > 0 && (
              <span className="inline-flex px-1.5 py-0.2 bg-violet-100 dark:bg-purple-900/40 text-violet-700 dark:text-purple-300 text-[10px] font-extrabold rounded-full">
                {slabCount}
              </span>
            )}
          </button>
        </nav>

        {/* Right: Google Profile Button and Dropdown Menu */}
        <div className="flex items-center gap-2 flex-shrink-0 z-20">
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center justify-center p-0.5 rounded-full hover:ring-3 hover:ring-slate-200 dark:hover:ring-[#3c4043] focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer google-btn-press"
              aria-label="Google Account"
              title={user ? (user.displayName || user.email || 'Google Account') : 'Google Account / Profile'}
            >
              {user ? (
                user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Google Account'}
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover border border-slate-200 dark:border-[#3c4043]"
                  />
                ) : (
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                    {(user.displayName || user.email || 'U')[0].toUpperCase()}
                  </div>
                )
              ) : (
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-100 dark:bg-[#303134] text-slate-600 dark:text-[#e8eaed] flex items-center justify-center border border-slate-200 dark:border-[#3c4043]">
                  <User className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500 dark:text-[#9aa0a6]" />
                </div>
              )}
            </button>

            {/* Google Account Popover Menu */}
            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-white dark:bg-[#282a2c] rounded-3xl shadow-2xl border border-slate-200/90 dark:border-[#3c4043] py-4 px-4 z-50 animate-fade-scale">
                {/* Centered Google User Card */}
                <div className="flex flex-col items-center text-center pb-4 border-b border-slate-100 dark:border-[#3c4043]">
                  {user ? (
                    user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName || 'User'}
                        className="w-16 h-16 rounded-full object-cover border-2 border-slate-200 dark:border-[#5f6368] shadow-xs mb-2"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-blue-600 text-white font-bold text-2xl flex items-center justify-center shadow-xs mb-2">
                        {(user.displayName || user.email || 'U')[0].toUpperCase()}
                      </div>
                    )
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-[#303134] text-slate-600 dark:text-slate-300 flex items-center justify-center border border-slate-200 dark:border-[#3c4043] mb-2">
                      <User className="w-8 h-8 text-slate-400 dark:text-[#9aa0a6]" />
                    </div>
                  )}

                  <p className="font-bold text-sm text-slate-900 dark:text-[#e8eaed] truncate max-w-[240px]">
                    {user ? (user.displayName || 'Google User') : 'Guest Student'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-[#9aa0a6] truncate max-w-[240px] mt-0.5">
                    {user ? user.email : 'Local offline storage'}
                  </p>

                  <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-[#353739] text-slate-700 dark:text-[#c4c7c5] border border-slate-200/80 dark:border-[#444746]">
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
                    className="w-full text-left px-3.5 py-2.5 text-xs text-slate-800 dark:text-[#e8eaed] hover:bg-slate-100/80 dark:hover:bg-[#353739] rounded-2xl flex items-center gap-3 cursor-pointer font-medium transition-colors google-btn-press"
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
                      className="w-full text-left px-3.5 py-2.5 text-xs text-slate-800 dark:text-[#e8eaed] hover:bg-slate-100/80 dark:hover:bg-[#353739] rounded-2xl flex items-center justify-between cursor-pointer font-medium transition-colors google-btn-press"
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
                      className="w-full text-left px-3.5 py-2.5 text-xs text-blue-700 dark:text-[#8ab4f8] hover:bg-blue-50/80 dark:hover:bg-[#353739] rounded-2xl flex items-center gap-3 cursor-pointer font-bold transition-colors google-btn-press"
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
                    className="w-full text-left px-3.5 py-2.5 text-xs text-slate-700 dark:text-[#c4c7c5] hover:bg-slate-100/80 dark:hover:bg-[#353739] rounded-2xl flex items-center gap-3 cursor-pointer transition-colors google-btn-press"
                  >
                    <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-[#353739] text-slate-500 dark:text-[#9aa0a6] flex items-center justify-center flex-shrink-0">
                      <Settings className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-[#e8eaed]">Settings & Firebase</div>
                      <div className="text-[10px] text-slate-400 dark:text-[#9aa0a6]">Keys and Firestore setup</div>
                    </div>
                  </button>

                  {/* Appearance Toggle */}
                  <div className="px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-[#1e1f20] border border-slate-200/60 dark:border-[#3c4043] flex items-center justify-between">
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
                      className="px-2.5 py-1 text-xs font-bold rounded-xl bg-white dark:bg-[#353739] text-slate-700 dark:text-[#e8eaed] border border-slate-200 dark:border-[#444746] shadow-2xs hover:bg-slate-100 dark:hover:bg-[#444746] transition-all cursor-pointer google-btn-press"
                    >
                      {theme === 'dark' ? 'Light' : 'Dark'}
                    </button>
                  </div>
                </div>

                {/* Sign Out Button (Google Style) */}
                {user && (
                  <div className="pt-2 border-t border-slate-100 dark:border-[#3c4043] mt-2">
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
