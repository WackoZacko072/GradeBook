import React, { useState, useRef, useEffect } from 'react';
import { BookOpen, ShieldCheck, CheckCircle2, DownloadCloud, GraduationCap, LogOut, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  onOpenBackup: () => void;
  onOpenFirebaseConfig: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenBackup, onOpenFirebaseConfig }) => {
  const { user, isConfigured, signInWithGoogle, logout, authError } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200/80 transition-all">
      <div className="w-full px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Left: Logo & Brand aligned with sidebar width */}
        <div className="w-56 sm:w-60 flex items-center gap-2.5 flex-shrink-0">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
            <BookOpen className="w-5 h-5 stroke-[2.2]" />
          </div>
          <span className="font-extrabold text-xl text-slate-900 tracking-tight select-none">
            gradebook<span className="text-blue-600">.</span>
          </span>
        </div>

        {/* Center: Segmented Navigation Pill */}
        <div className="hidden md:flex items-center p-1 bg-slate-100/90 rounded-2xl border border-slate-200/60 shadow-2xs">
          <button
            type="button"
            className="flex items-center gap-1.5 px-4 py-1.5 bg-white text-blue-700 font-semibold text-xs rounded-xl shadow-xs border border-slate-200/50 cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-600" />
            <span>Gradebook</span>
          </button>
          <div
            title="University Planner"
            className="flex items-center gap-1.5 px-4 py-1.5 text-slate-500 font-medium text-xs rounded-xl opacity-75 select-none"
          >
            <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
            <span>University Planner</span>
          </div>
        </div>

        {/* Right: User Authentication, Sync Status & Actions */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0">
          {user ? (
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200/70 text-emerald-700 rounded-full text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Cloud Synced</span>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-200/70 text-slate-600 rounded-full text-xs font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
              <span>Private & Secure</span>
            </div>
          )}

          <button
            type="button"
            onClick={onOpenBackup}
            title="Export / Restore Backup"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer min-h-[36px]"
          >
            <DownloadCloud className="w-3.5 h-3.5 text-slate-500" />
            <span>Backup</span>
          </button>

          {/* Authentication Section */}
          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 p-1 pl-2 pr-2.5 bg-slate-100 hover:bg-slate-200/80 rounded-full transition-all cursor-pointer border border-slate-200"
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
                <span className="text-xs font-semibold text-slate-800 max-w-[100px] truncate hidden sm:inline">
                  {user.displayName || user.email?.split('@')[0]}
                </span>
              </button>

              {/* User Dropdown */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
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
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenBackup();
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                    >
                      <DownloadCloud className="w-4 h-4 text-slate-400" />
                      <span>Data Backup & Restore</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenFirebaseConfig();
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                    >
                      <Settings className="w-4 h-4 text-slate-400" />
                      <span>Firebase Settings</span>
                    </button>
                  </div>

                  <div className="border-t border-slate-100 pt-1 mt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        logout();
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-semibold cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-rose-500" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={isConfigured ? signInWithGoogle : onOpenFirebaseConfig}
                className="flex items-center gap-2 px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl border border-slate-300 shadow-2xs hover:shadow-xs transition-all cursor-pointer min-h-[36px]"
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
                <span>Sign in with Google</span>
              </button>

              {!isConfigured && (
                <button
                  type="button"
                  onClick={onOpenFirebaseConfig}
                  title="Configure Firebase Keys"
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  <Settings className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {authError && (
        <div className="bg-rose-50 border-t border-rose-200 px-4 py-2 text-xs text-rose-700 flex items-center justify-between">
          <span>{authError}</span>
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
