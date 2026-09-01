import { useState, useEffect, useCallback } from 'react';
import { todoService, TodoData } from '../services/todoService';
import { orUndefined, orEmpty, orFalse, asOneOf } from '../utils/rows';
import { parseLocalDate } from '../utils/dates';
import { errorMessage } from '../utils/errors';

export const PRIORITIES = ['low', 'medium', 'high'] as const;

export interface Todo {
  id: string;
  title: string;
  description?: string;
  dueDate?: Date;
  priority: 'low' | 'medium' | 'high';
  isCompleted: boolean;
  createdBy: string;
  createdAt: Date;
  completedAt?: Date;
  category?: string;
}

export const useTodos = (userId: string | undefined) => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTodos = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const data = await todoService.getTodos(userId);
      const mappedTodos: Todo[] = data.map(todo => ({
        id: todo.id,
        title: todo.title,
        description: orUndefined(todo.description),
        dueDate: parseLocalDate(todo.due_date),
        priority: asOneOf(todo.priority, PRIORITIES, 'medium'),
        isCompleted: orFalse(todo.is_completed),
        createdBy: todo.user_id,
        createdAt: new Date(orEmpty(todo.created_at)),
        completedAt: todo.completed_at ? new Date(todo.completed_at) : undefined,
        category: orUndefined(todo.category)
      }));
      setTodos(mappedTodos);
      setError(null);
    } catch (err) {
      console.error('Error loading todos:', err);
      setError(errorMessage(err, 'Failed to load todos'));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setTodos([]);
      setLoading(false);
      return;
    }

    loadTodos();
  }, [userId, loadTodos]);


  const addTodo = async (todoData: Omit<TodoData, 'is_completed'>) => {
    if (!userId) throw new Error('Not authenticated');

    try {
      const data = await todoService.createTodo(userId, {
        ...todoData,
        is_completed: false
      });

      const newTodo: Todo = {
        id: data.id,
        title: data.title,
        description: orUndefined(data.description),
        dueDate: parseLocalDate(data.due_date),
        priority: asOneOf(data.priority, PRIORITIES, 'medium'),
        isCompleted: orFalse(data.is_completed),
        createdBy: data.user_id,
        createdAt: new Date(orEmpty(data.created_at)),
        completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
        category: orUndefined(data.category)
      };

      setTodos(prev => [newTodo, ...prev]);
      return newTodo;
    } catch (err) {
      setError(errorMessage(err, 'Failed to create todo'));
      throw err;
    }
  };

  const updateTodo = async (id: string, updates: Partial<TodoData>) => {
    try {
      const data = await todoService.updateTodo(id, updates);

      setTodos(prev => prev.map(todo => {
        if (todo.id === id) {
          return {
            ...todo,
            title: data.title,
            description: orUndefined(data.description),
            dueDate: parseLocalDate(data.due_date),
            priority: asOneOf(data.priority, PRIORITIES, 'medium'),
            isCompleted: orFalse(data.is_completed),
            completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
            category: orUndefined(data.category)
          };
        }
        return todo;
      }));
    } catch (err) {
      setError(errorMessage(err, 'Failed to update todo'));
      throw err;
    }
  };

  const deleteTodo = async (id: string) => {
    try {
      await todoService.deleteTodo(id);
      setTodos(prev => prev.filter(todo => todo.id !== id));
    } catch (err) {
      setError(errorMessage(err, 'Failed to delete todo'));
      throw err;
    }
  };

  const toggleComplete = async (id: string, isCompleted: boolean) => {
    try {
      await todoService.toggleTodoComplete(id, isCompleted);

      setTodos(prev => prev.map(todo => {
        if (todo.id === id) {
          return {
            ...todo,
            isCompleted,
            completedAt: isCompleted ? new Date() : undefined
          };
        }
        return todo;
      }));
    } catch (err) {
      setError(errorMessage(err, 'Failed to toggle todo'));
      throw err;
    }
  };

  return {
    todos,
    loading,
    error,
    addTodo,
    updateTodo,
    deleteTodo,
    toggleComplete,
    refreshTodos: loadTodos
  };
};
