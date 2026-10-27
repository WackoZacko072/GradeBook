import { doc, setDoc, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { NoteSource, NoteItem } from '../types/notebook';

const GUEST_SOURCES_KEY = 'gradeslate_sources_guest_v1';
const USER_CACHE_PREFIX = 'gradeslate_sources_cache_user_';
const LEGACY_GUEST_NOTES_KEY = 'gradebook_notebook_guest_v1';

/**
 * Filter out any mock/demo sources so users start with a clean workspace
 */
function filterOutMockSources(sources: NoteSource[]): NoteSource[] {
  return sources.filter(
    (s) => s && s.id !== 'source_demo_sample' && !s.id.startsWith('source_demo_')
  );
}

/**
 * Strips undefined properties so Firestore accepts the JSON object
 */
function sanitizeForFirestore<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

/**
 * Migrates any legacy sources stored inside old notes so user never loses their files
 */
function migrateLegacyNotesSources(): NoteSource[] {
  try {
    const raw = localStorage.getItem(LEGACY_GUEST_NOTES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const extracted: NoteSource[] = [];
        parsed.forEach((note: NoteItem) => {
          if (Array.isArray(note.sources)) {
            note.sources.forEach((src) => {
              if (src && src.content) {
                extracted.push({
                  ...src,
                  classId: src.classId || note.classId,
                  className: src.className || note.className,
                });
              }
            });
          }
        });
        return extracted;
      }
    }
  } catch {
    // ignore
  }
  return [];
}

/**
 * Loads sources for unauthenticated guests from localStorage
 */
export function loadGuestSources(): NoteSource[] {
  try {
    const raw = localStorage.getItem(GUEST_SOURCES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const cleaned = filterOutMockSources(parsed);
        return cleaned;
      }
    }
  } catch (err) {
    console.error('Error loading guest sources:', err);
  }

  // Attempt migration from legacy notes if guest sources are empty
  const migrated = migrateLegacyNotesSources();
  if (migrated.length > 0) {
    saveGuestSources(migrated);
    return migrated;
  }

  return [];
}

/**
 * Saves guest sources to localStorage
 */
export function saveGuestSources(sources: NoteSource[]): void {
  try {
    localStorage.setItem(GUEST_SOURCES_KEY, JSON.stringify(sources));
  } catch (err) {
    console.error('Error saving guest sources:', err);
  }
}

/**
 * Synchronously retrieves initial sources from cache or defaults so page render has 0 delay
 */
export function getInitialSources(userId?: string | null): NoteSource[] {
  if (userId) {
    try {
      const userRaw = localStorage.getItem(USER_CACHE_PREFIX + userId);
      if (userRaw) {
        const parsed = JSON.parse(userRaw);
        if (Array.isArray(parsed)) {
          return filterOutMockSources(parsed);
        }
      }
    } catch {
      // ignore
    }
  }

  return loadGuestSources();
}

/**
 * Saves user sources to Firestore and local cache
 */
export async function saveUserSources(userId: string, sources: NoteSource[]): Promise<void> {
  const cacheKey = USER_CACHE_PREFIX + userId;

  // Update local cache immediately
  try {
    localStorage.setItem(cacheKey, JSON.stringify(sources));
  } catch (err) {
    console.error('Error caching user sources locally:', err);
  }

  if (!db) return;

  try {
    // Storing under users/{userId}/sources/library
    const docRef = doc(db, 'users', userId, 'sources', 'library');
    await setDoc(docRef, {
      sources: sanitizeForFirestore(sources),
      updatedAt: Date.now(),
    });
  } catch (err) {
    console.warn('Failed to sync sources to Firestore, falling back to local cache:', err);
  }
}

/**
 * Real-time listener for user sources in Firestore
 */
export function subscribeToUserSources(
  userId: string,
  onSourcesReceived: (sources: NoteSource[]) => void
): Unsubscribe {
  const cacheKey = USER_CACHE_PREFIX + userId;

  // Immediately notify with cached sources
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        onSourcesReceived(filterOutMockSources(parsed));
      }
    } else {
      const initial = getInitialSources(userId);
      onSourcesReceived(initial);
    }
  } catch {
    // ignore
  }

  if (!db) {
    return () => {};
  }

  const docRef = doc(db, 'users', userId, 'sources', 'library');

  const unsubscribe = onSnapshot(
    docRef,
    async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const cloudSources = Array.isArray(data.sources) ? (data.sources as NoteSource[]) : [];
        const cleaned = filterOutMockSources(cloudSources);
        try {
          localStorage.setItem(cacheKey, JSON.stringify(cleaned));
        } catch {
          // ignore
        }
        onSourcesReceived(cleaned);
      } else {
        onSourcesReceived([]);
      }
    },
    (err) => {
      console.warn('Firestore sources sync listener error (using local cache):', err);
    }
  );

  return unsubscribe;
}
