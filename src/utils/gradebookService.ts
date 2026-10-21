import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { ClassItem } from '../types/grade';

const USER_CACHE_PREFIX = 'gradebook_cache_user_';
const GUEST_STORAGE_KEY = 'gradebook_guest_data_v1';

export interface UserGradebookData {
  classes: ClassItem[];
  updatedAt: number;
  email?: string | null;
  displayName?: string | null;
}

/**
 * Load classes for a specific user from Firestore, falling back to per-user localStorage cache.
 * If this is the user's very first time, it initializes an empty gradebook ([] zero classes).
 */
export async function loadUserClasses(userId: string, userEmail?: string | null, userName?: string | null): Promise<ClassItem[]> {
  const cacheKey = USER_CACHE_PREFIX + userId;

  // If Firestore is available, fetch from Firestore
  if (db) {
    try {
      const userDocRef = doc(db, 'users', userId);
      const snapshot = await getDoc(userDocRef);

      if (snapshot.exists()) {
        const data = snapshot.data();
        const classes = Array.isArray(data.classes) ? (data.classes as ClassItem[]) : [];
        // Update local cache for fast next load
        try {
          localStorage.setItem(cacheKey, JSON.stringify(classes));
        } catch {
          // ignore storage quota error
        }
        return classes;
      } else {
        // First-time user! Initialize with exactly 0 classes as requested
        const initialClasses: ClassItem[] = [];
        await setDoc(userDocRef, {
          classes: initialClasses,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          email: userEmail || null,
          displayName: userName || null,
        });

        try {
          localStorage.setItem(cacheKey, JSON.stringify(initialClasses));
        } catch {
          // ignore
        }
        return initialClasses;
      }
    } catch (err) {
      console.warn('Could not fetch from Firestore, falling back to local cache:', err);
    }
  }

  // Fallback to per-user local cache
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to read per-user local cache:', err);
  }

  // If new user and offline/fallback, default to 0 classes
  return [];
}

/**
 * Save classes for a specific user to Firestore and per-user local cache.
 */
export async function saveUserClasses(userId: string, classes: ClassItem[]): Promise<void> {
  const cacheKey = USER_CACHE_PREFIX + userId;

  // Always update local cache immediately for instantaneous UI updates
  try {
    localStorage.setItem(cacheKey, JSON.stringify(classes));
  } catch (err) {
    console.error('Failed to write to local cache:', err);
  }

  // Save to Firestore in background
  if (db) {
    try {
      const userDocRef = doc(db, 'users', userId);
      await setDoc(
        userDocRef,
        {
          classes,
          updatedAt: Date.now(),
        },
        { merge: true }
      );
    } catch (err) {
      console.error('Failed to sync classes to Firestore:', err);
    }
  }
}

/**
 * Guest/Unauthenticated fallback helpers
 */
export function loadGuestClasses(): ClassItem[] {
  try {
    const raw = localStorage.getItem(GUEST_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

export function saveGuestClasses(classes: ClassItem[]): void {
  try {
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(classes));
  } catch {
    // ignore
  }
}
