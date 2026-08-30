import { useState, useEffect } from 'react';
import { calendarService, CalendarEventData } from '../services/calendarService';
import { orUndefined, orFalse, asOneOf } from '../utils/rows';

const EVENT_TYPES = ['meeting', 'reminder', 'study', 'exam', 'class', 'todo'] as const;

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: Date;
  type: 'meeting' | 'reminder' | 'study' | 'exam' | 'class' | 'todo';
  color: string;
  groupId?: string;
  createdBy: string;
  hasReminder?: boolean;
  reminderMinutes?: number;
  todoId?: string;
}

export const useCalendar = (userId: string | undefined) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setEvents([]);
      setLoading(false);
      return;
    }

    loadEvents();
  }, [userId]);

  const loadEvents = async (startDate?: string, endDate?: string) => {
    if (!userId) return;

    try {
      setLoading(true);
      const data = await calendarService.getEvents(userId, startDate, endDate);

      const mappedEvents: CalendarEvent[] = data.map(event => ({
        id: event.id,
        title: event.title,
        description: orUndefined(event.description),
        date: new Date(event.event_date),
        type: asOneOf(event.event_type, EVENT_TYPES, 'study'),
        color: event.color,
        groupId: orUndefined(event.group_id),
        createdBy: event.user_id,
        hasReminder: orFalse(event.has_reminder),
        reminderMinutes: orUndefined(event.reminder_minutes),
        todoId: orUndefined(event.todo_id)
      }));

      setEvents(mappedEvents);
      setError(null);
    } catch (err: any) {
      console.error('Error loading calendar events:', err);
      setError(err.message || 'Failed to load calendar events');
    } finally {
      setLoading(false);
    }
  };

  const createEvent = async (eventData: {
    title: string;
    description?: string;
    date: Date;
    type: 'meeting' | 'reminder' | 'study' | 'exam' | 'class' | 'todo';
    color: string;
    groupId?: string;
    hasReminder?: boolean;
    reminderMinutes?: number;
    todoId?: string;
  }) => {
    if (!userId) throw new Error('Not authenticated');

    try {
      const data: CalendarEventData = {
        title: eventData.title,
        description: eventData.description,
        event_date: eventData.date.toISOString(),
        event_type: eventData.type,
        color: eventData.color,
        group_id: eventData.groupId,
        todo_id: eventData.todoId,
        has_reminder: eventData.hasReminder || false,
        reminder_minutes: eventData.reminderMinutes
      };

      const event = await calendarService.createEvent(userId, data);

      const newEvent: CalendarEvent = {
        id: event.id,
        title: event.title,
        description: orUndefined(event.description),
        date: new Date(event.event_date),
        type: asOneOf(event.event_type, EVENT_TYPES, 'study'),
        color: event.color,
        groupId: orUndefined(event.group_id),
        createdBy: event.user_id,
        hasReminder: orFalse(event.has_reminder),
        reminderMinutes: orUndefined(event.reminder_minutes),
        todoId: orUndefined(event.todo_id)
      };

      setEvents(prev => [...prev, newEvent]);
      return newEvent;
    } catch (err: any) {
      setError(err.message || 'Failed to create event');
      throw err;
    }
  };

  const updateEvent = async (id: string, updates: Partial<CalendarEventData>) => {
    try {
      const data = await calendarService.updateEvent(id, updates);

      setEvents(prev => prev.map(event => {
        if (event.id === id) {
          return {
            ...event,
            title: data.title,
            description: orUndefined(data.description),
            date: new Date(data.event_date),
            type: asOneOf(data.event_type, EVENT_TYPES, 'study'),
            color: data.color,
            hasReminder: orFalse(data.has_reminder),
            reminderMinutes: orUndefined(data.reminder_minutes)
          };
        }
        return event;
      }));
    } catch (err: any) {
      setError(err.message || 'Failed to update event');
      throw err;
    }
  };

  const deleteEvent = async (id: string) => {
    try {
      await calendarService.deleteEvent(id);
      setEvents(prev => prev.filter(event => event.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete event');
      throw err;
    }
  };

  const getEventsByMonth = async (year: number, month: number) => {
    if (!userId) return;

    try {
      const data = await calendarService.getEventsByMonth(userId, year, month);

      const mappedEvents: CalendarEvent[] = data.map(event => ({
        id: event.id,
        title: event.title,
        description: orUndefined(event.description),
        date: new Date(event.event_date),
        type: asOneOf(event.event_type, EVENT_TYPES, 'study'),
        color: event.color,
        groupId: orUndefined(event.group_id),
        createdBy: event.user_id,
        hasReminder: orFalse(event.has_reminder),
        reminderMinutes: orUndefined(event.reminder_minutes),
        todoId: orUndefined(event.todo_id)
      }));

      setEvents(mappedEvents);
    } catch (err: any) {
      setError(err.message || 'Failed to load events');
      throw err;
    }
  };

  return {
    events,
    loading,
    error,
    createEvent,
    updateEvent,
    deleteEvent,
    getEventsByMonth,
    refreshEvents: loadEvents
  };
};
