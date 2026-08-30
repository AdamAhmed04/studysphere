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

    const client = supabase;
    return () => {
      client.removeChannel(subscription);
    };
  }

  /**
   * Applies a stat increment atomically in the database.
   *
   * This used to read the row, add in JavaScript and write the total back,
   * which lost updates whenever two sessions finished close together. Direct
   * writes to user_stats are now revoked; the RPC is the only way in, which
   * also stops the leaderboard being editable from devtools.
   *
   * The streak is computed server-side from last_session_date, so callers no
   * longer pass streakDays.
   */
  async incrementStats(_userId: string, payload: {
    sessions?: number;
    totalFocusMinutes?: number;
    tasksCompleted?: number;
  }) {
    try {
      if (!supabase) {
        throw new Error('Supabase is not configured. Please set up your environment variables.');
      }

      const { data, error } = await supabase
        .rpc('increment_user_stats', {
          p_sessions: payload.sessions ?? 0,
          p_focus_minutes: payload.totalFocusMinutes ?? 0,
          p_tasks_completed: payload.tasksCompleted ?? 0,
        })
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

  // calculateStreak() used to live here. Every branch returned a hard-coded 1,
  // so a 40-day streak displayed as 1. Streaks are now computed inside
  // increment_user_stats() from last_session_date, where the write is atomic.

  // Cache management for offline support.
  //
  // The cached payload records which user it belongs to and reads verify it.
  // This was previously one global key with no such check, so signing in as a
  // second user on the same browser showed the previous user's name, email and
  // stats until the network reply landed.
  private cacheKey = 'studysphere_user_cache';

  cacheUserData(profile: UserProfile, stats: UserStats) {
    try {
      const cacheData = {
        userId: profile.user_id,
        profile,
        stats,
        timestamp: Date.now(),
      };
      localStorage.setItem(this.cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Cache user data error:', error);
    }
  }

  getCachedUserData(userId: string): { profile: UserProfile; stats: UserStats } | null {
    try {
      const cached = localStorage.getItem(this.cacheKey);
      if (!cached) return null;

      const data = JSON.parse(cached);

      // Belongs to a different account — never hand it back.
      if (!data.userId || data.userId !== userId) {
        localStorage.removeItem(this.cacheKey);
        return null;
      }

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