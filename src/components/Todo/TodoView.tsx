import React, { useState } from 'react';
import {
  Check,
  Plus,
  Trash2,
  Calendar,
  Flag,
  CheckCircle2,
  Edit2,
  X,
  Sparkles,
} from 'lucide-react';
import type { ClassItem } from '../../types/grade';
import type { TodoItem, TodoPriority } from '../../types/todo';

interface TodoViewProps {
  classes: ClassItem[];
  todos: TodoItem[];
  onAddTodo: (todo: TodoItem) => void;
  onUpdateTodo: (todo: TodoItem) => void;
  onDeleteTodo: (id: string) => void;
  onClearCompleted: () => void;
  onOpenAddClass?: () => void;
}

type FilterMode = 'all' | 'active' | 'completed';

const PRIORITY_WEIGHT: Record<TodoPriority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

const PRIORITY_STYLES: Record<TodoPriority, { label: string; badge: string; dot: string }> = {
  high: {
    label: 'High',
    badge: 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border-rose-200/70 dark:border-rose-900/60',
    dot: 'bg-rose-500',
  },
  medium: {
    label: 'Med',
    badge: 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200/70 dark:border-amber-900/60',
    dot: 'bg-amber-500',
  },
  low: {
    label: 'Low',
    badge: 'bg-slate-100 dark:bg-[#202123] text-slate-500 dark:text-[#9aa0a6] border-slate-200/70 dark:border-[#2c2e33]',
    dot: 'bg-slate-400',
  },
};

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

interface ColumnDef {
  id: string;
  name: string;
  color: string;
  isGeneral?: boolean;
}

