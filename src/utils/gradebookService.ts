import { doc, getDoc, setDoc, onSnapshot, type Unsubscribe } from 'firebase/firestore';
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

export type SyncState = 'synced' | 'syncing' | 'error' | 'offline';

export interface SyncStatusInfo {
  state: SyncState;
  lastSyncedAt: number | null;
  errorMessage: string | null;
}

let currentSyncStatus: SyncStatusInfo = {
  state: db ? 'synced' : 'offline',
  lastSyncedAt: null,
  errorMessage: null,
};

const syncListeners = new Set<(status: SyncStatusInfo) => void>();

function setSyncStatus(state: SyncState, errorMessage: string | null = null) {
  currentSyncStatus = {
    state,
    lastSyncedAt: state === 'synced' ? Date.now() : currentSyncStatus.lastSyncedAt,
    errorMessage,
  };
  syncListeners.forEach((fn) => fn(currentSyncStatus));
}

export function subscribeToSyncStatus(listener: (status: SyncStatusInfo) => void): () => void {
  listener(currentSyncStatus);
  syncListeners.add(listener);
  return () => {
    syncListeners.delete(listener);
  };
}

export function getSyncStatus(): SyncStatusInfo {
  return currentSyncStatus;
}

/**
 * Strips all undefined properties from objects so Firestore never rejects the payload
 */
function sanitizeForFirestore<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

/**
 * Get cached classes strictly for a specific user ID
 */
export function getUserCacheClasses(userId: string): ClassItem[] {
  try {
    const raw = localStorage.getItem(USER_CACHE_PREFIX + userId);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.error('Error reading user cache:', err);
  }
  return [];
}

/**
 * Get cached classes immediately and synchronously for instant rendering on page load
 */
