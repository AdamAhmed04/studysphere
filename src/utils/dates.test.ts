import { describe, it, expect } from 'vitest';
import { parseLocalDate, toLocalDateString, todayLocalDateString, ageInYears, latestDobForAge } from './dates';

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

describe('ageInYears', () => {
  // Fixed "today" so these do not start failing on somebody's birthday.
  const on = new Date(2026, 8, 3); // 3 September 2026

  it('counts whole years', () => {
    expect(ageInYears('2000-09-03', on)).toBe(26);
    expect(ageInYears('2010-01-01', on)).toBe(16);
  });

  it('treats the birthday itself as reached', () => {
    // The boundary the age gate turns on: born exactly 16 years ago today.
    expect(ageInYears('2010-09-03', on)).toBe(16);
  });

  it('does not count a birthday that has not arrived', () => {
    expect(ageInYears('2010-09-04', on)).toBe(15);
    expect(ageInYears('2010-12-31', on)).toBe(15);
  });

  it('handles a birthday earlier in the same month', () => {
    expect(ageInYears('2010-09-02', on)).toBe(16);
  });

  it('returns undefined rather than zero for a missing date', () => {
    // Undefined and 0 must stay distinguishable, or "no date" passes a
    // minimum-age check that reads age >= 16 as false but age > -1 as true.
    expect(ageInYears(undefined, on)).toBeUndefined();
    expect(ageInYears('', on)).toBeUndefined();
    expect(ageInYears('not-a-date', on)).toBeUndefined();
  });
});

describe('latestDobForAge', () => {
  const on = new Date(2026, 8, 3);

  it('gives the newest birth date that still meets the age', () => {
    expect(latestDobForAge(16, on)).toBe('2010-09-03');
  });

  it('agrees with ageInYears at the boundary', () => {
    const cutoff = latestDobForAge(16, on);
    expect(ageInYears(cutoff, on)).toBe(16);

    // One day later is one year short — the value the input must not offer.
    const dayAfter = toLocalDateString(new Date(2010, 8, 4));
    expect(ageInYears(dayAfter, on)).toBe(15);
  });
});
