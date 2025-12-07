import { useState, useEffect, useRef } from 'react';
import { TimerState } from '../types';

// Notification utility functions
const requestNotificationPermission = async () => {
  if ('Notification' in window && Notification.permission === 'default') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return Notification.permission === 'granted';
};

const showNotification = (title: string, body: string, icon?: string) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    const notification = new Notification(title, {
      body,
      icon: icon || '/vite.svg',
      badge: '/vite.svg',
      tag: 'studysphere-timer',
      requireInteraction: false,
      silent: false
    });
    
    // Auto-close after 5 seconds
    setTimeout(() => {
      notification.close();
    }, 5000);
    
    return notification;
  }
  return null;
};

export const useTimer = () => {
  // Load persisted state from localStorage on mount
  const [timer, setTimer] = useState<TimerState>(() => {
    try {
      const saved = localStorage.getItem('studysphere-timer-state');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load timer state:', e);
    }
    return {
      isActive: false,
      isPaused: false,
      isOnBreak: false,
      timeElapsed: 0,
      targetDuration: 25 * 60, // Default 25 minutes
      currentSubject: '',
      breakCount: 0,
      breakDuration: 5 * 60, // Default 5 minutes
      currentBreak: 0,
      breakTimeElapsed: 0,
    };
  });
  const [showCelebration, setShowCelebration] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const lastStateRef = useRef<TimerState | null>(null);

  // Persist timer state to localStorage
  const persistTimerState = (state: TimerState) => {
    try {
      localStorage.setItem('studysphere-timer-state', JSON.stringify(state));
    } catch (e) {
      console.error('Failed to persist timer state:', e);
    }
  };

  // Initialize Web Worker
  useEffect(() => {
    if (typeof Worker !== 'undefined') {
      workerRef.current = new Worker('/timer-worker.js');

      workerRef.current.onmessage = (e) => {
        const { type, data } = e.data;
        
        switch (type) {
          case 'STATE_UPDATE':
            setTimer(data);
            lastStateRef.current = data;
            persistTimerState(data);
            break;

          case 'PERSIST_STATE':
            // Worker requested state persistence
            persistTimerState(data);
            break;
            
          case 'TIMER_STARTED':
          case 'TIMER_PAUSED':
          case 'TIMER_RESUMED':
          case 'TIMER_RESET':
            setTimer(data);
            lastStateRef.current = data;
            persistTimerState(data);
            break;
            
          case 'TIMER_STOPPED':
            setTimer(data.timerState);
            lastStateRef.current = data.timerState;
            persistTimerState(data.timerState);
            break;
            
          case 'SESSION_COMPLETE':
            setShowCelebration(true);
            setTimer(prev => ({ ...prev, isActive: false }));
            break;
            
          case 'BREAK_STARTED':
            showNotification(
              '☕ Break Time!',
              `Time for a ${Math.floor(data.breakDuration)}-minute break from ${data.subject}. Break ${data.breakNumber} of ${data.totalBreaks}.`,
              '☕'
            );
            break;
            
          case 'BREAK_ENDED':
            showNotification(
              '📚 Back to Study!',
              `Break is over! Time to get back to studying ${data.subject}.`,
              '📚'
            );
            break;
        }
      };

      // Load persisted state into worker
      const savedState = localStorage.getItem('studysphere-timer-state');
      if (savedState) {
        try {
          const parsed = JSON.parse(savedState);
          workerRef.current.postMessage({ type: 'LOAD_STATE', data: parsed });
        } catch (e) {
          console.error('Failed to load state into worker:', e);
          workerRef.current.postMessage({ type: 'GET_STATE' });
        }
      } else {
        workerRef.current.postMessage({ type: 'GET_STATE' });
      }
    }
    
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  // Handle page visibility changes to sync state
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && workerRef.current) {
        // Page became visible, request current state
        workerRef.current.postMessage({ type: 'GET_STATE' });
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Request notification permission on first load
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  const startTimer = (subject: string, duration?: number, breakCount?: number, breakDuration?: number) => {
    const timerData = {
      targetDuration: duration || timer.targetDuration,
      currentSubject: subject,
      breakCount: breakCount || 0,
      breakDuration: (breakDuration || 5) * 60,
      subject: subject
    };
    
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'START_TIMER', data: timerData });
    }
    
    // Show notification that timer started
    showNotification(
      '🎯 Study Session Started!',
      `Started studying ${subject} for ${Math.floor((duration || timer.targetDuration) / 60)} minutes.`,
      '🎯'
    );
  };

  const setTargetDuration = (minutes: number) => {
    setTimer(prev => ({ ...prev, targetDuration: minutes * 60 }));
  };

  const pauseTimer = () => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'PAUSE_TIMER' });
    }
  };

  const resumeTimer = () => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'RESUME_TIMER' });
    }
  };

  const stopTimer = () => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'STOP_TIMER' });
    }

    const currentState = lastStateRef.current || timer;
    const durationInMinutes = Math.floor(currentState.timeElapsed / 60);

    const actualStartTime = currentState.startTime
      ? new Date(currentState.startTime)
      : new Date(Date.now() - currentState.timeElapsed * 1000);

    const session = {
      id: Date.now().toString(),
      duration: durationInMinutes,
      subject: currentState.currentSubject,
      startTime: actualStartTime,
      endTime: new Date(),
    };

    return session;
  };

  const reset = () => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'RESET_TIMER' });
    }
    setShowCelebration(false);
  };

  const hideCelebration = () => {
    setShowCelebration(false);
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Update localStorage to track timer state for navigation badge
  useEffect(() => {
    localStorage.setItem('studysphere-timer-active', timer.isActive.toString());
    
    // Dispatch storage event for same-tab updates
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'studysphere-timer-active',
      newValue: timer.isActive.toString()
    }));
  }, [timer.isActive]);

  return {
    timer,
    startTimer,
    setTargetDuration,
    pauseTimer,
    resumeTimer,
    stopTimer,
    reset,
    formatTime,
    showCelebration,
    hideCelebration,
  };
};