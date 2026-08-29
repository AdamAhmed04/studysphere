// Timer Web Worker for background execution
let timerId = null;

// Wall-clock anchor for the tick loop. Browsers throttle timers in hidden
// tabs, so we advance by the real elapsed delta rather than assuming 1s/tick.
let lastTick = null;

// Guards against one session being reported complete twice (e.g. when a
// reload resumes a state that was saved one tick before completion).
let sessionCompleted = false;

const DEFAULT_TARGET_DURATION = 25 * 60;

// Initialize timer state (will be loaded from main thread via message)
let timerState = {
  isActive: false,
  isPaused: false,
  isOnBreak: false,
  timeElapsed: 0,
  targetDuration: DEFAULT_TARGET_DURATION,
  breakCount: 0,
  breakDuration: 0,
  currentBreak: 0,
  breakTimeElapsed: 0,
  startTime: null,
  pausedAt: null,
  subject: '',
  currentSubject: ''
};

// Notify main thread to persist state
const persistState = () => {
  self.postMessage({ type: 'PERSIST_STATE', data: timerState });
};

self.onmessage = function(e) {
  const { type, data } = e.data;

  switch (type) {
    case 'LOAD_STATE':
      // Load persisted state from main thread
      if (data) {
        timerState = { ...timerState, ...data };
        if (!timerState.targetDuration || timerState.targetDuration <= 0) {
          timerState.targetDuration = DEFAULT_TARGET_DURATION;
        }
        // A saved state that is already at or past its target has completed;
        // don't resurrect it and report it a second time.
        if (timerState.isActive && timerState.timeElapsed >= timerState.targetDuration) {
          timerState.isActive = false;
        }
        // If timer was active when saved and not paused, resume it
        if (timerState.isActive && !timerState.isPaused && !timerId) {
          sessionCompleted = false;
          runTimer();
        }
      }
      self.postMessage({ type: 'STATE_UPDATE', data: timerState });
      break;
    case 'SET_DURATION':
      // Keep the worker's authoritative state in step with the UI, otherwise
      // the next GET_STATE reply reverts the user's chosen duration.
      if (data && data.targetDuration > 0 && !timerState.isActive) {
        timerState.targetDuration = data.targetDuration;
        persistState();
        self.postMessage({ type: 'STATE_UPDATE', data: timerState });
      }
      break;
    case 'START_TIMER':
      startTimer(data);
      break;
    case 'PAUSE_TIMER':
      pauseTimer();
      break;
    case 'RESUME_TIMER':
      resumeTimer();
      break;
    case 'STOP_TIMER':
      stopTimer();
      break;
    case 'RESET_TIMER':
      resetTimer();
      break;
    case 'GET_STATE':
      self.postMessage({ type: 'STATE_UPDATE', data: timerState });
      break;
  }
};

function startTimer(data) {
  sessionCompleted = false;
  timerState = {
    ...data,
    targetDuration: data.targetDuration > 0 ? data.targetDuration : DEFAULT_TARGET_DURATION,
    isActive: true,
    isPaused: false,
    startTime: Date.now(),
    timeElapsed: 0,
    breakTimeElapsed: 0,
    currentBreak: 0,
    isOnBreak: false,
    pausedAt: null
  };

  persistState();
  runTimer();
  self.postMessage({ type: 'TIMER_STARTED', data: timerState });
}

function pauseTimer() {
  timerState.isPaused = true;
  timerState.pausedAt = Date.now();
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
  persistState();
  self.postMessage({ type: 'TIMER_PAUSED', data: timerState });
}

function resumeTimer() {
  timerState.isPaused = false;
  timerState.pausedAt = null;
  persistState();
  runTimer();
  self.postMessage({ type: 'TIMER_RESUMED', data: timerState });
}

