import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { ClassItem } from '../types/grade';

const USER_CACHE_PREFIX = 'gradebook_cache_user_';
const GUEST_STORAGE_KEY = 'gradebook_guest_data_v1';
const LAST_ACTIVE_CLASSES_KEY = 'gradebook_last_saved_classes';
const LEGACY_STORAGE_KEYS = [
  'grade_calculator_data_v1',
  'zachary_gradebook_data_v1',
  'gradebook_data_v1',
];

/**
 * Strips all undefined properties from objects so Firestore never rejects the payload
 */
function sanitizeForFirestore<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

/**
 * Get cached classes immediately and synchronously for instant rendering on page refresh
 */
export function getInitialClasses(userId?: string | null): ClassItem[] {
  try {
    // 1. If user ID is passed, check their specific cache first
    if (userId) {
      const userRaw = localStorage.getItem(USER_CACHE_PREFIX + userId);
      if (userRaw) {
        const parsed = JSON.parse(userRaw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    }

    // 2. Check the last active saved classes key
    const lastActiveRaw = localStorage.getItem(LAST_ACTIVE_CLASSES_KEY);
    if (lastActiveRaw) {
      const parsed = JSON.parse(lastActiveRaw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }

    // 3. Check guest storage key
    const guestRaw = localStorage.getItem(GUEST_STORAGE_KEY);
    if (guestRaw) {
      const parsed = JSON.parse(guestRaw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }

    // 4. Check legacy storage keys
    for (const key of LEGACY_STORAGE_KEYS) {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    }
  } catch (err) {
    console.error('Error loading initial classes from cache:', err);
  }

  return [];
}

/**
 * Load classes for a specific authenticated user.
 * Prioritizes user's saved data, syncs with Firestore, and ensures local data is NEVER wiped out by refresh.
 */
export async function loadUserClasses(
  userId: string,
  userEmail?: string | null,
  userName?: string | null
): Promise<ClassItem[]> {
  const cacheKey = USER_CACHE_PREFIX + userId;

  // 1. Check local cache for this user first
  let cachedClasses: ClassItem[] = [];
  try {
    const raw = localStorage.getItem(cacheKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        cachedClasses = parsed;
      }
    }
  } catch {
    // ignore
  }

  // If local cache is empty, check if there is recent active data to adopt
  if (cachedClasses.length === 0) {
    const fallback = getInitialClasses(userId);
    if (fallback.length > 0) {
      cachedClasses = fallback;
    }
  }

  // 2. Fetch from Cloud Firestore if available
  if (db) {
    try {
      const userDocRef = doc(db, 'users', userId);
      const snapshot = await getDoc(userDocRef);

      if (snapshot.exists()) {
        const data = snapshot.data();
        const cloudClasses = Array.isArray(data.classes) ? (data.classes as ClassItem[]) : [];

        // If cloud has classes, use cloud classes and update local cache
        if (cloudClasses.length > 0) {
          try {
            localStorage.setItem(cacheKey, JSON.stringify(cloudClasses));
            localStorage.setItem(LAST_ACTIVE_CLASSES_KEY, JSON.stringify(cloudClasses));
          } catch {
            // ignore
          }
          return cloudClasses;
        }

        // Cloud document exists but classes is empty:
        // If the user had saved classes locally, preserve them and sync to cloud!
        if (cachedClasses.length > 0) {
          await saveUserClasses(userId, cachedClasses);
          return cachedClasses;
        }

        // Both cloud and local are empty: brand new empty user
        return [];
      } else {
        // Document does not exist yet in Firestore
        // If user already had classes locally, save them to Firestore!
        if (cachedClasses.length > 0) {
          await saveUserClasses(userId, cachedClasses);
          return cachedClasses;
        }

        // Completely new user starting with 0 classes
        const initialClasses: ClassItem[] = [];
        try {
          await setDoc(userDocRef, {
            classes: initialClasses,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            email: userEmail || null,
            displayName: userName || null,
          });
        } catch (setErr) {
          console.warn('Could not initialize user document in Firestore:', setErr);
        }

        try {
          localStorage.setItem(cacheKey, JSON.stringify(initialClasses));
          localStorage.setItem(LAST_ACTIVE_CLASSES_KEY, JSON.stringify(initialClasses));
        } catch {
          // ignore
        }
        return initialClasses;
      }
    } catch (err) {
      console.warn('Firestore fetch failed, using local cached classes:', err);
    }
  }

  // If Firestore is offline or errored, return cached local data (never wipe data!)
  return cachedClasses;
}

/**
 * Save classes for a specific user to Firestore and per-user local cache.
 */
export async function saveUserClasses(userId: string, classes: ClassItem[]): Promise<void> {
  const cacheKey = USER_CACHE_PREFIX + userId;

  // 1. Immediately save to localStorage synchronously so refresh never loses data
  try {
    const serialized = JSON.stringify(classes);
    localStorage.setItem(cacheKey, serialized);
    localStorage.setItem(LAST_ACTIVE_CLASSES_KEY, serialized);
    // Also sync to fallback storage keys
    for (const key of LEGACY_STORAGE_KEYS) {
      localStorage.setItem(key, serialized);
    }
  } catch (err) {
    console.error('Failed to write to local cache:', err);
  }

  // 2. Save to Firestore in background with sanitized payload (no undefined values)
  if (db) {
    try {
      const userDocRef = doc(db, 'users', userId);
      const sanitized = sanitizeForFirestore({
        classes,
        updatedAt: Date.now(),
      });

      await setDoc(userDocRef, sanitized, { merge: true });
    } catch (err) {
      console.error('Failed to sync classes to Firestore:', err);
    }
  }
}

/**
 * Guest/Unauthenticated fallback helpers
 */
export function loadGuestClasses(): ClassItem[] {
  return getInitialClasses(null);
}

export function saveGuestClasses(classes: ClassItem[]): void {
  try {
    const serialized = JSON.stringify(classes);
    localStorage.setItem(GUEST_STORAGE_KEY, serialized);
    localStorage.setItem(LAST_ACTIVE_CLASSES_KEY, serialized);
    for (const key of LEGACY_STORAGE_KEYS) {
      localStorage.setItem(key, serialized);
    }
  } catch {
    // ignore
  }
}
