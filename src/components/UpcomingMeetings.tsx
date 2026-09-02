import React from 'react';
import { Calendar, Clock, Users, Video, MapPin, Phone, Play, MessageCircle } from 'lucide-react';
import { Meeting, StudyGroup } from '../types';

interface UpcomingMeetingsProps {
  meetings: Meeting[];
  groups: StudyGroup[];
  onJoinMeeting: (meetingId: string) => void;
  onOpenChat: (groupId: string) => void;
}

export const UpcomingMeetings: React.FC<UpcomingMeetingsProps> = ({
  meetings,
  groups,
  onJoinMeeting,
  onOpenChat
}) => {
  const upcomingMeetings = meetings
    .filter(meeting => new Date(meeting.scheduledTime) > new Date() && meeting.status === 'scheduled')
    .sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime())
    .slice(0, 5);

  const formatDateTime = (date: Date) => {
    const now = new Date();
    const meetingDate = new Date(date);
    const diffInHours = (meetingDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return {
        date: 'Today',
        time: meetingDate.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        })
      };
    } else if (diffInHours < 48) {
      return {
        date: 'Tomorrow',
        time: meetingDate.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        })
      };
    } else {
      return {
        date: meetingDate.toLocaleDateString('en-US', { 
          weekday: 'short',
          month: 'short', 
          day: 'numeric' 
        }),
        time: meetingDate.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        })
      };
    }
  };

  const getMeetingTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video size={16} className="text-sand" />;
      case 'phone': return <Phone size={16} className="text-green-500" />;
      case 'in-person': return <MapPin size={16} className="text-sand" />;
      default: return <Video size={16} className="text-sand" />;
    }
  };

  const getGroupName = (groupId?: string) => {
    if (!groupId) return null;
    const group = groups.find(g => g.id === groupId);
    return group?.name;
  };

  const isStartingSoon = (scheduledTime: Date) => {
    const now = new Date();
    const diffInMinutes = (new Date(scheduledTime).getTime() - now.getTime()) / (1000 * 60);
    return diffInMinutes <= 15 && diffInMinutes > 0;
  };

  if (upcomingMeetings.length === 0) {
    return (
      <div className="theme-secondary-bg rounded-2xl shadow-xl p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Calendar className="text-sand" size={24} />
          <h3 className="text-xl font-bold text-ink">Upcoming Meetings</h3>
        </div>
        <div className="text-center py-8 text-muted">
          <Calendar size={48} className="mx-auto mb-4 opacity-50" />
          <p>No upcoming meetings scheduled</p>
          <p className="text-sm mt-1">Schedule a meeting from any chat group!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="theme-secondary-bg rounded-2xl shadow-xl p-6">
      <div className="flex items-center space-x-3 mb-6">
        <Calendar className="text-sand" size={24} />
        <h3 className="text-xl font-bold text-ink">Upcoming Meetings</h3>
      </div>

      <div className="space-y-4">
        {upcomingMeetings.map(meeting => {
          const { date, time } = formatDateTime(meeting.scheduledTime);
          const groupName = getGroupName(meeting.groupId);
          const startingSoon = isStartingSoon(meeting.scheduledTime);

          return (
            <div
              key={meeting.id}
              className={`p-4 rounded-xl border-2 transition-all hover:shadow-md ${
                startingSoon 
                  ? 'border-orange-300 bg-sand/10' 
                  : 'border-hairline-soft hover:border-sand/40'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h4 className="font-semibold text-ink">{meeting.title}</h4>
                    {startingSoon && (
                      <span className="px-2 py-1 text-xs bg-orange-200 text-sand rounded-full font-medium">
                        Starting Soon
                      </span>
                    )}
                  </div>
                  
                  {groupName && (
                    <p className="text-sm text-sand mb-2 flex items-center">
                      <Users size={14} className="mr-1" />
                      {groupName}
                    </p>
                  )}
                  
                  <div className="flex items-center space-x-4 text-sm text-ink/75 mb-2">
                    <div className="flex items-center space-x-1">
                      <Calendar size={14} />
                      <span>{date}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock size={14} />
                      <span>{time}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      {getMeetingTypeIcon(meeting.meetingType)}
                      <span className="capitalize">{meeting.meetingType}</span>
                    </div>
                  </div>

                  {meeting.location && (
                    <div className="flex items-center space-x-1 text-sm text-ink/75 mb-2">
                      <MapPin size={14} />
                      <span>{meeting.location}</span>
                    </div>
                  )}

                  {meeting.description && (
                    <p className="text-sm text-ink/75 mb-3 line-clamp-2">
                      {meeting.description}
                    </p>
                  )}

                  <div className="flex items-center space-x-2 text-xs text-muted">
                    <span>{meeting.duration} minutes</span>
                    <span>•</span>
                    <span>{meeting.participants.length} participants</span>
                    {(meeting.invitees?.length > 0 || meeting.inviteeEmails?.length > 0) && (
                      <>
                        <span>•</span>
                        <span>{(meeting.invitees?.length || 0) + (meeting.inviteeEmails?.length || 0)} invited</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex flex-col space-y-2 ml-4 min-w-[100px]">
                  <button
                    onClick={() => onJoinMeeting(meeting.id)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      startingSoon
                        ? 'bg-orange-600 text-white hover:bg-orange-700 shadow-lg'
                        : 'btn-primary'
                    }`}
                  >
                    <Play size={16} />
                    <span>Join</span>
                  </button>
                  
                  {meeting.groupId && (
                    <button
                      onClick={() => onOpenChat(meeting.groupId!)}
                      className="flex items-center space-x-2 px-4 py-2 border border-hairline text-ink/75 rounded-lg hover:bg-surface text-sm font-medium transition-colors"
                    >
                      <MessageCircle size={16} />
                      <span>Chatroom</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {meetings.filter(m => new Date(m.scheduledTime) > new Date()).length > 5 && (
        <div className="mt-4 text-center">
          <button className="text-sand hover:text-ink text-sm font-medium transition-colors">
            View All Meetings ({meetings.filter(m => new Date(m.scheduledTime) > new Date()).length})
          </button>
        </div>
      )}
    </div>
  );
};