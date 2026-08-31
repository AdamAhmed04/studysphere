import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import { toLocalDateString } from '../utils/dates';

export interface SignUpData {
  email: string;
  password: string;
  name: string;
  avatar?: File;
  bio?: string;
  dateOfBirth?: Date;
  school?: string;
  studyField?: string;
  graduationDate?: Date;
  grade?: string;
  interests: string[];
  isPublic: boolean;
}

export interface SignInData {
  email: string;
  password: string;
}

class AuthService {
  async signUp(userData: SignUpData) {
    try {
      if (!supabase) {
        throw new Error('Supabase is not configured. Please set up your environment variables.');
      }

      // Sign up user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          // Everything the on_auth_user_created trigger needs to build the
          // profile row server-side.
          data: {
            name: userData.name,
            bio: userData.bio,
            school: userData.school,
            study_field: userData.studyField,
            grade: userData.grade,
            interests: userData.interests,
            is_public: userData.isPublic,
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user');

      /*
       * Avatar and the two date fields need an authenticated session: the
       * storage policies and the profile UPDATE policy both key off auth.uid().
       * When email confirmation is enabled signUp() returns no session, so
       * these are skipped and the user sets them from Profile after confirming.
       * Never fail signup over them.
       */
      if (authData.session) {
        const patch: Record<string, unknown> = {
          date_of_birth: toLocalDateString(userData.dateOfBirth),
          graduation_date: toLocalDateString(userData.graduationDate),
        };

        if (userData.avatar) {
          try {
            const fileExt = userData.avatar.name.split('.').pop();
            const filePath = `${authData.user.id}/${authData.user.id}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
              .from('avatars')
              .upload(filePath, userData.avatar, { cacheControl: '3600', upsert: true });

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
              .from('avatars')
              .getPublicUrl(filePath);

            patch.avatar_url = urlData.publicUrl;
          } catch (avatarError) {
            console.error('Avatar upload failed, continuing without it:', avatarError);
          }
        }

        // Drop empty strings as well as undefined: toLocalDateString returns
        // '' for a missing date, and '' is not a valid value for a date column.
        const cleaned = Object.fromEntries(
          Object.entries(patch).filter(([, v]) => v !== undefined && v !== '')
        );

        if (Object.keys(cleaned).length > 0) {
          const { error: patchError } = await supabase
            .from('user_profiles')
            .update(cleaned)
            .eq('user_id', authData.user.id);

          if (patchError) console.error('Post-signup profile update failed:', patchError);
        }
      }

      // The profile, stats and presence rows are all created by the
      // on_auth_user_created trigger. Nothing to insert from here.
      return { user: authData.user, session: authData.session };
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  }

  async signIn(credentials: SignInData) {
    try {
      if (!supabase) {
        throw new Error('Supabase is not configured. Please set up your environment variables.');
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  }

  async signOut() {
    try {
      if (!supabase) {
        throw new Error('Supabase is not configured. Please set up your environment variables.');
      }

      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  async getCurrentUser() {
    try {
      if (!supabase) {
        return null;
      }

      const { data: { user } } = await supabase.auth.getUser();
      return user;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  async getSession() {
    try {
      if (!supabase) {
        return null;
      }

      const { data: { session } } = await supabase.auth.getSession();
      return session;
    } catch (error) {
      console.error('Get session error:', error);
      return null;
    }
  }
  async resetPassword(email: string) {
    try {
      if (!supabase) {
        throw new Error('Supabase is not configured. Please set up your environment variables.');
      }

      const redirectUrl = `${window.location.origin}${window.location.pathname}#type=recovery`;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Reset password error:', error);
      throw error;
    }
  }

  async updatePassword(newPassword: string) {
    try {
      if (!supabase) {
        throw new Error('Supabase is not configured. Please set up your environment variables.');
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Update password error:', error);
      throw error;
    }
  }

  /**
   * Subscribes to sign-in / sign-out.
   *
   * The callback is deferred with setTimeout on purpose. Supabase holds an
   * internal lock while it processes an auth event, and calling back into the
   * client from inside that window can deadlock — which is exactly what the
   * consumer does, since it reloads the profile and stats on sign-in.
   *
   * The previous version wrapped the call in `(() => { ... })()` under a
   * comment reading "use async block to avoid deadlocks". A plain IIFE is
   * synchronous and defers nothing, so it had the comment without the
   * behaviour. setTimeout(…, 0) genuinely yields, letting the lock release
   * before the callback runs.
   */
  onAuthStateChange(callback: (user: User | null) => void) {
    if (!supabase) {
      return { data: { subscription: { unsubscribe: () => {} } } };
    }

    return supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      setTimeout(() => callback(user), 0);
    });
  }
}

export const authService = new AuthService();