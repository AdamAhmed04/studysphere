import { useState, useEffect, useCallback } from 'react';
import { reminderService, ReminderData } from '../services/reminderService';
import { orUndefined, orFalse } from '../utils/rows';
import type { Reminder } from '../types';
import { errorMessage } from '../utils/errors';

/*
 * A note on `Reminder.type`.
 *
 * The UI type distinguishes 'event-reminder' (created alongside a calendar
 * event) from 'standalone-reminder' (created on its own). The table has no such
 * column, and nothing in the app ever reads the field — it is written in two
 * places and branched on in none — so rather than add a column for a value
 * nobody consults, it is derived from whether the reminder points at an event.
 *
 * That derivation is not exact: a standalone reminder can be linked to an
 * event, and will come back as 'event-reminder'. Harmless while nothing reads
 * it. If anything ever branches on this, the honest fix is a real column, not a
 * cleverer guess here.
 */
const toReminder = (row: {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  reminder_time: string;
  event_id: string | null;
  is_completed: boolean | null;
}): Reminder => ({
  id: row.id,
  title: row.title,
  description: orUndefined(row.description),
  reminderTime: new Date(row.reminder_time),
  eventId: orUndefined(row.event_id),
  type: row.event_id ? 'event-reminder' : 'standalone-reminder',
  isCompleted: orFalse(row.is_completed),
  createdBy: row.user_id,
});

export const useReminders = (userId: string | undefined) => {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReminders = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const data = await reminderService.getReminders(userId);
      setReminders(data.map(toReminder));
      setError(null);
    } catch (err) {
      console.error('Error loading reminders:', err);
      setError(errorMessage(err, 'Failed to load reminders'));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      // Also covers signing out: the previous account's reminders must not
      // stay on screen for the next one.
      setReminders([]);
      setLoading(false);
      return;
    }

    loadReminders();
  }, [userId, loadReminders]);


  /*
   * Takes the fields rather than a whole Reminder: the caller builds one with a
   * `reminder-${Date.now()}` placeholder id, and the real id comes back from
   * the database. Accepting the object wholesale would invite someone to trust
   * that placeholder.
   */
  const createReminder = async (input: {
    title: string;
    description?: string;
    reminderTime: Date;
    eventId?: string;
  }) => {
    if (!userId) throw new Error('Not authenticated');

    try {
      const payload: ReminderData = {
        title: input.title,
        description: input.description,
        reminder_time: input.reminderTime.toISOString(),
        event_id: input.eventId,
      };

      const row = await reminderService.createReminder(userId, payload);
      const created = toReminder(row);

      // Kept in reminder_time order, matching what the query returns, so a
      // newly added reminder does not jump to the end of the list.
      setReminders(prev =>
        [...prev, created].sort((a, b) => a.reminderTime.getTime() - b.reminderTime.getTime())
      );
      return created;
    } catch (err) {
      setError(errorMessage(err, 'Failed to create reminder'));
      throw err;
    }
  };

  const deleteReminder = async (id: string) => {
    try {
      await reminderService.deleteReminder(id);
      setReminders(prev => prev.filter(reminder => reminder.id !== id));
    } catch (err) {
      setError(errorMessage(err, 'Failed to delete reminder'));
      throw err;
    }
  };

  return {
    reminders,
    loading,
    error,
    createReminder,
    deleteReminder,
    refreshReminders: loadReminders,
  };
};
