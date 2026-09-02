import React, { useState } from 'react';
import { Play, Pause, Square, BookOpen, RotateCcw, Maximize, Minimize } from 'lucide-react';
import { useTimerContext } from '../contexts/TimerContext';
import { AuroraGround } from './AuroraGround';
import { WheelPicker } from './WheelPicker';
import { Celebration } from './Celebration';
import { Dial } from './Dial';
import { isNotificationSupported, getNotificationPermission } from '../utils/safeNotification';
/*
 * Wheel ranges. Minutes go 0-59 and hours 0-8 rather than one long list of
 * minutes: scrolling to 90 through a single column is a lot of flicking, and
 * hours-plus-minutes is how every clock people already use is set.
 */
const HOUR_VALUES = Array.from({ length: 9 }, (_, i) => i);
const MINUTE_VALUES = Array.from({ length: 60 }, (_, i) => i);
const BREAK_COUNT_VALUES = Array.from({ length: 11 }, (_, i) => i);
const BREAK_LENGTH_VALUES = Array.from({ length: 30 }, (_, i) => i + 1);

const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours && rest) return `${hours}h ${rest}m`;
  if (hours) return `${hours}h`;
  return `${rest}m`;
};

interface TimerProps {
  onSessionComplete: (duration: number, subject: string, startTime: Date, endTime: Date) => void;
}

