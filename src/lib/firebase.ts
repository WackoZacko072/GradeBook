import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

// Default Firebase Configuration for Gradebook (Project: gradebook-cbd26)
const DEFAULT_FIREBASE_CONFIG: FirebaseConfig = {
  apiKey: "AIzaSyBLXZNaIecqkf_rRBZcwRc8IQHDdwi2HI0",
  authDomain: "gradebook-cbd26.firebaseapp.com",
  projectId: "gradebook-cbd26",
  storageBucket: "gradebook-cbd26.firebasestorage.app",
  messagingSenderId: "428854713959",
  appId: "1:428854713959:web:b57cece66f905a0f463ec2",
};

const CLIENT_STORAGE_CONFIG_KEY = 'gradebook_firebase_config_v1';

export function getStoredFirebaseConfig(): FirebaseConfig {
  // 1. Check environment variables (Vite / Vercel)
  const envKey = import.meta.env.VITE_FIREBASE_API_KEY;
  if (envKey && envKey !== 'your_api_key_here' && envKey.trim().length > 0) {
    return {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || DEFAULT_FIREBASE_CONFIG.authDomain,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_CONFIG.projectId,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || DEFAULT_FIREBASE_CONFIG.storageBucket,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || DEFAULT_FIREBASE_CONFIG.messagingSenderId,
      appId: import.meta.env.VITE_FIREBASE_APP_ID || DEFAULT_FIREBASE_CONFIG.appId,
    };
  }

  // 2. Check browser localStorage override
  try {
    const raw = localStorage.getItem(CLIENT_STORAGE_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.apiKey && parsed.projectId) {
        return parsed as FirebaseConfig;
      }
    }
  } catch {
    // Ignore parse errors
  }

  // 3. Fallback to default project configuration
  return DEFAULT_FIREBASE_CONFIG;
}

export function saveClientFirebaseConfig(config: FirebaseConfig): void {
  localStorage.setItem(CLIENT_STORAGE_CONFIG_KEY, JSON.stringify(config));
  window.location.reload();
}

export function clearClientFirebaseConfig(): void {
  localStorage.removeItem(CLIENT_STORAGE_CONFIG_KEY);
  window.location.reload();
}

const activeConfig = getStoredFirebaseConfig();

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

try {
  app = getApps().length === 0 ? initializeApp(activeConfig) : getApp();
  auth = getAuth(app);
  db = getFirestore(app);
} catch (err) {
  console.error('Failed to initialize Firebase:', err);
}

export { app, auth, db, googleProvider };

export function isFirebaseConfigured(): boolean {
  return auth !== null && db !== null;
}
