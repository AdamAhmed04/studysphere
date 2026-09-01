import { supabase } from '../lib/supabase';
import { orUndefined, orEmpty } from '../utils/rows';

export interface FriendRequest {
  id: string;
  user_id: string;
  friend_user_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  created_at: string;
}

export interface FriendWithProfile {
  id: string;
  name: string;
  avatar?: string;
  totalStudyTime: number;
  isOnline: boolean;
  lastSeen?: Date;
  bio?: string;
  school?: string;
  studyField?: string;
}

/** A friend request waiting on the signed-in user. */
export interface PendingFriendRequest {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  createdAt: Date;
}

class FriendService {
  /**
   * Sends a friend request to whoever owns an email address.
   *
   * The lookup goes through the find_user_by_email RPC because `email` is no
   * longer a readable column — public_profiles exposes an allowlist that
   * deliberately omits it. The RPC returns an id and name and never the address.
   *
   * The RPC is rate-limited per account (20 an hour, 60 a day) because
   * otherwise it answers "is this address registered?" as fast as you can ask,
   * which is an enumeration oracle rather than a friend finder. Hitting the
   * limit comes back as SQLSTATE 54000 and is shown as its own message —
   * telling someone no such profile exists when really they need to slow down
   * would send them looking for a problem that is not there.
   */
  async sendFriendRequest(friendEmail: string): Promise<{ success: boolean; message: string }> {
    if (!supabase) throw new Error('Supabase not configured');

    try {
      const { data: matches, error: lookupError } = await supabase
        .rpc('find_user_by_email', { p_email: friendEmail });

      if (lookupError) {
        if (lookupError.code === '54000') {
          return {
            success: false,
            message: 'Too many email lookups just now. Please wait a while and try again.'
          };
        }
        throw lookupError;
      }

      const match = Array.isArray(matches) ? matches[0] : matches;
      if (!match) {
        return { success: false, message: 'No public profile found with that email' };
      }

      return this.sendFriendRequestById(match.user_id, match.name);
    } catch (error) {
      console.error('Error sending friend request:', error);
      throw error;
    }
  }

