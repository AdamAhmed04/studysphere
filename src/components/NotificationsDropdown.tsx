import React, { useState } from 'react';
import { Bell, Check, X, UserPlus, Calendar, Star, Users } from 'lucide-react';
import { Notification } from '../services/notificationService';

interface NotificationsDropdownProps {
  notifications: Notification[];
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDelete: (id: string) => void;
  onActionClick?: (notification: Notification) => void;
}

export const NotificationsDropdown: React.FC<NotificationsDropdownProps> = ({
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onActionClick
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'friend_request':
        return <UserPlus size={20} className="text-sand" />;
      case 'meeting_reminder':
      case 'meeting_invite':
        return <Calendar size={20} className="text-emerald-300" />;
      case 'cheer':
        return <Star size={20} className="text-yellow-600" />;
      case 'group_invite':
        return <Users size={20} className="text-sand" />;
      case 'study_callout':
        return <Bell size={20} className="text-orange-600" />;
      default:
        return <Bell size={20} className="text-ink/75" />;
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;

    return date.toLocaleDateString();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-surface-high rounded-lg transition-colors"
      >
        <Bell size={24} className="text-ink/75" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-96 modal-panel rounded-lg shadow-xl z-20 max-h-96 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-hairline-soft flex items-center justify-between bg-surface">
              <h3 className="text-lg font-bold text-ink">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={() => {
                    onMarkAllAsRead();
                  }}
                  className="text-sm text-sand hover:text-ink font-medium"
                >
                  Mark all as read
                </button>
              )}
            </div>

            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-muted">
                  <Bell size={48} className="mx-auto mb-3 text-muted" />
                  <p>No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-surface transition-colors ${
                        !notification.is_read ? 'bg-surface' : ''
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-1">
                          {getIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-ink">
                            {notification.title}
                          </p>
                          <p className="text-sm text-ink/75 mt-1">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-muted">
                              {formatTime(notification.created_at)}
                            </span>
                            <div className="flex items-center space-x-2">
                              {!notification.is_read && (
                                <button
                                  onClick={() => onMarkAsRead(notification.id)}
                                  className="text-xs text-sand hover:text-ink"
                                  title="Mark as read"
                                >
                                  <Check size={16} />
                                </button>
                              )}
                              <button
                                onClick={() => onDelete(notification.id)}
                                className="text-xs text-red-300 hover:text-red-300"
                                title="Delete"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          </div>
                          {onActionClick && Boolean(notification.action_data) && (
                            <button
                              onClick={() => {
                                onActionClick(notification);
                                setIsOpen(false);
                              }}
                              className="mt-2 text-xs text-sand hover:text-ink font-medium"
                            >
                              View details
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
