import { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { authService } from '../services/authService';
import { userService } from '../services/userService';
import type { UserProfile, UserStats } from '../lib/supabase';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    
    const initializeAuth = async () => {
      try {
        // Check for existing session first
        const session = await authService.getSession();
        if (session?.user && mounted) {
          setUser(session.user);
          await loadUserData(session.user);
        }
      } catch (err) {
        console.error('Error checking session:', err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    const loadUserData = async (user: User) => {
      if (!mounted) return;
      
      try {
        // Check for cached data first (offline support). Scoped to this user id
        // so a previous account's profile can never be shown to a new one.
        const cachedData = userService.getCachedUserData(user.id);
        if (cachedData && mounted) {
          setProfile(cachedData.profile);
          setStats(cachedData.stats);
        }

        // Load fresh data from server
        const [userProfile, userStats] = await Promise.all([
          userService.getCurrentUserProfile(),
          userService.getCurrentUserStats(),
        ]);

        if (mounted) {
          setProfile(userProfile);
          setStats(userStats);

          // Cache the data
          if (userProfile && userStats) {
            userService.cacheUserData(userProfile, userStats);
          }
        }
      } catch (err) {
        console.error('Error loading user data:', err);
        if (mounted) {
          setError('Failed to load user data');
        }
      }
    };

    // Initialize auth state
    initializeAuth();

    // Set up auth state listener
    const { data: { subscription } } = authService.onAuthStateChange(async (user) => {
      if (!mounted) return;
      
      setUser(user);
      setError(null);

      if (user) {
        await loadUserData(user);
      } else {
        // User signed out
        if (mounted) {
          setProfile(null);
          setStats(null);
          userService.clearCache();
        }
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);
      const result = await authService.signIn({ email, password });
      if (result?.user) {
        setUser(result.user);
      }
    } catch (err: any) {
      setError(err.message || 'Sign in failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (userData: any) => {
    try {
      setError(null);
      setLoading(true);
      const result = await authService.signUp(userData);
      if (result?.user) {
        setUser(result.user);
      }
    } catch (err: any) {
      setError(err.message || 'Sign up failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setError(null);
      await authService.signOut();
      setUser(null);
      setProfile(null);
      setStats(null);
      userService.clearCache();
    } catch (err: any) {
      setError(err.message || 'Sign out failed');
      throw err;
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user || !profile) return;

    try {
      const updatedProfile = await userService.updateProfile(user.id, updates);
      setProfile(updatedProfile);
      
      // Update cache
      if (stats) {
        userService.cacheUserData(updatedProfile, stats);
      }
    } catch (err: any) {
      setError(err.message || 'Profile update failed');
      throw err;
    }
  };

  const incrementStats = async (payload: {
    /** The saved study_sessions row to credit. The server reads the minutes
     *  off it; nothing here decides how many are awarded. */
    sessionId?: string;
    /** Display only — what to show until the server's own figure lands.
     *  Sending a different number here changes nothing that is stored. */
    expectedFocusMinutes?: number;
    /** The completed to-do to credit. Counted once, server-side, however many
     *  times it is ticked and un-ticked. */
    todoId?: string;
  }) => {
    if (!user) return;

    try {
      // Optimistic update. streak_days is deliberately left alone — the server
      // owns it now, and the authoritative value comes back from the RPC and
      // overwrites all of this a moment later.
      if (stats) {
        setStats({
          ...stats,
          sessions: stats.sessions + (payload.sessionId ? 1 : 0),
          total_focus_minutes: stats.total_focus_minutes + (payload.expectedFocusMinutes || 0),
          tasks_completed: stats.tasks_completed + (payload.todoId ? 1 : 0),
        });
      }

      const updated = await userService.incrementStats(user.id, payload);
      if (updated) setStats(updated);
    } catch (err: any) {
      // Revert optimistic update on error
      const currentStats = await userService.getCurrentUserStats();
      setStats(currentStats);

      setError(err.message || 'Stats update failed');
      throw err;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      setError(null);
      await authService.resetPassword(email);
      return { success: true };
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to send reset email';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  return {
    user,
    profile,
    stats,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    updateProfile,
    incrementStats,
    resetPassword,
    isAuthenticated: !!user,
  };
};