import { supabase } from '../lib/supabase';

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
  email?: string;
  bio?: string;
  school?: string;
  studyField?: string;
}

class FriendService {
  async sendFriendRequest(friendEmail: string): Promise<{ success: boolean; message: string }> {
    if (!supabase) throw new Error('Supabase not configured');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: friendProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('user_id, name')
        .eq('email', friendEmail)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!friendProfile) {
        return { success: false, message: 'User not found with that email' };
      }

      if (friendProfile.user_id === user.id) {
        return { success: false, message: 'You cannot add yourself as a friend' };
      }

      const { data: existing, error: existingError } = await supabase
        .from('friends')
        .select('id, status')
        .or(`and(user_id.eq.${user.id},friend_user_id.eq.${friendProfile.user_id}),and(user_id.eq.${friendProfile.user_id},friend_user_id.eq.${user.id})`)
        .maybeSingle();

      if (existingError) throw existingError;

      if (existing) {
        if (existing.status === 'accepted') {
          return { success: false, message: 'You are already friends' };
        } else if (existing.status === 'pending') {
          return { success: false, message: 'Friend request already sent' };
        } else if (existing.status === 'blocked') {
          return { success: false, message: 'Cannot send friend request' };
        }
      }

      const { error: insertError } = await supabase
        .from('friends')
        .insert({
          user_id: user.id,
          friend_user_id: friendProfile.user_id,
          status: 'pending'
        });

      if (insertError) throw insertError;

      const { data: senderProfile } = await supabase
        .from('user_profiles')
        .select('name')
        .eq('user_id', user.id)
        .single();

      await supabase
        .from('notifications')
        .insert({
          user_id: friendProfile.user_id,
          type: 'friend_request',
          title: 'New Friend Request',
          message: `${senderProfile?.name || 'Someone'} sent you a friend request`,
          action_data: { friend_request_id: user.id, sender_name: senderProfile?.name }
        });

      return { success: true, message: `Friend request sent to ${friendProfile.name}` };
    } catch (error) {
      console.error('Error sending friend request:', error);
      throw error;
    }
  }

  async acceptFriendRequest(requestId: string): Promise<FriendWithProfile | null> {
    if (!supabase) throw new Error('Supabase not configured');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('friends')
      .update({ status: 'accepted' })
      .eq('id', requestId);

    if (error) throw error;

    const { data: request } = await supabase
      .from('friends')
      .select('user_id')
      .eq('id', requestId)
      .single();

    if (request) {
      const { data: accepterProfile } = await supabase
        .from('user_profiles')
        .select('name')
        .eq('user_id', user.id)
        .single();

      await supabase
        .from('notifications')
        .insert({
          user_id: request.user_id,
          type: 'friend_request',
          title: 'Friend Request Accepted',
          message: `${accepterProfile?.name || 'Someone'} accepted your friend request`,
          action_data: { accepter_id: user.id }
        });

      const newFriend = await this.getFriendById(request.user_id);
      return newFriend;
    }

    return null;
  }

  private async getFriendById(friendId: string): Promise<FriendWithProfile | null> {
    if (!supabase) return null;

    try {
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('user_id, name, email, avatar_url, bio, school, study_field')
        .eq('user_id', friendId)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile) return null;

      const { data: stats, error: statsError } = await supabase
        .from('user_stats')
        .select('user_id, total_focus_minutes')
        .eq('user_id', friendId)
        .maybeSingle();

      if (statsError) throw statsError;

      const { data: presence, error: presenceError } = await supabase
        .from('user_presence')
        .select('user_id, is_online, last_seen')
        .eq('user_id', friendId)
        .maybeSingle();

      if (presenceError) throw presenceError;

      return {
        id: profile.user_id,
        name: profile.name,
        avatar: profile.avatar_url,
        email: profile.email,
        bio: profile.bio,
        school: profile.school,
        studyField: profile.study_field,
        totalStudyTime: stats?.total_focus_minutes || 0,
        isOnline: presence?.is_online || false,
        lastSeen: presence?.last_seen ? new Date(presence.last_seen) : undefined
      };
    } catch (error) {
      console.error('Error fetching friend by ID:', error);
      return null;
    }
  }

  async rejectFriendRequest(requestId: string): Promise<void> {
    if (!supabase) throw new Error('Supabase not configured');

    const { error } = await supabase
      .from('friends')
      .delete()
      .eq('id', requestId);

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

      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('user_id, name, email, avatar_url, bio, school, study_field')
        .in('user_id', friendIds);

      if (profilesError) throw profilesError;

      const { data: stats, error: statsError } = await supabase
        .from('user_stats')
        .select('user_id, total_focus_minutes')
        .in('user_id', friendIds);

      if (statsError) throw statsError;

      const { data: presence, error: presenceError } = await supabase
        .from('user_presence')
        .select('user_id, is_online, last_seen')
        .in('user_id', friendIds);

      if (presenceError) throw presenceError;

      const friends: FriendWithProfile[] = profiles?.map(profile => {
        const userStats = stats?.find(s => s.user_id === profile.user_id);
        const userPresence = presence?.find(p => p.user_id === profile.user_id);

        return {
          id: profile.user_id,
          name: profile.name,
          avatar: profile.avatar_url,
          email: profile.email,
          bio: profile.bio,
          school: profile.school,
          studyField: profile.study_field,
          totalStudyTime: userStats?.total_focus_minutes || 0,
          isOnline: userPresence?.is_online || false,
          lastSeen: userPresence?.last_seen ? new Date(userPresence.last_seen) : undefined
        };
      }) || [];

      return friends;
    } catch (error) {
      console.error('Error fetching friends:', error);
      return [];
    }
  }

  async getPendingRequests(): Promise<Array<{
    id: string;
    senderId: string;
    senderName: string;
    senderAvatar?: string;
    createdAt: Date;
  }>> {
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

      const senderIds = requests.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('user_id, name, avatar_url')
        .in('user_id', senderIds);

      return requests.map(req => {
        const profile = profiles?.find(p => p.user_id === req.user_id);
        return {
          id: req.id,
          senderId: req.user_id,
          senderName: profile?.name || 'Unknown',
          senderAvatar: profile?.avatar_url,
          createdAt: new Date(req.created_at)
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

  subscribeToPendingRequests(callback: (requests: any[]) => void) {
    if (!supabase) return { unsubscribe: () => {} };

    const channel = supabase
      .channel('friend_requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friends'
        },
        async () => {
          const requests = await this.getPendingRequests();
          callback(requests);
        }
      )
      .subscribe();

    return {
      unsubscribe: () => {
        channel.unsubscribe();
      }
    };
  }

  subscribeToFriendsChanges(callback: (friends: FriendWithProfile[]) => void) {
    if (!supabase) return { unsubscribe: () => {} };

    const channel = supabase
      .channel('friends_list')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friends'
        },
        async () => {
          const friends = await this.getFriends();
          callback(friends);
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

export const friendService = new FriendService();
