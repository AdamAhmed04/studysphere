import { supabase } from '../lib/supabase';
import { sanitizeInput } from '../utils/sanitize';
import { orUndefined, orEmpty, orFalse, asOneOf } from '../utils/rows';

/** Allowed chat message kinds, matching the CHECK constraint on the column. */
const MESSAGE_TYPES = ['text', 'note', 'resource'] as const;

export interface GroupMessage {
  id: string;
  group_id: string;
  user_id: string;
  message: string;
  type: 'text' | 'note' | 'resource';
  attachments?: string[];
  created_at: string;
  user_name?: string;
  user_avatar?: string;
}

export interface StudyGroupData {
  id: string;
  name: string;
  description: string;
  subject?: string;
  created_by: string;
  is_private: boolean;
  avatar_url?: string;
  created_at: string;
  last_activity: string;
  member_count?: number;
  members?: string[];
  last_message?: GroupMessage;
}

class GroupService {
  async createGroup(groupData: {
    name: string;
    description: string;
    subject?: string;
    isPrivate: boolean;
    memberIds: string[];
  }): Promise<StudyGroupData> {
    if (!supabase) throw new Error('Supabase not configured');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    /*
     * One RPC, one transaction.
     *
     * This used to be two statements — insert the group, then insert the
     * members — with nothing rolling the first back if the second failed. That
     * stranded a group row with no members, invisible in the UI and impossible
     * to remove from it. The function also deduplicates the member list, which
     * is what previously collided with the creator's admin row and violated
     * UNIQUE(group_id, user_id).
     */
    const { data: group, error: groupError } = await supabase
      .rpc('create_study_group', {
        p_name: groupData.name,
        p_description: groupData.description,
        p_subject: groupData.subject,
        p_is_private: groupData.isPrivate,
        p_member_ids: groupData.memberIds,
      })
      .single();

    if (groupError) throw groupError;

    const otherMemberIds = groupData.memberIds.filter(id => id !== user.id);

    for (const memberId of otherMemberIds) {
      await supabase
        .from('notifications')
        .insert({
          user_id: memberId,
          type: 'group_invite',
          title: 'Group Invitation',
          message: `You've been added to the group "${groupData.name}"`,
          action_data: { group_id: group.id, group_name: groupData.name }
        });
    }

    return {
      id: group.id,
      name: group.name,
      description: group.description,
      subject: orUndefined(group.subject),
      created_by: group.created_by,
      is_private: orFalse(group.is_private),
      avatar_url: orUndefined(group.avatar_url),
      created_at: orEmpty(group.created_at),
      last_activity: orEmpty(group.last_activity),
      // The function deduplicates, so the membership is the creator plus the
      // distinct others — not the raw list the caller passed in.
      member_count: otherMemberIds.length + 1,
      members: [user.id, ...otherMemberIds]
    };
  }

  async getGroups(): Promise<StudyGroupData[]> {
    if (!supabase) throw new Error('Supabase not configured');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: memberGroups, error: memberError } = await supabase
        .from('study_group_members')
        .select('group_id')
        .eq('user_id', user.id);

      if (memberError) throw memberError;
      if (!memberGroups || memberGroups.length === 0) return [];

      const groupIds = memberGroups.map(mg => mg.group_id);

      const { data: groups, error: groupsError } = await supabase
        .from('study_groups')
        .select('*')
        .in('id', groupIds)
        .order('last_activity', { ascending: false });

      if (groupsError) throw groupsError;

      const { data: allMembers, error: allMembersError } = await supabase
        .from('study_group_members')
        .select('group_id, user_id')
        .in('group_id', groupIds);

      if (allMembersError) throw allMembersError;

      /*
       * One row per group, chosen in the database.
       *
       * This used to fetch the entire message history of every group the user
       * belongs to and sort in JavaScript to find the newest of each, purely
       * to render one preview line per group. It grew without bound as the
       * chat was used.
       */
      const { data: lastMessages, error: messagesError } = await supabase
        .rpc('latest_group_messages', { p_group_ids: groupIds });

      if (messagesError) throw messagesError;

      const groupsWithDetails: StudyGroupData[] = groups?.map(group => {
        const members = allMembers?.filter(m => m.group_id === group.id) || [];
        const lastMessage = lastMessages?.find(m => m.group_id === group.id);

        return {
          id: group.id,
          name: group.name,
          description: group.description,
          subject: orUndefined(group.subject),
          created_by: group.created_by,
          is_private: orFalse(group.is_private),
          avatar_url: orUndefined(group.avatar_url),
          created_at: orEmpty(group.created_at),
          last_activity: orEmpty(group.last_activity),
          member_count: members.length,
          members: members.map(m => m.user_id),
          last_message: lastMessage ? {
            id: lastMessage.id,
            group_id: lastMessage.group_id,
            user_id: lastMessage.user_id,
            message: lastMessage.message,
            type: asOneOf(lastMessage.type, MESSAGE_TYPES, 'text'),
            attachments: orUndefined(lastMessage.attachments),
            created_at: orEmpty(lastMessage.created_at),
            user_name: orUndefined(lastMessage.user_name),
            user_avatar: orUndefined(lastMessage.user_avatar)
          } : undefined
        };
      }) || [];

