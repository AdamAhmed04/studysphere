import { useState, useEffect } from 'react';
import { calendarService, CalendarEventData } from '../services/calendarService';

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
        description: event.description,
        date: new Date(event.event_date),
        type: event.event_type,
        color: event.color,
        groupId: event.group_id,
        createdBy: event.user_id,
        hasReminder: event.has_reminder,
        reminderMinutes: event.reminder_minutes,
        todoId: event.todo_id
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
        description: event.description,
        date: new Date(event.event_date),
        type: event.event_type,
        color: event.color,
        groupId: event.group_id,
        createdBy: event.user_id,
        hasReminder: event.has_reminder,
        reminderMinutes: event.reminder_minutes,
        todoId: event.todo_id
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
            description: data.description,
            date: new Date(data.event_date),
            type: data.event_type,
            color: data.color,
            hasReminder: data.has_reminder,
            reminderMinutes: data.reminder_minutes
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
        description: event.description,
        date: new Date(event.event_date),
        type: event.event_type,
        color: event.color,
        groupId: event.group_id,
        createdBy: event.user_id,
        hasReminder: event.has_reminder,
        reminderMinutes: event.reminder_minutes,
        todoId: event.todo_id
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
