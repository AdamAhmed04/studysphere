import { supabase } from '../lib/supabase';

export interface StudySessionData {
  start_time: string;
  end_time?: string;
  duration: number;
  subject: string;
  notes?: string;
}

class StudySessionService {
  async getSessions(userId: string, limit: number = 50, offset: number = 0) {
    try {
      if (!supabase) {
        throw new Error('Supabase is not configured');
      }

      const { data, error } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('start_time', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Get study sessions error:', error);
      throw error;
    }
  }

  async createSession(userId: string, sessionData: StudySessionData) {
    try {
      if (!supabase) {
        throw new Error('Supabase is not configured');
      }

      const { data, error } = await supabase
        .from('study_sessions')
        .insert({
          user_id: userId,
          ...sessionData,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Create study session error:', error);
      throw error;
    }
  }

  async updateSession(sessionId: string, updates: Partial<StudySessionData>) {
    try {
      if (!supabase) {
        throw new Error('Supabase is not configured');
      }

      const { data, error } = await supabase
        .from('study_sessions')
        .update(updates)
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Update study session error:', error);
      throw error;
    }
  }

  async deleteSession(sessionId: string) {
    try {
      if (!supabase) {
        throw new Error('Supabase is not configured');
      }

      const { error } = await supabase
        .from('study_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;
    } catch (error) {
      console.error('Delete study session error:', error);
      throw error;
    }
  }

  async getSessionStats(userId: string, days: number = 30) {
    try {
      if (!supabase) {
        throw new Error('Supabase is not configured');
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('study_sessions')
        .select('duration, subject, start_time')
        .eq('user_id', userId)
        .gte('start_time', startDate.toISOString())
        .order('start_time', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Get session stats error:', error);
      throw error;
    }
  }
}

export const studySessionService = new StudySessionService();
