import { createContext, useContext, ReactNode } from 'react';
import { useTimer } from '../hooks/useTimer';

/*
 * useTimer creates a Web Worker, so calling it from two components ran two
 * workers counting the same session independently, both writing the same
 * localStorage key and racing each other. App (for the nav badge) and Timer
 * (for the controls) both did that, which is why timer state could disagree
 * between the two.
 *
 * One worker now, shared by every consumer.
 */

type TimerValue = ReturnType<typeof useTimer>;

const TimerContext = createContext<TimerValue | null>(null);

export const TimerProvider = ({ children }: { children: ReactNode }) => {
  const value = useTimer();
  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
};

export const useTimerContext = (): TimerValue => {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useTimerContext must be used inside <TimerProvider>');
  }
  return context;
};
