import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, Video, Calendar, Users, ArrowLeft } from 'lucide-react';
import { ChatMessage } from '../types';
import { Avatar } from './Avatar';

interface GroupChatProps {
  groupName?: string;
  groupSubject?: string;
  memberCount?: number;
  messages: ChatMessage[];
  onSendMessage: (message: string, type: 'text' | 'note' | 'resource') => void;
  onScheduleMeeting: () => void;
  onStartVideoCall: () => void;
  onBackToList: () => void;
}

export const GroupChat: React.FC<GroupChatProps> = ({ 
  groupName = "Study Group Chat",
  groupSubject,
  memberCount = 1,
  messages, 
  onSendMessage, 
  onScheduleMeeting, 
  onStartVideoCall,
  onBackToList
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [messageType, setMessageType] = useState<'text' | 'note' | 'resource'>('text');

  const scrollRef = useRef<HTMLDivElement>(null);
  // Whether the view is currently following the newest message. Set false as
  // soon as the reader scrolls up, so arriving messages don't yank them away
  // from older ones they are reading, and true again when they return.
  const pinnedToBottom = useRef(true);

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    // A small tolerance keeps this true through sub-pixel rounding and the
    // brief moment while a new message is being laid out.
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    pinnedToBottom.current = distanceFromBottom < 40;
  };

  // Jump to the newest message when messages arrive, and whenever the chat
  // itself changes — opening a conversation should show its latest, not its
  // oldest, message.
  useEffect(() => {
    if (pinnedToBottom.current) scrollToBottom();
  }, [messages]);

  useEffect(() => {
    pinnedToBottom.current = true;
    scrollToBottom();
  }, [groupName]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      onSendMessage(newMessage.trim(), messageType);
      setNewMessage('');
      // Sending is an explicit intent to be at the bottom, even if the reader
      // had scrolled up before typing.
      pinnedToBottom.current = true;
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getMessageStyle = (type: string) => {
    switch (type) {
      case 'note': return 'bg-sand/15 border-l-4 border-sand';
      case 'resource': return 'bg-emerald-500/15 border-l-4 border-emerald-400';
      default: return 'bg-surface';
    }
  };

  return (
    <div className="bg-surface rounded-2xl shadow-xl overflow-hidden">
      <div className="bg-surface-high p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={onBackToList}
              className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-all"
            >
              <ArrowLeft size={20} />
            </button>
            <Users className="text-white" size={24} />
            <div>
              <h3 className="text-xl font-bold text-white">{groupName}</h3>
              <p className="text-blue-100 text-sm">
                {groupSubject ? `${groupSubject} • ${memberCount} members` : `${memberCount} members • Share notes and resources`}
              </p>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={onStartVideoCall}
              className="p-2 bg-surface bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 transition-all"
            >
              <Video size={20} />
            </button>
            <button
              onClick={onScheduleMeeting}
              className="p-2 bg-surface bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 transition-all"
            >
              <Calendar size={20} />
            </button>
          </div>
        </div>
      </div>

      <div ref={scrollRef} onScroll={handleScroll} className="h-96 overflow-y-auto p-4 space-y-4">
        {messages.map(message => (
          <div key={message.id} className={`p-3 rounded-lg ${getMessageStyle(message.type)}`}>
            <div className="flex items-start space-x-3">
              <Avatar
                name={message.userName}
                src={message.userAvatar}
                className="w-8 h-8 flex-shrink-0"
                textClassName="text-sm"
                gradient="from-blue-400 to-purple-500"
              />
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-semibold text-ink">{message.userName}</span>
                  <span className="text-xs text-muted">{formatTime(message.timestamp)}</span>
                  {message.type !== 'text' && (
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      message.type === 'note' ? 'bg-sand/20 text-sand' : 'bg-emerald-500/20 text-emerald-300'
                    }`}>
                      {message.type}
                    </span>
                  )}
                </div>
                <p className="text-ink/75">{message.message}</p>
              </div>
            </div>
          </div>
        ))}
        
        {messages.length === 0 && (
          <div className="text-center py-8 text-muted">
            <Users size={48} className="mx-auto mb-4 opacity-50" />
            <p>No messages yet. Start the conversation!</p>
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="p-4 border-t border-hairline-soft">
        <div className="flex items-center space-x-3 mb-3">
          <select 
            value={messageType} 
            onChange={(e) => setMessageType(e.target.value as 'text' | 'note' | 'resource')}
            className="px-3 py-1 text-sm border border-hairline rounded-lg focus:ring-2 focus:ring-sand focus:border-transparent"
          >
            <option value="text">Message</option>
            <option value="note">Note</option>
            <option value="resource">Resource</option>
          </select>
        </div>
        
        <div className="flex space-x-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={`Type a ${messageType}...`}
            maxLength={2000}
            className="flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-sand focus:border-transparent theme-textbox"
          />
          <button
            type="button"
            className="p-3 text-ink/75 hover:bg-surface-high rounded-lg transition-colors"
          >
            <Paperclip size={20} />
          </button>
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="px-6 py-3 rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors btn-primary"
          >
            <Send size={20} />
          </button>
        </div>
      </form>
    </div>
  );
};