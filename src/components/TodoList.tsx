import React, { useState } from 'react';
import { CheckSquare, Plus, Calendar, Clock, AlertCircle, Trash2, Edit3, Check } from 'lucide-react';
import type { TodoItem } from '../types';
import { asOneOf } from '../utils/rows';
import { PRIORITIES } from '../hooks/useTodos';
import { parseLocalDate, toLocalDateString, todayLocalDateString } from '../utils/dates';

interface TodoListProps {
  todos: TodoItem[];
  onAddTodo: (todo: Omit<TodoItem, 'id' | 'createdAt'>) => void;
  onUpdateTodo: (id: string, updates: Partial<TodoItem>) => void;
  onDeleteTodo: (id: string) => void;
  currentUserId: string;
}

export const TodoList: React.FC<TodoListProps> = ({
  todos,
  onAddTodo,
  onUpdateTodo,
  onDeleteTodo,
  currentUserId
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    category: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    const todoData = {
      title: formData.title,
      description: formData.description || undefined,
      dueDate: parseLocalDate(formData.dueDate),
      priority: formData.priority,
      isCompleted: false,
      createdBy: currentUserId,
      category: formData.category || undefined
    };

    if (editingId) {
      onUpdateTodo(editingId, todoData);
      setEditingId(null);
    } else {
      onAddTodo(todoData);
    }

    setFormData({
      title: '',
      description: '',
      dueDate: '',
      priority: 'medium',
      category: ''
    });
    setShowAddForm(false);
  };

  const handleEdit = (todo: TodoItem) => {
    setFormData({
      title: todo.title,
      description: todo.description || '',
      dueDate: toLocalDateString(todo.dueDate),
      priority: todo.priority,
      category: todo.category || ''
    });
    setEditingId(todo.id);
    setShowAddForm(true);
  };

  const handleToggleComplete = (id: string, isCompleted: boolean) => {
    onUpdateTodo(id, {
      isCompleted: !isCompleted,
      completedAt: !isCompleted ? new Date() : undefined
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-300 bg-red-500/15';
      case 'medium': return 'text-yellow-600 bg-sand/15';
      case 'low': return 'text-emerald-300 bg-emerald-500/15';
      default: return 'text-ink/75 bg-surface-high';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertCircle size={14} />;
      case 'medium': return <Clock size={14} />;
      case 'low': return <CheckSquare size={14} />;
      default: return <CheckSquare size={14} />;
    }
  };

  const formatDueDate = (date: Date) => {
    if (!date) {
      return { text: 'No due date', color: 'text-muted' };
    }
    
    const now = new Date();
    const diffInDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays < 0) {
      return { text: `${Math.abs(diffInDays)} ${Math.abs(diffInDays) === 1 ? 'day' : 'days'} overdue`, color: 'text-red-300' };
    } else if (diffInDays === 0) {
      return { text: 'Due today', color: 'text-orange-600' };
    } else if (diffInDays === 1) {
      return { text: 'Due tomorrow', color: 'text-yellow-600' };
    } else if (diffInDays <= 7) {
      return { text: `Due in ${diffInDays} ${diffInDays === 1 ? 'day' : 'days'}`, color: 'text-sand' };
    } else {
      return { text: date.toLocaleDateString(), color: 'text-ink/75' };
    }
  };

  const sortedTodos = [...todos].sort((a, b) => {
    // Incomplete tasks first
    if (a.isCompleted !== b.isCompleted) {
      return a.isCompleted ? 1 : -1;
    }
    
    // Then by due date (closest first)
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    if (a.dueDate && !b.dueDate) return -1;
    if (!a.dueDate && b.dueDate) return 1;
    
    // Then by priority
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });

  const incompleteTodos = sortedTodos.filter(todo => !todo.isCompleted);
  const completedTodos = sortedTodos.filter(todo => todo.isCompleted);

  return (
    <div className="theme-secondary-bg rounded-2xl shadow-xl p-4 md:p-6 h-fit">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 md:mb-6 space-y-3 md:space-y-0">
        <div className="flex items-center space-x-2 md:space-x-3">
          <CheckSquare className="text-sand" size={20} />
          <h3 className="text-lg md:text-xl font-bold text-ink">To-Do List</h3>
          <span className="text-xs md:text-sm text-muted">
            ({incompleteTodos.length} pending)
          </span>
        </div>
        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
            setEditingId(null);
            setFormData({
              title: '',
              description: '',
              dueDate: '',
              priority: 'medium',
              category: ''
            });
          }}
          className="flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors btn-primary min-h-[44px] w-full md:w-auto justify-center"
        >
          <Plus size={16} />
          <span>Add Task</span>
        </button>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="mb-6 p-4 bg-surface rounded-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="Task title..."
                maxLength={500}
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-4 py-3 border border-hairline rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent min-h-[44px] text-base"
                required
              />
            </div>
            
            <div>
              <textarea
                placeholder="Description (optional)..."
                maxLength={2000}
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-4 py-3 border border-hairline rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="todolist-due-date" className="block text-sm font-medium text-ink/75 mb-1">Due Date</label>
                <input id="todolist-due-date"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                  min={todayLocalDateString()}
                  className="w-full px-3 py-2 border border-hairline rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent min-h-[44px] text-base"
                />
              </div>

              <div>
                <label htmlFor="todolist-priority" className="block text-sm font-medium text-ink/75 mb-1">Priority</label>
                <select id="todolist-priority"
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: asOneOf(e.target.value, PRIORITIES, 'medium') }))}
                  className="w-full px-3 py-2 border border-hairline rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent min-h-[44px] text-base"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div>
                <label htmlFor="todolist-category" className="block text-sm font-medium text-ink/75 mb-1">Category</label>
                <input id="todolist-category"
                  type="text"
                  placeholder="e.g., Study, Work"
                  maxLength={100}
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-hairline rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent min-h-[44px] text-base"
                />
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingId(null);
                }}
                className="flex-1 px-4 py-2 border border-hairline text-ink/75 rounded-lg hover:bg-surface transition-colors min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 rounded-lg transition-colors btn-primary min-h-[44px]"
              >
                {editingId ? 'Update Task' : 'Add Task'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Todo List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {/* Incomplete Tasks */}
        {incompleteTodos.map(todo => (
          <div
            key={todo.id}
            className="flex items-start space-x-3 p-4 bg-surface rounded-xl border border-hairline-soft hover:border-purple-300 transition-colors"
          >
            <button
              onClick={() => handleToggleComplete(todo.id, todo.isCompleted)}
              className="mt-1 p-1 rounded-full hover:bg-surface-high transition-colors"
            >
              <div className="w-5 h-5 border-2 border-hairline rounded-full flex items-center justify-center hover:border-purple-500 transition-colors">
                {todo.isCompleted && <Check size={12} className="text-sand" />}
              </div>
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className={`font-semibold ${todo.isCompleted ? 'line-through text-muted' : 'text-ink'}`}>
                    {todo.title}
                  </h4>
                  {todo.description && (
                    <p className={`text-sm mt-1 ${todo.isCompleted ? 'line-through text-muted' : 'text-ink/75'}`}>
                      {todo.description}
                    </p>
                  )}
                  
                  <div className="flex items-center space-x-3 mt-2">
                    {/* Priority */}
                    <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(todo.priority)}`}>
                      {getPriorityIcon(todo.priority)}
                      <span className="capitalize">{todo.priority}</span>
                    </span>

                    {/* Category */}
                    {todo.category && (
                      <span className="px-2 py-1 bg-surface-high text-ink rounded-full text-xs font-medium">
                        {todo.category}
                      </span>
                    )}

                    {/* Due Date */}
                    {todo.dueDate && (
                      <div className="flex items-center space-x-1 text-xs">
                        <Calendar size={12} />
                        <span className={formatDueDate(todo.dueDate).color}>
                          {formatDueDate(todo.dueDate).text}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-1 ml-2">
                  <button
                    onClick={() => handleEdit(todo)}
                    className="p-1 text-muted hover:text-sand rounded transition-colors"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    onClick={() => onDeleteTodo(todo.id)}
                    className="p-1 text-muted hover:text-red-300 rounded transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Completed Tasks */}
        {completedTodos.length > 0 && (
          <>
            <div className="pt-4 border-t border-hairline-soft">
              <h5 className="text-sm font-medium text-muted mb-3">
                Completed ({completedTodos.length})
              </h5>
            </div>
            {completedTodos.slice(0, 3).map(todo => (
              <div
                key={todo.id}
                className="flex items-start space-x-3 p-3 bg-surface rounded-xl opacity-75"
              >
                <button
                  onClick={() => handleToggleComplete(todo.id, todo.isCompleted)}
                  className="mt-1 p-1 rounded-full hover:bg-gray-200 transition-colors"
                >
                  <div className="w-5 h-5 border-2 border-green-500 bg-green-500 rounded-full flex items-center justify-center">
                    <Check size={12} className="text-white" />
                  </div>
                </button>

                <div className="flex-1 min-w-0">
                  <h4 className="font-medium line-through text-muted">{todo.title}</h4>
                  {todo.completedAt && (
                    <p className="text-xs text-muted mt-1">
                      Completed {todo.completedAt.toLocaleDateString()}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => onDeleteTodo(todo.id)}
                  className="p-1 text-muted hover:text-red-300 rounded transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {completedTodos.length > 3 && (
              <p className="text-xs text-muted text-center">
                +{completedTodos.length - 3} more completed tasks
              </p>
            )}
          </>
        )}

        {todos.length === 0 && (
          <div className="text-center py-8 text-muted">
            <CheckSquare size={48} className="mx-auto mb-4 opacity-50" />
            <p>No tasks yet</p>
            <p className="text-sm mt-1">Add your first task to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
};