function stopTimer() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }

  const sessionData = {
    duration: Math.max(1, Math.round(timerState.timeElapsed / 60)),
    subject: timerState.subject,
    startTime: new Date(timerState.startTime),
    endTime: new Date()
  };

  timerState.isActive = false;
  timerState.pausedAt = null;
  persistState();
  self.postMessage({ type: 'TIMER_STOPPED', data: { timerState, sessionData } });
}

function resetTimer() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }

  timerState = {
    isActive: false,
    isPaused: false,
    isOnBreak: false,
    timeElapsed: 0,
    targetDuration: 0,
    breakCount: 0,
    breakDuration: 0,
    currentBreak: 0,
    breakTimeElapsed: 0,
    startTime: null,
    pausedAt: null,
    subject: '',
    currentSubject: ''
  };

  persistState();
  self.postMessage({ type: 'TIMER_RESET', data: timerState });
}

function runTimer() {
  if (timerId) {
    clearInterval(timerId);
  }

  lastTick = Date.now();

  timerId = setInterval(() => {
    if (timerState.isPaused || !timerState.isActive) {
      return;
    }

    // Advance by real elapsed time, not by one second per tick. A throttled
    // background tab may fire this callback far less often than every second.
    const now = Date.now();
    const delta = Math.max(0, Math.round((now - lastTick) / 1000));
    if (delta === 0) {
      return;
    }
    lastTick = now;

    if (timerState.isOnBreak) {
      // Handle break timer
      timerState.breakTimeElapsed += delta;

      if (timerState.breakTimeElapsed >= timerState.breakDuration) {
        // Break is over, return to study
        timerState.isOnBreak = false;
        timerState.breakTimeElapsed = 0;

        // Notify break end
        self.postMessage({
          type: 'BREAK_ENDED',
          data: {
            breakNumber: timerState.currentBreak,
            totalBreaks: timerState.breakCount,
            subject: timerState.subject
          }
        });
      }
    } else {
      // Handle study timer
      timerState.timeElapsed += delta;

      // Check if we should take a break
      if (timerState.breakCount > 0 && timerState.currentBreak < timerState.breakCount) {
        // Calculate how much study time should pass before each break
        const studySegmentDuration = timerState.targetDuration / (timerState.breakCount + 1);

        // Calculate when the next break should occur
        const nextBreakAt = studySegmentDuration * (timerState.currentBreak + 1);

        // Check if we've reached the break point
        if (timerState.timeElapsed >= nextBreakAt) {
          timerState.isOnBreak = true;
          timerState.currentBreak += 1;
          timerState.breakTimeElapsed = 0;

          // Notify break start
          self.postMessage({
            type: 'BREAK_STARTED',
            data: {
              breakNumber: timerState.currentBreak,
              totalBreaks: timerState.breakCount,
              breakDuration: Math.floor(timerState.breakDuration / 60),
              subject: timerState.subject
            }
          });
        }
      }

      // Check if study session is complete
      if (timerState.timeElapsed >= timerState.targetDuration) {
        timerState.timeElapsed = timerState.targetDuration;
        timerState.isActive = false;
        timerState.pausedAt = null;

        if (timerId) {
          clearInterval(timerId);
          timerId = null;
        }

        // Persist the finished state BEFORE returning. Otherwise the newest
        // thing in storage is the tick before completion, still marked active,
        // and the next page load resumes and completes it all over again.
        persistState();
        self.postMessage({ type: 'STATE_UPDATE', data: timerState });

        if (!sessionCompleted) {
          sessionCompleted = true;
          self.postMessage({
            type: 'SESSION_COMPLETE',
            data: {
              duration: Math.max(1, Math.round(timerState.timeElapsed / 60)),
              subject: timerState.subject || timerState.currentSubject,
              startTime: new Date(timerState.startTime),
              endTime: new Date()
            }
          });
        }
        return;
      }
    }

    // Send regular state updates and persist
    persistState();
    self.postMessage({ type: 'STATE_UPDATE', data: timerState });
  }, 1000);
}