export const TodoView: React.FC<TodoViewProps> = ({
  classes,
  todos,
  onAddTodo,
  onUpdateTodo,
  onDeleteTodo,
  onClearCompleted,
  onOpenAddClass,
}) => {
  const [filter, setFilter] = useState<FilterMode>('all');
  const [draftTitles, setDraftTitles] = useState<Record<string, string>>({});
  const [draftDates, setDraftDates] = useState<Record<string, string>>({});
  const [draftPriorities, setDraftPriorities] = useState<Record<string, TodoPriority>>({});
  const [expandedOptionsCol, setExpandedOptionsCol] = useState<string | null>(null);
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const columns: ColumnDef[] = [
    ...classes.map((c) => ({
      id: c.id,
      name: c.name,
      color: c.color || '#2563EB',
    })),
    {
      id: 'general',
      name: 'General',
      color: '#6366F1',
      isGeneral: true,
    },
  ];

  const totalPending = todos.filter((t) => !t.completed).length;
  const totalCompleted = todos.filter((t) => t.completed).length;

  const handleCreateTask = (colId: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const title = (draftTitles[colId] || '').trim();
    if (!title) return;

    const newTodo: TodoItem = {
      id: `todo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      classId: colId,
      title,
      completed: false,
      dueDate: draftDates[colId] || undefined,
      priority: draftPriorities[colId] || 'medium',
      createdAt: Date.now(),
    };

    onAddTodo(newTodo);
    setDraftTitles((prev) => ({ ...prev, [colId]: '' }));
    setDraftDates((prev) => ({ ...prev, [colId]: '' }));
    setExpandedOptionsCol(null);
  };

  const handleToggleComplete = (todo: TodoItem) => {
    onUpdateTodo({
      ...todo,
      completed: !todo.completed,
      completedAt: !todo.completed ? Date.now() : undefined,
    });
  };

  const handleCyclePriority = (todo: TodoItem) => {
    const order: TodoPriority[] = ['low', 'medium', 'high'];
    const currentIdx = order.indexOf(todo.priority || 'medium');
    const nextPriority = order[(currentIdx + 1) % order.length];
    onUpdateTodo({
      ...todo,
      priority: nextPriority,
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
            Organize homework, exam prep, and deadlines side-by-side for every class.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
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

          {onOpenAddClass && (
            <button
              type="button"
              onClick={onOpenAddClass}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 dark:bg-[#8ab4f8] dark:hover:bg-[#aecbfa] dark:text-[#0f0f10] transition-colors cursor-pointer shadow-2xs google-btn-press"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Add Class</span>
            </button>
          )}
        </div>
      </div>

      {/* Side-by-Side Class Columns Board */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 items-start">
        {columns.map((col) => {
          const colTodos = todos
            .filter((t) => t.classId === col.id)
            .filter((t) => {
              if (filter === 'active') return !t.completed;
              if (filter === 'completed') return t.completed;
              return true;
            })
            .sort((a, b) => {
              if (a.completed !== b.completed) return a.completed ? 1 : -1;
              const pDiff =
                PRIORITY_WEIGHT[b.priority || 'medium'] -
                PRIORITY_WEIGHT[a.priority || 'medium'];
              if (pDiff !== 0) return pDiff;
              if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
              if (a.dueDate) return -1;
              if (b.dueDate) return 1;
              return b.createdAt - a.createdAt;
            });

          const pendingInCol = todos.filter((t) => t.classId === col.id && !t.completed).length;
          const draftTitle = draftTitles[col.id] || '';
          const draftPriority = draftPriorities[col.id] || 'medium';
          const isOptionsOpen = expandedOptionsCol === col.id;

          return (
            <div
              key={col.id}
              className="bg-white dark:bg-[#18191b] rounded-2xl border border-slate-200/80 dark:border-[#26282a] shadow-2xs overflow-hidden flex flex-col min-h-[280px] transition-all hover:shadow-sm"
            >
              {/* Colored Top Accent Bar */}
              <div className="h-1.5 w-full" style={{ backgroundColor: col.color }} />

              {/* Column Header */}
              <div className="px-4 pt-3.5 pb-2.5 flex items-center justify-between gap-2 border-b border-slate-100 dark:border-[#222426]">
                <div className="flex items-center gap-2 min-w-0">
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
                <span
                  className="text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: `${col.color}18`,
                    color: col.color,
                  }}
                >
                  {pendingInCol}
                </span>
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
                    onFocus={() => setExpandedOptionsCol(col.id)}
                    placeholder={`Add task...`}
                    className="flex-1 min-w-0 text-xs sm:text-sm bg-transparent text-slate-800 dark:text-[#e8eaed] placeholder-slate-400 dark:placeholder-[#80868b] focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedOptionsCol((prev) => (prev === col.id ? null : col.id))
                    }
                    className={`p-1 rounded-lg transition-colors cursor-pointer ${
                      isOptionsOpen || draftDates[col.id]
                        ? 'text-blue-600 dark:text-[#8ab4f8] bg-blue-50 dark:bg-blue-950/40'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-[#c4c7c5]'
                    }`}
                    title="Due date & priority"
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

                {isOptionsOpen && (
                  <div className="flex items-center justify-between gap-2 mt-2 px-0.5">
                    <input
                      type="date"
                      value={draftDates[col.id] || ''}
                      onChange={(e) =>
                        setDraftDates((prev) => ({ ...prev, [col.id]: e.target.value }))
                      }
                      className="text-[11px] px-2 py-1 rounded-lg bg-white dark:bg-[#1e1f20] border border-slate-200 dark:border-[#2c2e33] text-slate-600 dark:text-[#c4c7c5] focus:outline-hidden"
                    />
                    <div className="flex items-center gap-1">
                      {(['low', 'medium', 'high'] as TodoPriority[]).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() =>
                            setDraftPriorities((prev) => ({ ...prev, [col.id]: p }))
                          }
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-all cursor-pointer ${
                            draftPriority === p
                              ? PRIORITY_STYLES[p].badge
                              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-[#c4c7c5]'
                          }`}
                        >
                          {PRIORITY_STYLES[p].label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </form>

              {/* Task Items List */}
              <div className="p-3 flex-1 space-y-2 max-h-[420px] overflow-y-auto">
                {colTodos.length === 0 ? (
                  <div className="py-10 px-3 flex flex-col items-center justify-center text-center">
                    <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-[#202123] flex items-center justify-center mb-2 text-slate-400 dark:text-[#80868b]">
                      {filter === 'completed' ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                    </div>
                    <p className="text-xs font-medium text-slate-400 dark:text-[#80868b]">
                      {filter === 'completed'
                        ? 'No completed tasks'
                        : 'All caught up'}
                    </p>
                  </div>
                ) : (
                  colTodos.map((todo) => {
                    const dueInfo = formatDueDate(todo.dueDate);
                    const priority = todo.priority || 'medium';
                    const isEditing = editingTodoId === todo.id;

                    return (
                      <div
                        key={todo.id}
                        className={`group flex items-start gap-2.5 p-2.5 rounded-xl border transition-all ${
                          todo.completed
                            ? 'bg-slate-50/70 dark:bg-[#131416] border-slate-100 dark:border-[#202123] opacity-70'
                            : 'bg-white dark:bg-[#1e1f20] border-slate-200/70 dark:border-[#2a2c30] hover:border-slate-300 dark:hover:border-[#3a3d42] shadow-2xs'
                        }`}
                      >
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

                        {/* Task Title + Meta */}
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

                          {/* Badges Row */}
                          {(dueInfo || priority === 'high') && !isEditing && (
                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                              {priority === 'high' && !todo.completed && (
                                <span
                                  className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${PRIORITY_STYLES.high.badge}`}
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_STYLES.high.dot}`} />
                                  High
                                </span>
                              )}
                              {dueInfo && (
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
                              )}
                            </div>
                          )}
                        </div>

                        {/* Hover Actions */}
                        {!isEditing && (
                          <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => handleCyclePriority(todo)}
                              className="p-1 text-slate-400 hover:text-amber-500 rounded-md transition-colors cursor-pointer"
                              title={`Priority: ${PRIORITY_STYLES[priority].label} (click to cycle)`}
                            >
                              <Flag className="w-3 h-3" />
                            </button>
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
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
