import React, { useEffect } from 'react';
import { X, Lock, BookOpen, School, GraduationCap, Cake, UserPlus, Check } from 'lucide-react';
import { Avatar } from './Avatar';
import type { SearchResult } from '../services/searchService';

interface ProfilePreviewProps {
  user: SearchResult;
  onAddFriend: (userId: string, name: string) => void;
  onClose: () => void;
}

const formatStudyTime = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  return hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
};

/*
 * What someone sees before deciding to send a friend request.
 *
 * A private account is not hidden here, it is just quiet: the name and photo
 * are shown exactly as a public account's are, and the request button behaves
 * identically. Only the detail is withheld, and it is withheld visibly - an
 * account that says it is private reads as a deliberate setting, where an
 * empty profile reads as a broken page.
 */
export const ProfilePreview: React.FC<ProfilePreviewProps> = ({ user, onAddFriend, onClose }) => {
  // Escape closes it; a modal that traps you needs a mouse to leave.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const details = [
    { icon: School, label: 'School', value: user.school },
    { icon: BookOpen, label: 'Studying', value: user.study_field },
    { icon: GraduationCap, label: 'Year', value: user.grade },
    { icon: Cake, label: 'Age', value: user.age ? `${user.age} years old` : undefined },
  ].filter(detail => detail.value);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-md max-h-[90vh] overflow-y-auto modal-panel rounded-2xl shadow-xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-preview-name"
      >
        <div className="relative">
          <div className="h-24 bg-surface-high rounded-t-2xl" />

          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>

          <div className="px-6 pb-6">
            <div className="-mt-12 mb-4">
              <Avatar
                name={user.name}
                src={user.avatar_url}
                className="w-24 h-24 border-4 border-white shadow-lg"
                textClassName="text-3xl"
                gradient="from-green-400 to-blue-500"
              />
            </div>

            <div className="flex items-center flex-wrap gap-2 mb-1">
              <h3 id="profile-preview-name" className="text-2xl font-bold text-ink">
                {user.name}
              </h3>
              {!user.is_public && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-surface-high text-ink/75 text-xs font-medium">
                  <Lock size={12} />
                  Private
                </span>
              )}
            </div>

            {user.can_see_details ? (
              <>
                <p className="text-sm text-muted mb-4">
                  Study time: {formatStudyTime(user.total_study_time)}
                </p>

                {user.bio && <p className="text-ink/75 mb-4">{user.bio}</p>}

                {details.length > 0 && (
                  <dl className="space-y-3 mb-4">
                    {details.map(({ icon: Icon, label, value }) => (
                      <div key={label} className="flex items-center gap-3">
                        <Icon className="h-4 w-4 text-sand flex-shrink-0" />
                        <dt className="sr-only">{label}</dt>
                        <dd className="text-sm text-ink/75">{value}</dd>
                      </div>
                    ))}
                  </dl>
                )}

                {user.interests.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-ink/75 mb-2">Interests</p>
                    <div className="flex flex-wrap gap-2">
                      {user.interests.map(interest => (
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
              </>
            ) : (
              <div className="my-4 p-4 bg-surface rounded-xl text-center">
                <Lock className="h-6 w-6 text-muted mx-auto mb-2" />
                <p className="text-sm text-ink/75 font-medium mb-1">This account is private</p>
                <p className="text-sm text-muted">
                  Send {user.name.split(' ')[0]} a friend request to see their profile.
                </p>
              </div>
            )}

            <button
              onClick={() => onAddFriend(user.user_id, user.name)}
              disabled={user.is_friend}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                user.is_friend
                  ? 'bg-surface-high text-muted cursor-not-allowed'
                  : 'bg-sand text-white hover:bg-sand-lo'
              }`}
            >
              {user.is_friend ? <Check size={18} /> : <UserPlus size={18} />}
              <span>{user.is_friend ? 'Already friends' : 'Send friend request'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
