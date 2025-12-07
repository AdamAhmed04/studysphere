import { supabase } from '../lib/supabase';
import { sanitizeInput } from '../utils/sanitize';

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

    const { data: group, error: groupError } = await supabase
      .from('study_groups')
      .insert({
        name: groupData.name,
        description: groupData.description,
        subject: groupData.subject,
        is_private: groupData.isPrivate,
        created_by: user.id
      })
      .select()
      .single();

    if (groupError) throw groupError;

    const members = [
      { group_id: group.id, user_id: user.id, role: 'admin' },
      ...groupData.memberIds.map(memberId => ({
        group_id: group.id,
        user_id: memberId,
        role: 'member'
      }))
    ];

    const { error: membersError } = await supabase
      .from('study_group_members')
      .insert(members);

    if (membersError) throw membersError;

    for (const memberId of groupData.memberIds) {
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
      subject: group.subject,
      created_by: group.created_by,
      is_private: group.is_private,
      avatar_url: group.avatar_url,
      created_at: group.created_at,
      last_activity: group.last_activity,
      member_count: members.length,
      members: members.map(m => m.user_id)
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

      const { data: lastMessages, error: messagesError } = await supabase
        .from('chat_messages')
        .select('*, user_profiles!inner(name, avatar_url)')
        .in('group_id', groupIds);

      if (messagesError) throw messagesError;

      const groupsWithDetails: StudyGroupData[] = groups?.map(group => {
        const members = allMembers?.filter(m => m.group_id === group.id) || [];
        const groupMessages = lastMessages?.filter(m => m.group_id === group.id) || [];
        const lastMessage = groupMessages.sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];

        return {
          id: group.id,
          name: group.name,
          description: group.description,
          subject: group.subject,
          created_by: group.created_by,
          is_private: group.is_private,
          avatar_url: group.avatar_url,
          created_at: group.created_at,
          last_activity: group.last_activity,
          member_count: members.length,
          members: members.map(m => m.user_id),
          last_message: lastMessage ? {
            id: lastMessage.id,
            group_id: lastMessage.group_id,
            user_id: lastMessage.user_id,
            message: lastMessage.message,
            type: lastMessage.type,
            attachments: lastMessage.attachments,
            created_at: lastMessage.created_at,
            user_name: lastMessage.user_profiles?.name,
            user_avatar: lastMessage.user_profiles?.avatar_url
          } : undefined
        };
      }) || [];

      return groupsWithDetails;
    } catch (error) {
      console.error('Error fetching groups:', error);
      return [];
    }
  }

  async getGroupMessages(groupId: string): Promise<GroupMessage[]> {
    if (!supabase) throw new Error('Supabase not configured');

    try {
      const { data: messages, error } = await supabase
        .from('chat_messages')
        .select('*, user_profiles!inner(name, avatar_url)')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return messages?.map(msg => ({
        id: msg.id,
        group_id: msg.group_id,
        user_id: msg.user_id,
        message: msg.message,
        type: msg.type,
        attachments: msg.attachments,
        created_at: msg.created_at,
        user_name: msg.user_profiles?.name,
        user_avatar: msg.user_profiles?.avatar_url
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
      .select('*, user_profiles!inner(name, avatar_url)')
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
      type: messageData.type,
      attachments: messageData.attachments,
      created_at: messageData.created_at,
      user_name: messageData.user_profiles?.name,
      user_avatar: messageData.user_profiles?.avatar_url
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
          const { data: messageWithProfile } = await supabase
            .from('chat_messages')
            .select('*, user_profiles!inner(name, avatar_url)')
            .eq('id', payload.new.id)
            .single();

          if (messageWithProfile) {
            callback({
              id: messageWithProfile.id,
              group_id: messageWithProfile.group_id,
              user_id: messageWithProfile.user_id,
              message: messageWithProfile.message,
              type: messageWithProfile.type,
              attachments: messageWithProfile.attachments,
              created_at: messageWithProfile.created_at,
              user_name: messageWithProfile.user_profiles?.name,
              user_avatar: messageWithProfile.user_profiles?.avatar_url
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
