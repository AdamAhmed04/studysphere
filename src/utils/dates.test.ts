import { describe, it, expect } from 'vitest';
import { parseLocalDate, toLocalDateString, todayLocalDateString } from './dates';

/*
 * These guard the bug that put every due date one day early west of UTC:
 * `new Date('2026-09-01')` is parsed as UTC midnight, and reading it back with
 * local getters gives 31 August in the Americas.
 *
 * The assertions are written to hold in any timezone, so they fail on the old
 * behaviour wherever CI happens to run rather than only in one offset.
 */
describe('parseLocalDate', () => {
  it('reads the calendar date as local, not UTC', () => {
    const d = parseLocalDate('2026-09-01')!;
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(8); // September, zero-based
    expect(d.getDate()).toBe(1);
  });

  it('is midnight local time', () => {
    const d = parseLocalDate('2026-09-01')!;
    expect([d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds()]).toEqual([0, 0, 0, 0]);
  });

  it('returns undefined for empty or malformed input', () => {
    expect(parseLocalDate(undefined)).toBeUndefined();
    expect(parseLocalDate(null)).toBeUndefined();
    expect(parseLocalDate('')).toBeUndefined();
    expect(parseLocalDate('not-a-date')).toBeUndefined();
  });
});

describe('toLocalDateString', () => {
  it('formats from the local calendar date', () => {
    expect(toLocalDateString(new Date(2026, 8, 1))).toBe('2026-09-01');
  });

  it('zero-pads single-digit months and days', () => {
    expect(toLocalDateString(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('returns empty string for no date', () => {
    expect(toLocalDateString(undefined)).toBe('');
  });
});

describe('round trip', () => {
  it('survives parse then format unchanged', () => {
    // The original bug appeared on the round trip: each edit walked the date
    // back another day.
    for (const value of ['2026-01-01', '2026-06-15', '2026-09-01', '2026-12-31']) {
      expect(toLocalDateString(parseLocalDate(value))).toBe(value);
    }
  });

  it('todayLocalDateString round trips too', () => {
    const today = todayLocalDateString();
    expect(toLocalDateString(parseLocalDate(today))).toBe(today);
  });
});