export const Timer: React.FC<TimerProps> = ({ onSessionComplete }) => {
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
    hideCelebration,
    completedSession
  } = useTimerContext();
  const [subject, setSubject] = useState('');
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [customMinutes, setCustomMinutes] = useState(25);
  const [breakCount, setBreakCount] = useState(0);
  const [breakDuration, setBreakDuration] = useState(5);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [discardedNote, setDiscardedNote] = useState<string | null>(null);

  const handleStart = () => {
    if (!subject.trim()) return;

    /*
     * Just start the timer.
     *
     * This used to interrupt Start with a notification permission prompt, and
     * pop an alert nagging you if you declined — so pressing Start gave you a
     * dialog instead of a timer. Notifications are opt-in from Settings now,
     * and the status line above the timer already shows whether they are on.
     */
    startTimer(subject, undefined, breakCount, breakDuration);
  };

  const handleStop = () => {
    const session = stopTimer();

    // stopTimer returns null for a session too short to count. Say so rather
    // than discarding it silently, or it looks like the save failed.
    if (!session) {
      setDiscardedNote(
        `That session was under a minute, so it wasn't added to your total.`
      );
      window.setTimeout(() => setDiscardedNote(null), 6000);
      setSubject('');
      return;
    }

    onSessionComplete(session.duration, session.subject, session.startTime, session.endTime);
    setSubject('');
  };

  // Show notification permission status
  const getNotificationStatus = () => {
    if (!isNotificationSupported()) return 'Not supported';
    switch (getNotificationPermission()) {
      case 'granted': return 'Enabled ✅';
      case 'denied': return 'Disabled ❌';
      default: return 'Not requested';
    }
  };

  const handleReset = () => {
    reset();
  };

  const handleCelebrationComplete = () => {
    // Use the worker's session payload. Passing timer.timeElapsed here sent
    // seconds where minutes were expected, and omitted the start/end times
    // entirely — so every naturally-completed session failed to save.
    if (completedSession) {
      onSessionComplete(
        completedSession.duration,
        completedSession.subject,
        completedSession.startTime,
        completedSession.endTime
      );
    }
    hideCelebration();
    setSubject('');
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


  /*
   * Full screen is the same clock on the same ground and nothing else.
   *
   * It used to be a second design: its own gradient, its own animated
   * background, its own set of controls. There is no reason for one app to
   * look like two, and the dial is the thing worth looking at on an empty
   * screen anyway.
   *
   * AuroraGround is rendered again here rather than relied on from the app
   * shell. This overlay sits at z-50 and so creates its own stacking context;
   * the ground outside it would be painted behind the page, not behind this.
   * Its opaque void is also what hides the screen underneath.
   */
  if (isFullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center">
        <AuroraGround />

        <button
          onClick={() => setIsFullScreen(false)}
          className="absolute top-6 right-6 p-3 rounded-full text-muted hover:text-ink transition-colors"
          aria-label="Leave full screen"
        >
          <Minimize size={22} />
        </button>

        <Dial
          progress={
            timer.isOnBreak
              ? (timer.breakDuration ? timer.breakTimeElapsed / timer.breakDuration : 0)
              : progress / 100
          }
          time={timer.isOnBreak ? formatTime(timer.breakTimeElapsed) : formatTime(timer.timeElapsed)}
          label={timer.isOnBreak ? 'Break' : 'Focus'}
          running={timer.isActive && !timer.isPaused}
          size={340}
        />

        {timer.currentSubject && (
          <p className="mt-10 text-xs tracking-[0.22em] uppercase text-muted">
            {timer.currentSubject}
          </p>
        )}

        <div className="mt-12 flex items-center gap-3">
          {timer.isActive && !timer.isPaused && (
            <button
              onClick={pauseTimer}
              className="px-7 py-3 rounded-full bg-pearl text-on-pearl text-sm font-medium min-h-[48px]"
            >
              Pause
            </button>
          )}

          {timer.isActive && timer.isPaused && (
            <button
              onClick={resumeTimer}
              className="px-7 py-3 rounded-full bg-pearl text-on-pearl text-sm font-medium min-h-[48px]"
            >
              Resume
            </button>
          )}

          {timer.isActive && (
            <button
              onClick={handleStop}
              className="px-7 py-3 rounded-full border border-hairline text-ink text-sm font-medium min-h-[48px]"
            >
              Finish
            </button>
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
            <h2 className="text-2xl md:text-3xl font-bold text-ink mb-1 md:mb-2">Study Timer</h2>
            <p className="text-sm md:text-base text-ink/75">Focus and watch your progress move forward</p>
          </div>
          
        </div>
        
        
        {/* Notification Status */}
        <div className="mt-3 md:mt-4 p-3 bg-surface rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink font-medium">Break Notifications:</span>
            <span className="text-sand">{getNotificationStatus()}</span>
          </div>
          {isNotificationSupported() && getNotificationPermission() !== 'granted' && (
            <p className="text-xs text-sand mt-1">Enable notifications to get break reminders when away from the app.</p>
          )}
        </div>
      </div>

      <div className="mt-4 md:mt-8">
        {/* Timer display */}
        <div className="text-center mb-4 md:mb-8">
          <div className="mb-3 md:mb-4 flex flex-col items-center">
            {/*
              * The dial replaces both the numerals and the separate progress
              * bar underneath — the arc is the progress, so keeping a second
              * readout of the same fact was just clutter.
              *
              * Still the control for session length when the timer is idle.
              */}
            <button
              onClick={() => !timer.isActive && setShowDurationPicker(true)}
              disabled={timer.isActive}
              className={`rounded-full ${timer.isActive ? 'cursor-default' : 'cursor-pointer'}`}
              aria-label={timer.isActive ? undefined : 'Change session length'}
            >
              <Dial
                progress={
                  timer.isOnBreak
                    ? (timer.breakDuration ? timer.breakTimeElapsed / timer.breakDuration : 0)
                    : progress / 100
                }
                time={timer.isOnBreak ? formatTime(timer.breakTimeElapsed) : formatTime(timer.timeElapsed)}
                label={timer.isOnBreak ? 'Break' : 'Focus'}
                running={timer.isActive && !timer.isPaused}
                size={244}
              />
            </button>
            
            {/* Full-Screen Button */}
            {timer.isActive && (
              <button
                onClick={() => setIsFullScreen(true)}
                className="mt-2 md:mt-3 flex items-center space-x-2 px-4 py-2 bg-surface-high hover:bg-gray-200 text-ink/75 rounded-lg transition-colors mx-auto min-h-[44px]"
              >
                <Maximize size={16} />
                <span>Full Screen</span>
              </button>
            )}
            
            {timer.isOnBreak && (
              <div className="mt-4 text-base font-medium text-sand">
                Break {timer.currentBreak} of {timer.breakCount}
              </div>
            )}
            <div className="text-sm text-muted">
              {timer.isOnBreak 
                ? `Break: ${Math.floor(timer.breakDuration / 60)}m`
                : `Target: ${Math.floor(targetMinutes / 60) > 0 ? `${Math.floor(targetMinutes / 60)}h ` : ''}${targetMinutes % 60}m`
              }
              {timer.breakCount > 0 && !timer.isOnBreak && (
                <span className="ml-2 text-sand">
                  • {timer.breakCount} breaks ({Math.floor(timer.breakDuration / 60)}m each)
                </span>
              )}
            </div>
          </div>
          
          {timer.currentSubject && (
            <div className="flex items-center justify-center text-lg text-ink/75">
              <BookOpen size={20} className="mr-2" />
              {timer.currentSubject}
            </div>
          )}
        </div>

        {/*
          * Duration picker.
          *
          * The number inputs this replaces coerced an empty field back to a
          * value on every keystroke — `parseInt(e.target.value) || 1` — so the
          * field could never be cleared and 20 had to be reached by nudging 1
          * up to 2 and typing a 0 after it. Wheels have no empty state to
          * mishandle, so the bug cannot recur here.
          */}
        {showDurationPicker && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
            role="presentation"
            onClick={() => setShowDurationPicker(false)}
          >
            {/* Solid, with the hue behind it: a translucent panel over a
                drifting ground made the numbers hard to read. */}
            <div className="absolute inset-0 bg-void/70" />

            <div
              className="relative w-full sm:max-w-sm rounded-t-lg sm:rounded-lg overflow-hidden border border-hairline shadow-2xl"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="duration-picker-title"
            >
              <AuroraGround />

              <div className="p-6">
                <h4 id="duration-picker-title" className="text-lg font-display font-light text-ink mb-6">
                  Session length
                </h4>

                <div className="flex items-center gap-2 mb-4">
                  <WheelPicker
                    label="Hours"
                    unit="h"
                    values={HOUR_VALUES}
                    value={Math.floor(customMinutes / 60)}
                    onChange={(hours) => setCustomMinutes(hours * 60 + (customMinutes % 60))}
                  />
                  <WheelPicker
                    label="Minutes"
                    unit="min"
                    values={MINUTE_VALUES}
                    value={customMinutes % 60}
                    onChange={(minutes) => setCustomMinutes(Math.floor(customMinutes / 60) * 60 + minutes)}
                  />
                </div>

                <div className="flex flex-wrap justify-center gap-2 mb-7">
                  {[15, 25, 45, 60, 90].map(minutes => (
                    <button
                      key={minutes}
                      type="button"
                      onClick={() => setCustomMinutes(minutes)}
                      className={`px-3 py-1.5 text-xs rounded-pill border transition-colors ${
                        customMinutes === minutes
                          ? 'border-sand text-sand'
                          : 'border-hairline text-ink/75'
                      }`}
                    >
                      {minutes}m
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCustomMinutes(0)}
                    className="px-3 py-1.5 text-xs rounded-pill border border-hairline text-muted transition-colors"
                  >
                    Reset
                  </button>
                </div>

                <div className="mb-7">
                  <p className="text-xs uppercase tracking-[0.15em] text-muted mb-2">Breaks</p>
                  <div className="flex items-center gap-2">
                    <WheelPicker
                      label="Number of breaks"
                      values={BREAK_COUNT_VALUES}
                      value={breakCount}
                      onChange={setBreakCount}
                    />
                    {breakCount > 0 && (
                      <WheelPicker
                        label="Break length in minutes"
                        unit="min"
                        values={BREAK_LENGTH_VALUES}
                        value={breakDuration}
                        onChange={setBreakDuration}
                      />
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDurationPicker(false)}
                    className="flex-1 px-4 py-3 rounded-pill border border-hairline text-ink text-sm font-medium min-h-[48px]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDurationChange}
                    disabled={customMinutes < 1}
                    className="flex-1 px-4 py-3 rounded-pill bg-pearl text-on-pearl text-sm font-medium min-h-[48px] disabled:opacity-40"
                  >
                    {customMinutes < 1
                      ? 'Set a length'
                      : `Start ${formatDuration(customMinutes)}`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Told, not silently dropped, when a session was too short to record. */}
        {discardedNote && (
          <div
            role="status"
            className="mb-4 px-4 py-3 rounded-lg bg-sand/10 border border-amber-200 text-sm text-sand"
          >
            {discardedNote}
          </div>
        )}

        {/* Subject input */}
        {!timer.isActive && (
          <div className="mb-4 md:mb-6">
            <label htmlFor="subject" className="block text-sm font-medium text-ink/75 mb-2">
              What are you studying?
            </label>
            <input
              type="text"
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., Mathematics, History, Programming..."
              maxLength={200}
              className="w-full px-4 py-3 md:py-3 border border-hairline rounded-lg focus:ring-2 focus:ring-sand focus:border-transparent transition-all text-base min-h-[44px]"
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

        {/* The linear progress bar lived here. The dial's arc says the same
            thing, in the same glance, so showing both was redundant. */}
      </div>
      
      <Celebration 
        isVisible={showCelebration} 
        onComplete={handleCelebrationComplete}
      />
      </div>
    </div>
  );
};