import React, { useState, useRef, useEffect } from 'react';
import {
  BookOpen,
  ShieldCheck,
  CheckCircle2,
  FileText,
  LogOut,
  Settings,
  Menu,
  RefreshCw,
  AlertCircle,
  CloudUpload,
  AlertTriangle,
  Sparkles,
  BookMarked,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  subscribeToSyncStatus,
  getSyncStatus,
  forceSyncToCloud,
  type SyncStatusInfo,
} from '../utils/gradebookService';
import type { ClassItem } from '../types/grade';

interface HeaderProps {
  activeTab: 'gradebook' | 'notebook';
  onChangeTab: (tab: 'gradebook' | 'notebook') => void;
  classes: ClassItem[];
  noteCount?: number;
  onOpenTranscript: () => void;
  onOpenFirebaseConfig: () => void;
  onOpenMobileDrawer?: () => void;
  onOpenAiAdvisor: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onChangeTab,
  classes,
  noteCount = 0,
  onOpenTranscript,
  onOpenFirebaseConfig,
  onOpenMobileDrawer,
  onOpenAiAdvisor,
}) => {
  const { user, isConfigured, signInWithGoogle, logout, authError } = useAuth();
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
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200/80 transition-all">
      <div className="w-full px-3 sm:px-6 h-16 flex items-center justify-between">
        {/* Left: Mobile Menu Toggle + Logo + Navigation Tabs */}
        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
          {/* Hamburger toggle for mobile drawer */}
          <button
            type="button"
            onClick={onOpenMobileDrawer}
            className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer min-h-[42px] min-w-[42px] flex items-center justify-center -ml-1"
            aria-label="Open classes menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div
            onClick={() => onChangeTab('gradebook')}
            className="flex items-center gap-2 cursor-pointer select-none"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs flex-shrink-0">
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
            </div>
            <span className="font-extrabold text-lg sm:text-xl text-slate-900 tracking-tight">
              gradebook<span className="text-blue-600">.</span>
            </span>
          </div>

          {/* Primary Tabs: Gradebook & Notebook */}
          <nav className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/70 ml-1 sm:ml-2">
            <button
              type="button"
              onClick={() => onChangeTab('gradebook')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'gradebook'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-blue-600 stroke-[2.2]" />
              <span>Gradebook</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeTab('notebook')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'notebook'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookMarked className="w-3.5 h-3.5 text-indigo-600 stroke-[2.2]" />
              <span>Notebook</span>
              {noteCount > 0 && (
                <span className="hidden sm:inline-flex px-1.5 py-0.2 bg-indigo-100 text-indigo-700 text-[10px] font-extrabold rounded-full">
                  {noteCount}
                </span>
              )}
            </button>
          </nav>
        </div>


        {/* Right: User Authentication, Sync Status & Actions */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {user ? (
            <>
              {syncStatus.state === 'syncing' ? (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-full text-xs font-medium">
                  <RefreshCw className="w-3 h-3 text-amber-600 animate-spin" />
                  <span className="hidden sm:inline">Syncing...</span>
                </div>
              ) : syncStatus.state === 'error' ? (
                <button
                  type="button"
                  onClick={onOpenFirebaseConfig}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 bg-rose-50 border border-rose-300 text-rose-700 hover:bg-rose-100 rounded-full text-xs font-semibold cursor-pointer animate-pulse transition-all"
                  title={syncStatus.errorMessage || 'Cloud sync error'}
                >
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                  <span className="hidden sm:inline">Sync Error - Fix</span>
                  <span className="sm:hidden">Sync Error</span>
                </button>
              ) : (
                <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200/70 text-emerald-700 rounded-full text-xs font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Cloud Synced</span>
                </div>
              )}
            </>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-200/70 text-slate-600 rounded-full text-xs font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
              <span>Private & Secure</span>
            </div>
          )}

          {/* AI Advisor icon button - matching blue & white logo */}
          <button
            type="button"
            onClick={onOpenAiAdvisor}
            title="AI Academic Advisor"
            aria-label="AI Academic Advisor"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white shadow-xs flex items-center justify-center transition-all cursor-pointer flex-shrink-0"
          >
            <Sparkles className="w-4 h-4 text-white stroke-[2.2]" />
          </button>

          {/* Desktop Transcript Button */}
          <button
            type="button"
            onClick={onOpenTranscript}
            title="Download Official Academic Transcript (PDF)"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:text-blue-800 bg-blue-50/80 hover:bg-blue-100 border border-blue-200/60 rounded-xl transition-all cursor-pointer min-h-[36px]"
          >
            <FileText className="w-3.5 h-3.5 text-blue-600 stroke-[2.2]" />
            <span>Transcript (PDF)</span>
          </button>

          {/* Authentication Section */}
          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 p-1 sm:pl-2 sm:pr-2.5 bg-slate-100 hover:bg-slate-200/80 rounded-full transition-all cursor-pointer border border-slate-200 min-h-[38px]"
                aria-label="User account menu"
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-7 h-7 rounded-full object-cover border border-slate-300"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                    {(user.displayName || user.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <span className="text-xs font-semibold text-slate-800 max-w-[80px] sm:max-w-[100px] truncate hidden sm:inline">
                  {user.displayName?.split(' ')[0] || user.email?.split('@')[0]}
                </span>
                <span
                  className={`w-2 h-2 rounded-full sm:hidden mr-1 ${
                    syncStatus.state === 'error'
                      ? 'bg-rose-500 animate-pulse'
                      : syncStatus.state === 'syncing'
                      ? 'bg-amber-500 animate-spin'
                      : 'bg-emerald-500'
                  }`}
                  title={syncStatus.state}
                />
              </button>

              {/* User Dropdown */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 max-w-[88vw] bg-white rounded-2xl shadow-xl border border-slate-200/90 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {user.displayName || 'Gradebook User'}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {user.email}
                    </p>
                    <div className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full w-fit">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Signed in with Google</span>
                    </div>
                  </div>

                  <div className="py-1">
                    {/* Manual Force Cloud Sync Button */}
                    <button
                      type="button"
                      disabled={isForceSyncing}
                      onClick={handleForceSync}
                      className="w-full text-left px-4 py-2.5 text-xs text-blue-700 hover:bg-blue-50/80 flex items-center justify-between cursor-pointer min-h-[40px] transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <CloudUpload className={`w-4 h-4 text-blue-600 ${isForceSyncing ? 'animate-bounce' : ''}`} />
                        <span className="font-semibold">{isForceSyncing ? 'Syncing...' : 'Sync to Cloud Now'}</span>
                      </div>
                      {syncFeedback && (
                        <span className="text-[10px] text-emerald-600 font-bold ml-2 truncate max-w-[100px]">
                          {syncFeedback}
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenTranscript();
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer min-h-[40px]"
                    >
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span>Official Academic Transcript (PDF)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenFirebaseConfig();
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer min-h-[40px]"
                    >
                      <Settings className="w-4 h-4 text-slate-400" />
                      <span>Firebase & Rules Settings</span>
                    </button>
                  </div>

                  <div className="border-t border-slate-100 pt-1 mt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        logout();
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-semibold cursor-pointer min-h-[40px]"
                    >
                      <LogOut className="w-4 h-4 text-rose-500" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={isConfigured ? signInWithGoogle : onOpenFirebaseConfig}
                className="flex items-center gap-2 px-3 sm:px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl border border-slate-300 shadow-2xs hover:shadow-xs transition-all cursor-pointer min-h-[38px]"
              >
                {/* Official Google G Logo */}
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
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
                <span className="hidden sm:inline">Sign in with Google</span>
                <span className="sm:hidden">Sign in</span>
              </button>

              {!isConfigured && (
                <button
                  type="button"
                  onClick={onOpenFirebaseConfig}
                  title="Configure Firebase Keys"
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center"
                >
                  <Settings className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sync Warning Banner if Firestore returned an error */}
      {user && syncStatus.state === 'error' && syncStatus.errorMessage && (
        <div className="bg-amber-50 border-t border-amber-200 px-4 py-2 text-xs text-amber-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span className="font-medium">
              {syncStatus.errorMessage.includes('Permission Denied')
                ? 'Firestore Security Rules are blocking sync across devices.'
                : syncStatus.errorMessage}
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenFirebaseConfig}
            className="ml-3 px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg cursor-pointer flex-shrink-0 text-[11px]"
          >
            View Rules & Fix
          </button>
        </div>
      )}

      {/* Auth Error Banner */}
      {authError && (
        <div className="bg-rose-50 border-t border-rose-200 px-4 py-2 text-xs text-rose-700 flex items-center justify-between">
          <span className="line-clamp-2">{authError}</span>
          <button
            type="button"
            onClick={onOpenFirebaseConfig}
            className="underline font-bold hover:text-rose-900 cursor-pointer ml-3 flex-shrink-0"
          >
            Check Settings
          </button>
        </div>
      )}
    </header>
  );
};
