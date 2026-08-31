/**
 * Date helpers for the calendar-date values that `<input type="date">`
 * produces and consumes.
 *
 * The trap: `new Date('2026-09-01')` is parsed as UTC midnight, while
 * everything downstream — setHours, toDateString, toLocaleDateString — works
 * in local time. West of UTC that lands on the previous day, so a task due
 * September 1st displays as August 31st in the Americas. Round-tripping
 * through toISOString() then walks it back another day on every edit.
 *
 * Use these instead of `new Date(str)` and `date.toISOString().split('T')[0]`
 * whenever the value is a calendar date rather than an instant.
 */

/** Parses "YYYY-MM-DD" as midnight in the viewer's own timezone. */
export const parseLocalDate = (value?: string | null): Date | undefined => {
  if (!value) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
};

/** Formats a Date as "YYYY-MM-DD" from its local calendar date. */
export const toLocalDateString = (date?: Date): string => {
  if (!date) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

/** Today as "YYYY-MM-DD" locally — for the `min` attribute on date inputs. */
export const todayLocalDateString = (): string => toLocalDateString(new Date());
