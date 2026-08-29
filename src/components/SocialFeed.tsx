import React from 'react';
import { MessageCircle, Users, User, Clock } from 'lucide-react';
import type { StudyGroup, ChatMessage, User as UserType } from '../types';

interface SocialFeedProps {
  groups: StudyGroup[];
  messages: ChatMessage[];
  currentUser: UserType;
  onOpenChat: (groupId: string) => void;
}

export const SocialFeed: React.FC<SocialFeedProps> = ({
  groups,
  messages,
  currentUser,
  onOpenChat
}) => {
  // Get recent messages from all groups, sorted by timestamp
  const recentMessages = messages
    .filter(msg => msg.groupId) // Only messages that belong to a group
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 4); // Show last 4 messages for compact display

  const formatTime = (date: Date) => {
    const now = new Date();
    const messageDate = new Date(date);
    const diffInMinutes = (now.getTime() - messageDate.getTime()) / (1000 * 60);
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${Math.floor(diffInMinutes)}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return messageDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const truncateMessage = (message: string, maxLength: number = 60) => {
    return message.length > maxLength ? message.substring(0, maxLength) + '...' : message;
  };

  const getGroupInfo = (groupId: string) => {
    return groups.find(g => g.id === groupId);
  };

  const isIndividualChat = (group: StudyGroup) => {
    return group.members.length === 2;
  };

  const getMessageTypeIcon = (type: string) => {
    switch (type) {
      case 'note': return '📝';
      case 'resource': return '📎';
      default: return '';
    }
  };

  if (recentMessages.length === 0) {
    return (
      <div className="theme-secondary-bg rounded-2xl shadow-xl p-6">
        <div className="flex items-center space-x-3 mb-4">
          <MessageCircle className="text-blue-500" size={24} />
          <h3 className="text-xl font-bold text-gray-800">Social</h3>
        </div>
        <div className="text-center py-8 text-gray-500">
          <MessageCircle size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-gray-600 mb-2">No recent messages</p>
          <p className="text-sm text-gray-500">Start chatting with your study buddies!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="theme-secondary-bg rounded-2xl shadow-xl p-4 md:p-6 h-fit">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div className="flex items-center space-x-2 md:space-x-3">
          <MessageCircle className="text-blue-500" size={18} />
          <h3 className="text-base md:text-lg font-bold text-gray-800">Social</h3>
        </div>
        {recentMessages.length > 0 && (
          <span className="text-xs text-gray-500">{recentMessages.length} recent</span>
        )}
      </div>

      <div className="space-y-2 md:space-y-3">
        {recentMessages.map(message => {
          const group = getGroupInfo(message.groupId!);
          if (!group) return null;

          const isCurrentUser = message.userId === currentUser.id;
          const isIndividual = isIndividualChat(group);

          return (
            <div
              key={message.id}
              onClick={() => onOpenChat(message.groupId!)}
              className="flex items-start space-x-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors group"
            >
              {/* Chat Avatar */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                isIndividual
                  ? 'bg-gradient-to-r from-green-400 to-blue-500'
                  : 'bg-gradient-to-r from-blue-400 to-purple-500'
              }`}>
                {isIndividual ? (
                  <User className="text-white" size={16} />
                ) : (
                  <span className="text-white font-bold text-sm">
                    {group.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Message Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="text-sm font-semibold text-gray-800 truncate">
                      {group.name}
                    </h4>
                    {group.subject && !isIndividual && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                        {group.subject}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-1 text-xs text-gray-500">
                    <Clock size={12} />
                    <span>{formatTime(message.timestamp)}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};