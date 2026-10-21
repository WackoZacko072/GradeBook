import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  type User,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured } from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isConfigured: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  authError: string | null;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const configured = isFirebaseConfigured();

  useEffect(() => {
    if (!configured || !auth) {
      setUser(null);
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [configured]);

  const signInWithGoogle = async () => {
    if (!configured || !auth) {
      setAuthError('Firebase is not yet configured. Please add your Firebase configuration.');
      return;
    }

    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error('Google Sign-in failed:', error);
      if (error?.code === 'auth/popup-closed-by-user') {
        // User voluntarily dismissed popup, ignore
        return;
      }
      if (error?.code === 'auth/unauthorized-domain') {
        setAuthError(
          'Unauthorized domain: Please add this domain (e.g. localhost or your Vercel URL) to Firebase Console -> Authentication -> Settings -> Authorized Domains.'
        );
      } else {
        setAuthError(error?.message || 'Failed to sign in with Google. Please try again.');
      }
    }
  };

  const logout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      setUser(null);
    } catch (error: any) {
      console.error('Logout error:', error);
    }
  };

  const clearAuthError = () => setAuthError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isConfigured: configured,
        signInWithGoogle,
        logout,
        authError,
        clearAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
