import React from 'react';
import { UserPlus, Check, X } from 'lucide-react';
import { Avatar } from './Avatar';

interface FriendRequest {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  createdAt: Date;
}

interface FriendRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  requests: FriendRequest[];
  onAccept: (requestId: string) => void;
  onReject: (requestId: string) => void;
}

export const FriendRequestsModal: React.FC<FriendRequestsModalProps> = ({
  isOpen,
  onClose,
  requests,
  onAccept,
  onReject
}) => {
  if (!isOpen) return null;

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <UserPlus className="text-blue-600" size={24} />
              <h2 className="text-2xl font-bold text-gray-800">Friend Requests</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-50 rounded-lg transition-colors"
            >
              <X size={24} className="text-gray-600" />
            </button>
          </div>
          {requests.length > 0 && (
            <p className="text-sm text-gray-600 mt-2">
              You have {requests.length} pending request{requests.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        <div className="overflow-y-auto max-h-[calc(80vh-120px)]">
          {requests.length === 0 ? (
            <div className="p-12 text-center">
              <UserPlus size={64} className="mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 text-lg font-medium">No pending friend requests</p>
              <p className="text-gray-400 text-sm mt-2">
                When someone sends you a friend request, it will appear here
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Avatar
                        name={request.senderName}
                        src={request.senderAvatar}
                        className="w-12 h-12"
                        textClassName="text-lg"
                        gradient="from-blue-500 to-purple-500"
                      />
                      <div>
                        <p className="font-semibold text-gray-800 text-lg">
                          {request.senderName}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatTime(request.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => onAccept(request.id)}
                        className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        title="Accept"
                      >
                        <Check size={18} />
                        <span className="font-medium">Accept</span>
                      </button>
                      <button
                        onClick={() => onReject(request.id)}
                        className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        title="Reject"
                      >
                        <X size={18} />
                        <span className="font-medium">Reject</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