      return groupsWithDetails;
    } catch (error) {
      console.error('Error fetching groups:', error);
      return [];
    }
  }

  /*
   * The profile embed is a LEFT join on purpose - no `!inner`.
   *
   * `public_profiles` is filtered `where is_public = true`, so an inner join
   * does not merely leave the author nameless, it drops the message. Toggling
   * your own profile to private in Settings therefore removed every message you
   * had ever posted, from every group, for everyone: 20 stored, 0 returned.
   *
   * It also broke sending. `sendMessage` selects the same embed with
   * `.single()`, so for a private author the row inserted fine and the select
   * that followed it matched nothing and threw - a failure reported for a
   * message that had actually been saved.
   *
   * Left-joined, an unresolvable author yields a null profile and the mapper
   * leaves `user_name` undefined; App.tsx already renders a fallback for that.
   * Private stays private - the name is withheld, the message is not.
   */
  async getGroupMessages(groupId: string): Promise<GroupMessage[]> {
    if (!supabase) throw new Error('Supabase not configured');

    try {
      const { data: messages, error } = await supabase
        .from('chat_messages')
        .select('*, public_profiles(name, avatar_url)')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return messages?.map(msg => ({
        id: msg.id,
        group_id: msg.group_id,
        user_id: msg.user_id,
        message: msg.message,
        type: asOneOf(msg.type, MESSAGE_TYPES, 'text'),
        attachments: orUndefined(msg.attachments),
        created_at: orEmpty(msg.created_at),
        user_name: orUndefined(msg.public_profiles?.name),
        user_avatar: orUndefined(msg.public_profiles?.avatar_url)
      })) || [];
    } catch (error) {
      console.error('Error fetching group messages:', error);
      return [];
    }
  }

  async sendMessage(groupId: string, message: string, type: 'text' | 'note' | 'resource' = 'text'): Promise<GroupMessage> {
    if (!supabase) throw new Error('Supabase not configured');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const sanitizedMessage = sanitizeInput(message, 2000);
    if (!sanitizedMessage.trim()) {
      throw new Error('Message cannot be empty');
    }

    const { data: messageData, error: messageError } = await supabase
      .from('chat_messages')
      .insert({
        group_id: groupId,
        user_id: user.id,
        message: sanitizedMessage,
        type
      })
      .select('*, public_profiles(name, avatar_url)')
      .single();

    if (messageError) throw messageError;

    await supabase
      .from('study_groups')
      .update({ last_activity: new Date().toISOString() })
      .eq('id', groupId);

    return {
      id: messageData.id,
      group_id: messageData.group_id,
      user_id: messageData.user_id,
      message: messageData.message,
      type: asOneOf(messageData.type, MESSAGE_TYPES, 'text'),
      attachments: orUndefined(messageData.attachments),
      created_at: orEmpty(messageData.created_at),
      user_name: orUndefined(messageData.public_profiles?.name),
      user_avatar: orUndefined(messageData.public_profiles?.avatar_url)
    };
  }

  subscribeToGroupMessages(groupId: string, callback: (message: GroupMessage) => void) {
    if (!supabase) return { unsubscribe: () => {} };

    const channel = supabase
      .channel(`group_messages_${groupId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `group_id=eq.${groupId}`
        },
        async (payload) => {
          if (!supabase) return;
          const { data: messageWithProfile } = await supabase
            .from('chat_messages')
            .select('*, public_profiles(name, avatar_url)')
            .eq('id', payload.new.id)
            .single();

          if (messageWithProfile) {
            callback({
              id: messageWithProfile.id,
              group_id: messageWithProfile.group_id,
              user_id: messageWithProfile.user_id,
              message: messageWithProfile.message,
              type: asOneOf(messageWithProfile.type, MESSAGE_TYPES, 'text'),
              attachments: orUndefined(messageWithProfile.attachments),
              created_at: orEmpty(messageWithProfile.created_at),
              user_name: orUndefined(messageWithProfile.public_profiles?.name),
              user_avatar: orUndefined(messageWithProfile.public_profiles?.avatar_url)
            });
          }
        }
      )
      .subscribe();

    return {
      unsubscribe: () => {
        channel.unsubscribe();
      }
    };
  }

  async leaveGroup(groupId: string): Promise<void> {
    if (!supabase) throw new Error('Supabase not configured');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('study_group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', user.id);

    if (error) throw error;
  }
}

export const groupService = new GroupService();
