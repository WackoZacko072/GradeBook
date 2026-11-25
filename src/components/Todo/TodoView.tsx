import React, { useState } from 'react';
import {
  Check,
  Plus,
  Trash2,
  Calendar,
  CheckCircle2,
  Edit2,
  X,
  Sparkles,
  GripVertical,
  ArrowUpDown,
} from 'lucide-react';
import type { TodoItem, TodoList } from '../../types/todo';

interface TodoViewProps {
  lists: TodoList[];
  todos: TodoItem[];
  viewMode?: 'grid' | 'list';
  onAddList: (list: TodoList) => void;
  onDeleteList: (listId: string) => void;
  onReorderLists: (newLists: TodoList[]) => void;
  onAddTodo: (todo: TodoItem) => void;
  onUpdateTodo: (todo: TodoItem) => void;
  onDeleteTodo: (id: string) => void;
  onReorderTodos: (newTodos: TodoItem[]) => void;
  onClearCompleted: () => void;
}

type FilterMode = 'all' | 'active' | 'completed';
type ListSortMode = 'manual' | 'due_asc' | 'due_desc' | 'list' | 'alpha' | 'newest';

const LIST_COLOR_OPTIONS = [
  '#2563EB', // Blue
  '#7C3AED', // Violet
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#EF4444', // Red
  '#6366F1', // Indigo
];

function formatDueDate(dateStr?: string): { text: string; isOverdue: boolean; isToday: boolean } | null {
  if (!dateStr) return null;
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3) return null;
  const target = new Date(parts[0], parts[1] - 1, parts[2]);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { text: 'Overdue', isOverdue: true, isToday: false };
  }
  if (diffDays === 0) {
    return { text: 'Today', isOverdue: false, isToday: true };
  }
  if (diffDays === 1) {
    return { text: 'Tomorrow', isOverdue: false, isToday: false };
  }
  return {
    text: target.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    isOverdue: false,
    isToday: false,
  };
}

