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

export function exportBackup(classes: ClassItem[]): void {
  const exportPayload = {
    version: '1.0',
    appName: 'Gradebook',
    exportedAt: new Date().toISOString(),
    classes,
  };
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `gradebook_backup_${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

export function validateAndParseBackup(jsonString: string): ClassItem[] {
  const parsed = JSON.parse(jsonString);
  const classesList = Array.isArray(parsed) ? parsed : parsed.classes;
  if (!Array.isArray(classesList)) {
    throw new Error('Invalid backup file format. Expected a list of classes.');
  }

  // Basic sanity validation
  return classesList.map((item: any) => ({
    id: String(item.id || 'class_' + Math.random().toString(36).substring(2, 9)),
    name: String(item.name || 'Untitled Class'),
    code: item.code ? String(item.code) : undefined,
    color: item.color ? String(item.color) : '#2563EB',
    createdAt: Number(item.createdAt) || Date.now(),
    categories: Array.isArray(item.categories)
      ? item.categories.map((cat: any) => ({
          id: String(cat.id || 'cat_' + Math.random().toString(36).substring(2, 9)),
          name: String(cat.name || 'Category'),
          weight: Number(cat.weight) || 0,
          assessments: Array.isArray(cat.assessments)
            ? cat.assessments.map((ass: any) => ({
                id: String(ass.id || 'ass_' + Math.random().toString(36).substring(2, 9)),
                name: String(ass.name || 'Assessment'),
                score: ass.score === null || ass.score === undefined || isNaN(ass.score) ? null : Number(ass.score),
                maxScore: ass.maxScore ? Number(ass.maxScore) : undefined,
                earnedScore: ass.earnedScore ? Number(ass.earnedScore) : undefined,
                mode: ass.mode === 'points' ? 'points' : 'percentage',
                date: ass.date ? String(ass.date) : undefined,
              }))
            : [],
        }))
      : [],
  }));
}