export function getInitialClasses(userId?: string | null): ClassItem[] {
  try {
    // 1. If user ID is known, check their specific cache first
    if (userId) {
      const userClasses = getUserCacheClasses(userId);
      if (userClasses.length > 0) return userClasses;
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
 * Real-time subscription to user classes in Firestore.
 * Automatically synchronizes between computer and phone instantly!
 */
export function subscribeToUserClasses(
  userId: string,
  onClassesReceived: (classes: ClassItem[]) => void,
  userEmail?: string | null,
  userName?: string | null
): Unsubscribe {
  const cacheKey = USER_CACHE_PREFIX + userId;

  // Immediately notify caller with locally cached classes so UI renders with 0 delay
  const userSpecific = getUserCacheClasses(userId);
  if (userSpecific.length > 0) {
    onClassesReceived(userSpecific);
  } else {
    const anyLocal = getInitialClasses(userId);
    if (anyLocal.length > 0) {
      onClassesReceived(anyLocal);
    }
  }

  if (!db) {
    setSyncStatus('offline', 'Firebase database is not connected.');
    return () => {};
  }

  setSyncStatus('syncing');

  const userDocRef = doc(db, 'users', userId);

  const unsubscribe = onSnapshot(
    userDocRef,
    async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const cloudClasses = Array.isArray(data.classes) ? (data.classes as ClassItem[]) : [];

        if (cloudClasses.length > 0) {
          // Cloud has valid classes -> adopt them on this device
          try {
            const serialized = JSON.stringify(cloudClasses);
            localStorage.setItem(cacheKey, serialized);
            localStorage.setItem(LAST_ACTIVE_CLASSES_KEY, serialized);
          } catch {
            // ignore
          }
          setSyncStatus('synced');
          onClassesReceived(cloudClasses);
        } else {
          // Cloud has 0 classes. Check if this device has local classes to upload:
          const localToUpload = getUserCacheClasses(userId).length > 0
            ? getUserCacheClasses(userId)
            : getInitialClasses(userId);

          if (localToUpload.length > 0) {
            console.log('Uploading local classes to empty cloud document...');
            await saveUserClasses(userId, localToUpload);
            onClassesReceived(localToUpload);
          } else {
            // Truly empty starting state
            setSyncStatus('synced');
            onClassesReceived([]);
          }
        }
      } else {
        // Document does not exist yet in Firestore
        const localToUpload = getUserCacheClasses(userId).length > 0
          ? getUserCacheClasses(userId)
          : getInitialClasses(userId);

        if (localToUpload.length > 0) {
          console.log('Creating cloud document with local classes...');
          await saveUserClasses(userId, localToUpload);
          onClassesReceived(localToUpload);
        } else {
          // Create initial empty document for brand new user
          try {
            await setDoc(userDocRef, {
              classes: [],
              createdAt: Date.now(),
              updatedAt: Date.now(),
              email: userEmail || null,
              displayName: userName || null,
            });
            setSyncStatus('synced');
          } catch (initErr: any) {
            console.error('Failed to initialize user document:', initErr);
            const msg = initErr?.code === 'permission-denied'
              ? 'Firestore Permission Denied. Please ensure Firestore Security Rules are published in Firebase Console.'
              : initErr?.message || 'Permission denied in Firestore';
            setSyncStatus('error', msg);
          }
          onClassesReceived([]);
        }
      }
    },
    (error) => {
      console.error('Firestore real-time sync error:', error);
      let message = error.message;
      if (error.code === 'permission-denied') {
        message = 'Firestore Permission Denied. Please ensure rules are published in Firebase Console.';
      } else if (error.code === 'unavailable') {
        message = 'Firestore service is currently unavailable or offline.';
      }
      setSyncStatus('error', message);
    }
  );

  return unsubscribe;
}

/**
 * Save classes for a specific user to Firestore and per-user local cache.
 */
export async function saveUserClasses(
  userId: string,
  classes: ClassItem[]
): Promise<{ success: boolean; error?: string }> {
  if (!userId) return { success: false, error: 'No user ID provided' };

  const cacheKey = USER_CACHE_PREFIX + userId;

  // 1. Immediately save to localStorage synchronously
  try {
    const serialized = JSON.stringify(classes);
    localStorage.setItem(cacheKey, serialized);
    localStorage.setItem(LAST_ACTIVE_CLASSES_KEY, serialized);
    for (const key of LEGACY_STORAGE_KEYS) {
      localStorage.setItem(key, serialized);
    }
  } catch (err) {
    console.error('Failed to write to local cache:', err);
  }

  // 2. Save to Firestore in background
  if (db) {
    setSyncStatus('syncing');
    try {
      const userDocRef = doc(db, 'users', userId);
      const sanitized = sanitizeForFirestore({
        classes,
        updatedAt: Date.now(),
      });

      await setDoc(userDocRef, sanitized, { merge: true });
      setSyncStatus('synced');
      return { success: true };
    } catch (err: any) {
      console.error('Failed to sync classes to Firestore:', err);
      let errorMsg = err?.message || 'Failed to sync with Firestore';
      if (err?.code === 'permission-denied') {
        errorMsg = 'Firestore Permission Denied. Check your Firebase Console Firestore rules.';
      }
      setSyncStatus('error', errorMsg);
      return { success: false, error: errorMsg };
    }
  } else {
    setSyncStatus('offline', 'Firebase database is not connected.');
    return { success: false, error: 'Firebase not configured' };
  }
}

/**
 * Force manual upload of classes to Cloud Firestore
 */
export async function forceSyncToCloud(
  userId: string,
  classes: ClassItem[]
): Promise<{ success: boolean; error?: string }> {
  return await saveUserClasses(userId, classes);
}

/**
 * Test connectivity & permissions to Firestore
 */
export async function testFirestoreAccess(userId: string): Promise<{ success: boolean; message: string }> {
  if (!db) {
    return { success: false, message: 'Firebase Firestore is not initialized.' };
  }
  try {
    const userDocRef = doc(db, 'users', userId);
    const snap = await getDoc(userDocRef);
    await setDoc(userDocRef, { _lastPing: Date.now() }, { merge: true });
    return {
      success: true,
      message: `Cloud Firestore connection verified! Read (${snap.exists() ? 'document exists' : 'ready'}) and write succeeded.`,
    };
  } catch (err: any) {
    console.error('Firestore connection test failed:', err);
    let msg = err?.message || 'Connection test failed';
    if (err?.code === 'permission-denied') {
      msg = 'Permission Denied: Your Firebase Firestore Security Rules are blocking access. Go to Firebase Console -> Firestore Database -> Rules and publish the required rules.';
    }
    return { success: false, message: msg };
  }
}

/**
 * Guest helpers
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
