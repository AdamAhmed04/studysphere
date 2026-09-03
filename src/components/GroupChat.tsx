import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, Video, Calendar, Users, ArrowLeft, X, Loader2 } from 'lucide-react';
import { ChatMessage } from '../types';
import { AuroraGround } from './AuroraGround';
import { ChatAttachment } from './ChatAttachment';
import { MAX_ATTACHMENT_BYTES } from '../services/groupService';
import { useToast } from '../contexts/ToastContext';
import { Avatar } from './Avatar';

interface GroupChatProps {
  groupName?: string;
  groupSubject?: string;
  memberCount?: number;
  messages: ChatMessage[];
  onSendMessage: (
    message: string,
    type: 'text' | 'note' | 'resource',
    files?: File[],
  ) => void | Promise<void>;
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
  const [pending, setPending] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

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

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;

    const text = newMessage.trim();
    // A file on its own is a message; empty text with no file is not.
    if (!text && pending.length === 0) return;

    setSending(true);

    try {
      await onSendMessage(text, messageType, pending);
      setNewMessage('');
      setPending([]);
      // Sending is an explicit intent to be at the bottom, even if the reader
      // had scrolled up before typing.
      pinnedToBottom.current = true;
    } finally {
      setSending(false);
    }
  };

  const handleFilesChosen = (event: React.ChangeEvent<HTMLInputElement>) => {
    const chosen = Array.from(event.target.files ?? []);
    // Reset immediately, or picking the same file twice in a row is ignored.
    event.target.value = '';

    const tooBig = chosen.filter(f => f.size > MAX_ATTACHMENT_BYTES);
    if (tooBig.length) {
      toast.error(
        tooBig.length === 1
          ? `${tooBig[0].name} is larger than 50MB.`
          : `${tooBig.length} files are larger than 50MB.`
      );
    }

    const accepted = chosen.filter(f => f.size <= MAX_ATTACHMENT_BYTES);
    if (accepted.length) setPending(current => [...current, ...accepted]);
  };

  const removePending = (index: number) =>
    setPending(current => current.filter((_, i) => i !== index));

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
    <div className="fixed inset-0 z-40 flex flex-col">
      <AuroraGround />

      {/* safe-area-top on the bar itself, so its background runs under the
          camera while the controls sit below it. */}
      <header className="shrink-0 safe-area-top bg-surface-high border-b border-hairline-soft">
        <div className="flex items-center justify-between gap-3 p-3 md:p-4">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <button
              onClick={onBackToList}
              className="shrink-0 p-2 -ml-1 rounded-lg text-ink hover:bg-surface-high transition-colors"
              aria-label="Back to conversations"
            >
              <ArrowLeft size={20} />
            </button>
            <Users className="shrink-0 text-muted" size={22} />
            {/* min-w-0 and truncate, or a long group name pushes the call and
                calendar buttons off the right edge on a phone. */}
            <div className="min-w-0">
              <h3 className="text-lg md:text-xl font-semibold text-ink truncate">{groupName}</h3>
              <p className="text-xs md:text-sm text-muted truncate">
                {groupSubject ? `${groupSubject} • ${memberCount} members` : `${memberCount} members • Share notes and resources`}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 gap-1 md:gap-2">
            <button
              onClick={onStartVideoCall}
              className="p-2 rounded-lg text-ink/75 hover:bg-surface-high transition-colors"
              aria-label="Start a video call"
            >
              <Video size={20} />
            </button>
            <button
              onClick={onScheduleMeeting}
              className="p-2 rounded-lg text-ink/75 hover:bg-surface-high transition-colors"
              aria-label="Schedule a meeting"
            >
              <Calendar size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* min-h-0 is what lets this shrink inside the flex column; without it
          the messages push the composer off the bottom of the screen. */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
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
                {message.message && <p className="text-ink/75">{message.message}</p>}

                {message.attachments?.map(path => (
                  <ChatAttachment key={path} path={path} />
                ))}
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

      <form
        onSubmit={handleSend}
        className="shrink-0 border-t border-hairline-soft bg-surface p-3 md:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        {pending.length > 0 && (
          <ul className="flex flex-wrap gap-2 mb-3">
            {pending.map((file, index) => (
              <li
                key={file.name + index}
                className="flex items-center gap-2 max-w-full pl-3 pr-2 py-1.5 rounded-pill bg-surface-high border border-hairline-soft"
              >
                <span className="text-xs text-ink truncate max-w-[10rem]">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removePending(index)}
                  className="shrink-0 text-muted hover:text-ink transition-colors"
                  aria-label={`Remove ${file.name}`}
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}

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
            className="flex-1 min-w-0 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-sand focus:border-transparent theme-textbox"
          />
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.txt,.csv,.md,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
            className="sr-only"
            onChange={handleFilesChosen}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending}
            className="shrink-0 p-3 text-ink/75 hover:bg-surface-high rounded-lg transition-colors disabled:opacity-50"
            aria-label="Attach a file"
          >
            <Paperclip size={20} />
          </button>
          <button
            type="submit"
            disabled={sending || (!newMessage.trim() && pending.length === 0)}
            className="shrink-0 px-5 md:px-6 py-3 rounded-lg disabled:cursor-not-allowed transition-colors btn-primary"
            aria-label="Send"
          >
            {sending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
          </button>
        </div>
      </form>
    </div>
  );
};