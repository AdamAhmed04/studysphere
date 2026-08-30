import { supabase } from '../lib/supabase';

export interface UserPresence {
  user_id: string;
  is_online: boolean;
  last_seen: Date;
  updated_at: Date;
}

class PresenceService {
  /** Distinguishes concurrent presence channels within one client. */
  private static channelSeq = 0;

  // ReturnType, not NodeJS.Timeout: this runs in a browser, where setInterval
  // returns a number rather than a Node Timeout object.
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private listenersAttached = false;
  private readonly HEARTBEAT_INTERVAL = 30000;

  /*
   * Bound once, as fields, so they have stable identities.
   *
   * These used to be inline arrow functions passed straight to
   * addEventListener, which means removeEventListener could never match them —
   * a new function object every call. Combined with startHeartbeat attaching
   * them unconditionally, and its own visibilitychange handler calling
   * startHeartbeat again, every tab switch added another pair of listeners
   * that could not be removed. Listener count and presence writes grew without
   * bound for the life of the page.
   */
  private readonly handleUnload = () => {
    // Best effort only — the browser may tear down before this request lands.
    // The visibilitychange path below is the reliable offline signal.
    this.setOffline();
  };

  private readonly handleVisibilityChange = () => {
    if (document.hidden) {
      this.pauseHeartbeat();
      this.setOffline();
    } else {
      this.setOnline();
      this.resumeHeartbeat();
    }
  };

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

  /** Idempotent: calling this while already running is a no-op. */
  startHeartbeat(): void {
    if (this.listenersAttached) return;
    this.listenersAttached = true;

    window.addEventListener('beforeunload', this.handleUnload);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);

    this.setOnline();
    this.resumeHeartbeat();
  }

  /** Idempotent: safe to call when never started, or twice. */
  stopHeartbeat(): void {
    if (!this.listenersAttached) return;
    this.listenersAttached = false;

    window.removeEventListener('beforeunload', this.handleUnload);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);

    this.pauseHeartbeat();
    this.setOffline();
  }

  /*
   * Pause and resume only touch the interval — they leave the listeners alone.
   * Going to a background tab should stop the polling without tearing down the
   * subscription, which is what the old code got wrong by routing that case
   * back through startHeartbeat.
   */
  private resumeHeartbeat(): void {
    if (this.heartbeatInterval) return;
    this.heartbeatInterval = setInterval(() => {
      this.setOnline();
    }, this.HEARTBEAT_INTERVAL);
  }

  private pauseHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  subscribeToPresence(userIds: string[], callback: (presence: UserPresence) => void) {
    if (!supabase) return { unsubscribe: () => {} };

    /*
     * With no ids the filter renders as `user_id=in.()`, which is not valid —
     * the subscription fails rather than simply matching nothing. That is the
     * state of every brand-new account, before it has any friends.
     */
    if (userIds.length === 0) return { unsubscribe: () => {} };

    // Unique per subscription. A global literal name meant two subscribers in
    // one client collided on the same channel.
    const channelName = `presence_updates_${++PresenceService.channelSeq}`;

    const channel = supabase
      .channel(channelName)
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
