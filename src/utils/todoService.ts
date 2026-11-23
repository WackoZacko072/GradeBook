import { doc, getDoc, setDoc, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { TodoItem, TodoList } from '../types/todo';

const GUEST_TODOS_KEY = 'gradebook_todos_guest_v1';
const USER_TODOS_PREFIX = 'gradebook_todos_user_';
const GUEST_TODO_LISTS_KEY = 'gradebook_todo_lists_guest_v1';
const USER_TODO_LISTS_PREFIX = 'gradebook_todo_lists_user_';

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

export function loadGuestTodoLists(): TodoList[] | null {
  try {
    const raw = localStorage.getItem(GUEST_TODO_LISTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn('Failed to parse guest todo lists:', err);
  }
  return null;
}

export function saveGuestTodoLists(lists: TodoList[]): void {
  try {
    localStorage.setItem(GUEST_TODO_LISTS_KEY, JSON.stringify(lists));
  } catch (err) {
    console.warn('Failed to save guest todo lists:', err);
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

export function getUserCacheTodoLists(userId: string): TodoList[] | null {
  try {
    const raw = localStorage.getItem(USER_TODO_LISTS_PREFIX + userId);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn('Failed to read user todo lists cache:', err);
  }
  return null;
}

export function getInitialTodos(userId?: string | null): TodoItem[] {
  if (userId) {
    const cached = getUserCacheTodos(userId);
    if (cached.length > 0) return cached;
  }
  return loadGuestTodos();
}

export function getInitialTodoLists(userId?: string | null): TodoList[] | null {
  if (userId) {
    const cached = getUserCacheTodoLists(userId);
    if (cached !== null) return cached;
  }
  return loadGuestTodoLists();
}

export function subscribeToUserTodos(
  userId: string,
  onTodosReceived: (todos: TodoItem[]) => void,
  onListsReceived?: (lists: TodoList[]) => void
): Unsubscribe {
  const cachedTodos = getUserCacheTodos(userId);
  if (cachedTodos.length > 0) {
    onTodosReceived(cachedTodos);
  }
  const cachedLists = getUserCacheTodoLists(userId);
  if (cachedLists !== null && onListsReceived) {
    onListsReceived(cachedLists);
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

      if (onListsReceived) {
        if (Array.isArray(data?.todoLists)) {
          const cloudLists = data.todoLists as TodoList[];
          try {
            localStorage.setItem(USER_TODO_LISTS_PREFIX + userId, JSON.stringify(cloudLists));
          } catch {
            // ignore
          }
          onListsReceived(cloudLists);
        } else {
          const localLists = getUserCacheTodoLists(userId);
          if (localLists !== null) {
            await saveUserTodoLists(userId, localLists);
            onListsReceived(localLists);
          }
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

export async function saveUserTodoLists(userId: string, lists: TodoList[]): Promise<void> {
  if (!userId) return;

  try {
    localStorage.setItem(USER_TODO_LISTS_PREFIX + userId, JSON.stringify(lists));
  } catch (err) {
    console.warn('Failed to cache user todo lists:', err);
  }

  if (!db) return;

  try {
    const userDocRef = doc(db, 'users', userId);
    const sanitized = sanitizeForFirestore(lists);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      await setDoc(
        userDocRef,
        {
          todoLists: sanitized,
          updatedAt: Date.now(),
        },
        { merge: true }
      );
    } else {
      await setDoc(userDocRef, {
        classes: [],
        todoLists: sanitized,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  } catch (err) {
    console.warn('Failed to sync user todo lists to Firestore:', err);
  }
}
