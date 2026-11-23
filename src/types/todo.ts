export interface TodoList {
  id: string;
  name: string;
  color: string;
  createdAt: number;
}

export interface TodoItem {
  id: string;
  classId: string; // References TodoList['id']
  title: string;
  completed: boolean;
  dueDate?: string; // YYYY-MM-DD
  createdAt: number;
  completedAt?: number;
}
