/*
  # todos.due_date becomes a calendar date

  It was timestamptz, which is an instant — a moment on the world's timeline.
  A due date is not that. "Due September 1st" means the 1st wherever you are,
  and storing it as an instant meant a task set in Brussels read as August 31st
  in New York. No amount of client-side care fixes that, because the
  information simply is not present in the value.

  Deliberately NOT changed: calendar_events.event_date, meetings.scheduled_time
  and reminders.reminder_time. Those carry a time in the UI and are genuinely
  instants — an exam at 14:00 happens at one moment worldwide. Only the todo
  due date is a pure calendar date, and its form has a date picker and no time
  field.

  Existing rows were written as UTC midnight by the original client, so
  AT TIME ZONE 'UTC' recovers the intended day. Rows written after the
  local-date fix hold local midnight instead; with a single row in this
  database the difference does not arise, but it is why this conversion would
  not be universally correct for an app with existing data across timezones.
*/
ALTER TABLE todos
  ALTER COLUMN due_date TYPE date
  USING (due_date AT TIME ZONE 'UTC')::date;
