import React, { useState } from 'react';
import { Play, Pause, Square, BookOpen, RotateCcw, Palette, ChevronDown, Maximize, Minimize, Waves, Circle } from 'lucide-react';
import { useTimer } from '../hooks/useTimer';
import { Celebration } from './Celebration';
import { colorThemes, getColorTheme } from '../utils/themes';
import { useTheme } from '../hooks/useTheme';
import type { StudyGroup, ChatMessage, User, Friend } from '../types';

interface TimerProps {
  onSessionComplete: (duration: number, subject: string, startTime: Date, endTime: Date) => void;
  groups?: StudyGroup[];
  messages?: ChatMessage[];
  currentUser?: User;
  friends?: Friend[];
  onOpenChat?: (groupId: string) => void;
}

export const Timer: React.FC<TimerProps> = ({ 
  onSessionComplete, 
  groups = [], 
  messages = [], 
  currentUser, 
  friends = [], 
  onOpenChat 
}) => {
  const { 
    timer, 
    startTimer, 
    setTargetDuration, 
    pauseTimer, 
    resumeTimer, 
    stopTimer, 
    formatTime,
    reset,
    showCelebration,
    hideCelebration
  } = useTimer();
  const [subject, setSubject] = useState('');
  const { currentTheme } = useTheme();
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [customMinutes, setCustomMinutes] = useState(25);
  const [breakCount, setBreakCount] = useState(0);
  const [breakDuration, setBreakDuration] = useState(5);
  const [selectedColorTheme, setSelectedColorTheme] = useState('blue');
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [backgroundStyle, setBackgroundStyle] = useState<'waves' | 'bubbles' | 'particles' | 'minimal'>('waves');
  const [showBackgroundDropdown, setShowBackgroundDropdown] = useState(false);

  const handleStart = () => {
    if (!subject.trim()) return;
    
    // Request notification permission before starting
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          startTimer(subject, undefined, breakCount, breakDuration);
        } else {
          // Still start timer even if notifications are denied
          startTimer(subject, undefined, breakCount, breakDuration);
          alert('Notifications are disabled. You won\'t receive break reminders when away from the app.');
        }
      });
    } else {
      startTimer(subject, undefined, breakCount, breakDuration);
    }
  };

  const handleStop = () => {
    const session = stopTimer();
    onSessionComplete(session.duration, session.subject, session.startTime, session.endTime);
    setSubject('');
  };

  // Show notification permission status
  const getNotificationStatus = () => {
    if (!('Notification' in window)) return 'Not supported';
    switch (Notification.permission) {
      case 'granted': return 'Enabled ✅';
      case 'denied': return 'Disabled ❌';
      default: return 'Not requested';
    }
  };

  const handleReset = () => {
    reset();
  };

  const handleCelebrationComplete = () => {
    hideCelebration();
    if (timer.timeElapsed > 0) {
      onSessionComplete(timer.timeElapsed, timer.currentSubject);
    }
  };

  const handleDurationChange = () => {
    setTargetDuration(customMinutes);
    setShowDurationPicker(false);
  };

  const targetMinutes = Math.floor(timer.targetDuration / 60);

  // Calculate progress based on target session (e.g., 25 minutes = 100%)
  const progress = Math.min((timer.timeElapsed / timer.targetDuration) * 100, 100);

  React.useEffect(() => {
    setCustomMinutes(targetMinutes);
  }, [targetMinutes]);

  const currentColorTheme = getColorTheme(selectedColorTheme);

  const backgroundStyles = [
    { id: 'waves', name: 'Flowing Waves', icon: Waves },
    { id: 'bubbles', name: 'Floating Bubbles', icon: Circle },
    { id: 'particles', name: 'Gentle Particles', icon: Circle },
    { id: 'minimal', name: 'Minimal', icon: Minimize }
  ];

  const renderAnimatedBackground = () => {
    const baseColor = currentColorTheme.color;
    const waveColor = currentColorTheme.waveColor;

    switch (backgroundStyle) {
      case 'bubbles':
        return (
          <div className="absolute inset-0 overflow-hidden">
            {/* Floating Bubbles */}
            {[...Array(12)].map((_, i) => (
              <div
                key={`bubble-${i}`}
                className="absolute rounded-full opacity-100 animate-pulse shadow-2xl"
                style={{
                  backgroundColor: baseColor,
                  width: `${20 + (i % 4) * 15}px`,
                  height: `${20 + (i % 4) * 15}px`,
                  left: `${(i * 8.33) % 100}%`,
                  top: `${(i * 7) % 100}%`,
                  animationDuration: `${4 + (i % 3) * 2}s`,
                  animationDelay: `${i * 0.5}s`,
                  transform: `translateY(${Math.sin(i) * 20}px)`,
                  boxShadow: `0 0 60px ${baseColor}, inset 0 0 30px ${baseColor}, 0 0 100px ${baseColor}80, 0 0 150px ${baseColor}60`
                }}
              />
            ))}
            
            {/* Bubble Movement Animation */}
            <div 
              className="absolute inset-0 opacity-95"
              style={{
                background: `radial-gradient(circle at 30% 70%, ${baseColor}90, transparent 50%), 
                            radial-gradient(circle at 70% 30%, ${baseColor}80, transparent 50%),
                            radial-gradient(circle at 50% 90%, ${baseColor}95, transparent 40%)`,
                animation: 'floatBubbles 25s ease-in-out infinite'
              }}
            />
          </div>
        );

      case 'particles':
        return (
          <div className="absolute inset-0 overflow-hidden">
            {/* Particle Field */}
            {[...Array(20)].map((_, i) => (
              <div
                key={`particle-${i}`}
                className="absolute w-6 h-6 rounded-full opacity-100 shadow-2xl"
                style={{
                  backgroundColor: baseColor,
                  left: `${(i * 5) % 100}%`,
                  top: `${(i * 3.7) % 100}%`,
                  animation: `floatParticle ${8 + (i % 4) * 2}s ease-in-out infinite`,
                  animationDelay: `${i * 0.3}s`,
                  boxShadow: `0 0 40px ${baseColor}, 0 0 60px ${baseColor}80, 0 0 80px ${baseColor}60`
                }}
              />
            ))}
            
            {/* Particle Connections */}
            <div 
              className="absolute inset-0 opacity-90"
              style={{
                background: `linear-gradient(45deg, transparent 20%, ${baseColor}90 50%, transparent 80%),
                            linear-gradient(-45deg, transparent 30%, ${baseColor}80 60%, transparent 90%)`,
                backgroundSize: '200% 200%',
                animation: 'moveParticleField 20s linear infinite'
              }}
            />
          </div>
        );

      case 'minimal':
        return (
          <div className="absolute inset-0 overflow-hidden">
            {/* Simple Gradient Shift */}
            <div 
              className="absolute inset-0 opacity-95"
              style={{
                background: `linear-gradient(135deg, ${baseColor}, ${baseColor}90, ${baseColor}80)`,
                animation: 'gentleShift 30s ease-in-out infinite'
              }}
            />
          </div>
        );

      default: // waves
        return (
          <div className="absolute inset-0 overflow-hidden">
            {/* Moving Wave Animation */}
            <div 
              className="absolute inset-0 opacity-90"
              style={{
                background: `linear-gradient(45deg, ${baseColor}90, transparent 20%, ${baseColor}80 50%, transparent 80%)`,
                backgroundSize: '400% 400%',
                animation: 'moveWave 20s ease-in-out infinite'
              }}
            />
            
            {/* Secondary Moving Wave */}
            <div 
              className="absolute inset-0 opacity-85"
              style={{
                background: `linear-gradient(-45deg, transparent 10%, ${baseColor}85 30%, transparent 60%, ${baseColor}75)`,
                backgroundSize: '300% 300%',
                animation: 'moveWave 25s ease-in-out infinite reverse'
              }}
            />
            
            {/* Gentle Vertical Wave */}
            <div 
              className="absolute inset-0 opacity-80"
              style={{
                background: `linear-gradient(90deg, transparent, ${baseColor}85 20%, transparent 40%, ${baseColor}90 70%, transparent)`,
                backgroundSize: '200% 100%',
                animation: 'moveWaveHorizontal 30s linear infinite'
              }}
            />
          </div>
        );
    }
  };

  // Full-screen timer view
  if (isFullScreen) {
    return (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${currentColorTheme.color}, ${currentColorTheme.color}dd)`
        }}
      >
        {/* Animated Background */}
        {renderAnimatedBackground()}

        <div className="w-full h-full flex flex-col items-center justify-center relative">
          {/* Minimize Button */}
          <button
            onClick={() => setIsFullScreen(false)}
            className="absolute top-6 right-6 p-3 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full transition-all shadow-lg hover:shadow-xl z-10"
            style={{ color: selectedColorTheme === 'white' ? '#374151' : '#1f2937' }}
          >
            <Minimize size={24} />
          </button>

          {/* Background Style Selector */}
          <div className="absolute top-6 left-6 z-10">
            <div className="relative">
              <button
                onClick={() => setShowBackgroundDropdown(!showBackgroundDropdown)}
                className="flex items-center space-x-2 px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-all shadow-lg"
                style={{ color: selectedColorTheme === 'white' ? '#374151' : '#1f2937' }}
              >
                {React.createElement(backgroundStyles.find(s => s.id === backgroundStyle)?.icon || Waves, { size: 16 })}
                <span className="text-sm font-medium">
                  {backgroundStyles.find(s => s.id === backgroundStyle)?.name}
                </span>
                <ChevronDown size={14} />
              </button>
              
              {showBackgroundDropdown && (
                <div className="absolute left-0 top-full mt-2 bg-white rounded-lg shadow-xl border border-gray-200 z-20 min-w-48">
                  <div className="p-2">
                    <div className="text-xs font-medium text-gray-500 px-3 py-2">Background Style</div>
                    {backgroundStyles.map((style) => (
                      <button
                        key={style.id}
                        onClick={() => {
                          setBackgroundStyle(style.id as any);
                          setShowBackgroundDropdown(false);
                        }}
                        className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                          backgroundStyle === style.id ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
                        }`}
                      >
                        <style.icon size={16} />
                        <span className="font-medium">{style.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Full-Screen Timer Display */}
          <div className="text-center mb-12">
            <div className="mb-8">
              <div 
                className="text-9xl font-mono font-bold mb-4"
                style={{ color: selectedColorTheme === 'white' ? '#374151' : '#1f2937' }}
              >
                {timer.isOnBreak ? formatTime(timer.breakTimeElapsed) : formatTime(timer.timeElapsed)}
              </div>
              {timer.isOnBreak && (
                <div 
                  className="text-3xl font-semibold mb-4"
                  style={{ color: selectedColorTheme === 'white' ? '#ea580c' : '#ea580c' }}
                >
                  Break Time! ({timer.currentBreak}/{timer.breakCount})
                </div>
              )}
              <div 
                className="text-xl"
                style={{ color: selectedColorTheme === 'white' ? '#6b7280' : '#4b5563' }}
              >
                {timer.isOnBreak 
                  ? `Break: ${Math.floor(timer.breakDuration / 60)}m`
                  : `Target: ${Math.floor(targetMinutes / 60) > 0 ? `${Math.floor(targetMinutes / 60)}h ` : ''}${targetMinutes % 60}m`
                }
                {timer.breakCount > 0 && !timer.isOnBreak && (
                  <span className="ml-4" style={{ color: currentColorTheme.color }}>
                    • {timer.breakCount} breaks ({Math.floor(timer.breakDuration / 60)}m each)
                  </span>
                )}
              </div>
            </div>
            
            {timer.currentSubject && (
              <div 
                className="flex items-center justify-center text-2xl mb-8"
                style={{ color: selectedColorTheme === 'white' ? '#374151' : '#1f2937' }}
              >
                <BookOpen size={28} className="mr-3" />
                {timer.currentSubject}
              </div>
            )}
          </div>

          {/* Full-Screen Controls */}
          <div className="flex justify-center space-x-6">
            {timer.isActive && (
              <>
                <button
                  onClick={timer.isPaused ? resumeTimer : pauseTimer}
                  className="flex items-center space-x-3 px-8 py-4 bg-yellow-600 text-white rounded-xl hover:bg-yellow-700 transition-colors shadow-lg hover:shadow-xl text-lg font-medium"
                >
                  {timer.isPaused ? <Play size={24} /> : <Pause size={24} />}
                  <span>{timer.isPaused ? 'Resume' : 'Pause'}</span>
                </button>
                <button
                  onClick={handleStop}
                  className="flex items-center space-x-3 px-8 py-4 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors shadow-lg hover:shadow-xl text-lg font-medium"
                >
                  <Square size={24} />
                  <span>Stop</span>
                </button>
              </>
            )}
            
            {!timer.isActive && timer.timeElapsed > 0 && (
              <button
                onClick={handleReset}
                className="flex items-center space-x-3 px-8 py-4 bg-gray-500 hover:bg-gray-600 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl text-lg"
              >
                <RotateCcw size={24} />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Full-Screen Progress Bar */}
          {timer.isActive && (
            <div className="absolute bottom-12 left-12 right-12">
              {timer.isOnBreak ? (
                <div>
                  <div className="flex justify-between text-lg text-orange-600 mb-3">
                    <span>Break Progress</span>
                    <span>{Math.round((timer.breakTimeElapsed / timer.breakDuration) * 100)}%</span>
                  </div>
                  <div className="w-full bg-orange-200 rounded-full h-4">
                    <div 
                      className="bg-gradient-to-r from-orange-400 to-yellow-500 h-4 rounded-full transition-all duration-1000"
                      style={{ width: `${(timer.breakTimeElapsed / timer.breakDuration) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ) : (
                <div>
                  <div 
                    className="flex justify-between text-lg mb-3"
                    style={{ color: selectedColorTheme === 'white' ? '#374151' : '#1f2937' }}
                  >
                    <span>Study Progress</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full bg-white bg-opacity-30 rounded-full h-4">
                    <div 
                      className="h-4 rounded-full transition-all duration-1000"
                      style={{ 
                        width: `${progress}%`,
                        background: `linear-gradient(to right, ${currentColorTheme.color}, ${currentColorTheme.color}dd)`
                      }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        <Celebration 
          isVisible={showCelebration} 
          onComplete={handleCelebrationComplete}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 md:gap-6 max-w-6xl mx-auto">
      <div className="theme-secondary-bg rounded-2xl shadow-xl p-4 md:p-8 flex-1 max-w-2xl">
      <div className="text-center mb-4 md:mb-8">
        <div className="flex flex-col md:flex-row items-center justify-between mb-4 space-y-3 md:space-y-0">
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-1 md:mb-2">Study Timer</h2>
            <p className="text-sm md:text-base text-gray-600">Focus and watch your progress move forward</p>
          </div>
          
          {/* Color Theme Selector */}
          <div className="relative">
            <button
              onClick={() => setShowThemeDropdown(!showThemeDropdown)}
              className="flex items-center space-x-2 px-3 md:px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors secondary-btn min-h-[44px]"
            >
              <Palette size={16} />
              <div 
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: colorThemes[selectedColorTheme].color }}
              />
              <span className="text-sm font-medium">{colorThemes[selectedColorTheme].name}</span>
              <ChevronDown size={16} />
            </button>
            
            {showThemeDropdown && (
              <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-xl border border-gray-200 z-10 min-w-48">
                <div className="p-2">
                  <div className="text-xs font-medium text-gray-500 px-3 py-2">Choose Color</div>
                  {Object.entries(colorThemes).map(([key, theme]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setSelectedColorTheme(key);
                        setShowThemeDropdown(false);
                      }}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                        selectedColorTheme === key ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
                      }`}
                    >
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: theme.color }}
                      />
                      <span className="font-medium">{theme.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Background Style Selector for Regular View */}
        <div className="mt-3 md:mt-4 flex items-center justify-center">
          <div className="relative">
            <button
              onClick={() => setShowBackgroundDropdown(!showBackgroundDropdown)}
              className="flex items-center space-x-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm secondary-btn min-h-[44px]"
            >
              {React.createElement(backgroundStyles.find(s => s.id === backgroundStyle)?.icon || Waves, { size: 14 })}
              <span className="font-medium">
                {backgroundStyles.find(s => s.id === backgroundStyle)?.name}
              </span>
              <ChevronDown size={12} />
            </button>
            
            {showBackgroundDropdown && (
              <div className="absolute left-1/2 transform -translate-x-1/2 top-full mt-2 bg-white rounded-lg shadow-xl border border-gray-200 z-10 min-w-48">
                <div className="p-2">
                  <div className="text-xs font-medium text-gray-500 px-3 py-2">Background Style</div>
                  {backgroundStyles.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => {
                        setBackgroundStyle(style.id as any);
                        setShowBackgroundDropdown(false);
                      }}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                        backgroundStyle === style.id ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
                      }`}
                    >
                      <style.icon size={14} />
                      <span className="font-medium">{style.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Notification Status */}
        <div className="mt-3 md:mt-4 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="text-blue-700 font-medium">Break Notifications:</span>
            <span className="text-blue-600">{getNotificationStatus()}</span>
          </div>
          {Notification.permission !== 'granted' && (
            <p className="text-xs text-blue-600 mt-1">Enable notifications to get break reminders when away from the app.</p>
          )}
        </div>
      </div>

      <div className="mt-4 md:mt-8">
        {/* Timer display */}
        <div className="text-center mb-4 md:mb-8">
          <div className="mb-3 md:mb-4">
            <button
              onClick={() => !timer.isActive && setShowDurationPicker(true)}
              disabled={timer.isActive}
              className={`text-4xl md:text-6xl font-mono font-bold text-gray-800 mb-2 block mx-auto ${
                !timer.isActive ? 'hover:text-blue-600 cursor-pointer transition-colors' : 'cursor-default'
              }`}
            >
              {timer.isOnBreak ? formatTime(timer.breakTimeElapsed) : formatTime(timer.timeElapsed)}
            </button>
            
            {/* Full-Screen Button */}
            {timer.isActive && (
              <button
                onClick={() => setIsFullScreen(true)}
                className="mt-2 md:mt-3 flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors mx-auto min-h-[44px]"
              >
                <Maximize size={16} />
                <span>Full Screen</span>
              </button>
            )}
            
            {timer.isOnBreak && (
              <div className="text-lg font-semibold text-orange-600 mb-2">
                Break Time! ({timer.currentBreak}/{timer.breakCount})
              </div>
            )}
            <div className="text-sm text-gray-500">
              {timer.isOnBreak 
                ? `Break: ${Math.floor(timer.breakDuration / 60)}m`
                : `Target: ${Math.floor(targetMinutes / 60) > 0 ? `${Math.floor(targetMinutes / 60)}h ` : ''}${targetMinutes % 60}m`
              }
              {timer.breakCount > 0 && !timer.isOnBreak && (
                <span className="ml-2 text-blue-600">
                  • {timer.breakCount} breaks ({Math.floor(timer.breakDuration / 60)}m each)
                </span>
              )}
            </div>
          </div>
          
          {timer.currentSubject && (
            <div className="flex items-center justify-center text-lg text-gray-600">
              <BookOpen size={20} className="mr-2" />
              {timer.currentSubject}
            </div>
          )}
        </div>

        {/* Duration picker modal */}
        {showDurationPicker && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4">
              <h4 className="text-xl font-bold text-gray-800 mb-4">Set Study Duration</h4>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Study Duration (minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  max="480"
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl font-mono"
                />
                <div className="mt-2 flex justify-center space-x-2">
                  {[15, 25, 45, 60, 90].map(minutes => (
                    <button
                      key={minutes}
                      type="button"
                      onClick={() => setCustomMinutes(minutes)}
                      className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      {minutes}m
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Breaks
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={breakCount}
                  onChange={(e) => setBreakCount(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-xl font-mono"
                />
                <div className="mt-2 flex justify-center space-x-2">
                  {[0, 1, 2, 3, 4].map(count => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setBreakCount(count)}
                      className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>
              
              {breakCount > 0 && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Break Duration (minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={breakDuration}
                    onChange={(e) => setBreakDuration(parseInt(e.target.value) || 5)}
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-xl font-mono theme-textbox"
                  />
                  <div className="mt-2 flex justify-center space-x-2">
                    {[5, 10, 15, 20].map(minutes => (
                      <button
                        key={minutes}
                        type="button"
                        onClick={() => setBreakDuration(minutes)}
                        className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        {minutes}m
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDurationPicker(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDurationChange}
                  className="flex-1 px-4 py-2 rounded-lg transition-colors btn-primary"
                  style={{
                    backgroundColor: currentTheme.buttonColor,
                    color: getContrastTextColor(currentTheme.buttonColor)
                  }}
                >
                  Set Duration
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Subject input */}
        {!timer.isActive && (
          <div className="mb-4 md:mb-6">
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
              What are you studying?
            </label>
            <input
              type="text"
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., Mathematics, History, Programming..."
              className="w-full px-4 py-3 md:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base min-h-[44px]"
            />
          </div>
        )}

        {/* Main Control Buttons */}
        <div className="flex justify-center space-x-3 md:space-x-4">
          {!timer.isActive ? (
            <div className="flex space-x-3 md:space-x-4">
              <button
                onClick={handleStart}
                disabled={!subject.trim()}
                className="flex items-center space-x-2 px-6 md:px-8 py-3 rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shadow-lg hover:shadow-xl btn-primary min-h-[48px] text-base md:text-lg"
              >
                <Play size={20} />
                <span>Start</span>
              </button>
            </div>
          ) : (
            <div className="flex space-x-3 md:space-x-4">
              <button
                onClick={timer.isPaused ? resumeTimer : pauseTimer}
                className="flex items-center space-x-2 px-5 md:px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors shadow-lg hover:shadow-xl min-h-[48px]"
              >
                {timer.isPaused ? <Play size={20} /> : <Pause size={20} />}
                <span>{timer.isPaused ? 'Resume' : 'Pause'}</span>
              </button>
              <button
                onClick={handleStop}
                className="flex items-center space-x-2 px-5 md:px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-lg hover:shadow-xl min-h-[48px]"
              >
                <Square size={20} />
                <span>Stop</span>
              </button>
            </div>
          )}
          
          {!timer.isActive && timer.timeElapsed > 0 && (
            <button
              onClick={handleReset}
              className="flex items-center space-x-2 px-5 md:px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 min-h-[48px]"
            >
              <RotateCcw size={20} />
              Reset
            </button>
          )}
        </div>

        {/* Progress bar */}
        {timer.isActive && (
          <div className="mt-6">
            {timer.isOnBreak ? (
              <div>
                <div className="flex justify-between text-sm text-orange-600 mb-2">
                  <span>Break Progress</span>
                  <span>{Math.round((timer.breakTimeElapsed / timer.breakDuration) * 100)}%</span>
                </div>
                <div className="w-full bg-orange-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-orange-400 to-yellow-500 h-2 rounded-full transition-all duration-1000"
                    style={{ width: `${(timer.breakTimeElapsed / timer.breakDuration) * 100}%` }}
                  ></div>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Study Progress</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full transition-all duration-1000"
                    style={{ 
                      width: `${progress}%`,
                      background: `linear-gradient(to right, ${currentColorTheme.color}, ${currentColorTheme.color}dd)`
                    }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      <Celebration 
        isVisible={showCelebration} 
        onComplete={handleCelebrationComplete}
      />
      </div>
    </div>
  );
};

// Helper function
const getContrastTextColor = (backgroundColor: string): string => {
  const hex = backgroundColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? '#1f2937' : '#ffffff';
};