  /**
   * The direct path. Search results carry a user id, so there is no reason to
   * round-trip through an email address to friend someone.
   */
  async sendFriendRequestById(friendUserId: string, friendName?: string): Promise<{ success: boolean; message: string }> {
    if (!supabase) throw new Error('Supabase not configured');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (friendUserId === user.id) {
        return { success: false, message: 'You cannot add yourself as a friend' };
      }

      // Not maybeSingle(): a mirrored pair would return two rows and throw.
      const { data: existing, error: existingError } = await supabase
        .from('friends')
        .select('id, status')
        .or(`and(user_id.eq.${user.id},friend_user_id.eq.${friendUserId}),and(user_id.eq.${friendUserId},friend_user_id.eq.${user.id})`);

      if (existingError) throw existingError;

      if (existing && existing.length > 0) {
        const status = existing[0].status;
        if (status === 'accepted') return { success: false, message: 'You are already friends' };
        if (status === 'pending') return { success: false, message: 'A request is already pending' };
        return { success: false, message: 'Cannot send friend request' };
      }

      const { error: insertError } = await supabase
        .from('friends')
        .insert({ user_id: user.id, friend_user_id: friendUserId, status: 'pending' });

      if (insertError) throw insertError;

      const { data: senderProfile } = await supabase
        .from('user_profiles')
        .select('name')
        .eq('user_id', user.id)
        .maybeSingle();

      await supabase.from('notifications').insert({
        user_id: friendUserId,
        type: 'friend_request',
        title: 'New Friend Request',
        message: `${senderProfile?.name || 'Someone'} sent you a friend request`,
        action_data: { sender_id: user.id, sender_name: senderProfile?.name }
      });

      return { success: true, message: `Friend request sent${friendName ? ` to ${friendName}` : ''}` };
    } catch (error) {
      console.error('Error sending friend request:', error);
      throw error;
    }
  }

  /**
   * Accepts a pending request.
   *
   * The update asks for the changed row back and throws when nothing comes
   * back. Previously it ignored the result entirely, so when RLS matched zero
   * rows — which it always did, because the policy covered the sender rather
   * than the recipient — the UI reported success and rendered a friendship that
   * did not exist.
   */
  async acceptFriendRequest(requestId: string): Promise<FriendWithProfile | null> {
    if (!supabase) throw new Error('Supabase not configured');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: updated, error } = await supabase
      .from('friends')
      .update({ status: 'accepted' })
      .eq('id', requestId)
      .select('user_id')
      .maybeSingle();

    if (error) throw error;
    if (!updated) {
      throw new Error('Could not accept that request — it may have been withdrawn already.');
    }

    const { data: accepterProfile } = await supabase
      .from('user_profiles')
      .select('name')
      .eq('user_id', user.id)
      .maybeSingle();

    await supabase.from('notifications').insert({
      user_id: updated.user_id,
      type: 'friend_request',
      title: 'Friend Request Accepted',
      message: `${accepterProfile?.name || 'Someone'} accepted your friend request`,
      action_data: { accepter_id: user.id }
    });

    return this.getFriendById(updated.user_id);
  }

  private async getFriendById(friendId: string): Promise<FriendWithProfile | null> {
    if (!supabase) return null;

    try {
      const { data: profile, error: profileError } = await supabase
        .from('public_profiles')
        .select('user_id, name, avatar_url, bio, school, study_field')
        .eq('user_id', friendId)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile) return null;

      const [statsRes, presenceRes] = await Promise.all([
        supabase.from('public_leaderboard').select('total_focus_minutes').eq('user_id', friendId).maybeSingle(),
        supabase.from('user_presence').select('is_online, last_seen').eq('user_id', friendId).maybeSingle(),
      ]);

      return {
        id: orEmpty(profile.user_id),
        name: orEmpty(profile.name),
        avatar: orUndefined(profile.avatar_url),
        bio: orUndefined(profile.bio),
        school: orUndefined(profile.school),
        studyField: orUndefined(profile.study_field),
        totalStudyTime: statsRes.data?.total_focus_minutes || 0,
        isOnline: presenceRes.data?.is_online || false,
        lastSeen: presenceRes.data?.last_seen ? new Date(presenceRes.data.last_seen) : undefined
      };
    } catch (error) {
      console.error('Error fetching friend by ID:', error);
      return null;
    }
  }

  async rejectFriendRequest(requestId: string): Promise<void> {
    if (!supabase) throw new Error('Supabase not configured');

    const { error } = await supabase.from('friends').delete().eq('id', requestId);
    if (error) throw error;
  }

  async getFriends(): Promise<FriendWithProfile[]> {
    if (!supabase) throw new Error('Supabase not configured');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: friendships, error: friendshipsError } = await supabase
        .from('friends')
        .select('user_id, friend_user_id')
        .eq('status', 'accepted')
        .or(`user_id.eq.${user.id},friend_user_id.eq.${user.id}`);

      if (friendshipsError) throw friendshipsError;
      if (!friendships || friendships.length === 0) return [];

      const friendIds = friendships.map(f =>
        f.user_id === user.id ? f.friend_user_id : f.user_id
      );

      const [profilesRes, statsRes, presenceRes] = await Promise.all([
        supabase.from('public_profiles')
          .select('user_id, name, avatar_url, bio, school, study_field')
          .in('user_id', friendIds),
        supabase.from('public_leaderboard')
          .select('user_id, total_focus_minutes')
          .in('user_id', friendIds),
        supabase.from('user_presence')
          .select('user_id, is_online, last_seen')
          .in('user_id', friendIds),
      ]);

      if (profilesRes.error) throw profilesRes.error;

      const stats = statsRes.data || [];
      const presence = presenceRes.data || [];

      return (profilesRes.data || []).map(profile => {
        const userStats = stats.find(s => s.user_id === profile.user_id);
        const userPresence = presence.find(p => p.user_id === profile.user_id);

        return {
          id: orEmpty(profile.user_id),
          name: orEmpty(profile.name),
          avatar: orUndefined(profile.avatar_url),
          bio: orUndefined(profile.bio),
          school: orUndefined(profile.school),
          studyField: orUndefined(profile.study_field),
          totalStudyTime: userStats?.total_focus_minutes || 0,
          isOnline: userPresence?.is_online || false,
          lastSeen: userPresence?.last_seen ? new Date(userPresence.last_seen) : undefined
        };
      });
    } catch (error) {
      console.error('Error fetching friends:', error);
      return [];
    }
  }

  async getPendingRequests(): Promise<PendingFriendRequest[]> {
    if (!supabase) throw new Error('Supabase not configured');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: requests, error } = await supabase
        .from('friends')
        .select('id, user_id, created_at')
        .eq('friend_user_id', user.id)
        .eq('status', 'pending');

      if (error) throw error;
      if (!requests || requests.length === 0) return [];

      const { data: profiles } = await supabase
        .from('public_profiles')
        .select('user_id, name, avatar_url')
        .in('user_id', requests.map(r => r.user_id));

      return requests.map(req => {
        const profile = profiles?.find(p => p.user_id === req.user_id);
        return {
          id: req.id,
          senderId: req.user_id,
          senderName: profile?.name ?? 'Unknown',
          senderAvatar: orUndefined(profile?.avatar_url),
          createdAt: new Date(orEmpty(req.created_at))
        };
      });
    } catch (error) {
      console.error('Error fetching pending requests:', error);
      return [];
    }
  }

  async removeFriend(friendId: string): Promise<void> {
    if (!supabase) throw new Error('Supabase not configured');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('friends')
      .delete()
      .or(`and(user_id.eq.${user.id},friend_user_id.eq.${friendId}),and(user_id.eq.${friendId},friend_user_id.eq.${user.id})`);

    if (error) throw error;
  }

  /**
   * Realtime subscriptions, scoped per user.
   *
   * Both channels used to carry a global literal name and no filter, so every
   * connected client refetched its whole friends list whenever any row in
   * `friends` changed for anybody — and two components subscribing to the same
   * literal name on one client collided.
   */
  subscribeToPendingRequests(userId: string, callback: (requests: PendingFriendRequest[]) => void) {
    if (!supabase) return { unsubscribe: () => {} };

    const channel = supabase
      .channel(`friend_requests_${userId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'friends', filter: `friend_user_id=eq.${userId}` },
        async () => callback(await this.getPendingRequests()))
      .subscribe();

    return { unsubscribe: () => { channel.unsubscribe(); } };
  }

  subscribeToFriendsChanges(userId: string, callback: (friends: FriendWithProfile[]) => void) {
    if (!supabase) return { unsubscribe: () => {} };

    const client = supabase;
    const refresh = async () => callback(await this.getFriends());

    // Two filters are needed because a friendship row names the user in either
    // column, and PostgREST realtime filters cannot express OR.
    const outgoing = client
      .channel(`friends_out_${userId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'friends', filter: `user_id=eq.${userId}` },
        refresh)
      .subscribe();

    const incoming = client
      .channel(`friends_in_${userId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'friends', filter: `friend_user_id=eq.${userId}` },
        refresh)
      .subscribe();

    return {
      unsubscribe: () => {
        outgoing.unsubscribe();
        incoming.unsubscribe();
      }
    };
  }
}

export const friendService = new FriendService();
