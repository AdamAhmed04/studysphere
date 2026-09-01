import React, { useState } from 'react';
import { User, Lock, Globe, Bell, Save, Paintbrush, LogOut } from 'lucide-react';
import { ThemeCustomizer } from './ThemeCustomizer';
import { useAuthContext } from '../contexts/AuthContext';
import { isNotificationSupported, getNotificationPermission, requestNotificationPermission } from '../utils/safeNotification';

interface UserProfileSummary {
  name: string;
  email: string;
  isPublic: boolean;
  interests: string[];
}

interface SettingsProps {
  userProfile: UserProfileSummary;
  onUpdateProfile: (updates: Partial<UserProfileSummary>) => void;
}

export const Settings: React.FC<SettingsProps> = ({ userProfile, onUpdateProfile }) => {
  const [formData, setFormData] = useState(userProfile);
  const [newInterest, setNewInterest] = useState('');
  const [activeSection, setActiveSection] = useState<'profile' | 'privacy' | 'theme'>('profile');

  const { signOut } = useAuthContext();
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const notificationsSupported = isNotificationSupported();
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission>(getNotificationPermission());

  const handleEnableNotifications = async () => {
    if (!notificationsSupported || notificationPermission !== 'default') return;
    setNotificationPermission(await requestNotificationPermission());
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out failed:', error);
      setSigningOut(false);
      setConfirmingSignOut(false);
    }
  };

  const handleSave = () => {
    onUpdateProfile(formData);
  };

  const addInterest = () => {
    if (newInterest.trim() && !formData.interests.includes(newInterest.trim())) {
      setFormData(prev => ({
        ...prev,
        interests: [...prev.interests, newInterest.trim()]
      }));
      setNewInterest('');
    }
  };

  const removeInterest = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.filter(i => i !== interest)
    }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Settings Navigation */}
      <div className="theme-secondary-bg rounded-2xl shadow-xl p-6">
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveSection('profile')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              activeSection === 'profile' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <User size={18} />
            <span>Profile</span>
          </button>
          <button
            onClick={() => setActiveSection('privacy')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              activeSection === 'privacy' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Lock size={18} />
            <span>Privacy</span>
          </button>
          <button
            onClick={() => setActiveSection('theme')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              activeSection === 'theme' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Paintbrush size={18} />
            <span>Theme</span>
          </button>
        </div>
      </div>

      {/* Theme Customization Section */}
      {activeSection === 'theme' && <ThemeCustomizer />}

      {/* Profile Settings */}
      {activeSection === 'profile' && (
        <div className="theme-secondary-bg rounded-2xl shadow-xl p-6">
        <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
          <User className="mr-3 text-blue-500" size={28} />
          Profile Settings
        </h3>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="settings-display-name" className="block text-sm font-medium text-gray-700 mb-2">
              Display Name
            </label>
            <input id="settings-display-name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/*
            Read-only on purpose.

            This field used to be editable, but saving it only wrote
            user_profiles.email — it never touched the address you actually
            sign in with. Changing it left you logging in with the old address
            while your profile showed the new one, and find_user_by_email
            resolving friend requests to the new one.

            Changing a sign-in address properly needs supabase.auth.updateUser
            plus its confirmation flow, which is a feature rather than a field.
          */}
          <div>
            <label htmlFor="settings-email-address" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input id="settings-email-address"
              type="email"
              value={formData.email}
              readOnly
              aria-describedby="email-readonly-note"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
            />
            <p id="email-readonly-note" className="mt-1 text-xs text-gray-500">
              This is the address you sign in with and cannot be changed here yet.
            </p>
          </div>
        </div>

        {/* Interests */}
        <div className="mt-6">
          <label htmlFor="settings-study-interests" className="block text-sm font-medium text-gray-700 mb-2">
            Study Interests
          </label>
          <div className="flex space-x-3 mb-3">
            <input id="settings-study-interests"
              type="text"
              value={newInterest}
              onChange={(e) => setNewInterest(e.target.value)}
              placeholder="Add an interest (e.g., Mathematics, Cars, History)"
              className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent theme-textbox"
            />
            <button
              onClick={addInterest}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.interests.map(interest => (
              <span
                key={interest}
                className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm cursor-pointer hover:bg-blue-200 transition-colors"
                onClick={() => removeInterest(interest)}
              >
                {interest} ✕
              </span>
            ))}
          </div>
        </div>
      </div>
      )}

      {/* Privacy Settings */}
      {activeSection === 'privacy' && (
        <div className="theme-secondary-bg rounded-2xl shadow-xl p-6">
        <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
          <Lock className="mr-3 text-green-500" size={28} />
          Privacy Settings
        </h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center space-x-3">
              {formData.isPublic ? <Globe className="text-green-500" size={20} /> : <Lock className="text-red-500" size={20} />}
              <div>
                <p className="font-medium text-gray-800">Public Profile</p>
                <p className="text-sm text-gray-600">
                  Allow others to see your study stats and add you as a friend
                </p>
              </div>
            </div>
            <button
              onClick={() => setFormData(prev => ({ ...prev, isPublic: !prev.isPublic }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formData.isPublic ? 'bg-green-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.isPublic ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/*
            This was a decorative toggle: hardcoded green, no onClick, no
            state, describing a "notified when friends are studying" feature
            that does not exist. It now controls something real.

            Browsers only grant notification permission in response to a user
            gesture. The app previously asked from inside a realtime callback
            and on timer mount, where the request is ignored or denied. A
            button in Settings is the right place for that gesture.
          */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center space-x-3">
              <Bell className={notificationPermission === 'granted' ? 'text-green-600' : 'text-gray-400'} size={20} />
              <div>
                <p className="font-medium text-gray-800">Browser notifications</p>
                <p className="text-sm text-gray-600">
                  {!notificationsSupported
                    ? 'Not supported by this browser'
                    : notificationPermission === 'granted'
                      ? 'On — you will be told when a study session or break ends'
                      : notificationPermission === 'denied'
                        ? 'Blocked. Re-enable this site in your browser settings to turn it back on.'
                        : 'Off — turn on to be told when a study session or break ends'}
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={notificationPermission === 'granted'}
              aria-label="Browser notifications"
              onClick={handleEnableNotifications}
              disabled={!notificationsSupported || notificationPermission !== 'default'}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                notificationPermission === 'granted' ? 'bg-green-600' : 'bg-gray-300'
              } ${(!notificationsSupported || notificationPermission !== 'default') ? 'cursor-not-allowed opacity-70' : ''}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  notificationPermission === 'granted' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
      )}

      {/* Save Button */}
      {activeSection !== 'theme' && (
        <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="flex items-center space-x-2 px-6 py-3 rounded-lg transition-all shadow-lg btn-primary"
        >
          <Save size={20} />
          <span>Save Changes</span>
        </button>
      </div>
      )}

      {/*
        Account section.

        signOut existed in useAuth from the start but nothing in the app ever
        called it — there was no way to leave a session, which matters most on
        a shared or school computer. Shown on every tab so it is findable
        without knowing which one to look under.
      */}
      <div className="theme-secondary-bg rounded-2xl shadow-xl p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-1 flex items-center">
          <LogOut className="mr-2 text-gray-600" size={20} />
          Account
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Signed in as {userProfile.email}
        </p>

        {confirmingSignOut ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-gray-700">Sign out of StudySphere?</span>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {signingOut ? 'Signing out…' : 'Yes, sign out'}
            </button>
            <button
              onClick={() => setConfirmingSignOut(false)}
              disabled={signingOut}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmingSignOut(true)}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium border border-red-300 text-red-700 hover:bg-red-50 transition-colors"
          >
            <LogOut size={16} />
            <span>Sign out</span>
          </button>
        )}
      </div>
    </div>
  );
};