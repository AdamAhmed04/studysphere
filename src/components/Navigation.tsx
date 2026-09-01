import React, { useState, useEffect, useRef } from 'react';
import { Clock, Users, MessageSquare, BarChart3, Settings, User, Calendar, Search, ChevronDown, Play, Pause, MoreHorizontal } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { Avatar } from './Avatar';

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
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
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

  /*
   * Below 360px seven full-word labels do not fit. "Calendar" needs 38.8px at
   * a 9px font and only 42.3px is available even with zero button padding and
   * zero gaps, so the row cannot be tuned into fitting - something has to come
   * out of it.
   *
   * The last two collapse behind a "More" button, leaving five tabs plus More.
   * At 320px that gives each button 47.7px, and the longest label still on the
   * bar ("Friends", 35.6px) roughly 8px of slack.
   *
   * Why these two: Settings loses least by moving, because it is already
   * reachable from the profile dropdown above. Calendar follows because it
   * owns the longest label, which is what breaks the row in the first place.
   *
   * The split is CSS-only ('hidden xs:flex'), so no viewport is measured in
   * JS and there is no resize listener to keep in sync.
   */
  const OVERFLOW_TAB_IDS = ['calendar', 'settings'];
  const overflowTabs = tabs.filter(tab => OVERFLOW_TAB_IDS.includes(tab.id));
  const isOverflowTabActive = OVERFLOW_TAB_IDS.includes(activeTab);

  /*
   * A menu that cannot be dismissed is worse than no menu, and on a 320px
   * screen there is very little bare background left to tap. So it closes on
   * outside press and on Escape, not only on selection.
   */
  useEffect(() => {
    if (!showMoreMenu) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowMoreMenu(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showMoreMenu]);


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
                <Avatar
                  name={userProfile.username}
                  src={userProfile.avatar}
                  alt={userProfile.name}
                  className="w-10 h-10 md:w-12 md:h-12 border-2 border-white shadow-md"
                  textClassName="text-base md:text-lg"
                  gradient="from-green-400 to-blue-500"
                />
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
        {/*
          Seven items share the width evenly rather than each claiming a fixed
          52px. At 375px that fixed width left "Calendar" exactly filling its
          own button and only 2px of gap before "Settings", where every other
          pair had 11-20px. flex-1 with min-w-0 divides the row instead of
          overflowing it, and the label steps down a size on the narrowest
          screens so the longest one is comfortable rather than exact.

          min-h stays at 52px: that is the touch target, and it should not
          shrink.
        */}
        <div className="lg:hidden border-t border-gray-200">
          <div className="relative flex items-stretch gap-0.5 py-2 px-1">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const inOverflow = OVERFLOW_TAB_IDS.includes(tab.id);
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`${inOverflow ? 'hidden xs:flex' : 'flex'} flex-1 min-w-0 flex-col items-center justify-center gap-1 px-0.5 py-2 rounded-lg transition-all border border-transparent min-h-[52px] ${
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
                  <Icon size={22} className="shrink-0" />
                  <span className="text-[10px] sm:text-xs font-medium leading-none">{tab.label}</span>
                </button>
              );
            })}

            {/*
              Rendered only below the xs breakpoint, and the whole wrapper -
              button and menu together - is what hides above it, so a menu left
              open cannot survive the viewport widening past the point where
              its tabs are back on the bar.
            */}
            <div ref={moreMenuRef} className="relative flex xs:hidden flex-1 min-w-0">
              <button
                type="button"
                onClick={() => setShowMoreMenu(open => !open)}
                aria-haspopup="menu"
                aria-expanded={showMoreMenu}
                aria-label={`More tabs: ${overflowTabs.map(tab => tab.label).join(', ')}`}
                className={`flex w-full min-w-0 flex-col items-center justify-center gap-1 px-0.5 py-2 rounded-lg transition-all border border-transparent min-h-[52px] ${
                  isOverflowTabActive || showMoreMenu
                    ? 'text-blue-700'
                    : 'text-gray-600'
                }`}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = currentTheme.buttonColor;
                  e.currentTarget.style.boxShadow = `0 0 0 2px ${currentTheme.buttonColor}20`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'transparent';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <MoreHorizontal size={22} className="shrink-0" />
                <span className="text-[10px] font-medium leading-none">More</span>
              </button>

              {showMoreMenu && (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-50 mt-1 min-w-[10rem] rounded-xl border border-gray-200 bg-white p-2 shadow-xl"
                >
                  {overflowTabs.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        role="menuitem"
                        onClick={() => {
                          onTabChange(tab.id);
                          setShowMoreMenu(false);
                        }}
                        className={`flex w-full items-center gap-3 px-4 py-3 rounded-lg text-left font-medium transition-all min-h-[44px] ${
                          isActive
                            ? 'bg-blue-100 text-blue-700'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <Icon size={18} />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};