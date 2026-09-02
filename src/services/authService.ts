import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import { toLocalDateString } from '../utils/dates';
import {
  clearPendingAvatar,
  dataUrlToBlob,
  downscaleImage,
  readPendingAvatar,
  stashPendingAvatar,
} from '../utils/avatar';

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
          /*
           * Everything the on_auth_user_created trigger needs to build the
           * profile row server-side. This is the only route that works during
           * signup: the trigger fires as the auth row is created, so it needs
           * no session, where a follow-up UPDATE would need auth.uid() and
           * gets nothing when email confirmation is on.
           *
           * toLocalDateString yields '' for a missing date; safe_date() turns
           * that, and anything else unparseable, into NULL rather than
           * aborting the signup.
           */
          data: {
            name: userData.name,
            bio: userData.bio,
            school: userData.school,
            study_field: userData.studyField,
            grade: userData.grade,
            interests: userData.interests,
            is_public: userData.isPublic,
            date_of_birth: toLocalDateString(userData.dateOfBirth),
            graduation_date: toLocalDateString(userData.graduationDate),
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user');

      /*
       * The avatar is the one field that cannot go through metadata, because
       * it is a file rather than a string. It needs a session: both the
       * storage policy and the profile UPDATE policy key off auth.uid().
       */
      const avatarDataUrl = await this.prepareAvatar(userData.avatar);

      if (avatarDataUrl) {
        if (authData.session) {
          try {
            const avatarUrl = await this.uploadAvatar(
              authData.user.id,
              dataUrlToBlob(avatarDataUrl),
            );

            const { error: patchError } = await supabase
              .from('user_profiles')
              .update({ avatar_url: avatarUrl })
              .eq('user_id', authData.user.id);

            if (patchError) throw patchError;
          } catch (avatarError) {
            // Park it rather than drop it, so the next load retries.
            console.error('Avatar upload failed, deferring to first load:', avatarError);
            stashPendingAvatar(authData.user.id, avatarDataUrl);
          }
        } else {
          /*
           * No session means confirmation is pending, so there is no
           * auth.uid() for the storage policy to match. Park the photo;
           * applyPendingAvatar uploads it on the first load that has a
           * session, which is the redirect back from the confirmation email.
           */
          stashPendingAvatar(authData.user.id, avatarDataUrl);
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

  /** Downscales a chosen photo. Returns null if there is none, or it is unreadable. */
  private async prepareAvatar(file: File | undefined): Promise<string | null> {
    if (!file) return null;

    try {
      return await downscaleImage(file);
    } catch (error) {
      console.error('Could not process the chosen profile photo:', error);
      return null;
    }
  }

  /*
   * Uploads to a stable per-user path and returns a cache-busted public URL.
   * Stable so a user only ever occupies one file; cache-busted because the URL
   * would otherwise be byte-identical after a replacement and every client
   * would keep serving the old photo for the rest of the hour.
   */
  async uploadAvatar(userId: string, image: Blob): Promise<string> {
    if (!supabase) {
      throw new Error('Supabase is not configured. Please set up your environment variables.');
    }

    // The storage policies match (storage.foldername(name))[1] against
    // auth.uid(), so the user id has to be the first path segment.
    const filePath = `${userId}/avatar.jpg`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, image, {
        cacheControl: '3600',
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    return `${data.publicUrl}?v=${Date.now()}`;
  }

  /*
   * Uploads a photo that was picked at signup but could not be sent then.
   * Called on every authenticated load; costs one localStorage read when there
   * is nothing waiting. On failure the photo stays parked so the next load
   * tries again - it is only cleared once it is safely on the profile.
   */
  async applyPendingAvatar(userId: string): Promise<string | null> {
    const dataUrl = readPendingAvatar(userId);
    if (!dataUrl || !supabase) return null;

    try {
      const avatarUrl = await this.uploadAvatar(userId, dataUrlToBlob(dataUrl));

      const { error } = await supabase
        .from('user_profiles')
        .update({ avatar_url: avatarUrl })
        .eq('user_id', userId);

      if (error) throw error;

      clearPendingAvatar(userId);
      return avatarUrl;
    } catch (error) {
      console.error('Could not apply the profile photo picked at signup:', error);
      return null;
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