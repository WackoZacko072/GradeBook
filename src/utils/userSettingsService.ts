import { doc, getDoc, setDoc, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { GradeScaleEntry } from '../types/grade';

export interface UserSettings {
  gradingScale?: GradeScaleEntry[];
  theme?: 'light' | 'dark';
  viewMode?: 'grid' | 'list';
  todoViewMode?: 'grid' | 'list';
  sidebarCollapsed?: 'expanded' | 'collapsed';
  updatedAt?: number;
}

let activeUserId: string | null = null;
let cachedCloudSettings: UserSettings = {};

export function setActiveSettingsUserId(userId: string | null): void {
  activeUserId = userId;
  if (!userId) {
    cachedCloudSettings = {};
  }
}

export function getActiveSettingsUserId(): string | null {
  return activeUserId;
}

/**
 * Saves partial user settings to Firestore so they sync across all devices.
 */
export async function saveUserSettings(
  partial: Partial<UserSettings>,
  userIdOverride?: string | null
): Promise<void> {
  const userId = userIdOverride ?? activeUserId;
  if (!userId || !db) return;

  const nextSettings: UserSettings = {
    ...cachedCloudSettings,
    ...partial,
    updatedAt: Date.now(),
  };
  cachedCloudSettings = nextSettings;

  // Strip undefined properties so Firestore never rejects the payload
  const sanitizedSettings = JSON.parse(JSON.stringify(nextSettings));

  try {
    const userDocRef = doc(db, 'users', userId);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      const existingSettings = (snap.data()?.settings as UserSettings | undefined) || {};
      const merged = {
        ...existingSettings,
        ...sanitizedSettings,
      };
      cachedCloudSettings = merged;
      await setDoc(
        userDocRef,
        {
          settings: merged,
          updatedAt: Date.now(),
        },
        { merge: true }
      );
    } else {
      await setDoc(userDocRef, {
        classes: [],
        settings: sanitizedSettings,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  } catch (err) {
    console.warn('Failed to sync user settings to Firestore:', err);
  }
}

/**
 * Subscribes to real-time user settings updates from Firestore across devices.
 */
export function subscribeToUserSettings(
  userId: string,
  onSettingsReceived: (settings: UserSettings) => void
): Unsubscribe {
  if (!userId || !db) {
    return () => {};
  }

  const userDocRef = doc(db, 'users', userId);
  return onSnapshot(
    userDocRef,
    (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.data();
      if (data && data.settings && typeof data.settings === 'object') {
        const cloudSettings = data.settings as UserSettings;
        cachedCloudSettings = cloudSettings;
        onSettingsReceived(cloudSettings);
      }
    },
    (error) => {
      console.warn('Firestore settings subscription error:', error);
    }
  );
}