export const TodoView: React.FC<TodoViewProps> = ({
  lists,
  todos,
  viewMode = 'grid',
  onAddList,
  onDeleteList,
  onReorderLists,
  onAddTodo,
  onUpdateTodo,
  onDeleteTodo,
  onReorderTodos,
  onClearCompleted,
}) => {
  const [filter, setFilter] = useState<FilterMode>('all');
  const [listSort, setListSort] = useState<ListSortMode>('manual');
  const [unifiedDraftTitle, setUnifiedDraftTitle] = useState('');
  const [unifiedDraftDate, setUnifiedDraftDate] = useState('');
  const [unifiedSelectedListId, setUnifiedSelectedListId] = useState<string>('');
  const [draftTitles, setDraftTitles] = useState<Record<string, string>>({});
  const [draftDates, setDraftDates] = useState<Record<string, string>>({});
  const [expandedDateCol, setExpandedDateCol] = useState<string | null>(null);
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  // Add To-Do List form state
  const [isAddingList, setIsAddingList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListColor, setNewListColor] = useState(LIST_COLOR_OPTIONS[0]);

  // Drag & Drop state for lists and tasks
  const [draggedListId, setDraggedListId] = useState<string | null>(null);
  const [dragOverListId, setDragOverListId] = useState<string | null>(null);
  const [listDropPosition, setListDropPosition] = useState<'before' | 'after'>('before');
  const [draggedTodoId, setDraggedTodoId] = useState<string | null>(null);
  const [dragOverTodoId, setDragOverTodoId] = useState<string | null>(null);
  const [todoDropPosition, setTodoDropPosition] = useState<'before' | 'after'>('before');

  const totalPending = todos.filter((t) => !t.completed).length;
  const totalCompleted = todos.filter((t) => t.completed).length;

  const handleCreateList = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newListName.trim();
    if (!trimmed) return;

    onAddList({
      id: `todolist_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: trimmed,
      color: newListColor,
      createdAt: Date.now(),
    });
    setNewListName('');
    setNewListColor(LIST_COLOR_OPTIONS[(lists.length + 1) % LIST_COLOR_OPTIONS.length]);
    setIsAddingList(false);
  };

  const handleCreateTask = (listId: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const title = (draftTitles[listId] || '').trim();
    if (!title) return;

    const newTodo: TodoItem = {
      id: `todo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      classId: listId,
      title,
      completed: false,
      dueDate: draftDates[listId] || undefined,
      createdAt: Date.now(),
    };

    onAddTodo(newTodo);
    setDraftTitles((prev) => ({ ...prev, [listId]: '' }));
    setDraftDates((prev) => ({ ...prev, [listId]: '' }));
    setExpandedDateCol(null);
  };

  const handleToggleComplete = (todo: TodoItem) => {
    onUpdateTodo({
      ...todo,
      completed: !todo.completed,
      completedAt: !todo.completed ? Date.now() : undefined,
    });
  };

  const handleStartEdit = (todo: TodoItem) => {
    setEditingTodoId(todo.id);
    setEditingTitle(todo.title);
  };

  const handleSaveEdit = (todo: TodoItem) => {
    const trimmed = editingTitle.trim();
    if (trimmed && trimmed !== todo.title) {
      onUpdateTodo({ ...todo, title: trimmed });
    }
    setEditingTodoId(null);
  };

  // List Drag & Drop Handlers
  const handleListDragStart = (e: React.DragEvent, listId: string) => {
    if (draggedTodoId) return;
    setDraggedListId(listId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `list:${listId}`);
  };

  const handleListDragOver = (e: React.DragEvent, targetListId: string) => {
    e.preventDefault();
    if (draggedListId && draggedListId !== targetListId) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const pos = e.clientX < rect.left + rect.width / 2 ? 'before' : 'after';
      setDragOverListId(targetListId);
      setListDropPosition(pos);
    } else if (draggedTodoId) {
      setDragOverListId(targetListId);
      setDragOverTodoId(null);
    }
  };

  const handleListDrop = (e: React.DragEvent, targetListId: string) => {
    e.preventDefault();
    if (draggedListId && draggedListId !== targetListId) {
      moveListToTarget(draggedListId, targetListId, listDropPosition);
    } else if (draggedTodoId) {
      // Dropped a task onto a list column (move to end of that list)
      moveTodoToListEnd(draggedTodoId, targetListId);
    }
    clearDragState();
  };

  // Task Drag & Drop Handlers
  const handleTodoDragStart = (e: React.DragEvent, todoId: string) => {
    e.stopPropagation();
    setDraggedTodoId(todoId);
    setDraggedListId(null);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `todo:${todoId}`);
  };

  const handleTodoDragOver = (e: React.DragEvent, targetTodoId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedTodoId && draggedTodoId !== targetTodoId) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const pos = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
      setDragOverTodoId(targetTodoId);
      setTodoDropPosition(pos);
      setDragOverListId(null);
    }
  };

  const handleTodoDrop = (e: React.DragEvent, targetTodo: TodoItem) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedTodoId && draggedTodoId !== targetTodo.id) {
      moveTodoToTodo(draggedTodoId, targetTodo.id, todoDropPosition);
    }
    clearDragState();
  };

  const clearDragState = () => {
    setDraggedListId(null);
    setDragOverListId(null);
    setListDropPosition('before');
    setDraggedTodoId(null);
    setDragOverTodoId(null);
    setTodoDropPosition('before');
  };

  // Shared reorder helpers (used by both desktop HTML5 DnD and iPad/mobile touch DnD)
  const moveListToTarget = (
    sourceListId: string,
    targetListId: string,
    position: 'before' | 'after' = 'before'
  ) => {
    if (sourceListId === targetListId) return;
    const fromIdx = lists.findIndex((l) => l.id === sourceListId);
    if (fromIdx === -1) return;

    const reordered = [...lists];
    const [moved] = reordered.splice(fromIdx, 1);
    const toIdx = reordered.findIndex((l) => l.id === targetListId);
    if (toIdx === -1) {
      reordered.push(moved);
    } else {
      const insertIdx = position === 'after' ? toIdx + 1 : toIdx;
      reordered.splice(insertIdx, 0, moved);
    }
    onReorderLists(reordered);
  };

  const moveTodoToTodo = (
    sourceTodoId: string,
    targetTodoId: string,
    position: 'before' | 'after' = 'before'
  ) => {
    if (sourceTodoId === targetTodoId) return;
    const fromIdx = todos.findIndex((t) => t.id === sourceTodoId);
    const targetTodo = todos.find((t) => t.id === targetTodoId);
    if (fromIdx === -1 || !targetTodo) return;

    const updatedTodos = [...todos];
    const [movedTodo] = updatedTodos.splice(fromIdx, 1);
    const updatedMoved: TodoItem = {
      ...movedTodo,
      // In list view, only reorder without changing the task's course/list
      classId: viewMode === 'list' ? movedTodo.classId : targetTodo.classId,
    };
    const toIdx = updatedTodos.findIndex((t) => t.id === targetTodoId);
    if (toIdx === -1) {
      updatedTodos.push(updatedMoved);
    } else {
      const insertIdx = position === 'after' ? toIdx + 1 : toIdx;
      updatedTodos.splice(insertIdx, 0, updatedMoved);
    }
    onReorderTodos(updatedTodos);
  };

  const moveTodoToListEnd = (sourceTodoId: string, targetListId: string) => {
    const fromIdx = todos.findIndex((t) => t.id === sourceTodoId);
    if (fromIdx === -1) return;
    const updatedTodos = [...todos];
    const [movedTodo] = updatedTodos.splice(fromIdx, 1);
    updatedTodos.push({ ...movedTodo, classId: targetListId });
    onReorderTodos(updatedTodos);
  };

  // Touch Drag & Drop Handlers (for iPad & Mobile only)
  const handleListTouchStart = (e: React.TouchEvent, listId: string) => {
    e.stopPropagation();
    setDraggedListId(listId);
    setDraggedTodoId(null);
    setDragOverListId(listId);
  };

  const handleListTouchMove = (e: React.TouchEvent) => {
    if (!draggedListId) return;
    e.preventDefault();
    const touch = e.touches[0];
    if (!touch) return;
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const targetListEl = el?.closest('[data-list-id]') as HTMLElement | null;
    const targetId = targetListEl?.getAttribute('data-list-id');
    if (targetId && targetId !== draggedListId && targetListEl) {
      const rect = targetListEl.getBoundingClientRect();
      const pos = touch.clientX < rect.left + rect.width / 2 ? 'before' : 'after';
      setDragOverListId(targetId);
      setListDropPosition(pos);
    }
  };

  const handleListTouchEnd = () => {
    if (draggedListId && dragOverListId && draggedListId !== dragOverListId) {
      moveListToTarget(draggedListId, dragOverListId, listDropPosition);
    }
    clearDragState();
  };

  const handleTodoTouchStart = (e: React.TouchEvent, todoId: string) => {
    e.stopPropagation();
    setDraggedTodoId(todoId);
    setDraggedListId(null);
    setDragOverTodoId(todoId);
  };

  const handleTodoTouchMove = (e: React.TouchEvent) => {
    if (!draggedTodoId) return;
    e.preventDefault();
    const touch = e.touches[0];
    if (!touch) return;
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const targetTodoEl = el?.closest('[data-todo-id]') as HTMLElement | null;
    const targetTodoId = targetTodoEl?.getAttribute('data-todo-id');
    if (targetTodoId && targetTodoId !== draggedTodoId && targetTodoEl) {
      const rect = targetTodoEl.getBoundingClientRect();
      const pos = touch.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
      setDragOverTodoId(targetTodoId);
      setTodoDropPosition(pos);
      setDragOverListId(null);
      return;
    }
    const targetListEl = el?.closest('[data-list-id]') as HTMLElement | null;
    const targetListId = targetListEl?.getAttribute('data-list-id');
    if (targetListId) {
      setDragOverListId(targetListId);
      setDragOverTodoId(null);
    }
  };

  const handleTodoTouchEnd = () => {
    if (draggedTodoId) {
      if (dragOverTodoId && dragOverTodoId !== draggedTodoId) {
        moveTodoToTodo(draggedTodoId, dragOverTodoId, todoDropPosition);
      } else if (dragOverListId) {
        moveTodoToListEnd(draggedTodoId, dragOverListId);
      }
    }
    clearDragState();
  };

  const draggedTodoItem = draggedTodoId ? todos.find((t) => t.id === draggedTodoId) || null : null;

  const renderTodoDropShadow = (compact = false) => {
    if (!draggedTodoItem) return null;
    return (
      <div
        className={`pointer-events-none flex items-center gap-2.5 rounded-xl border-2 border-dashed border-blue-400 dark:border-[#8ab4f8] bg-blue-50/70 dark:bg-[#8ab4f8]/10 shadow-md transition-all ${
          compact ? 'px-2.5 py-2.5' : 'px-4 py-3.5 rounded-2xl'
        }`}
      >
        <div className="w-3.5 h-3.5 rounded-full border-2 border-blue-400/70 dark:border-[#8ab4f8]/70 flex-shrink-0" />
        <span className="text-xs sm:text-sm font-medium text-blue-700/80 dark:text-[#aecbfa] truncate">
          {draggedTodoItem.title}
        </span>
      </div>
    );
  };

  const listById = new Map(lists.map((l) => [l.id, l]));
  const activeUnifiedListId =
    unifiedSelectedListId && listById.has(unifiedSelectedListId)
      ? unifiedSelectedListId
      : lists[0]?.id || '';

  const handleCreateUnifiedTask = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = unifiedDraftTitle.trim();
    if (!trimmed || !activeUnifiedListId) return;

    onAddTodo({
      id: `todo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      classId: activeUnifiedListId,
      title: trimmed,
      completed: false,
      dueDate: unifiedDraftDate || undefined,
      createdAt: Date.now(),
    });
    setUnifiedDraftTitle('');
    setUnifiedDraftDate('');
  };

  const getSortedUnifiedTodos = (): TodoItem[] => {
    const filtered = todos.filter((t) => {
      if (filter === 'active') return !t.completed;
      if (filter === 'completed') return t.completed;
      return true;
    });

    const active = filtered.filter((t) => !t.completed);
    const completed = filtered.filter((t) => t.completed);

    const sortGroup = (items: TodoItem[]): TodoItem[] => {
      const copy = [...items];
      if (listSort === 'manual') return copy;
      if (listSort === 'due_asc') {
        return copy.sort((a, b) => {
          if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
          if (a.dueDate) return -1;
          if (b.dueDate) return 1;
          return 0;
        });
      }
      if (listSort === 'due_desc') {
        return copy.sort((a, b) => {
          if (a.dueDate && b.dueDate) return b.dueDate.localeCompare(a.dueDate);
          if (a.dueDate) return -1;
          if (b.dueDate) return 1;
          return 0;
        });
      }
      if (listSort === 'list') {
        return copy.sort((a, b) => {
          const nameA = listById.get(a.classId)?.name || '';
          const nameB = listById.get(b.classId)?.name || '';
          return nameA.localeCompare(nameB);
        });
      }
      if (listSort === 'alpha') {
        return copy.sort((a, b) => a.title.localeCompare(b.title));
      }
      if (listSort === 'newest') {
        return copy.sort((a, b) => b.createdAt - a.createdAt);
      }
      return copy;
    };

    return [...sortGroup(active), ...sortGroup(completed)];
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1
              className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-[#e8eaed] tracking-tight"
              style={{ fontFamily: "'Google Sans', sans-serif" }}
            >
              To-Do
            </h1>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-900/60">
              {totalPending} left
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-[#9aa0a6] mt-1">
            Drag to reorder lists or tasks, and keep track of everything side-by-side.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Sort Selector (shown in List View) */}
          {viewMode === 'list' && (
            <div className="inline-flex items-center gap-1.5 bg-white dark:bg-[#18191b] px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-[#26282a]">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={listSort}
                onChange={(e) => setListSort(e.target.value as ListSortMode)}
                aria-label="Sort tasks"
                className="text-xs font-semibold bg-transparent text-slate-700 dark:text-[#e8eaed] focus:outline-hidden cursor-pointer"
              >
                <option value="manual" className="dark:bg-[#18191b]">Manual Order</option>
                <option value="due_asc" className="dark:bg-[#18191b]">Due Date (Earliest)</option>
                <option value="due_desc" className="dark:bg-[#18191b]">Due Date (Latest)</option>
                <option value="list" className="dark:bg-[#18191b]">By List / Class</option>
                <option value="alpha" className="dark:bg-[#18191b]">Title (A–Z)</option>
                <option value="newest" className="dark:bg-[#18191b]">Newest First</option>
              </select>
            </div>
          )}

          {/* Filter Segmented Pill */}
          <div className="inline-flex items-center bg-slate-100 dark:bg-[#18191b] p-1 rounded-xl border border-slate-200/80 dark:border-[#26282a]">
            {(['all', 'active', 'completed'] as FilterMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setFilter(mode)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                  filter === mode
                    ? 'bg-white dark:bg-[#282a2c] text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500 dark:text-[#9aa0a6] hover:text-slate-800 dark:hover:text-[#e8eaed]'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {totalCompleted > 0 && (
            <button
              type="button"
              onClick={onClearCompleted}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-[#c4c7c5] bg-white dark:bg-[#18191b] hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200/80 dark:border-[#26282a] transition-colors cursor-pointer google-btn-press"
            >
              Clear done ({totalCompleted})
            </button>
          )}

          {viewMode === 'grid' && (
            <button
              type="button"
              onClick={() => setIsAddingList((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 dark:bg-[#8ab4f8] dark:hover:bg-[#aecbfa] dark:text-[#0f0f10] transition-colors cursor-pointer shadow-2xs google-btn-press"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Add To-Do</span>
            </button>
          )}
        </div>
      </div>

      {/* Inline Add To-Do List Creator */}
      {isAddingList && (
        <form
          onSubmit={handleCreateList}
          className="bg-white dark:bg-[#18191b] rounded-2xl border border-slate-200/90 dark:border-[#26282a] p-4 shadow-sm flex flex-col sm:flex-row sm:items-center gap-3 animate-fade-scale"
        >
          <input
            type="text"
            autoFocus
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            placeholder="List name (e.g., Pre-Calc 12, Exam Prep...)"
            className="flex-1 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#121314] border border-slate-200 dark:border-[#2c2e33] text-sm text-slate-900 dark:text-[#e8eaed] placeholder-slate-400 focus:outline-hidden focus:border-blue-500"
          />
          <div className="flex items-center gap-1.5">
            {LIST_COLOR_OPTIONS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setNewListColor(c)}
                className={`w-6 h-6 rounded-full transition-transform cursor-pointer ${
                  newListColor === c ? 'scale-115 ring-2 ring-offset-2 ring-slate-400 dark:ring-offset-[#18191b]' : 'opacity-75 hover:opacity-100'
                }`}
                style={{ backgroundColor: c }}
                aria-label={`Select color ${c}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={!newListName.trim()}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 transition-colors cursor-pointer"
            >
              Create List
            </button>
            <button
              type="button"
              onClick={() => setIsAddingList(false)}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-[#e8eaed] hover:bg-slate-100 dark:hover:bg-[#202123] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}

      {/* Empty State if all lists were deleted */}
      {lists.length === 0 ? (
        <div className="bg-white dark:bg-[#18191b] rounded-3xl border border-dashed border-slate-300 dark:border-[#2c2e33] py-16 px-6 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-[#8ab4f8] flex items-center justify-center mb-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-[#e8eaed]">No To-Do lists yet</h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-[#9aa0a6] mt-1 max-w-sm">
            Click <span className="font-semibold text-slate-700 dark:text-[#e8eaed]">Add To-Do</span> to create your first list column.
          </p>
          <button
            type="button"
            onClick={() => setIsAddingList(true)}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 cursor-pointer google-btn-press"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add To-Do</span>
          </button>
        </div>
      ) : viewMode === 'list' ? (
        /* Unified Spacious List View */
        <div className="max-w-4xl mx-auto space-y-5">
          {/* Quick-Add Bar for Unified List */}
          <form
            onSubmit={handleCreateUnifiedTask}
            className="bg-white dark:bg-[#18191b] rounded-2xl border border-slate-200/80 dark:border-[#26282a] p-3.5 shadow-2xs flex flex-col sm:flex-row sm:items-center gap-2.5"
          >
            <select
              value={activeUnifiedListId}
              onChange={(e) => setUnifiedSelectedListId(e.target.value)}
              aria-label="Select list"
              className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#121314] border border-slate-200 dark:border-[#2c2e33] text-xs font-bold text-slate-700 dark:text-[#e8eaed] focus:outline-hidden cursor-pointer sm:max-w-[180px]"
            >
              {lists.map((l) => (
                <option key={l.id} value={l.id} className="dark:bg-[#18191b]">
                  {l.name}
                </option>
              ))}
            </select>

            <input
              type="text"
              value={unifiedDraftTitle}
              onChange={(e) => setUnifiedDraftTitle(e.target.value)}
              placeholder="Add a task to any list..."
              className="flex-1 min-w-0 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#121314] border border-slate-200 dark:border-[#2c2e33] focus:border-blue-500 text-sm text-slate-800 dark:text-[#e8eaed] placeholder-slate-400 dark:placeholder-[#80868b] focus:outline-hidden"
            />

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={unifiedDraftDate}
                onChange={(e) => setUnifiedDraftDate(e.target.value)}
                className="px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-[#121314] border border-slate-200 dark:border-[#2c2e33] text-xs text-slate-600 dark:text-[#c4c7c5] focus:outline-hidden"
              />
              <button
                type="submit"
                disabled={!unifiedDraftTitle.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 transition-colors cursor-pointer flex-shrink-0 google-btn-press"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Add</span>
              </button>
            </div>
          </form>

          {/* Spacious Combined Tasks List */}
          {(() => {
            const unifiedTodos = getSortedUnifiedTodos();
            if (unifiedTodos.length === 0) {
              return (
                <div className="bg-white dark:bg-[#18191b] rounded-3xl border border-dashed border-slate-200 dark:border-[#2c2e33] py-14 px-6 flex flex-col items-center text-center">
                  <div className="w-11 h-11 rounded-full bg-slate-100 dark:bg-[#202123] flex items-center justify-center mb-3 text-slate-400">
                    {filter === 'completed' ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <Sparkles className="w-5 h-5" />
                    )}
                  </div>
                  <p className="text-sm font-medium text-slate-500 dark:text-[#9aa0a6]">
                    {filter === 'completed' ? 'No completed tasks yet' : 'All caught up across all lists'}
                  </p>
                </div>
              );
            }

            const canDrag = listSort === 'manual';

            return (
              <div className="space-y-3">
                {unifiedTodos.map((todo) => {
                  const parentList = listById.get(todo.classId);
                  const accent = parentList?.color || '#2563EB';
                  const dueInfo = formatDueDate(todo.dueDate);
                  const isEditing = editingTodoId === todo.id;
                  const isTodoDragTarget = dragOverTodoId === todo.id && draggedTodoId !== todo.id;

                  return (
                    <React.Fragment key={todo.id}>
                      {isTodoDragTarget && todoDropPosition === 'before' && renderTodoDropShadow(false)}
                      <div
                        data-todo-id={todo.id}
                        draggable={canDrag && !isEditing}
                        onDragStart={(e) => canDrag && handleTodoDragStart(e, todo.id)}
                        onDragOver={(e) => canDrag && handleTodoDragOver(e, todo.id)}
                        onDrop={(e) => canDrag && handleTodoDrop(e, todo)}
                        onDragEnd={clearDragState}
                        className={`group flex items-center gap-3.5 px-4 py-3.5 rounded-2xl border transition-all ${
                          draggedTodoId === todo.id
                            ? 'opacity-40 scale-[0.99] border-blue-400'
                            : todo.completed
                            ? 'bg-slate-50/80 dark:bg-[#141517] border-slate-200/60 dark:border-[#202123] opacity-70'
                            : 'bg-white dark:bg-[#18191b] border-slate-200/80 dark:border-[#26282a] hover:border-slate-300 dark:hover:border-[#3a3d42] shadow-2xs'
                        }`}
                      >
                      {canDrag && (
                        <div
                          onTouchStart={(e) => handleTodoTouchStart(e, todo.id)}
                          onTouchMove={handleTodoTouchMove}
                          onTouchEnd={handleTodoTouchEnd}
                          onTouchCancel={clearDragState}
                          className="p-1 -ml-1 text-slate-300 dark:text-[#5f6368] group-hover:text-slate-500 dark:group-hover:text-[#9aa0a6] cursor-grab active:cursor-grabbing flex-shrink-0 touch-none"
                          title="Drag to reorder"
                        >
                          <GripVertical className="w-4 h-4" />
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => handleToggleComplete(todo)}
                        className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all cursor-pointer"
                        style={
                          todo.completed
                            ? { backgroundColor: accent, borderColor: accent }
                            : { borderColor: accent }
                        }
                        aria-label={todo.completed ? 'Mark incomplete' : 'Mark complete'}
                      >
                        {todo.completed && <Check className="w-3 h-3 text-white stroke-[3]" />}
                      </button>

                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              autoFocus
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit(todo);
                                if (e.key === 'Escape') setEditingTodoId(null);
                              }}
                              onBlur={() => handleSaveEdit(todo)}
                              className="w-full text-sm px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-[#121314] border border-blue-500 text-slate-900 dark:text-[#e8eaed] focus:outline-hidden"
                            />
                            <button
                              type="button"
                              onClick={() => setEditingTodoId(null)}
                              className="p-1 text-slate-400 hover:text-slate-600"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <p
                            onDoubleClick={() => handleStartEdit(todo)}
                            className={`text-sm leading-snug break-words ${
                              todo.completed
                                ? 'line-through text-slate-400 dark:text-[#80868b]'
                                : 'text-slate-800 dark:text-[#e8eaed] font-medium'
                            }`}
                          >
                            {todo.title}
                          </p>
                        )}
                      </div>

                      {/* List Pill & Due Date */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {parentList && (
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
                            style={{
                              backgroundColor: `${accent}15`,
                              color: accent,
                            }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: accent }}
                            />
                            <span className="max-w-[120px] truncate">{parentList.name}</span>
                          </span>
                        )}

                        {dueInfo && (
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg ${
                              todo.completed
                                ? 'bg-slate-100 dark:bg-[#202123] text-slate-400 dark:text-[#80868b]'
                                : dueInfo.isOverdue
                                ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'
                                : dueInfo.isToday
                                ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-[#8ab4f8]'
                                : 'bg-slate-100 dark:bg-[#26282a] text-slate-600 dark:text-[#c4c7c5]'
                            }`}
                          >
                            <Calendar className="w-3 h-3" />
                            {dueInfo.text}
                          </span>
                        )}
                      </div>

                      {!isEditing && (
                        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(todo)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-[#8ab4f8] rounded-lg transition-colors cursor-pointer"
                            title="Edit task"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteTodo(todo.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                            title="Delete task"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                      </div>
                      {isTodoDragTarget && todoDropPosition === 'after' && renderTodoDropShadow(false)}
                    </React.Fragment>
                  );
                })}
              </div>
            );
          })()}
        </div>
      ) : (
        /* Side-by-Side Class Columns Board */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 items-start">
          {lists.map((col) => {
            const rawColTodos = todos.filter((t) => t.classId === col.id);
            const activeTodos = rawColTodos.filter((t) => !t.completed);
            const completedTodos = rawColTodos.filter((t) => t.completed);

            const colTodos =
              filter === 'active'
                ? activeTodos
                : filter === 'completed'
                ? completedTodos
                : [...activeTodos, ...completedTodos];

            const pendingInCol = activeTodos.length;
            const draftTitle = draftTitles[col.id] || '';
            const isDateOpen = expandedDateCol === col.id;
            const isListDragTarget = dragOverListId === col.id && draggedListId !== col.id;
            const isTaskColumnDropTarget =
              Boolean(draggedTodoId) && dragOverListId === col.id && !dragOverTodoId;

            return (
              <div
                key={col.id}
                data-list-id={col.id}
                draggable
                onDragStart={(e) => handleListDragStart(e, col.id)}
                onDragOver={(e) => handleListDragOver(e, col.id)}
                onDrop={(e) => handleListDrop(e, col.id)}
                onDragEnd={clearDragState}
                className={`relative bg-white dark:bg-[#18191b] rounded-2xl border shadow-2xs overflow-hidden flex flex-col min-h-[280px] transition-all ${
                  draggedListId === col.id
                    ? 'opacity-45 scale-[0.98] border-blue-400'
                    : isListDragTarget
                    ? listDropPosition === 'before'
                      ? 'border-l-4 border-l-blue-500 dark:border-l-[#8ab4f8] border-slate-200/80 dark:border-[#26282a] shadow-lg'
                      : 'border-r-4 border-r-blue-500 dark:border-r-[#8ab4f8] border-slate-200/80 dark:border-[#26282a] shadow-lg'
                    : isTaskColumnDropTarget
                    ? 'ring-2 ring-blue-400/70 border-blue-400 dark:ring-[#8ab4f8]/70 dark:border-[#8ab4f8]'
                    : 'border-slate-200/80 dark:border-[#26282a] hover:shadow-sm'
                }`}
              >
                {/* Colored Top Accent Bar */}
                <div className="h-1.5 w-full" style={{ backgroundColor: col.color }} />

                {/* Column Header (Drag Handle + Title + Count + Delete List) */}
                <div className="px-3.5 pt-3 pb-2.5 flex items-center justify-between gap-2 border-b border-slate-100 dark:border-[#222426] cursor-grab active:cursor-grabbing group/header">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div
                      onTouchStart={(e) => handleListTouchStart(e, col.id)}
                      onTouchMove={handleListTouchMove}
                      onTouchEnd={handleListTouchEnd}
                      onTouchCancel={clearDragState}
                      className="p-1 -ml-1 touch-none flex-shrink-0"
                      title="Drag to reorder list"
                    >
                      <GripVertical className="w-4 h-4 text-slate-300 dark:text-[#5f6368] group-hover/header:text-slate-500 dark:group-hover/header:text-[#9aa0a6]" />
                    </div>
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: col.color }}
                    />
                    <h2
                      className="font-bold text-base text-slate-900 dark:text-[#e8eaed] truncate"
                      style={{ fontFamily: "'Google Sans', sans-serif" }}
                    >
                      {col.name}
                    </h2>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span
                      className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: `${col.color}18`,
                        color: col.color,
                      }}
                    >
                      {pendingInCol}
                    </span>
                    <button
                      type="button"
                      onClick={() => onDeleteList(col.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                      title={`Delete ${col.name} list`}
                      aria-label={`Delete ${col.name} list`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Quick Add Form */}
                <form
                  onSubmit={(e) => handleCreateTask(col.id, e)}
                  className="px-3 pt-3 pb-2 border-b border-slate-100/80 dark:border-[#222426]/80 bg-slate-50/50 dark:bg-[#141517]"
                >
                  <div className="flex items-center gap-1.5 bg-white dark:bg-[#1e1f20] border border-slate-200/90 dark:border-[#2c2e33] focus-within:border-blue-500 dark:focus-within:border-[#8ab4f8] rounded-xl px-2.5 py-1.5 transition-colors">
                    <input
                      type="text"
                      value={draftTitle}
                      onChange={(e) =>
                        setDraftTitles((prev) => ({ ...prev, [col.id]: e.target.value }))
                      }
                      placeholder="Add task..."
                      className="flex-1 min-w-0 text-xs sm:text-sm bg-transparent text-slate-800 dark:text-[#e8eaed] placeholder-slate-400 dark:placeholder-[#80868b] focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedDateCol((prev) => (prev === col.id ? null : col.id))
                      }
                      className={`p-1 rounded-lg transition-colors cursor-pointer ${
                        isDateOpen || draftDates[col.id]
                          ? 'text-blue-600 dark:text-[#8ab4f8] bg-blue-50 dark:bg-blue-950/40'
                          : 'text-slate-400 hover:text-slate-600 dark:hover:text-[#c4c7c5]'
                      }`}
                      title="Add due date"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="submit"
                      disabled={!draftTitle.trim()}
                      className="p-1 rounded-lg text-white disabled:opacity-30 transition-all cursor-pointer flex-shrink-0"
                      style={{ backgroundColor: col.color }}
                      title="Add task"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  </div>

                  {isDateOpen && (
                    <div className="mt-2 px-0.5 flex items-center justify-between gap-2">
                      <input
                        type="date"
                        value={draftDates[col.id] || ''}
                        onChange={(e) =>
                          setDraftDates((prev) => ({ ...prev, [col.id]: e.target.value }))
                        }
                        className="text-[11px] px-2 py-1 rounded-lg bg-white dark:bg-[#1e1f20] border border-slate-200 dark:border-[#2c2e33] text-slate-600 dark:text-[#c4c7c5] focus:outline-hidden"
                      />
                      {draftDates[col.id] && (
                        <button
                          type="button"
                          onClick={() =>
                            setDraftDates((prev) => ({ ...prev, [col.id]: '' }))
                          }
                          className="text-[11px] text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  )}
                </form>

                {/* Task Items List */}
                <div className="p-3 flex-1 space-y-2 max-h-[420px] overflow-y-auto">
                  {colTodos.length === 0 ? (
                    isTaskColumnDropTarget ? (
                      renderTodoDropShadow(true)
                    ) : (
                      <div className="py-10 px-3 flex flex-col items-center justify-center text-center">
                        <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-[#202123] flex items-center justify-center mb-2 text-slate-400 dark:text-[#80868b]">
                          {filter === 'completed' ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            <Sparkles className="w-4 h-4" />
                          )}
                        </div>
                        <p className="text-xs font-medium text-slate-400 dark:text-[#80868b]">
                          {filter === 'completed' ? 'No completed tasks' : 'All caught up'}
                        </p>
                      </div>
                    )
                  ) : (
                    <>
                      {colTodos.map((todo) => {
                        const dueInfo = formatDueDate(todo.dueDate);
                        const isEditing = editingTodoId === todo.id;
                        const isTodoDragTarget = dragOverTodoId === todo.id && draggedTodoId !== todo.id;

                        return (
                          <React.Fragment key={todo.id}>
                            {isTodoDragTarget && todoDropPosition === 'before' && renderTodoDropShadow(true)}
                            <div
                              data-todo-id={todo.id}
                              draggable={!isEditing}
                              onDragStart={(e) => handleTodoDragStart(e, todo.id)}
                              onDragOver={(e) => handleTodoDragOver(e, todo.id)}
                              onDrop={(e) => handleTodoDrop(e, todo)}
                              onDragEnd={clearDragState}
                              className={`group flex items-start gap-2 p-2.5 rounded-xl border transition-all ${
                                draggedTodoId === todo.id
                                  ? 'opacity-40 scale-[0.98] border-blue-400'
                                  : todo.completed
                                  ? 'bg-slate-50/70 dark:bg-[#131416] border-slate-100 dark:border-[#202123] opacity-70'
                                  : 'bg-white dark:bg-[#1e1f20] border-slate-200/70 dark:border-[#2a2c30] hover:border-slate-300 dark:hover:border-[#3a3d42] shadow-2xs'
                              }`}
                            >
                          {/* Task Drag Handle */}
                          <div
                            onTouchStart={(e) => handleTodoTouchStart(e, todo.id)}
                            onTouchMove={handleTodoTouchMove}
                            onTouchEnd={handleTodoTouchEnd}
                            onTouchCancel={clearDragState}
                            className="mt-0.5 p-0.5 -ml-0.5 text-slate-300 dark:text-[#5f6368] group-hover:text-slate-400 dark:group-hover:text-[#9aa0a6] cursor-grab active:cursor-grabbing flex-shrink-0 touch-none"
                            title="Drag to reorder"
                          >
                            <GripVertical className="w-3.5 h-3.5" />
                          </div>

                          {/* Custom Check Button */}
                          <button
                            type="button"
                            onClick={() => handleToggleComplete(todo)}
                            className="mt-0.5 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all cursor-pointer"
                            style={
                              todo.completed
                                ? { backgroundColor: col.color, borderColor: col.color }
                                : { borderColor: col.color }
                            }
                            aria-label={todo.completed ? 'Mark incomplete' : 'Mark complete'}
                          >
                            {todo.completed && <Check className="w-3 h-3 text-white stroke-[3]" />}
                          </button>

                          {/* Task Title + Due Date */}
                          <div className="flex-1 min-w-0">
                            {isEditing ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  autoFocus
                                  value={editingTitle}
                                  onChange={(e) => setEditingTitle(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveEdit(todo);
                                    if (e.key === 'Escape') setEditingTodoId(null);
                                  }}
                                  onBlur={() => handleSaveEdit(todo)}
                                  className="w-full text-xs sm:text-sm px-2 py-0.5 rounded-md bg-slate-50 dark:bg-[#121314] border border-blue-500 text-slate-900 dark:text-[#e8eaed] focus:outline-hidden"
                                />
                                <button
                                  type="button"
                                  onClick={() => setEditingTodoId(null)}
                                  className="p-0.5 text-slate-400 hover:text-slate-600"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <p
                                onDoubleClick={() => handleStartEdit(todo)}
                                className={`text-xs sm:text-sm leading-snug break-words ${
                                  todo.completed
                                    ? 'line-through text-slate-400 dark:text-[#80868b]'
                                    : 'text-slate-800 dark:text-[#e8eaed] font-medium'
                                }`}
                              >
                                {todo.title}
                              </p>
                            )}

                            {dueInfo && !isEditing && (
                              <div className="mt-1.5">
                                <span
                                  className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                                    todo.completed
                                      ? 'bg-slate-100 dark:bg-[#202123] text-slate-400 dark:text-[#80868b]'
                                      : dueInfo.isOverdue
                                      ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'
                                      : dueInfo.isToday
                                      ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-[#8ab4f8]'
                                      : 'bg-slate-100 dark:bg-[#26282a] text-slate-600 dark:text-[#c4c7c5]'
                                  }`}
                                >
                                  <Calendar className="w-2.5 h-2.5" />
                                  {dueInfo.text}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Hover Actions */}
                          {!isEditing && (
                            <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => handleStartEdit(todo)}
                                className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-[#8ab4f8] rounded-md transition-colors cursor-pointer"
                                title="Edit task"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteTodo(todo.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-md transition-colors cursor-pointer"
                                title="Delete task"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                            </div>
                            {isTodoDragTarget && todoDropPosition === 'after' && renderTodoDropShadow(true)}
                          </React.Fragment>
                        );
                      })}
                      {isTaskColumnDropTarget && renderTodoDropShadow(true)}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
