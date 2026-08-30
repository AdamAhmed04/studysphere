import React from 'react';
import { MessageCircle, User, Clock, ChevronRight } from 'lucide-react';
import type { StudyGroup, ChatMessage, User as UserType, Friend } from '../types';

interface SocialMessagesBoxProps {
  groups: StudyGroup[];
  messages: ChatMessage[];
  currentUser: UserType;
  friends: Friend[];
  onOpenChat: (groupId: string) => void;
}

export const SocialMessagesBox: React.FC<SocialMessagesBoxProps> = ({
  groups,
  messages,
  currentUser,
  friends,
  onOpenChat
}) => {
  // Get recent messages from all groups, sorted by timestamp
  const recentMessages = messages
    .filter(msg => msg.groupId && msg.userId !== currentUser.id) // Only messages from others
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 4); // Show last 4 messages

  const formatTime = (date: Date) => {
    const now = new Date();
    const messageDate = new Date(date);
    const diffInMinutes = (now.getTime() - messageDate.getTime()) / (1000 * 60);
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${Math.floor(diffInMinutes)}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return messageDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const truncateMessage = (message: string, maxLength: number = 45) => {
    return message.length > maxLength ? message.substring(0, maxLength) + '...' : message;
  };

  const getGroupInfo = (groupId: string) => {
    return groups.find(g => g.id === groupId);
  };

  const isIndividualChat = (group: StudyGroup) => {
    return group.members.length === 2;
  };

  const getIndividualChatName = (group: StudyGroup) => {
    if (!isIndividualChat(group)) return group.name;
    
    // Find the other member (not current user)
    const otherMemberId = group.members.find(id => id !== currentUser.id);
    if (!otherMemberId) return group.name;
    
    // Look up the friend's name
    const friend = friends.find(f => f.id === otherMemberId);
    return friend ? friend.name : group.name;
  };

  const getMessageTypeIcon = (type: string) => {
    switch (type) {
      case 'note': return '📝';
      case 'resource': return '📎';
      default: return '';
    }
  };

  return (
    <div className="theme-secondary-bg rounded-2xl shadow-xl p-6 h-fit">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <MessageCircle className="text-blue-500" size={20} />
          <h3 className="text-lg font-bold text-gray-800">Social</h3>
        </div>
        {recentMessages.length > 0 && (
          <span className="text-xs text-gray-500">{recentMessages.length} recent</span>
        )}
      </div>

      {recentMessages.length === 0 ? (
        <div className="text-center py-6 text-gray-500">
          <MessageCircle size={32} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm text-gray-600">No recent messages</p>
          <p className="text-xs text-gray-500 mt-1">Messages from friends will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {recentMessages.map(message => {
            const group = getGroupInfo(message.groupId!);
            if (!group) return null;

            const isIndividual = isIndividualChat(group);
            const displayName = isIndividual ? getIndividualChatName(group) : group.name;

            return (
              <div
                key={message.id}
                onClick={() => onOpenChat(message.groupId!)}
                className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors group border border-transparent hover:border-blue-200"
              >
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isIndividual
                    ? 'bg-gradient-to-r from-green-400 to-blue-500'
                    : 'bg-gradient-to-r from-blue-400 to-purple-500'
                }`}>
                  {isIndividual ? (
                    <User className="text-white" size={12} />
                  ) : (
                    <span className="text-white font-bold text-xs">
                      {group.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Message Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-semibold text-gray-800 truncate">
                      {displayName}
                    </h4>
                    <div className="flex items-center space-x-1 text-xs text-gray-500">
                      <Clock size={10} />
                      <span>{formatTime(message.timestamp)}</span>
                    </div>
                  </div>
                  
                  <p className="text-xs text-gray-600 mb-1">
                    <span className="font-medium text-gray-700">
                      {message.userName}:
                    </span>
                  </p>
                  
                  <p className="text-sm text-gray-800 leading-relaxed">
                    {getMessageTypeIcon(message.type)}
                    {truncateMessage(message.message)}
                  </p>
                  
                  {/* Subject tag for groups */}
                  {group.subject && !isIndividual && (
                    <div className="mt-1">
                      <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                        {group.subject}
                      </span>
                    </div>
                  )}
                </div>

                {/* Arrow indicator */}
                <ChevronRight size={14} className="text-gray-400 group-hover:text-blue-500 transition-colors flex-shrink-0 mt-1" />
              </div>
            );
          })}
        </div>
      )}

      {/* View All Messages Link */}
      {recentMessages.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <button
            onClick={() => onOpenChat('')}
            className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            View All Messages
          </button>
        </div>
      )}
    </div>
  );
};