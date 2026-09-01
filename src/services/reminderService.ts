import { supabase } from '../lib/supabase';

export interface ReminderData {
  title: string;
  description?: string;
  reminder_time: string;
  event_id?: string;
}

/*
 * Reminders had a table, RLS policies and indexes, and no client code at all.
 * The Calendar created them straight into React state, so they looked saved and
 * were gone on the next refresh. This is the writer that was missing.
 *
 * Deleting is handled by the database rather than here: reminders.event_id is
 * ON DELETE CASCADE, so removing a calendar event takes its reminders with it.
 */
class ReminderService {
  async getReminders(userId: string) {
    try {
      if (!supabase) {
        throw new Error('Supabase is not configured');
      }

      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', userId)
        .order('reminder_time', { ascending: true });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Get reminders error:', error);
      throw error;
    }
  }

  async createReminder(userId: string, reminderData: ReminderData) {
    try {
      if (!supabase) {
        throw new Error('Supabase is not configured');
      }

      const { data, error } = await supabase
        .from('reminders')
        .insert({
          user_id: userId,
          ...reminderData,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Create reminder error:', error);
      throw error;
    }
  }

  async deleteReminder(id: string) {
    try {
      if (!supabase) {
        throw new Error('Supabase is not configured');
      }

      const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Delete reminder error:', error);
      throw error;
    }
  }
}

export const reminderService = new ReminderService();
