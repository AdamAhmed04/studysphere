import React from 'react';

interface DialProps {
  /** 0 to 1. How much of the session has elapsed. */
  progress: number;
  /** Formatted time, e.g. "24:13". */
  time: string;
  /** Small label under the numerals — "Focus", "Break". */
  label?: string;
  /** Dims the hand when false, so a paused timer looks paused. */
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
 * The hand sits at the tip of the arc and is driven by the same progress
 * value, so the two cannot drift apart. It used to sweep on its own sixty
 * second cycle, which meant it was measuring wall-clock seconds while the arc
 * measured the session — two different things on one face, visibly out of
 * step. Both now share the tick duration below so they move as one mark.
 */
const TICK_MS = 900;

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

      <div
        className="dial-hand"
        data-running={running}
        style={{
          transform: `rotate(${clamped * 360}deg)`,
          transitionDuration: `${TICK_MS}ms`,
        }}
      />

      <div className="dial-face">
        <span className="dial-time" role="timer" aria-live="off">{time}</span>
        {label && <span className="dial-label">{label}</span>}
      </div>
    </div>
  );
};
