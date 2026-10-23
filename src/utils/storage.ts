import type { ClassItem } from '../types/grade';
import { INITIAL_DEMO_CLASSES } from './sampleData';

const PRIMARY_STORAGE_KEY = 'grade_calculator_data_v1';
const SECONDARY_STORAGE_KEY = 'zachary_gradebook_data_v1';
const FALLBACK_STORAGE_KEY = 'gradebook_data_v1';

export function loadClasses(): ClassItem[] {
  try {
    // 1. Check original storage key first (where user's actual classes were saved)
    let raw = localStorage.getItem(PRIMARY_STORAGE_KEY);
    
    // 2. Check secondary keys if primary is empty
    if (!raw) {
      raw = localStorage.getItem(SECONDARY_STORAGE_KEY);
    }
    if (!raw) {
      raw = localStorage.getItem(FALLBACK_STORAGE_KEY);
    }

    if (!raw) {
      return INITIAL_DEMO_CLASSES;
    }

    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return INITIAL_DEMO_CLASSES;
  } catch (err) {
    console.error('Failed to load gradebook data from localStorage:', err);
    return INITIAL_DEMO_CLASSES;
  }
}

export function saveClasses(classes: ClassItem[]): void {
  try {
    const serialized = JSON.stringify(classes);
    // Keep all keys synchronized so user data is never lost or overwritten across sessions
    localStorage.setItem(PRIMARY_STORAGE_KEY, serialized);
    localStorage.setItem(SECONDARY_STORAGE_KEY, serialized);
    localStorage.setItem(FALLBACK_STORAGE_KEY, serialized);
  } catch (err) {
    console.error('Failed to save gradebook data to localStorage:', err);
  }
}
