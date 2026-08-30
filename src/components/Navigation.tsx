import React, { useState, useEffect } from 'react';
import { Clock, Users, MessageSquare, BarChart3, Settings, User, Calendar, Search, ChevronDown, Play, Pause } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  userProfile: { username: string; isPublic: boolean; avatar?: string; name: string };
  timerState?: {
    isActive: boolean;
    isPaused: boolean;
    timeElapsed: number;
    currentSubject: string;
  };
  formatTime?: (seconds: number) => string;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange, userProfile, timerState, formatTime }) => {
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const { currentTheme } = useTheme();

  // Show notification badge if timer is active
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [showTimerChip, setShowTimerChip] = useState(false);
  
  useEffect(() => {
    // Listen for timer state changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'studysphere-timer-active') {
        setIsTimerActive(e.newValue === 'true');
      }
    };

    // Check initial state
    setIsTimerActive(localStorage.getItem('studysphere-timer-active') === 'true');

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Show timer chip when timer is active and not on timer tab
  useEffect(() => {
    setShowTimerChip(timerState?.isActive === true && activeTab !== 'timer');
  }, [timerState?.isActive, activeTab]);

  const tabs = [
    { id: 'timer', label: 'Home', icon: Clock, badge: isTimerActive },
    { id: 'stats', label: 'Stats', icon: BarChart3 },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'friends', label: 'Friends', icon: Users },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];


  const getButtonFocusStyle = () => ({
    borderColor: currentTheme.buttonColor,
    boxShadow: `0 0 0 3px ${currentTheme.buttonColor}20`
  });
  return (
    <div className="theme-secondary-bg shadow-lg">
      <div className="max-w-7xl mx-auto px-2 md:px-4">
        <div className="flex items-center h-14 md:h-16">
          {/* Profile Section - Top Left Corner */}
          <div className="flex items-center space-x-2 md:space-x-4 mr-2 md:mr-6">
            <div className="relative">
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex items-center space-x-2 md:space-x-3 px-2 md:px-4 py-2 rounded-xl transition-all border border-gray-200 hover:bg-gray-100 min-h-[44px]"
                style={{
                  ...getButtonFocusStyle()
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = currentTheme.buttonColor;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#d1d5db';
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = currentTheme.buttonColor;
                  e.currentTarget.style.boxShadow = `0 0 0 3px ${currentTheme.buttonColor}20`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#d1d5db';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-r from-green-400 to-blue-500 flex items-center justify-center overflow-hidden border-2 border-white shadow-md">
                  {userProfile.avatar ? (
                    <img
                      src={userProfile.avatar}
                      alt={userProfile.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white font-bold text-base md:text-lg">
                      {userProfile.username.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="text-left hidden md:block">
                  <p className="font-semibold text-gray-800">{userProfile.username}</p>
                  <p className="text-sm text-gray-500">
                    {userProfile.isPublic ? 'Public' : 'Private'} Profile
                  </p>
                </div>
                <ChevronDown size={18} className="text-gray-400 hidden md:block" />
              </button>
              
              {/* Profile Dropdown */}
              {showProfileDropdown && (
                <div className="absolute left-0 top-full mt-2 bg-white rounded-xl shadow-xl border border-gray-200 z-50 min-w-56">
                  <div className="p-2">
                    <button
                      onClick={() => {
                        onTabChange('profile');
                        setShowProfileDropdown(false);
                      }}
                      className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all text-left hover:bg-gray-100"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = currentTheme.buttonColor;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'transparent';
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = currentTheme.buttonColor;
                        e.currentTarget.style.boxShadow = `0 0 0 2px ${currentTheme.buttonColor}20`;
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'transparent';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                      style={{ border: '1px solid transparent' }}
                    >
                      <User size={18} />
                      <span className="font-medium">View Profile</span>
                    </button>
                    <button
                      onClick={() => {
                        onTabChange('settings');
                        setShowProfileDropdown(false);
                      }}
                      className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all text-left hover:bg-gray-100"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = currentTheme.buttonColor;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'transparent';
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = currentTheme.buttonColor;
                        e.currentTarget.style.boxShadow = `0 0 0 2px ${currentTheme.buttonColor}20`;
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'transparent';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                      style={{ border: '1px solid transparent' }}
                    >
                      <Settings size={18} />
                      <span className="font-medium">Settings</span>
                    </button>
                    <div className="border-t border-gray-200 my-2"></div>
                    <div className="px-4 py-3">
                      <p className="text-sm text-gray-500 mb-2">Status</p>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                        <span className="text-sm text-gray-600 font-medium">Online</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* App Logo - Centered (or Timer Chip if active) */}
          <div className="flex-1 flex items-center justify-center">
            {showTimerChip && timerState ? (
              <button
                onClick={() => onTabChange('timer')}
                className="flex items-center space-x-2 px-3 md:px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all min-h-[44px] animate-pulse"
              >
                {timerState.isPaused ? <Pause size={16} /> : <Play size={16} className="animate-pulse" />}
                <span className="font-mono font-bold text-sm md:text-base">
                  {formatTime ? formatTime(timerState.timeElapsed) : '00:00'}
                </span>
                <span className="hidden md:inline text-xs opacity-90 max-w-[120px] truncate">
                  {timerState.currentSubject}
                </span>
              </button>
            ) : (
            <div className="flex items-center space-x-2 md:space-x-3">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Clock className="text-white" size={20} />
              </div>
              <h1 className="text-xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                StudySphere
              </h1>
            </div>
            )}
          </div>
          
          {/* Navigation Tabs - Right Side */}
          <div className="flex items-center ml-2 md:ml-6">
            <nav className="hidden lg:flex space-x-1">
              {tabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <div key={tab.id} className="relative">
                    <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`flex items-center space-x-2 px-3 md:px-4 py-2 rounded-xl transition-all border border-transparent min-h-[44px] ${
                      isActive
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                    }`}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.borderColor = currentTheme.buttonColor;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.borderColor = 'transparent';
                      }
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = currentTheme.buttonColor;
                      e.currentTarget.style.boxShadow = `0 0 0 3px ${currentTheme.buttonColor}20`;
                    }}
                    onBlur={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.borderColor = 'transparent';
                      }
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <Icon size={20} />
                    <span className="text-sm md:text-base">{tab.label}</span>
                    </button>
                    {tab.badge && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Mobile navigation */}
        <div className="lg:hidden border-t border-gray-200">
          <div className="flex justify-around py-2 px-1">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex flex-col items-center space-y-1 p-2 rounded-lg transition-all border border-transparent min-h-[52px] min-w-[52px] ${
                    isActive
                      ? 'text-blue-700'
                      : 'text-gray-600'
                  }`}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.borderColor = currentTheme.buttonColor;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.borderColor = 'transparent';
                    }
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = currentTheme.buttonColor;
                    e.currentTarget.style.boxShadow = `0 0 0 2px ${currentTheme.buttonColor}20`;
                  }}
                  onBlur={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.borderColor = 'transparent';
                    }
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <Icon size={24} />
                  <span className="text-xs font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};