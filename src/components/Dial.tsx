import React from 'react';

interface DialProps {
  /** 0 to 1. How much of the session has elapsed. */
  progress: number;
  /** Formatted time, e.g. "24:13". */
  time: string;
  /** Small label under the numerals — "Focus", "Break". */
  label?: string;
  /** The hand only sweeps while the timer is actually running. */
  running?: boolean;
  size?: number;
}

const RADIUS = 76;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/*
 * The analog face.
 *
 * The ticks are a repeating conic gradient masked to a thin ring rather than
 * sixty elements or sixty SVG lines: no markup, nothing to keep in sync, and
 * it stays crisp at any size.
 *
 * The sweeping hand is the only thing on screen that moves quickly, and it is
 * what makes a stopped timer read as *paused* rather than *broken* — a still
 * dial with no second hand looks like a screenshot. It stops when the timer
 * stops, for the same reason.
 */
export const Dial: React.FC<DialProps> = ({
  progress,
  time,
  label,
  running = false,
  size = 208,
}) => {
  const clamped = Math.min(Math.max(progress, 0), 1);

  return (
    <div className="dial" style={{ width: size, height: size }}>
      <div className="dial-ticks" />
      <div className="dial-ticks dial-ticks--major" />

      <svg viewBox="0 0 208 208" aria-hidden="true">
        <circle
          cx="104"
          cy="104"
          r={RADIUS}
          fill="none"
          stroke="rgba(234, 230, 244, 0.10)"
          strokeWidth="2.5"
        />
        <circle
          cx="104"
          cy="104"
          r={RADIUS}
          fill="none"
          stroke="var(--sand)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - clamped)}
          transform="rotate(-90 104 104)"
          className="dial-progress"
        />
      </svg>

      <div className="dial-hand" data-running={running} />

      <div className="dial-face">
        <span className="dial-time" role="timer" aria-live="off">{time}</span>
        {label && <span className="dial-label">{label}</span>}
      </div>
    </div>
  );
};
