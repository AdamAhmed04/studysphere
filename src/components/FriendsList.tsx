import React, { useState } from 'react';
import { Users, UserPlus, MessageCircle, UserCheck, Search, X } from 'lucide-react';
import { Friend } from '../types';

interface FriendsListProps {
  friends: Friend[];
  onAddFriend: (email: string) => void;
  onStartChat: (friendId: string) => void;
}

export const FriendsList: React.FC<FriendsListProps> = ({ friends, onAddFriend, onStartChat }) => {
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [friendEmail, setFriendEmail] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleAddFriend = (e: React.FormEvent) => {
    e.preventDefault();
    if (friendEmail.trim()) {
      onAddFriend(friendEmail.trim());
      setFriendEmail('');
      setShowAddFriend(false);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    
    // Simulate API search with mock results
    setTimeout(() => {
      const mockResults = [
        {
          id: `search-${Date.now()}-1`,
          name: `${query} Smith`,
          email: `${query.toLowerCase()}@example.com`,
          totalStudyTime: Math.floor(Math.random() * 500),
          isOnline: Math.random() > 0.5,
          isPublic: true,
        },
        {
          id: `search-${Date.now()}-2`,
          name: `${query} Johnson`,
          email: `${query.toLowerCase()}.j@example.com`,
          totalStudyTime: Math.floor(Math.random() * 500),
          isOnline: Math.random() > 0.5,
          isPublic: true,
        },
        {
          id: `search-${Date.now()}-3`,
          name: `Study${query}`,
          email: `study${query.toLowerCase()}@example.com`,
          totalStudyTime: Math.floor(Math.random() * 500),
          isOnline: Math.random() > 0.5,
          isPublic: Math.random() > 0.3,
        },
      ].filter(user => 
        user.name.toLowerCase().includes(query.toLowerCase()) ||
        user.email.toLowerCase().includes(query.toLowerCase())
      );
      
      setSearchResults(mockResults);
      setIsSearching(false);
    }, 800);
  };

  const handleAddFromSearch = (userEmail: string) => {
    onAddFriend(userEmail);
    setSearchQuery('');
    setSearchResults([]);
    setShowAddFriend(false);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setIsSearching(false);
  };
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    return hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
  };

  return (
    <div className="theme-secondary-bg rounded-2xl shadow-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-gray-800 flex items-center">
          <Users className="mr-3 text-blue-500" size={28} />
          Study Buddies
        </h3>
        <button
          onClick={() => setShowAddFriend(!showAddFriend)}
          className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors btn-primary"
        >
          <UserPlus size={16} />
          <span>Add Friend</span>
        </button>
      </div>

      {showAddFriend && (
        <div className="mb-6 p-4 bg-gray-50 rounded-xl">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search for Friends
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
          </div>

          {/* Search Results */}
          {isSearching && (
            <div className="mb-4 p-4 bg-white rounded-lg border border-gray-200">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Searching...</span>
              </div>
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="mb-4 max-h-64 overflow-y-auto">
              <div className="text-sm font-medium text-gray-700 mb-2">Search Results</div>
              <div className="space-y-2">
                {searchResults.map(user => (
                  <div key={user.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-400 to-blue-500 flex items-center justify-center">
                        <span className="text-white font-bold text-sm">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 flex items-center">
                          {user.name}
                          {!user.isPublic && (
                            <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                              Private
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        <p className="text-xs text-gray-500">
                          Study time: {formatTime(user.totalStudyTime)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAddFromSearch(user.email)}
                      disabled={!user.isPublic}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                        user.isPublic
                          ? 'btn-primary'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {user.isPublic ? 'Add' : 'Private'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {searchQuery && !isSearching && searchResults.length === 0 && (
            <div className="mb-4 p-4 bg-white rounded-lg border border-gray-200 text-center text-gray-500">
              No users found matching "{searchQuery}"
            </div>
          )}

          <div className="border-t border-gray-200 pt-4">
            <form onSubmit={handleAddFriend}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Or add by email directly
              </label>
              <div className="flex space-x-3">
                <input
                  type="email"
                  placeholder="Friend's email address"
                  value={friendEmail}
                  onChange={(e) => setFriendEmail(e.target.value)}
                  className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent theme-textbox"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg transition-colors btn-primary"
                >
                  <UserCheck size={16} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {friends.map(friend => (
          <div key={friend.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-400 to-blue-500 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">
                    {friend.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                  friend.isOnline ? 'bg-green-400' : 'bg-gray-300'
                }`}></div>
              </div>
              
              <div>
                <p className="font-semibold text-gray-800">{friend.name}</p>
                <p className="text-sm text-gray-600">
                  Study time: {formatTime(friend.totalStudyTime)}
                </p>
              </div>
            </div>

            <button
              onClick={() => onStartChat(friend.id)}
              className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <MessageCircle size={20} />
            </button>
          </div>
        ))}
      </div>

      {friends.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Users size={48} className="mx-auto mb-4 opacity-50" />
          <p>No study buddies yet. Add some friends to get started!</p>
        </div>
      )}
    </div>
  );
};