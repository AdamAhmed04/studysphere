import { supabase } from '../lib/supabase';
import type { UserProfile, UserStats } from '../lib/supabase';

class UserService {
  async getCurrentUserProfile(): Promise<UserProfile | null> {
    try {
      if (!supabase) {
        return null;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Get current user profile error:', error);
      return null;
    }
  }

  async getCurrentUserStats(): Promise<UserStats | null> {
    try {
      if (!supabase) {
        console.warn('Supabase client not configured');
        return null;
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.warn('No authenticated user found');
        return null;
      }

      const { data, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user stats:', error);
        return null;
      }

      // Stats should be auto-created by trigger, but handle missing case
      if (!data) {
        console.warn('User stats not found, they should have been created by trigger');
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getCurrentUserStats:', error);
      return null;
    }
  }

  subscribeToUserStats(userId: string, callback: (stats: UserStats | null) => void) {
    if (!supabase) {
      return () => {};
    }

    const subscription = supabase
      .channel(`user_stats_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_stats',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          callback(payload.new as UserStats);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }

  async incrementStats(userId: string, payload: {
    sessions?: number;
    totalFocusMinutes?: number;
    streakDays?: number;
    tasksCompleted?: number;
  }) {
    try {
      if (!supabase) {
        throw new Error('Supabase is not configured. Please set up your environment variables.');
      }

      // Get current stats
      const { data: currentStats, error: fetchError } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!currentStats) throw new Error('User stats not found');

      // Calculate new values
      const newStats = {
        sessions: (currentStats.sessions || 0) + (payload.sessions || 0),
        total_focus_minutes: (currentStats.total_focus_minutes || 0) + (payload.totalFocusMinutes || 0),
        streak_days: payload.streakDays !== undefined ? payload.streakDays : (currentStats.streak_days || 0),
        tasks_completed: (currentStats.tasks_completed || 0) + (payload.tasksCompleted || 0),
        last_session_date: payload.totalFocusMinutes ? new Date().toISOString().split('T')[0] : currentStats.last_session_date,
      };

      const { data, error } = await supabase
        .from('user_stats')
        .update(newStats)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Increment stats error:', error);
      throw error;
    }
  }

  async updateProfile(userId: string, updates: Partial<UserProfile>) {
    try {
      if (!supabase) {
        throw new Error('Supabase is not configured. Please set up your environment variables.');
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  }

  async calculateStreak(userId: string): Promise<number> {
    try {
      if (!supabase) {
        console.warn('Supabase client not configured');
        return 0;
      }

      const { data: stats, error } = await supabase
        .from('user_stats')
        .select('last_session_date')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error calculating streak:', error);
        return 0;
      }

      if (!stats?.last_session_date) return 0;

      const lastSessionDate = new Date(stats.last_session_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      lastSessionDate.setHours(0, 0, 0, 0);

      const diffTime = today.getTime() - lastSessionDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      // If last session was today or yesterday, maintain/increment streak
      if (diffDays <= 1) {
        return diffDays === 0 ? 1 : 1; // Simplified streak calculation
      }

      return 0; // Streak broken
    } catch (error) {
      console.error('Calculate streak error:', error);
      return 0;
    }
  }

  // Cache management for offline support
  private cacheKey = 'studysphere_user_cache';

  cacheUserData(profile: UserProfile, stats: UserStats) {
    try {
      const cacheData = {
        profile,
        stats,
        timestamp: Date.now(),
      };
      localStorage.setItem(this.cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Cache user data error:', error);
    }
  }

  getCachedUserData(): { profile: UserProfile; stats: UserStats } | null {
    try {
      const cached = localStorage.getItem(this.cacheKey);
      if (!cached) return null;

      const data = JSON.parse(cached);
      const isStale = Date.now() - data.timestamp > 24 * 60 * 60 * 1000; // 24 hours

      if (isStale) {
        localStorage.removeItem(this.cacheKey);
        return null;
      }

      return { profile: data.profile, stats: data.stats };
    } catch (error) {
      console.error('Get cached user data error:', error);
      return null;
    }
  }

  clearCache() {
    localStorage.removeItem(this.cacheKey);
  }
}

export const userService = new UserService();