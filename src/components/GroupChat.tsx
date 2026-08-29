import React, { useState } from 'react';
import { Send, Paperclip, Video, Calendar, Users, ArrowLeft } from 'lucide-react';
import { ChatMessage } from '../types';

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

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      onSendMessage(newMessage.trim(), messageType);
      setNewMessage('');
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
      case 'note': return 'bg-yellow-100 border-l-4 border-yellow-500';
      case 'resource': return 'bg-green-100 border-l-4 border-green-500';
      default: return 'bg-white';
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4">
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
              className="p-2 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 transition-all"
            >
              <Video size={20} />
            </button>
            <button
              onClick={onScheduleMeeting}
              className="p-2 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 transition-all"
            >
              <Calendar size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="h-96 overflow-y-auto p-4 space-y-4">
        {messages.map(message => (
          <div key={message.id} className={`p-3 rounded-lg ${getMessageStyle(message.type)}`}>
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">
                  {message.userName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-semibold text-gray-800">{message.userName}</span>
                  <span className="text-xs text-gray-500">{formatTime(message.timestamp)}</span>
                  {message.type !== 'text' && (
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      message.type === 'note' ? 'bg-yellow-200 text-yellow-800' : 'bg-green-200 text-green-800'
                    }`}>
                      {message.type}
                    </span>
                  )}
                </div>
                <p className="text-gray-700">{message.message}</p>
              </div>
            </div>
          </div>
        ))}
        
        {messages.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Users size={48} className="mx-auto mb-4 opacity-50" />
            <p>No messages yet. Start the conversation!</p>
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-3 mb-3">
          <select 
            value={messageType} 
            onChange={(e) => setMessageType(e.target.value as 'text' | 'note' | 'resource')}
            className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            className="flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent theme-textbox"
          />
          <button
            type="button"
            className="p-3 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
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