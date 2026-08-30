import { supabase } from '../lib/supabase';
import {
  isNotificationSupported,
  showNotification,
} from '../utils/safeNotification';

export interface Notification {
  id: string;
  user_id: string;
  type: 'friend_request' | 'meeting_reminder' | 'study_callout' | 'cheer' | 'group_invite' | 'meeting_invite';
  title: string;
  message: string;
  action_data: any;
  is_read: boolean;
  created_at: string;
}

class NotificationService {
  /**
   * Shows a desktop notification only if permission has already been granted.
   *
   * This used to call requestNotificationPermission() on every incoming
   * notification. Browsers only honour that prompt in response to a user
   * gesture, so from a websocket callback it is ignored or denied — and where
   * it isn't, the user gets prompted over and over. Asking is now Settings'
   * job; this only reads the answer.
   */
  private maybeShowBrowserNotification(n: Notification): void {
    if (!isNotificationSupported()) return;
    if (Notification.permission !== 'granted') return;
    showNotification(n.title || 'New notification', {
      // Was `n.message ?? n.message` — the fallback was the same expression as
      // the value, so it could never do anything.
      body: n.message || '',
    });
  }
  async getNotifications(): Promise<Notification[]> {
    if (!supabase) throw new Error('Supabase not configured');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }

  async getUnreadCount(): Promise<number> {
    if (!supabase) throw new Error('Supabase not configured');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }
  }

  async markAsRead(notificationId: string): Promise<void> {
    if (!supabase) throw new Error('Supabase not configured');

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) throw error;
  }

  async markAllAsRead(): Promise<void> {
    if (!supabase) throw new Error('Supabase not configured');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) throw error;
  }

  async deleteNotification(notificationId: string): Promise<void> {
    if (!supabase) throw new Error('Supabase not configured');

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) throw error;
  }

  async createNotification(
    userId: string,
    type: Notification['type'],
    title: string,
    message: string,
    actionData?: any
  ): Promise<void> {
    if (!supabase) throw new Error('Supabase not configured');

    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title,
        message,
        action_data: actionData || {}
      });

    if (error) throw error;
  }

  /**
   * Subscribes to this user's incoming notifications.
   *
   * The channel used to be the bare literal 'notifications' with no filter, so
   * two components subscribing in one client collided on the same name, and
   * the client was woken for every insert rather than only its own. RLS meant
   * you could not *read* someone else's row, but you were still being told
   * something had happened.
   */
  subscribeToNotifications(userId: string, callback: (notification: Notification) => void) {
    if (!supabase) return { unsubscribe: () => {} };
    if (!userId) return { unsubscribe: () => {} };

    const channel = supabase
      .channel(`notifications_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        async (payload) => {
          const notification = payload.new as Notification;
          callback(notification);
          this.maybeShowBrowserNotification(notification);
        }
      )
      .subscribe();

    return {
      unsubscribe: () => {
        channel.unsubscribe();
      }
    };
  }
}

export const notificationService = new NotificationService();
