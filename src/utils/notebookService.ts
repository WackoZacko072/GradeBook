import { doc, setDoc, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { NoteItem } from '../types/notebook';
import { INITIAL_DEMO_NOTES } from './sampleNotebookData';

const GUEST_NOTES_KEY = 'gradebook_notebook_guest_v1';
const USER_CACHE_PREFIX = 'gradebook_notebook_cache_user_';

/**
 * Strips undefined properties so Firestore accepts the JSON object
 */
function sanitizeForFirestore<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

/**
 * Loads notes for unauthenticated guests from localStorage
 */
export function loadGuestNotes(): NoteItem[] {
  try {
    const raw = localStorage.getItem(GUEST_NOTES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.error('Error loading guest notes:', err);
  }
  return INITIAL_DEMO_NOTES;
}

/**
 * Saves guest notes to localStorage
 */
export function saveGuestNotes(notes: NoteItem[]): void {
  try {
    localStorage.setItem(GUEST_NOTES_KEY, JSON.stringify(notes));
  } catch (err) {
    console.error('Error saving guest notes:', err);
  }
}

/**
 * Synchronously retrieves initial notes from cache or defaults so page render has 0 delay
 */
export function getInitialNotes(userId?: string | null): NoteItem[] {
  if (userId) {
    try {
      const userRaw = localStorage.getItem(USER_CACHE_PREFIX + userId);
      if (userRaw) {
        const parsed = JSON.parse(userRaw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
  }

  try {
    const guestRaw = localStorage.getItem(GUEST_NOTES_KEY);
    if (guestRaw) {
      const parsed = JSON.parse(guestRaw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }

  return INITIAL_DEMO_NOTES;
}

/**
 * Saves user notes to Firestore and local cache
 */
export async function saveUserNotes(userId: string, notes: NoteItem[]): Promise<void> {
  const cacheKey = USER_CACHE_PREFIX + userId;

  // Update local cache immediately
  try {
    localStorage.setItem(cacheKey, JSON.stringify(notes));
  } catch (err) {
    console.error('Error caching user notes locally:', err);
  }

  if (!db) return;

  try {
    // Storing under users/{userId}/notebook/library
    const docRef = doc(db, 'users', userId, 'notebook', 'library');
    await setDoc(docRef, {
      notes: sanitizeForFirestore(notes),
      updatedAt: Date.now(),
    });
  } catch (err) {
    console.warn('Failed to sync notes to Firestore, falling back to local cache:', err);
  }
}

/**
 * Real-time listener for user notes in Firestore
 */
export function subscribeToUserNotes(
  userId: string,
  onNotesReceived: (notes: NoteItem[]) => void
): Unsubscribe {
  const cacheKey = USER_CACHE_PREFIX + userId;

  // Immediately notify with cached notes
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        onNotesReceived(parsed);
      }
    } else {
      const initial = getInitialNotes(userId);
      onNotesReceived(initial);
    }
  } catch {
    // ignore
  }

  if (!db) {
    return () => {};
  }

  const docRef = doc(db, 'users', userId, 'notebook', 'library');

  const unsubscribe = onSnapshot(
    docRef,
    async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const cloudNotes = Array.isArray(data.notes) ? (data.notes as NoteItem[]) : [];
        if (cloudNotes.length > 0) {
          try {
            localStorage.setItem(cacheKey, JSON.stringify(cloudNotes));
          } catch {
            // ignore
          }
          onNotesReceived(cloudNotes);
        } else {
          // Cloud has empty notes, check local
          const local = getInitialNotes(userId);
          if (local.length > 0) {
            await saveUserNotes(userId, local);
            onNotesReceived(local);
          } else {
            onNotesReceived([]);
          }
        }
      } else {
        // Document does not exist yet, initialize with demo notes
        const initial = getInitialNotes(userId);
        if (initial.length > 0) {
          await saveUserNotes(userId, initial);
          onNotesReceived(initial);
        } else {
          onNotesReceived([]);
        }
      }
    },
    (err) => {
      console.warn('Firestore notebook sync listener error (using local cache):', err);
    }
  );

  return unsubscribe;
}
