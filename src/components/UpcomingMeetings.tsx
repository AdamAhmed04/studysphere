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
      case 'video': return <Video size={16} className="text-blue-500" />;
      case 'phone': return <Phone size={16} className="text-green-500" />;
      case 'in-person': return <MapPin size={16} className="text-purple-500" />;
      default: return <Video size={16} className="text-blue-500" />;
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
          <Calendar className="text-blue-500" size={24} />
          <h3 className="text-xl font-bold text-gray-800">Upcoming Meetings</h3>
        </div>
        <div className="text-center py-8 text-gray-500">
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
        <Calendar className="text-blue-500" size={24} />
        <h3 className="text-xl font-bold text-gray-800">Upcoming Meetings</h3>
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
                  ? 'border-orange-300 bg-orange-50' 
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h4 className="font-semibold text-gray-800">{meeting.title}</h4>
                    {startingSoon && (
                      <span className="px-2 py-1 text-xs bg-orange-200 text-orange-800 rounded-full font-medium">
                        Starting Soon
                      </span>
                    )}
                  </div>
                  
                  {groupName && (
                    <p className="text-sm text-blue-600 mb-2 flex items-center">
                      <Users size={14} className="mr-1" />
                      {groupName}
                    </p>
                  )}
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
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
                    <div className="flex items-center space-x-1 text-sm text-gray-600 mb-2">
                      <MapPin size={14} />
                      <span>{meeting.location}</span>
                    </div>
                  )}

                  {meeting.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {meeting.description}
                    </p>
                  )}

                  <div className="flex items-center space-x-2 text-xs text-gray-500">
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
                      className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
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
          <button className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors">
            View All Meetings ({meetings.filter(m => new Date(m.scheduledTime) > new Date()).length})
          </button>
        </div>
      )}
    </div>
  );
};