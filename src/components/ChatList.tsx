import React, { useState } from 'react';
import { MessageCircle, Users, Plus, Search, MoreVertical, User as UserIcon } from 'lucide-react';
import type { StudyGroup, ChatMessage, User, Friend } from '../types';

interface ChatListProps {
  groups: StudyGroup[];
  onSelectGroup: (groupId: string) => void;
  onCreateGroup: () => void;
  currentUser: User;
  friends: Friend[];
}

export const ChatList: React.FC<ChatListProps> = ({ 
  groups, 
  onSelectGroup, 
  onCreateGroup,
  currentUser,
  friends
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'groups' | 'individual'>('all');

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.subject?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  /*
   * Every study group is a group, whatever its size.
   *
   * This used to split on member count — `> 2` was a group, `=== 2` was a
   * direct message. A group you have not invited anyone to yet has ONE member,
   * so it matched neither test and disappeared from both tabs: the list showed
   * "All (4)" alongside "Groups (0)".
   *
   * The count was only ever a proxy for the fabricated direct-chats, which
   * always had exactly two members and never persisted. Those are gone. When
   * direct messages are built for real they need their own flag on the row,
   * not a guess based on how many people are in the conversation — a two-person
   * study group is a perfectly ordinary group.
   */
  const groupChats = filteredGroups;
  const individualChats: StudyGroup[] = [];

  // Get the appropriate list based on active category
  const getDisplayGroups = () => {
    switch (activeCategory) {
      case 'groups':
        return groupChats;
      case 'individual':
        return individualChats;
      default:
        return filteredGroups;
    }
  };

  const displayGroups = getDisplayGroups();
  const sortedGroups = displayGroups.sort((a, b) => 
    new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
  );

  const formatTime = (date: Date) => {
    const now = new Date();
    const messageDate = new Date(date);
    const diffInHours = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return messageDate.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    } else if (diffInHours < 168) { // Less than a week
      return messageDate.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return messageDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const truncateMessage = (message: string, maxLength: number = 50) => {
    return message.length > maxLength ? message.substring(0, maxLength) + '...' : message;
  };

  const getGroupAvatar = (group: StudyGroup) => {
    if (group.avatar) return group.avatar;
    return group.name.charAt(0).toUpperCase();
  };

  // Direct messages are not implemented, so nothing is an individual chat yet.
  // Kept as a single place to change when they are built.
  const isIndividualChat = (_group: StudyGroup) => false;

  const getIndividualChatName = (group: StudyGroup) => {
    if (!isIndividualChat(group)) return group.name;
    
    // Find the other member (not current user)
    const otherMemberId = group.members.find(id => id !== currentUser.id);
    if (!otherMemberId) return group.name;
    
    // Look up the friend's name
    const friend = friends.find(f => f.id === otherMemberId);
    return friend ? friend.name : group.name;
  };
  const getMessagePreview = (group: StudyGroup) => {
    if (!group.lastMessage) return 'No messages yet';
    
    const isCurrentUser = group.lastMessage.userId === currentUser.id;
    const prefix = isCurrentUser ? 'You: ' : `${group.lastMessage.userName}: `;
    
    if (group.lastMessage.type === 'note') {
      return `${prefix}📝 ${truncateMessage(group.lastMessage.message)}`;
    } else if (group.lastMessage.type === 'resource') {
      return `${prefix}📎 ${truncateMessage(group.lastMessage.message)}`;
    }
    
    return `${prefix}${truncateMessage(group.lastMessage.message)}`;
  };

  const getCategoryCount = (category: 'all' | 'groups' | 'individual') => {
    switch (category) {
      case 'groups':
        return groupChats.length;
      case 'individual':
        return individualChats.length;
      default:
        return filteredGroups.length;
    }
  };
  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden h-full max-h-[600px]">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <MessageCircle className="text-white" size={24} />
            <h3 className="text-xl font-bold text-white">Chats</h3>
          </div>
          <button
            onClick={onCreateGroup}
            className="p-2 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 transition-all"
          >
            <Plus size={20} />
          </button>
        </div>
        
        {/* Category Tabs */}
        <div className="flex space-x-1 bg-white bg-opacity-20 rounded-lg p-1 mb-4">
          <button
            onClick={() => setActiveCategory('all')}
            className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-lg transition-all text-sm font-medium ${
              activeCategory === 'all'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-white hover:bg-white hover:bg-opacity-10'
            }`}
          >
            <MessageCircle size={16} />
            <span>All ({getCategoryCount('all')})</span>
          </button>
          <button
            onClick={() => setActiveCategory('groups')}
            className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-lg transition-all text-sm font-medium ${
              activeCategory === 'groups'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-white hover:bg-white hover:bg-opacity-10'
            }`}
          >
            <Users size={16} />
            <span>Groups ({getCategoryCount('groups')})</span>
          </button>
          <button
            onClick={() => setActiveCategory('individual')}
            className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-lg transition-all text-sm font-medium ${
              activeCategory === 'individual'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-white hover:bg-white hover:bg-opacity-10'
            }`}
          >
            <UserIcon size={16} />
            <span>Direct ({getCategoryCount('individual')})</span>
          </button>
        </div>
        
        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder={`Search ${activeCategory === 'all' ? 'all chats' : activeCategory === 'groups' ? 'group chats' : 'direct messages'}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white bg-opacity-20 text-white placeholder-gray-300 rounded-lg focus:bg-opacity-30 focus:outline-none transition-all"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="overflow-y-auto flex-1">
        {sortedGroups.length === 0 ? (
          <div className="text-center py-12 px-4">
            {searchQuery ? (
              <>
                <Search size={48} className="mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600">
                  No {activeCategory === 'all' ? 'chats' : activeCategory === 'groups' ? 'group chats' : 'direct messages'} found matching "{searchQuery}"
                </p>
              </>
            ) : (
              <>
                {activeCategory === 'groups' ? (
                  <>
                    <Users size={48} className="mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600 mb-2">No group chats yet</p>
                    <p className="text-sm text-gray-500">Create a group to start chatting with multiple study buddies!</p>
                  </>
                ) : activeCategory === 'individual' ? (
                  <>
                    <UserIcon size={48} className="mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600 mb-2">No direct messages yet</p>
                    <p className="text-sm text-gray-500">Start a one-on-one conversation with a friend!</p>
                  </>
                ) : (
                  <>
                    <MessageCircle size={48} className="mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600 mb-2">No chats yet</p>
                    <p className="text-sm text-gray-500">Create a group or start a direct message to begin chatting!</p>
                  </>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {sortedGroups.map(group => (
              <div
                key={group.id}
                onClick={() => onSelectGroup(group.id)}
                className="flex items-center p-4 hover:bg-gray-50 cursor-pointer transition-colors active:bg-gray-100"
              >
                {/* Group Avatar */}
                <div className="flex-shrink-0 mr-3">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    isIndividualChat(group)
                      ? 'bg-gradient-to-r from-green-400 to-blue-500'
                      : 'bg-gradient-to-r from-blue-400 to-purple-500'
                  }`}>
                    <span className="text-white font-bold text-lg">
                      {isIndividualChat(group) ? (
                        <UserIcon size={20} />
                      ) : (
                        getGroupAvatar(group)
                      )}
                    </span>
                  </div>
                </div>

                {/* Chat Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-base font-semibold text-gray-900 truncate">
                      {isIndividualChat(group) ? getIndividualChatName(group) : group.name}
                    </h4>
                    <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                      {formatTime(group.lastActivity)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600 truncate">
                      {getMessagePreview(group)}
                    </p>
                    
                    {/* Member count */}
                    <div className="flex items-center text-xs text-gray-400 flex-shrink-0 ml-2">
                      {isIndividualChat(group) ? (
                        <>
                          <UserIcon size={12} />
                          <span>Direct</span>
                        </>
                      ) : (
                        <>
                          <Users size={12} />
                          <span>{group.members.length}</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Subject tag */}
                  {group.subject && !isIndividualChat(group) && (
                    <div className="mt-1">
                      <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                        {group.subject}
                      </span>
                    </div>
                  )}
                </div>

                {/* More options */}
                <div className="flex-shrink-0 ml-2">
                  <button className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors">
                    <MoreVertical size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};