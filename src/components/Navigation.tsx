import React, { useState, useEffect, useRef } from 'react';
import { Clock, Users, MessageSquare, BarChart3, Settings, User, Calendar, Search, Play, Pause } from 'lucide-react';
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
  const profileMenuRef = useRef<HTMLDivElement>(null);

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
  ];

  /*
   * Six tabs, and six fit. Settings lives in the profile menu instead, where
   * it was already reachable, which is what took the count from seven to six.
   *
   * Seven full-word labels did not fit below 360px, so the last two used to
   * collapse behind a "More" button. That is gone with the seventh: measured
   * at 320px, no label overflows its button and the page does not scroll
   * sideways, so a "More" button would now reveal nothing.
   */

  /*
   * A menu that cannot be dismissed is worse than no menu, and on a phone
   * there is very little bare background left to tap. So it closes on outside
   * press and on Escape, not only on selection.
   */
  useEffect(() => {
    if (!showProfileDropdown) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowProfileDropdown(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showProfileDropdown]);


  return (
    <div className="theme-secondary-bg shadow-lg safe-area-top relative z-40">
      <div className="max-w-7xl mx-auto px-2 md:px-4">
        <div className="flex items-center h-14 md:h-16">
          {/* Profile Section - Top Left Corner */}
          <div className="flex items-center space-x-2 md:space-x-4 mr-2 md:mr-6">
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex items-center justify-center p-1 rounded-full transition-all border border-transparent hover:border-sand/40 min-h-[44px] min-w-[44px]"
                aria-label="Open profile menu"
                aria-expanded={showProfileDropdown}
                aria-haspopup="menu"
              >
                <Avatar
                  name={userProfile.username}
                  src={userProfile.avatar}
                  alt={userProfile.name}
                  className="w-10 h-10 md:w-11 md:h-11 border-2 border-white/15 shadow-md"
                  textClassName="text-base md:text-lg"
                />
              </button>
              
              {/* Profile Dropdown */}
              {showProfileDropdown && (
                <div className="absolute left-0 top-full mt-2 modal-panel rounded-xl shadow-xl z-50 min-w-56 max-w-[calc(100vw-1rem)]">
                  <div className="p-2">
                    <button
                      onClick={() => {
                        onTabChange('profile');
                        setShowProfileDropdown(false);
                      }}
                      className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all text-left hover:bg-surface-high"
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
                      className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all text-left hover:bg-surface-high"
                      style={{ border: '1px solid transparent' }}
                    >
                      <Settings size={18} />
                      <span className="font-medium">Settings</span>
                    </button>
                    <div className="border-t border-hairline-soft my-2"></div>
                    <div className="px-4 py-3">
                      <p className="text-sm text-muted mb-2">Status</p>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                        <span className="text-sm text-ink/75 font-medium">Online</span>
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
                className="flex items-center space-x-2 px-3 md:px-4 py-2 bg-surface-high text-white rounded-xl shadow-lg hover:shadow-xl transition-all min-h-[44px] animate-pulse"
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
              <div className="w-8 h-8 md:w-10 md:h-10 bg-surface-high rounded-xl flex items-center justify-center shadow-lg">
                <Clock className="text-white" size={20} />
              </div>
              <h1 className="text-xl md:text-3xl font-bold text-ink">
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
                    className={`flex items-center space-x-2 px-3 md:px-4 py-2 rounded-xl transition-all border border-transparent hover:border-sand/40 min-h-[44px] ${
                      isActive
                        ? 'bg-surface-high text-ink'
                        : 'text-ink/75 hover:text-ink hover:bg-surface-high'
                    }`}
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
        <div className="lg:hidden border-t border-hairline-soft">
          <div className="relative flex items-stretch gap-0.5 py-2 px-1">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex flex-1 min-w-0 flex-col items-center justify-center gap-1 px-0.5 py-2 rounded-lg transition-all border border-transparent hover:border-sand/40 min-h-[52px] ${
                    isActive
                      ? 'text-ink'
                      : 'text-ink/75'
                  }`}
                >
                  <Icon size={22} className="shrink-0" />
                  <span className="text-[10px] sm:text-xs font-medium leading-none">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};