import React, { useState } from 'react';
import { X, Calendar, Users, MapPin, Video, Phone } from 'lucide-react';
import type { User as UserType, Friend, StudyGroup } from '../types';
import { toLocalDateString, todayLocalDateString } from '../utils/dates';
import { Avatar } from './Avatar';

interface ScheduleMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScheduleMeeting: (meetingData: {
    title: string;
    description?: string;
    scheduledTime: Date;
    duration: number;
    participants: string[];
    invitees: string[];
    inviteeEmails: string[];
    groupId?: string;
    location?: string;
    meetingType: 'video' | 'in-person' | 'phone';
    reminders: number[];
  }) => void;
  currentUser: UserType;
  friends: Friend[];
  selectedGroup?: StudyGroup;
  selectedFriend?: Friend;
}

export const ScheduleMeetingModal: React.FC<ScheduleMeetingModalProps> = ({
  isOpen,
  onClose,
  onScheduleMeeting,
  currentUser,
  friends,
  selectedGroup,
  selectedFriend
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '14:00',
    selectedInvitees: [] as string[],
    inviteeEmails: [] as string[],
    duration: 60,
    location: '',
    meetingType: 'video' as 'video' | 'in-person' | 'phone',
    reminders: [15] as number[],
    selectedParticipants: [] as string[]
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  React.useEffect(() => {
    if (isOpen) {
      // Auto-populate participants based on context
      if (selectedGroup) {
        setFormData(prev => ({
          ...prev,
          title: `${selectedGroup.name} Meeting`,
          selectedParticipants: selectedGroup.members.filter(id => id !== currentUser.id)
        }));
      } else if (selectedFriend) {
        setFormData(prev => ({
          ...prev,
          title: `Meeting with ${selectedFriend.name}`,
          selectedParticipants: [selectedFriend.id]
        }));
      }
      
      // Set default date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setFormData(prev => ({
        ...prev,
        date: toLocalDateString(tomorrow),
        time: '14:00'
      }));
    }
  }, [isOpen, selectedGroup, selectedFriend, currentUser.id]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Meeting title is required';
    }

    if (!formData.date) {
      newErrors.date = 'Date is required';
    } else {
      const selectedDate = new Date(formData.date + 'T' + formData.time);
      if (selectedDate <= new Date()) {
        newErrors.date = 'Meeting must be scheduled for a future date/time';
      }
    }

    if (!formData.time) {
      newErrors.time = 'Time is required';
    }

    if (formData.duration < 15) {
      newErrors.duration = 'Meeting must be at least 15 minutes';
    }

    if (formData.selectedParticipants.length === 0) {
      newErrors.participants = 'At least one participant is required';
    }

    if (formData.meetingType === 'in-person' && !formData.location.trim()) {
      newErrors.location = 'Location is required for in-person meetings';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    const scheduledTime = new Date(formData.date + 'T' + formData.time);
    
    onScheduleMeeting({
      title: formData.title,
      description: formData.description || undefined,
      scheduledTime,
      duration: formData.duration,
      participants: [currentUser.id, ...formData.selectedParticipants],
      invitees: formData.selectedInvitees,
      inviteeEmails: formData.inviteeEmails,
      groupId: selectedGroup?.id,
      location: formData.location || undefined,
      meetingType: formData.meetingType,
      reminders: formData.reminders
    });

    // Reset form
    setFormData({ 
      title: '',
      description: '',
      date: '',
      time: '',
      duration: 60,
      location: '',
      meetingType: 'video',
      reminders: [15],
      selectedParticipants: [],
      selectedInvitees: [],
      inviteeEmails: []
    });
    setErrors({});
    onClose();
  };

  const toggleParticipant = (friendId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedParticipants: prev.selectedParticipants.includes(friendId)
        ? prev.selectedParticipants.filter(id => id !== friendId)
        : [...prev.selectedParticipants, friendId]
    }));
  };



  const toggleReminder = (minutes: number) => {
    setFormData(prev => ({
      ...prev,
      reminders: prev.reminders.includes(minutes)
        ? prev.reminders.filter(m => m !== minutes)
        : [...prev.reminders, minutes].sort((a, b) => b - a)
    }));
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600">
          <div className="flex items-center space-x-3">
            <Calendar className="text-white" size={24} />
            <h3 className="text-xl font-bold text-white">Schedule Meeting</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Meeting Title */}
          <div>
            <label htmlFor="schedulemeetingmodal-meeting-title" className="block text-sm font-medium text-gray-700 mb-2">
              Meeting Title *
            </label>
            <input id="schedulemeetingmodal-meeting-title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.title ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g., Calculus Study Session"
              maxLength={200}
            />
            {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="schedulemeetingmodal-description" className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea id="schedulemeetingmodal-description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
              placeholder="Meeting agenda, topics to cover, materials needed..."
              maxLength={2000}
            />
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="schedulemeetingmodal-date" className="block text-sm font-medium text-gray-700 mb-2">
                Date *
              </label>
              <input id="schedulemeetingmodal-date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                min={todayLocalDateString()}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.date ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.date && <p className="mt-1 text-sm text-red-600">{errors.date}</p>}
            </div>

            <div>
              <label htmlFor="schedulemeetingmodal-time" className="block text-sm font-medium text-gray-700 mb-2">
                Time *
              </label>
              <input id="schedulemeetingmodal-time"
                type="time"
                value={formData.time}
                onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.time ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.time && <p className="mt-1 text-sm text-red-600">{errors.time}</p>}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label htmlFor="schedulemeetingmodal-duration-minutes" className="block text-sm font-medium text-gray-700 mb-2">
              Duration (minutes)
            </label>
            <div className="flex items-center space-x-4">
              <input id="schedulemeetingmodal-duration-minutes"
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) || 60 }))}
                min="15"
                max="480"
                className={`w-32 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.duration ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              <div className="flex space-x-2">
                {[30, 60, 90, 120].map(duration => (
                  <button
                    key={duration}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, duration }))}
                    className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                      formData.duration === duration
                        ? 'btn-primary'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 secondary-btn'
                    }`}
                  >
                    {duration}m
                  </button>
                ))}
              </div>
            </div>
            {errors.duration && <p className="mt-1 text-sm text-red-600">{errors.duration}</p>}
          </div>

          {/* Meeting Type */}
          <div>
            <div id="meeting-type-label" className="block text-sm font-medium text-gray-700 mb-3">
              Meeting Type
            </div>
            <div role="group" aria-labelledby="meeting-type-label" className="grid grid-cols-3 gap-3">
              {([
                { type: 'video', label: 'Video Call', icon: Video },
                { type: 'in-person', label: 'In Person', icon: MapPin },
                { type: 'phone', label: 'Phone Call', icon: Phone }
              ] as const).map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, meetingType: type }))}
                  className={`flex flex-col items-center p-4 border-2 rounded-lg transition-all ${
                    formData.meetingType === type
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Icon size={24} className="mb-2" />
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Location (for in-person meetings) */}
          {formData.meetingType === 'in-person' && (
            <div>
              <label htmlFor="schedulemeetingmodal-location" className="block text-sm font-medium text-gray-700 mb-2">
                Location *
              </label>
              <input id="schedulemeetingmodal-location"
                type="text"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.location ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., Library Study Room 3, Coffee Shop on Main St"
                maxLength={300}
              />
              {errors.location && <p className="mt-1 text-sm text-red-600">{errors.location}</p>}
            </div>
          )}

          {/* Participants */}
          {!selectedGroup && (
            <div>
              <div id="meeting-participants-label" className="block text-sm font-medium text-gray-700 mb-3">
                Participants ({formData.selectedParticipants.length} selected)
              </div>
              <div role="group" aria-labelledby="meeting-participants-label" className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                {friends.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    <Users size={32} className="mx-auto mb-2 opacity-50" />
                    <p>No friends available</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {friends.map(friend => (
                      <div
                        key={friend.id}
                        className="flex items-center p-3 hover:bg-gray-50 cursor-pointer"
                        onClick={() => toggleParticipant(friend.id)}
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
                            {friend.isOnline ? 'Online' : 'Offline'}
                          </p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          formData.selectedParticipants.includes(friend.id)
                            ? 'bg-blue-600 border-blue-600'
                            : 'border-gray-300'
                        }`}>
                          {formData.selectedParticipants.includes(friend.id) && (
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
              {errors.participants && <p className="mt-1 text-sm text-red-600">{errors.participants}</p>}
            </div>
          )}

          {/* Reminders */}
          <div>
            <div id="meeting-reminders-label" className="block text-sm font-medium text-gray-700 mb-3">
              Reminders
            </div>
            <div role="group" aria-labelledby="meeting-reminders-label" className="flex flex-wrap gap-2">
              {[5, 15, 30, 60, 1440].map(minutes => (
                <button
                  key={minutes}
                  type="button"
                  onClick={() => toggleReminder(minutes)}
                  className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                    formData.reminders.includes(minutes)
                      ? 'btn-primary'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 secondary-btn'
                  }`}
                >
                  {minutes < 60 ? `${minutes} min` : minutes === 60 ? '1 hour' : '1 day'} before
                </button>
              ))}
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 rounded-lg transition-all shadow-lg btn-primary"
            >
              Schedule Meeting
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};