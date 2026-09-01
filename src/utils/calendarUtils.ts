/*
 * Only what the Calendar actually uses.
 *
 * This module also exported getEventTypeLabel, formatEventTime, formatEventDate,
 * isEventToday, isEventUpcoming and sortEventsByDate, none of which had a single
 * caller. Exported dead code is invisible to noUnusedLocals, which only sees
 * within a module — the same blind spot that hid two unreachable components and
 * a dead hook. Deleted rather than kept "just in case": git remembers, and an
 * unused helper that drifts out of step with the schema is worse than no helper.
 *
 * sortEventsByDate was also quietly wrong, which is a fair argument for the
 * deletion: it sorted in place, so it mutated the caller's array. Nothing
 * noticed, because nothing called it.
 */

export const eventTypeColors = {
  meeting: '#3B82F6',    // Blue
  exam: '#EF4444',       // Red
  class: '#10B981',      // Green
  reminder: '#F59E0B',   // Orange
  study: '#8B5CF6',      // Purple
  todo: '#EC4899',       // Pink
} as const;

export const eventTypeLabels = {
  meeting: 'Meeting',
  exam: 'Exam',
  class: 'Class',
  reminder: 'Reminder',
  study: 'Study Session',
  todo: 'Task',
} as const;

export const getEventTypeColor = (type: keyof typeof eventTypeColors): string => {
  return eventTypeColors[type] || eventTypeColors.reminder;
};
