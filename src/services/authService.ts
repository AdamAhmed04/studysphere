import { supabase } from '../lib/supabase';
import type { UserProfile } from '../lib/supabase';

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
          data: {
            name: userData.name,
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user');

      // Upload avatar if provided
      let avatarUrl: string | undefined;
      if (userData.avatar) {
        try {
          const fileExt = userData.avatar.name.split('.').pop();
          const filePath = `${authData.user.id}/${authData.user.id}.${fileExt}`;

          // Delete existing avatar if any
          await supabase.storage
            .from('avatars')
            .remove([filePath]);

          const { error: uploadError, data: uploadData } = await supabase.storage
            .from('avatars')
            .upload(filePath, userData.avatar, {
              cacheControl: '3600',
              upsert: true
            });

          if (uploadError) {
            console.error('Avatar upload error:', uploadError);
            throw new Error(`Failed to upload avatar: ${uploadError.message}`);
          }

          const { data: urlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);

          avatarUrl = urlData.publicUrl;
        } catch (avatarError) {
          console.error('Avatar processing error:', avatarError);
          // Don't fail signup if avatar upload fails, just log it
        }
      }

      // Create user profile
      const profileData: Omit<UserProfile, 'created_at' | 'updated_at'> = {
        user_id: authData.user.id,
        name: userData.name,
        email: userData.email,
        avatar_url: avatarUrl,
        bio: userData.bio,
        date_of_birth: userData.dateOfBirth?.toISOString().split('T')[0],
        school: userData.school,
        study_field: userData.studyField,
        graduation_date: userData.graduationDate?.toISOString().split('T')[0],
        grade: userData.grade,
        interests: userData.interests,
        is_public: userData.isPublic,
      };

      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert(profileData);

      if (profileError) throw profileError;

      // Note: user_stats will be auto-created by trigger, no manual insert needed

      return { user: authData.user, profile: profileData };
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

  onAuthStateChange(callback: (user: any) => void) {
    if (!supabase) {
      return { data: { subscription: { unsubscribe: () => {} } } };
    }

    return supabase.auth.onAuthStateChange((event, session) => {
      // Use async block to avoid deadlocks
      (() => {
        callback(session?.user || null);
      })();
    });
  }
}

export const authService = new AuthService();