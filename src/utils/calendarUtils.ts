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

export const getEventTypeLabel = (type: keyof typeof eventTypeLabels): string => {
  return eventTypeLabels[type] || 'Event';
};

export const formatEventTime = (date: Date): string => {
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });
};

export const formatEventDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', { 
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export const isEventToday = (date: Date): boolean => {
  const today = new Date();
  return date.toDateString() === today.toDateString();
};

export const isEventUpcoming = (date: Date): boolean => {
  return new Date(date) >= new Date();
};

export const sortEventsByDate = <T extends { date: Date | string }>(events: T[]): T[] => {
  return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};