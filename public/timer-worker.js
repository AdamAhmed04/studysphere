// Timer Web Worker for background execution
let timerId = null;

// Initialize timer state (will be loaded from main thread via message)
let timerState = {
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
        timerState = data;
        // If timer was active when saved and not paused, resume it
        if (timerState.isActive && !timerState.isPaused && !timerId) {
          runTimer();
        }
      }
      self.postMessage({ type: 'STATE_UPDATE', data: timerState });
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
  timerState = {
    ...data,
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
    duration: Math.floor(timerState.timeElapsed / 60),
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

  timerId = setInterval(() => {
    if (timerState.isPaused || !timerState.isActive) {
      return;
    }

    if (timerState.isOnBreak) {
      // Handle break timer
      timerState.breakTimeElapsed += 1;

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
      timerState.timeElapsed += 1;

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

        // Notify session complete
        self.postMessage({
          type: 'SESSION_COMPLETE',
          data: {
            duration: Math.floor(timerState.timeElapsed / 60),
            subject: timerState.subject,
            startTime: new Date(timerState.startTime),
            endTime: new Date()
          }
        });

        if (timerId) {
          clearInterval(timerId);
          timerId = null;
        }
        return;
      }
    }

    // Send regular state updates and persist
    persistState();
    self.postMessage({ type: 'STATE_UPDATE', data: timerState });
  }, 1000);
}