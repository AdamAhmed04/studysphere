import React from 'react';
import { Trophy, Crown, Medal, Target, Star } from 'lucide-react';
import { Friend } from '../types';
import { Avatar } from './Avatar';

interface LeaderboardProps {
  friends: Friend[];
  currentUserId: string;
  onCallOut: (friendId: string) => void;
  onSendStar: (friendId: string) => void;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ friends, currentUserId, onCallOut, onSendStar }) => {
  const sortedFriends = [...friends].sort((a, b) => b.totalStudyTime - a.totalStudyTime);
  
  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return <Crown className="text-yellow-500" size={24} />;
      case 1: return <Trophy className="text-muted" size={24} />;
      case 2: return <Medal className="text-orange-400" size={24} />;
      default: return <Target className="text-muted" size={20} />;
    }
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    return hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
  };

  const lowestStudyTime = Math.min(...friends.map(f => f.totalStudyTime));
  const highestStudyTime = Math.max(...friends.map(f => f.totalStudyTime));

  return (
    <div className="theme-secondary-bg rounded-2xl shadow-xl p-6">
      <h3 className="text-2xl font-bold text-ink mb-6 flex items-center">
        <Trophy className="mr-3 text-yellow-500" size={28} />
        Study Leaderboard
      </h3>

      <div className="space-y-4">
        {sortedFriends.map((friend, index) => (
          <div 
            key={friend.id}
            className={`flex items-center justify-between p-4 rounded-xl transition-all hover:shadow-md ${
              friend.id === currentUserId ? 'bg-surface border-2 border-hairline' : 'bg-surface'
            }`}
          >
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                {getRankIcon(index)}
              </div>
              
              <div className="flex items-center space-x-3">
                <Avatar
                  name={friend.name}
                  src={friend.avatar}
                  className="w-10 h-10"
                  gradient="from-blue-400 to-purple-500"
                />
                <div>
                  <p className="font-semibold text-ink">
                    {friend.name} {friend.id === currentUserId && '(You)'}
                  </p>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-ink/75">
                      {formatTime(friend.totalStudyTime)}
                    </span>
                    <div className={`w-2 h-2 rounded-full ${
                      friend.isOnline ? 'bg-green-400' : 'bg-muted/40'
                    }`}></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-lg font-bold text-ink/75">#{index + 1}</span>
              {friend.totalStudyTime === highestStudyTime && friend.totalStudyTime > 60 && friend.id !== currentUserId && (
                <button
                  onClick={() => onSendStar(friend.id)}
                  className="px-3 py-1 text-xs bg-sand/15 text-yellow-600 rounded-full hover:bg-yellow-200 transition-colors flex items-center space-x-1"
                >
                  <Star size={12} />
                  <span>Send Star</span>
                </button>
              )}
              {friend.totalStudyTime === lowestStudyTime && friend.totalStudyTime < 60 && (
                <button
                  onClick={() => onCallOut(friend.id)}
                  className="px-3 py-1 text-xs bg-red-500/15 text-red-300 rounded-full hover:bg-red-200 transition-colors"
                >
                  Call Out
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {sortedFriends.length === 0 && (
        <div className="text-center py-8 text-muted">
          <Target size={48} className="mx-auto mb-4 opacity-50" />
          <p>Add friends to see the leaderboard!</p>
        </div>
      )}
    </div>
  );
};