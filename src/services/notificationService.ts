import { supabase } from '../lib/supabase';
import {
  isNotificationSupported,
  requestNotificationPermission,
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
  private async maybeShowBrowserNotification(n: Notification): Promise<void> {
    if (!isNotificationSupported()) return;
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') return;
    showNotification(n.title ?? 'New notification', {
      body: n.message ?? n.message,
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

  subscribeToNotifications(callback: (notification: Notification) => void) {
    if (!supabase) return { unsubscribe: () => {} };

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications'
        },
        async (payload) => {
          const notification = payload.new as Notification;
          callback(notification);
          await this.maybeShowBrowserNotification(notification);
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
