import { supabase } from '../lib/supabase';
import { notificationService } from './notificationService';

export interface MeetingData {
  title: string;
  description?: string;
  scheduled_time: string;
  duration: number;
  group_id?: string;
  location?: string;
  meeting_type: 'video' | 'in-person' | 'phone';
  meeting_link?: string;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
}

class MeetingService {
  async getMeetings(userId: string, limit: number = 50, offset: number = 0) {
    try {
      if (!supabase) {
        throw new Error('Supabase is not configured');
      }

      const { data, error } = await supabase
        .from('meetings')
        .select('*, meeting_participants(*)')
        .or(`host_id.eq.${userId},meeting_participants.user_id.eq.${userId}`)
        .order('scheduled_time', { ascending: true })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Get meetings error:', error);
      throw error;
    }
  }

  async createMeeting(hostId: string, meetingData: MeetingData, participantIds: string[] = []) {
    try {
      if (!supabase) {
        throw new Error('Supabase is not configured');
      }

      const { data: meeting, error: meetingError } = await supabase
        .from('meetings')
        .insert({
          host_id: hostId,
          ...meetingData,
        })
        .select()
        .single();

      if (meetingError) throw meetingError;

      if (participantIds.length > 0) {
        const participants = participantIds.map(userId => ({
          meeting_id: meeting.id,
          user_id: userId,
          status: 'invited' as const,
        }));

        const { error: participantsError } = await supabase
          .from('meeting_participants')
          .insert(participants);

        if (participantsError) throw participantsError;

        for (const participantId of participantIds) {
          await notificationService.createNotification(
            participantId,
            'meeting_invite',
            'Meeting Invitation',
            `You've been invited to "${meetingData.title}" on ${new Date(meetingData.scheduled_time).toLocaleString()}`,
            { meeting_id: meeting.id, meeting_title: meetingData.title }
          );
        }
      }

      return meeting;
    } catch (error) {
      console.error('Create meeting error:', error);
      throw error;
    }
  }

  async updateMeeting(meetingId: string, updates: Partial<MeetingData>) {
    try {
      if (!supabase) {
        throw new Error('Supabase is not configured');
      }

      const { data, error } = await supabase
        .from('meetings')
        .update(updates)
        .eq('id', meetingId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Update meeting error:', error);
      throw error;
    }
  }

  async deleteMeeting(meetingId: string) {
    try {
      if (!supabase) {
        throw new Error('Supabase is not configured');
      }

      const { error } = await supabase
        .from('meetings')
        .delete()
        .eq('id', meetingId);

      if (error) throw error;
    } catch (error) {
      console.error('Delete meeting error:', error);
      throw error;
    }
  }

  async updateParticipantStatus(
    meetingId: string,
    userId: string,
    status: 'invited' | 'accepted' | 'declined'
  ) {
    try {
      if (!supabase) {
        throw new Error('Supabase is not configured');
      }

      const { data, error } = await supabase
        .from('meeting_participants')
        .update({ status })
        .eq('meeting_id', meetingId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Update participant status error:', error);
      throw error;
    }
  }

  async getUpcomingMeetings(userId: string, limit: number = 10) {
    try {
      if (!supabase) {
        throw new Error('Supabase is not configured');
      }

      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('meetings')
        .select('*, meeting_participants(*)')
        .or(`host_id.eq.${userId},meeting_participants.user_id.eq.${userId}`)
        .gte('scheduled_time', now)
        .eq('status', 'scheduled')
        .order('scheduled_time', { ascending: true })
        .limit(limit);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Get upcoming meetings error:', error);
      throw error;
    }
  }
}

export const meetingService = new MeetingService();
