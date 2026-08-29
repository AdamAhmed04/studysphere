import { supabase } from '../lib/supabase';

export interface TodoData {
  title: string;
  description?: string;
  due_date?: string;
  priority: 'low' | 'medium' | 'high';
  category?: string;
  is_completed: boolean;
}

class TodoService {
  async getTodos(userId: string, limit: number = 100, offset: number = 0) {
    try {
      if (!supabase) {
        throw new Error('Supabase is not configured');
      }

      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Get todos error:', error);
      throw error;
    }
  }

  async createTodo(userId: string, todoData: TodoData) {
    try {
      if (!supabase) {
        throw new Error('Supabase is not configured');
      }

      const { data, error } = await supabase
        .from('todos')
        .insert({
          user_id: userId,
          ...todoData,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Create todo error:', error);
      throw error;
    }
  }

  async updateTodo(todoId: string, updates: Partial<TodoData>) {
    try {
      if (!supabase) {
        throw new Error('Supabase is not configured');
      }

      const { data, error } = await supabase
        .from('todos')
        .update(updates)
        .eq('id', todoId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Update todo error:', error);
      throw error;
    }
  }

  async deleteTodo(todoId: string) {
    try {
      if (!supabase) {
        throw new Error('Supabase is not configured');
      }

      const { error } = await supabase
        .from('todos')
        .delete()
        .eq('id', todoId);

      if (error) throw error;
    } catch (error) {
      console.error('Delete todo error:', error);
      throw error;
    }
  }

  async toggleTodoComplete(todoId: string, isCompleted: boolean) {
    try {
      if (!supabase) {
        throw new Error('Supabase is not configured');
      }

      const { data, error } = await supabase
        .from('todos')
        .update({
          is_completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null,
        })
        .eq('id', todoId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Toggle todo error:', error);
      throw error;
    }
  }
}

export const todoService = new TodoService();
