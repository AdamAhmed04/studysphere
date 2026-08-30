import { useState, useEffect } from 'react';
import { meetingService, MeetingData } from '../services/meetingService';
import { orUndefined, asOneOf } from '../utils/rows';

const MEETING_TYPES = ['video', 'in-person', 'phone'] as const;
const MEETING_STATUSES = ['scheduled', 'active', 'completed', 'cancelled'] as const;

export interface Meeting {
  id: string;
  title: string;
  description?: string;
  scheduledTime: Date;
  duration: number;
  hostId: string;
  participants: string[];
  invitees: string[];
  inviteeEmails: string[];
  groupId?: string;
  location?: string;
  meetingType: 'video' | 'in-person' | 'phone';
  meetingLink?: string;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  reminders: number[];
  createdAt: Date;
}

export const useMeetings = (userId: string | undefined) => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setMeetings([]);
      setLoading(false);
      return;
    }

    loadMeetings();
  }, [userId]);

  const loadMeetings = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const data = await meetingService.getMeetings(userId);

      const mappedMeetings: Meeting[] = data.map((meeting: any) => ({
        id: meeting.id,
        title: meeting.title,
        description: meeting.description,
        scheduledTime: new Date(meeting.scheduled_time),
        duration: meeting.duration,
        hostId: meeting.host_id,
        participants: meeting.meeting_participants?.map((p: any) => p.user_id) || [],
        invitees: meeting.meeting_participants?.filter((p: any) => p.status === 'invited').map((p: any) => p.user_id) || [],
        inviteeEmails: [],
        groupId: meeting.group_id,
        location: meeting.location,
        meetingType: meeting.meeting_type,
        meetingLink: meeting.meeting_link,
        status: meeting.status,
        reminders: [],
        createdAt: new Date(meeting.created_at)
      }));

      setMeetings(mappedMeetings);
      setError(null);
    } catch (err: any) {
      console.error('Error loading meetings:', err);
      setError(err.message || 'Failed to load meetings');
    } finally {
      setLoading(false);
    }
  };

  const createMeeting = async (meetingData: {
    title: string;
    description?: string;
    scheduledTime: Date;
    duration: number;
    participants: string[];
    invitees: string[];
    inviteeEmails: string[];
    groupId?: string;
    location?: string;
    meetingType: 'video' | 'in-person' | 'phone';
    reminders: number[];
  }) => {
    if (!userId) throw new Error('Not authenticated');

    try {
      const data: MeetingData = {
        title: meetingData.title,
        description: meetingData.description,
        scheduled_time: meetingData.scheduledTime.toISOString(),
        duration: meetingData.duration,
        group_id: meetingData.groupId,
        location: meetingData.location,
        meeting_type: meetingData.meetingType,
        status: 'scheduled'
      };

      const allParticipants = [
        ...meetingData.participants,
        ...meetingData.invitees
      ];

      const meeting = await meetingService.createMeeting(userId, data, allParticipants);

      const newMeeting: Meeting = {
        id: meeting.id,
        title: meeting.title,
        description: meeting.description,
        scheduledTime: new Date(meeting.scheduled_time),
        duration: meeting.duration,
        hostId: meeting.host_id,
        participants: meetingData.participants,
        invitees: meetingData.invitees,
        inviteeEmails: meetingData.inviteeEmails,
        groupId: meeting.group_id,
        location: meeting.location,
        meetingType: meeting.meeting_type,
        meetingLink: meeting.meeting_link,
        status: meeting.status,
        reminders: meetingData.reminders,
        createdAt: new Date(meeting.created_at)
      };

      setMeetings(prev => [newMeeting, ...prev]);
      return newMeeting;
    } catch (err: any) {
      setError(err.message || 'Failed to create meeting');
      throw err;
    }
  };

  const updateMeeting = async (id: string, updates: Partial<MeetingData>) => {
    try {
      const data = await meetingService.updateMeeting(id, updates);

      setMeetings(prev => prev.map(meeting => {
        if (meeting.id === id) {
          return {
            ...meeting,
            title: data.title,
            description: orUndefined(data.description),
            scheduledTime: new Date(data.scheduled_time),
            duration: data.duration,
            location: orUndefined(data.location),
            meetingType: asOneOf(data.meeting_type, MEETING_TYPES, 'video'),
            status: asOneOf(data.status, MEETING_STATUSES, 'scheduled')
          };
        }
        return meeting;
      }));
    } catch (err: any) {
      setError(err.message || 'Failed to update meeting');
      throw err;
    }
  };

  const deleteMeeting = async (id: string) => {
    try {
      await meetingService.deleteMeeting(id);
      setMeetings(prev => prev.filter(meeting => meeting.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete meeting');
      throw err;
    }
  };

  const getUpcomingMeetings = () => {
    const now = new Date();
    return meetings
      .filter(m => m.scheduledTime > now && m.status === 'scheduled')
      .sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());
  };

  return {
    meetings,
    loading,
    error,
    createMeeting,
    updateMeeting,
    deleteMeeting,
    getUpcomingMeetings,
    refreshMeetings: loadMeetings
  };
};
