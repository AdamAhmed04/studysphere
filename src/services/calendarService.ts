import { supabase } from '../lib/supabase';

export interface CalendarEventData {
  title: string;
  description?: string;
  event_date: string;
  event_type: 'meeting' | 'reminder' | 'study' | 'exam' | 'class' | 'todo';
  color: string;
  group_id?: string;
  todo_id?: string;
  has_reminder: boolean;
  reminder_minutes?: number;
}

class CalendarService {
  async getEvents(userId: string, startDate?: string, endDate?: string) {
    try {
      if (!supabase) {
        throw new Error('Supabase is not configured');
      }

      let query = supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', userId)
        .order('event_date', { ascending: true });

      if (startDate) {
        query = query.gte('event_date', startDate);
      }

      if (endDate) {
        query = query.lte('event_date', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Get calendar events error:', error);
      throw error;
    }
  }

  async createEvent(userId: string, eventData: CalendarEventData) {
    try {
      if (!supabase) {
        throw new Error('Supabase is not configured');
      }

      const { data, error } = await supabase
        .from('calendar_events')
        .insert({
          user_id: userId,
          ...eventData,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Create calendar event error:', error);
      throw error;
    }
  }

  async updateEvent(eventId: string, updates: Partial<CalendarEventData>) {
    try {
      if (!supabase) {
        throw new Error('Supabase is not configured');
      }

      const { data, error } = await supabase
        .from('calendar_events')
        .update(updates)
        .eq('id', eventId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Update calendar event error:', error);
      throw error;
    }
  }

  async deleteEvent(eventId: string) {
    try {
      if (!supabase) {
        throw new Error('Supabase is not configured');
      }

      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;
    } catch (error) {
      console.error('Delete calendar event error:', error);
      throw error;
    }
  }

  async getEventsByMonth(userId: string, year: number, month: number) {
    try {
      if (!supabase) {
        throw new Error('Supabase is not configured');
      }

      const startDate = new Date(year, month, 1).toISOString();
      const endDate = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', userId)
        .gte('event_date', startDate)
        .lte('event_date', endDate)
        .order('event_date', { ascending: true });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Get events by month error:', error);
      throw error;
    }
  }
}

export const calendarService = new CalendarService();
