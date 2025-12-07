import { useState, useEffect } from 'react';
import { todoService, TodoData } from '../services/todoService';

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

  useEffect(() => {
    if (!userId) {
      setTodos([]);
      setLoading(false);
      return;
    }

    loadTodos();
  }, [userId]);

  const loadTodos = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const data = await todoService.getTodos(userId);
      const mappedTodos: Todo[] = data.map(todo => ({
        id: todo.id,
        title: todo.title,
        description: todo.description,
        dueDate: todo.due_date ? new Date(todo.due_date) : undefined,
        priority: todo.priority,
        isCompleted: todo.is_completed,
        createdBy: todo.user_id,
        createdAt: new Date(todo.created_at),
        completedAt: todo.completed_at ? new Date(todo.completed_at) : undefined,
        category: todo.category
      }));
      setTodos(mappedTodos);
      setError(null);
    } catch (err: any) {
      console.error('Error loading todos:', err);
      setError(err.message || 'Failed to load todos');
    } finally {
      setLoading(false);
    }
  };

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
        description: data.description,
        dueDate: data.due_date ? new Date(data.due_date) : undefined,
        priority: data.priority,
        isCompleted: data.is_completed,
        createdBy: data.user_id,
        createdAt: new Date(data.created_at),
        completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
        category: data.category
      };

      setTodos(prev => [newTodo, ...prev]);
      return newTodo;
    } catch (err: any) {
      setError(err.message || 'Failed to create todo');
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
            description: data.description,
            dueDate: data.due_date ? new Date(data.due_date) : undefined,
            priority: data.priority,
            isCompleted: data.is_completed,
            completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
            category: data.category
          };
        }
        return todo;
      }));
    } catch (err: any) {
      setError(err.message || 'Failed to update todo');
      throw err;
    }
  };

  const deleteTodo = async (id: string) => {
    try {
      await todoService.deleteTodo(id);
      setTodos(prev => prev.filter(todo => todo.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete todo');
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
    } catch (err: any) {
      setError(err.message || 'Failed to toggle todo');
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
