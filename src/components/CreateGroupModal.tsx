import React, { useState } from 'react';
import { X, Users, Lock, Globe } from 'lucide-react';
import type { User, Friend } from '../types';
import { Avatar } from './Avatar';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateGroup: (groupData: {
    name: string;
    description: string;
    subject?: string;
    isPrivate: boolean;
    members: string[];
  }) => void;
  currentUser: User;
  friends: Friend[];
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isOpen,
  onClose,
  onCreateGroup,
  currentUser,
  friends
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    subject: '',
    isPrivate: false,
    selectedMembers: [] as string[]
  });

  const subjects = [
    'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science',
    'History', 'English', 'Psychology', 'Economics', 'Art', 'Music',
    'Engineering', 'Medicine', 'Law', 'Business', 'Philosophy'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    onCreateGroup({
      name: formData.name,
      description: formData.description,
      subject: formData.subject || undefined,
      isPrivate: formData.isPrivate,
      members: [currentUser.id, ...formData.selectedMembers]
    });

    // Reset form
    setFormData({
      name: '',
      description: '',
      subject: '',
      isPrivate: false,
      selectedMembers: []
    });
    onClose();
  };

  const toggleMember = (friendId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedMembers: prev.selectedMembers.includes(friendId)
        ? prev.selectedMembers.filter(id => id !== friendId)
        : [...prev.selectedMembers, friendId]
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-800">Create Study Group</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          <div>
            <label htmlFor="creategroupmodal-group-name" className="block text-sm font-medium text-gray-700 mb-2">
              Group Name *
            </label>
            <input id="creategroupmodal-group-name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Calculus Study Group"
              maxLength={100}
              required
            />
          </div>

          <div>
            <label htmlFor="creategroupmodal-description" className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea id="creategroupmodal-description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
              placeholder="What's this group about?"
              maxLength={2000}
            />
          </div>

          <div>
            <label htmlFor="creategroupmodal-subject-optional" className="block text-sm font-medium text-gray-700 mb-2">
              Subject (Optional)
            </label>
            <select id="creategroupmodal-subject-optional"
              value={formData.subject}
              onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a subject...</option>
              {subjects.map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center space-x-3">
              {/* Label follows the state. It used to read "Private Group ·
                  Only invited members can join" in both states, so a public
                  group was described as private. */}
              {formData.isPrivate
                ? <Lock className="text-gray-700" size={20} />
                : <Globe className="text-gray-700" size={20} />}
              <div>
                <p className="font-medium text-gray-800">
                  {formData.isPrivate ? 'Private group' : 'Public group'}
                </p>
                <p className="text-sm text-gray-600">
                  {formData.isPrivate
                    ? 'Only people you invite can join'
                    : 'Anyone can find and join this group'}
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={formData.isPrivate}
              aria-label="Private group"
              onClick={() => setFormData(prev => ({ ...prev, isPrivate: !prev.isPrivate }))}
              /* On means private, matching the label beside it. Previously the
                 "on" colour meant public, which read as the opposite. */
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formData.isPrivate ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.isPrivate ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div>
            <div id="creategroup-add-friends" className="block text-sm font-medium text-gray-700 mb-3">
              Add Friends ({formData.selectedMembers.length} selected)
            </div>
            <div role="group" aria-labelledby="creategroup-add-friends" className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
              {friends.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <Users size={32} className="mx-auto mb-2 opacity-50" />
                  <p>No friends to add yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {friends.map(friend => (
                    <div
                      key={friend.id}
                      className="flex items-center p-3 hover:bg-gray-50 cursor-pointer"
                      onClick={() => toggleMember(friend.id)}
                    >
                      <Avatar
                        name={friend.name}
                        src={friend.avatar}
                        className="w-10 h-10 mr-3"
                        textClassName="text-sm"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{friend.name}</p>
                        <p className="text-sm text-gray-500">
                          {Math.floor(friend.totalStudyTime / 60)}h study time
                        </p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        formData.selectedMembers.includes(friend.id)
                          ? 'bg-blue-600 border-blue-600'
                          : 'border-gray-300'
                      }`}>
                        {formData.selectedMembers.includes(friend.id) && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!formData.name.trim()}
              className="flex-1 px-4 py-3 rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors btn-primary"
            >
              Create Group
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};