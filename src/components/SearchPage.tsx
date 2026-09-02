import React, { useState, useEffect, useCallback } from 'react';
import { Search, UserPlus, Users, BookOpen, Filter, X } from 'lucide-react';
import type { User, Friend } from '../types';
import { searchService, SearchResult } from '../services/searchService';
import { useDebounce } from '../hooks/useDebounce';
import { Avatar } from './Avatar';
import { ProfilePreview } from './ProfilePreview';

interface SearchPageProps {
  onAddFriend: (userId: string, name?: string) => void;
  currentUser: User;
  friends: Friend[];
}

export const SearchPage: React.FC<SearchPageProps> = ({ onAddFriend, currentUser }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchFilter, setSearchFilter] = useState<'all' | 'subject'>('all');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [previewUser, setPreviewUser] = useState<SearchResult | null>(null);
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  const performSearch = useCallback(async (query: string) => {
    setIsSearching(true);

    try {
      const filters: { school?: string; studyField?: string; interests?: string[] } = {};
      if (searchFilter === 'subject' && selectedSubject) {
        filters.studyField = selectedSubject;
      }

      const results = await searchService.searchUsers(query, filters);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchFilter, selectedSubject]);

  useEffect(() => {
    if (debouncedSearchQuery.trim().length >= 2) {
      performSearch(debouncedSearchQuery);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [debouncedSearchQuery, searchFilter, selectedSubject, performSearch]);

  const subjects = [
    'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science',
    'History', 'English', 'Psychology', 'Economics', 'Art', 'Music',
    'Engineering', 'Medicine', 'Law', 'Business', 'Philosophy'
  ];


  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleAddFromSearch = (userId: string, name: string) => {
    // Friending is by user id now. Email is no longer exposed in search
    // results, and an id is the more direct identifier anyway.
    onAddFriend(userId, name);
    setSearchResults(prev => prev.filter(user => user.user_id !== userId));
    setPreviewUser(null);
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

  const getMatchingInterests = (userInterests: string[]) => {
    return currentUser.interests.filter(interest => 
      userInterests.some(ui => ui.toLowerCase().includes(interest.toLowerCase()))
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Search Header */}
      <div className="bg-surface rounded-2xl shadow-xl p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Search className="text-sand" size={28} />
          <h2 className="text-2xl font-bold text-ink">Find Study Buddies</h2>
        </div>

        {/* Search Controls */}
        <div className="space-y-4">
          <div className="flex space-x-4">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-muted" />
              </div>
              {/* Not "email" any more: addresses are no longer readable, so
                  searching by one cannot work. Adding a friend by email still
                  works from the Friends page, which resolves it server-side. */}
              <input
                type="text"
                placeholder="Search by name, school, or subject..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-10 py-3 border border-hairline rounded-lg focus:ring-2 focus:ring-sand focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <X className="h-5 w-5 text-muted hover:text-ink" />
                </button>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-muted" />
              <select
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value as 'all' | 'subject')}
                className="px-3 py-2 border border-hairline rounded-lg focus:ring-2 focus:ring-sand focus:border-transparent"
              >
                <option value="all">All Users</option>
                <option value="subject">By Subject</option>
              </select>
            </div>
          </div>

          {searchFilter === 'subject' && (
            <div>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-sand focus:border-transparent theme-textbox"
              >
                <option value="">Select a subject...</option>
                {subjects.map(subject => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Search Results */}
      {isSearching && (
        <div className="bg-surface rounded-2xl shadow-xl p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sand"></div>
            <span className="ml-3 text-ink/75">Searching for study buddies...</span>
          </div>
        </div>
      )}

      {searchResults.length > 0 && (
        <div className="bg-surface rounded-2xl shadow-xl p-6">
          <h3 className="text-xl font-bold text-ink mb-4">
            Found {searchResults.length} study buddies
          </h3>
          <div className="grid gap-4">
            {searchResults.map(user => {
              const matchingInterests = getMatchingInterests(user.interests);
              const isAlreadyFriend = user.is_friend;
              
              return (
                <div key={user.user_id} className="border border-hairline-soft rounded-xl p-6 hover:border-sand/40 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <button
                        onClick={() => setPreviewUser(user)}
                        className="flex-shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-sand"
                        aria-label={`View ${user.name}'s profile`}
                      >
                        <Avatar
                          name={user.name}
                          src={user.avatar_url}
                          className="w-16 h-16"
                          textClassName="text-xl"
                        />
                      </button>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <button
                            onClick={() => setPreviewUser(user)}
                            className="text-lg font-semibold text-ink hover:text-sand hover:underline transition-colors text-left"
                          >
                            {user.name}
                          </button>
                        </div>

                        {/* Email is no longer exposed in search results. School
                            is the useful public identifier for finding someone. */}
                        <p className="text-ink/75 mb-2">{user.school || user.bio || 'No details shared'}</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                          <div className="flex items-center space-x-2">
                            <BookOpen className="h-4 w-4 text-sand" />
                            <span className="text-sm text-ink/75">{user.study_field || 'Not specified'}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Users className="h-4 w-4 text-green-500" />
                            <span className="text-sm text-ink/75">{user.school}</span>
                          </div>
                        </div>
                        
                        <p className="text-sm text-ink/75 mb-3">{user.bio}</p>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted">
                              Study time: {formatTime(user.total_study_time)}
                            </p>
                            {matchingInterests.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                <span className="text-xs text-emerald-300 font-medium">Shared interests:</span>
                                {matchingInterests.slice(0, 3).map(interest => (
                                  <span
                                    key={interest}
                                    className="text-xs bg-emerald-500/15 text-emerald-300 px-2 py-1 rounded-full"
                                  >
                                    {interest}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col space-y-2">
                      <button
                        onClick={() => handleAddFromSearch(user.user_id, user.name)}
                        disabled={isAlreadyFriend}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          !isAlreadyFriend
                            ? 'bg-sand text-white hover:bg-sand-lo'
                            : 'bg-gray-300 text-muted cursor-not-allowed'
                        }`}
                      >
                        <UserPlus size={16} />
                        {/* No "Private" state: private profiles are filtered out
                            by the view and never reach search results. */}
                        <span>{isAlreadyFriend ? 'Friends' : 'Add Friend'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {searchQuery && !isSearching && searchResults.length === 0 && (
        <div className="bg-surface rounded-2xl shadow-xl p-6">
          <div className="text-center py-8">
            <Search size={48} className="mx-auto mb-4 text-muted" />
            <h3 className="text-lg font-semibold text-ink mb-2">No results found</h3>
            <p className="text-ink/75">
              No users found matching "{searchQuery}". Try different keywords or check your filters.
            </p>
          </div>
        </div>
      )}

      {!searchQuery && (
        <div className="bg-surface rounded-2xl shadow-xl p-6">
          <div className="text-center py-12">
            <Search size={64} className="mx-auto mb-4 text-muted" />
            <h3 className="text-xl font-semibold text-ink mb-2">Find Your Study Community</h3>
            <p className="text-ink/75 mb-6">
              Search for study buddies by name, school, subject, or interests. Connect with like-minded students!
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
              {subjects.slice(0, 8).map(subject => (
                <button
                  key={subject}
                  onClick={() => {
                    setSearchFilter('subject');
                    setSelectedSubject(subject);
                    handleSearch(subject);
                  }}
                  className="px-3 py-2 bg-surface-high text-ink rounded-lg hover:bg-blue-200 transition-colors text-sm secondary-btn"
                >
                  {subject}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {previewUser && (
        <ProfilePreview
          user={previewUser}
          onAddFriend={handleAddFromSearch}
          onClose={() => setPreviewUser(null)}
        />
      )}
    </div>
  );
};