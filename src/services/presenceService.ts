import { supabase } from '../lib/supabase';

export interface UserPresence {
  user_id: string;
  is_online: boolean;
  last_seen: Date;
  updated_at: Date;
}

class PresenceService {
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly HEARTBEAT_INTERVAL = 30000;

  async setOnline(): Promise<void> {
    if (!supabase) throw new Error('Supabase not configured');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('user_presence')
      .upsert({
        user_id: user.id,
        is_online: true,
        last_seen: new Date().toISOString()
      });

    if (error) console.error('Error setting online status:', error);
  }

  async setOffline(): Promise<void> {
    if (!supabase) throw new Error('Supabase not configured');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('user_presence')
      .update({
        is_online: false,
        last_seen: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (error) console.error('Error setting offline status:', error);
  }

  async getUserPresence(userId: string): Promise<UserPresence | null> {
    if (!supabase) throw new Error('Supabase not configured');

    const { data, error } = await supabase
      .from('user_presence')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user presence:', error);
      return null;
    }

    if (!data) return null;

    return {
      user_id: data.user_id,
      is_online: data.is_online,
      last_seen: new Date(data.last_seen),
      updated_at: new Date(data.updated_at)
    };
  }

  async getMultiplePresence(userIds: string[]): Promise<Map<string, UserPresence>> {
    if (!supabase) throw new Error('Supabase not configured');

    const { data, error } = await supabase
      .from('user_presence')
      .select('*')
      .in('user_id', userIds);

    if (error) {
      console.error('Error fetching presence:', error);
      return new Map();
    }

    const presenceMap = new Map<string, UserPresence>();
    data?.forEach(p => {
      presenceMap.set(p.user_id, {
        user_id: p.user_id,
        is_online: p.is_online,
        last_seen: new Date(p.last_seen),
        updated_at: new Date(p.updated_at)
      });
    });

    return presenceMap;
  }

  startHeartbeat(): void {
    this.setOnline();

    this.heartbeatInterval = setInterval(() => {
      this.setOnline();
    }, this.HEARTBEAT_INTERVAL);

    window.addEventListener('beforeunload', () => {
      this.stopHeartbeat();
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.setOffline();
      } else {
        this.setOnline();
        if (!this.heartbeatInterval) {
          this.startHeartbeat();
        }
      }
    });
  }

  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    this.setOffline();
  }

  subscribeToPresence(userIds: string[], callback: (presence: UserPresence) => void) {
    if (!supabase) return { unsubscribe: () => {} };

    const channel = supabase
      .channel('presence_updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_presence',
          filter: `user_id=in.(${userIds.join(',')})`
        },
        (payload) => {
          const data = payload.new;
          callback({
            user_id: data.user_id,
            is_online: data.is_online,
            last_seen: new Date(data.last_seen),
            updated_at: new Date(data.updated_at)
          });
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

export const presenceService = new PresenceService();
