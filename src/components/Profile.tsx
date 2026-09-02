import React, { useState } from 'react';
import { Calendar, BookOpen, Users, Trophy, Edit3, GraduationCap, School, Camera, Loader2 } from 'lucide-react';
import type { User as UserType, StudySession, Friend } from '../types';
import { authService } from '../services/authService';
import { dataUrlToBlob, downscaleImage } from '../utils/avatar';
import { useToast } from '../contexts/ToastContext';
import { Avatar } from './Avatar';

interface ProfileProps {
  userProfile: UserType;
  onUpdateProfile: (updates: Partial<UserType>) => void;
  sessions: StudySession[];
  friends: Friend[];
}

export const Profile: React.FC<ProfileProps> = ({ userProfile, onUpdateProfile, sessions, friends }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(userProfile);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const toast = useToast();

  // The preview is what was just picked; it wins until the reloaded profile
  // carries the new URL, so the change is visible without waiting for a fetch.
  const avatarSrc = avatarPreview ?? userProfile.avatar ?? null;

  /*
   * Saved as soon as it is picked rather than on Save. The file is already in
   * storage by then, so deferring the profile write would only leave storage
   * and the profile disagreeing until the user happened to press a button.
   */
  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // so picking the same file twice still fires
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Please choose an image under 5MB.');
      return;
    }

    setAvatarBusy(true);

    try {
      const dataUrl = await downscaleImage(file);
      const avatarUrl = await authService.uploadAvatar(userProfile.id, dataUrlToBlob(dataUrl));

      setAvatarPreview(dataUrl);
      setEditData((previous) => ({ ...previous, avatar: avatarUrl }));
      onUpdateProfile({ avatar: avatarUrl });
    } catch (error) {
      toast.error('Could not upload that photo.', error);
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleSave = () => {
    onUpdateProfile(editData);
    setIsEditing(false);
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return 'Not specified';
    return new Date(date).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const calculateAge = (birthDate: Date | undefined) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const totalStudyHours = Math.floor(userProfile.totalStudyTime / 60);
  const age = calculateAge(userProfile.dateOfBirth);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile Header */}
      <div className="bg-surface rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-surface-high h-32"></div>
        <div className="relative px-6 pb-6">
          <div className="flex items-end space-x-6 -mt-16">
            <div className="relative">
              <Avatar
                name={userProfile.name}
                src={avatarSrc}
                alt={userProfile.name}
                className="w-32 h-32 border-4 border-white shadow-lg"
                textClassName="text-4xl"
                gradient="from-green-400 to-blue-500"
              />

              <label
                htmlFor="profile-photo"
                className="absolute bottom-1 right-1 flex items-center justify-center w-10 h-10 rounded-full bg-sand text-white border-2 border-white shadow-md cursor-pointer hover:bg-sand-lo transition-colors"
              >
                {avatarBusy
                  ? <Loader2 size={18} className="animate-spin" />
                  : <Camera size={18} />}
                <span className="sr-only">
                  {avatarSrc ? "Change profile photo" : "Add a profile photo"}
                </span>
              </label>
              <input
                id="profile-photo"
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={avatarBusy}
                onChange={handleAvatarChange}
              />
            </div>
            <div className="flex-1 pt-16">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-ink">{userProfile.name}</h1>
                  <p className="text-ink/75">{userProfile.email}</p>
                  {age && <p className="text-sm text-muted">Age: {age}</p>}
                </div>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="flex items-center space-x-2 px-4 py-2 bg-sand text-white rounded-lg hover:bg-sand-lo transition-colors"
                >
                  <Edit3 size={16} />
                  <span>{isEditing ? 'Cancel' : 'Edit Profile'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-ink/75 font-medium">Study Hours</p>
              <p className="text-2xl font-bold text-sand">{totalStudyHours}h</p>
            </div>
            <BookOpen className="text-sand" size={32} />
          </div>
        </div>

        <div className="bg-surface rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-ink/75 font-medium">Streak</p>
              <p className="text-2xl font-bold text-orange-600">{userProfile.currentStreak}</p>
            </div>
            <Trophy className="text-orange-500" size={32} />
          </div>
        </div>

        <div className="bg-surface rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-ink/75 font-medium">Friends</p>
              <p className="text-2xl font-bold text-emerald-300">{friends.length}</p>
            </div>
            <Users className="text-green-500" size={32} />
          </div>
        </div>

        <div className="bg-surface rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-ink/75 font-medium">Sessions</p>
              <p className="text-2xl font-bold text-sand">{sessions.length}</p>
            </div>
            <Calendar className="text-sand" size={32} />
          </div>
        </div>
      </div>

      {/* Profile Details */}
      <div className="bg-surface rounded-2xl shadow-xl p-6">
        <h3 className="text-2xl font-bold text-ink mb-6">Profile Information</h3>
        
        {isEditing ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="profile-name" className="block text-sm font-medium text-ink/75 mb-2">Name</label>
                <input id="profile-name"
                  type="text"
                  value={editData.name}
                  onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 border border-hairline rounded-lg focus:ring-2 focus:ring-sand focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="profile-email" className="block text-sm font-medium text-ink/75 mb-2">Email</label>
                <input id="profile-email"
                  type="email"
                  value={editData.email}
                  onChange={(e) => setEditData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-4 py-3 border border-hairline rounded-lg focus:ring-2 focus:ring-sand focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label htmlFor="profile-bio" className="block text-sm font-medium text-ink/75 mb-2">Bio</label>
              <textarea id="profile-bio"
                value={editData.bio || ''}
                onChange={(e) => setEditData(prev => ({ ...prev, bio: e.target.value }))}
                rows={3}
                className="w-full px-4 py-3 border border-hairline rounded-lg focus:ring-2 focus:ring-sand focus:border-transparent resize-none"
                placeholder="Tell us about yourself..."
                maxLength={2000}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="profile-school-university" className="block text-sm font-medium text-ink/75 mb-2">School/University</label>
                <input id="profile-school-university"
                  type="text"
                  value={editData.school || ''}
                  onChange={(e) => setEditData(prev => ({ ...prev, school: e.target.value }))}
                  className="w-full px-4 py-3 border border-hairline rounded-lg focus:ring-2 focus:ring-sand focus:border-transparent"
                  placeholder="e.g., Harvard University"
                  maxLength={200}
                />
              </div>
              <div>
                <label htmlFor="profile-field-of-study" className="block text-sm font-medium text-ink/75 mb-2">Field of Study</label>
                <input id="profile-field-of-study"
                  type="text"
                  value={editData.studyField || ''}
                  onChange={(e) => setEditData(prev => ({ ...prev, studyField: e.target.value }))}
                  className="w-full px-4 py-3 border border-hairline rounded-lg focus:ring-2 focus:ring-sand focus:border-transparent"
                  placeholder="e.g., Computer Science"
                  maxLength={200}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsEditing(false)}
                className="px-6 py-2 border border-hairline text-ink/75 rounded-lg hover:bg-surface transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2 rounded-lg transition-colors btn-primary"
              >
                Save Changes
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {userProfile.bio && (
              <div>
                <h4 className="text-lg font-semibold text-ink mb-2">About</h4>
                <p className="text-ink/75">{userProfile.bio}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {userProfile.school && (
                <div className="flex items-start space-x-3">
                  <School className="text-sand mt-1" size={20} />
                  <div>
                    <p className="font-semibold text-ink">School</p>
                    <p className="text-ink/75">{userProfile.school}</p>
                  </div>
                </div>
              )}

              {userProfile.studyField && (
                <div className="flex items-start space-x-3">
                  <GraduationCap className="text-green-500 mt-1" size={20} />
                  <div>
                    <p className="font-semibold text-ink">Field of Study</p>
                    <p className="text-ink/75">{userProfile.studyField}</p>
                  </div>
                </div>
              )}

              {userProfile.grade && (
                <div className="flex items-start space-x-3">
                  <Trophy className="text-sand mt-1" size={20} />
                  <div>
                    <p className="font-semibold text-ink">Grade/Year</p>
                    <p className="text-ink/75">{userProfile.grade}</p>
                  </div>
                </div>
              )}

              {userProfile.graduationDate && (
                <div className="flex items-start space-x-3">
                  <Calendar className="text-orange-500 mt-1" size={20} />
                  <div>
                    <p className="font-semibold text-ink">Graduation</p>
                    <p className="text-ink/75">{formatDate(userProfile.graduationDate)}</p>
                  </div>
                </div>
              )}
            </div>

            {userProfile.interests.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold text-ink mb-3">Interests</h4>
                <div className="flex flex-wrap gap-2">
                  {userProfile.interests.map(interest => (
                    <span
                      key={interest}
                      className="px-3 py-1 bg-surface-high text-ink rounded-full text-sm"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-hairline-soft">
              <p className="text-sm text-muted">
                Member since {formatDate(userProfile.joinDate)} • 
                Profile is {userProfile.isPublic ? 'Public' : 'Private'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};