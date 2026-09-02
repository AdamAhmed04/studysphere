import React, { useCallback, useEffect, useRef } from 'react';

interface WheelPickerProps {
  values: number[];
  value: number;
  onChange: (value: number) => void;
  /** Shown to the right of each number, e.g. "h" or "min". */
  unit?: string;
  label: string;
}

const ITEM_HEIGHT = 40;
const VISIBLE = 5;

/*
 * One mouse-wheel notch should move one value.
 *
 * A notch reports roughly 100px of deltaY, which against a 40px row scrolls
 * two or three values at once — and more on mice that report larger deltas,
 * which is how a single click came to skip six minutes. Accumulating the
 * delta and stepping once per threshold makes a notch mean one value, while
 * a trackpad's stream of small deltas still adds up smoothly instead of
 * being ignored.
 */
const WHEEL_THRESHOLD = 24;

/** Firefox reports scroll in lines rather than pixels. */
const LINE_HEIGHT = 16;

/*
 * A scroll wheel, the way a phone does it.
 *
 * The number inputs this replaces coerced an empty field straight back to a
 * value, so the field could never be cleared and 20 had to be reached by
 * nudging 1 up to 2 and typing a 0 after it. A wheel has no empty state to
 * mishandle — every position is a valid value.
 *
 * Touch is left to scroll-snap so the browser owns the physics: momentum,
 * rubber banding and the snap all come free and feel native under a thumb.
 * Only the mouse wheel is intercepted, because that is the one input the
 * browser maps to pixels rather than to intent.
 */
export const WheelPicker: React.FC<WheelPickerProps> = ({
  values,
  value,
  onChange,
  unit,
  label,
}) => {
  const listRef = useRef<HTMLDivElement>(null);
  const settleTimer = useRef<number | undefined>(undefined);
  /*
   * Scrolling the list in code fires scroll events too. Without this the
   * component answers its own scroll, recomputes the same index and fights
   * the user mid-gesture.
   */
  const programmatic = useRef(false);

  const scrollToValue = useCallback((next: number, behavior: ScrollBehavior) => {
    const list = listRef.current;
    if (!list) return;

    const index = values.indexOf(next);
    if (index < 0) return;

    programmatic.current = true;
    list.scrollTo({ top: index * ITEM_HEIGHT, behavior });

    window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(
      () => { programmatic.current = false; },
      behavior === 'smooth' ? 400 : 60,
    );
  }, [values]);

  const step = useCallback((delta: number) => {
    const index = values.indexOf(value);
    const next = values[Math.min(Math.max(index + delta, 0), values.length - 1)];

    if (next !== undefined && next !== value) {
      onChange(next);
      scrollToValue(next, 'smooth');
    }
  }, [values, value, onChange, scrollToValue]);

  // Line the wheel up with the current value on open, without animating.
  useEffect(() => {
    scrollToValue(value, 'auto');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /*
   * Attached natively rather than through onWheel: React registers wheel
   * listeners as passive, and a passive listener cannot preventDefault, which
   * is what stops the browser applying its own pixel scroll on top of ours.
   */
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    let accumulated = 0;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();

      accumulated += event.deltaMode === 1 ? event.deltaY * LINE_HEIGHT : event.deltaY;
      if (Math.abs(accumulated) < WHEEL_THRESHOLD) return;

      const direction = accumulated > 0 ? 1 : -1;
      accumulated = 0;
      step(direction);
    };

    list.addEventListener('wheel', onWheel, { passive: false });
    return () => list.removeEventListener('wheel', onWheel);
  }, [step]);

  const handleScroll = () => {
    if (programmatic.current) return;

    window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(() => {
      const list = listRef.current;
      if (!list) return;

      const index = Math.round(list.scrollTop / ITEM_HEIGHT);
      const next = values[Math.min(Math.max(index, 0), values.length - 1)];

      if (next !== undefined && next !== value) onChange(next);
    }, 120);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') { event.preventDefault(); step(1); }
    if (event.key === 'ArrowUp') { event.preventDefault(); step(-1); }
  };

  return (
    <div className="wheel">
      <div className="wheel-band" aria-hidden="true" />

      <div
        ref={listRef}
        className="wheel-list"
        onScroll={handleScroll}
        onKeyDown={onKeyDown}
        role="listbox"
        aria-label={label}
        tabIndex={0}
        style={{ height: ITEM_HEIGHT * VISIBLE }}
      >
        {/* Half a wheel of padding at each end, so the first and last values
            can sit in the centre band like any other. */}
        <div style={{ height: ITEM_HEIGHT * ((VISIBLE - 1) / 2) }} />

        {values.map((candidate) => (
          <div
            key={candidate}
            role="option"
            aria-selected={candidate === value}
            className={`wheel-item ${candidate === value ? 'is-selected' : ''}`}
            style={{ height: ITEM_HEIGHT }}
            onClick={() => { onChange(candidate); scrollToValue(candidate, 'smooth'); }}
          >
            {candidate}
            {unit && <span className="wheel-unit">{unit}</span>}
          </div>
        ))}

        <div style={{ height: ITEM_HEIGHT * ((VISIBLE - 1) / 2) }} />
      </div>
    </div>
  );
};
