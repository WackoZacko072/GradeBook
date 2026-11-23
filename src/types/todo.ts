export type TodoPriority = 'low' | 'medium' | 'high';

export interface TodoItem {
  id: string;
  classId: string; // ClassItem['id'] or 'general'
  title: string;
  completed: boolean;
  dueDate?: string; // YYYY-MM-DD
  priority?: TodoPriority;
  createdAt: number;
  completedAt?: number;
}
