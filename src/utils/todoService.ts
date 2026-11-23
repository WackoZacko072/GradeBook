import { doc, getDoc, setDoc, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { TodoItem } from '../types/todo';

const GUEST_TODOS_KEY = 'gradebook_todos_guest_v1';
const USER_TODOS_PREFIX = 'gradebook_todos_user_';

function sanitizeForFirestore<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

export function loadGuestTodos(): TodoItem[] {
  try {
    const raw = localStorage.getItem(GUEST_TODOS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn('Failed to parse guest todos:', err);
  }
  return [];
}

export function saveGuestTodos(todos: TodoItem[]): void {
  try {
    localStorage.setItem(GUEST_TODOS_KEY, JSON.stringify(todos));
  } catch (err) {
    console.warn('Failed to save guest todos:', err);
  }
}

export function getUserCacheTodos(userId: string): TodoItem[] {
  try {
    const raw = localStorage.getItem(USER_TODOS_PREFIX + userId);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn('Failed to read user todos cache:', err);
  }
  return [];
}

export function getInitialTodos(userId?: string | null): TodoItem[] {
  if (userId) {
    const cached = getUserCacheTodos(userId);
    if (cached.length > 0) return cached;
  }
  return loadGuestTodos();
}

export function subscribeToUserTodos(
  userId: string,
  onTodosReceived: (todos: TodoItem[]) => void
): Unsubscribe {
  const cached = getUserCacheTodos(userId);
  if (cached.length > 0) {
    onTodosReceived(cached);
  }

  if (!db || !userId) {
    return () => {};
  }

  const userDocRef = doc(db, 'users', userId);
  return onSnapshot(
    userDocRef,
    async (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.data();
      if (Array.isArray(data?.todos)) {
        const cloudTodos = data.todos as TodoItem[];
        try {
          localStorage.setItem(USER_TODOS_PREFIX + userId, JSON.stringify(cloudTodos));
        } catch {
          // ignore
        }
        onTodosReceived(cloudTodos);
      } else {
        const localTodos = getUserCacheTodos(userId);
        if (localTodos.length > 0) {
          await saveUserTodos(userId, localTodos);
          onTodosReceived(localTodos);
        }
      }
    },
    (error) => {
      console.warn('Firestore todos subscription error:', error);
    }
  );
}

export async function saveUserTodos(userId: string, todos: TodoItem[]): Promise<void> {
  if (!userId) return;

  try {
    localStorage.setItem(USER_TODOS_PREFIX + userId, JSON.stringify(todos));
  } catch (err) {
    console.warn('Failed to cache user todos:', err);
  }

  if (!db) return;

  try {
    const userDocRef = doc(db, 'users', userId);
    const sanitized = sanitizeForFirestore(todos);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      await setDoc(
        userDocRef,
        {
          todos: sanitized,
          updatedAt: Date.now(),
        },
        { merge: true }
      );
    } else {
      await setDoc(userDocRef, {
        classes: [],
        todos: sanitized,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  } catch (err) {
    console.warn('Failed to sync user todos to Firestore:', err);
  }
}
