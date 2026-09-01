import React, { useState } from 'react';
import { Calendar as CalendarIcon, Plus, Clock, Users, MapPin, ChevronLeft, ChevronRight, X, Video, Phone, MessageCircle, User as UserIcon, Bell } from 'lucide-react';
import type { CalendarEvent, Meeting, User, Reminder, Friend } from '../types';
import { asOneOf } from '../utils/rows';

/** The event types a person can pick. 'todo' is excluded on purpose: those
 *  are created from to-dos with a due date, not chosen in this form. */
const SELECTABLE_EVENT_TYPES = ['meeting', 'reminder', 'study', 'exam', 'class'] as const;

/*
 * What the agenda list and the day cells actually hand to a click handler:
 * events, reminders and meetings are all flattened to this shape before being
 * rendered together. CalendarEvent is a superset, so it fits without a cast.
 */
interface AgendaItem {
  id: string;
  title: string;
  description?: string;
  date: Date;
  type: CalendarEvent['type'];
  color: string;
  createdBy?: string;
  meetingData?: Meeting;
}
import { eventTypeColors, eventTypeLabels, getEventTypeColor } from '../utils/calendarUtils';
import { parseLocalDate, todayLocalDateString } from '../utils/dates';

interface CalendarProps {
  events: CalendarEvent[];
  reminders: Reminder[];
  meetings: Meeting[];
  /*
   * Resolves with the saved event, so a linked reminder can point at the id the
   * database actually assigned. It used to return void, and the reminder was
   * given `newEvent.id` — a `Date.now().toString()` placeholder that exists
   * nowhere. That went unnoticed while reminders were never persisted; the
   * moment they were, the foreign key rejected it.
   *
   * Resolves undefined when the event could not be saved, in which case no
   * reminder is created rather than one that points at nothing.
   */
  onCreateEvent: (event: CalendarEvent) => Promise<CalendarEvent | undefined>;
  onCreateReminder: (reminder: Reminder) => void;
  onCreateMeeting: (meeting: Meeting) => void;
  currentUser: User;
  onJoinMeeting: (meetingId: string) => void;
  onOpenChat: (groupId: string) => void;
  friends: Friend[];
}

export const Calendar: React.FC<CalendarProps> = ({ 
  events, 
  reminders,
  meetings, 
  onCreateEvent, 
  onCreateReminder,
  onCreateMeeting, 
  currentUser,
  onJoinMeeting,
  onOpenChat,
  friends
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showEventModal, setShowEventModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<AgendaItem | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    type: 'reminder' as 'meeting' | 'reminder' | 'study' | 'exam' | 'class',
    color: '#F59E0B',
    time: '14:00',
    hasReminder: false,
    reminderMinutes: 15
  });
  const [reminderForm, setReminderForm] = useState({
    title: '',
    description: '',
    date: '',
    time: '14:00',
    linkedEventId: ''
  });
  const [meetingForm, setMeetingForm] = useState({
    title: '',
    description: '',
    duration: 60,
    time: '14:00'
  });

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toDateString();
    const dayEvents = events.filter(event => 
      new Date(event.date).toDateString() === dateStr
    );
    const dayReminders = reminders.filter(reminder => 
      new Date(reminder.reminderTime).toDateString() === dateStr
    ).map(r => ({
      id: r.id,
      title: r.title,
      description: r.description,
      date: r.reminderTime,
      type: 'reminder' as const,
      color: eventTypeColors.reminder,
      createdBy: r.createdBy,
      reminderData: r
    }));
    const dayMeetings = meetings.filter(meeting => 
      new Date(meeting.scheduledTime).toDateString() === dateStr
    );
    return [...dayEvents, ...dayReminders, ...dayMeetings.map(m => ({
      id: m.id,
      title: m.title,
      description: m.description,
      date: m.scheduledTime,
      type: 'meeting' as const,
      color: eventTypeColors.meeting,
      createdBy: m.hostId,
      meetingData: m
    }))];
  };

  const handleCreateEvent = async () => {
    if (!selectedDate || !eventForm.title.trim()) return;

    const [hours, minutes] = eventForm.time.split(':').map(Number);
    const eventDate = new Date(selectedDate);
    // Seconds and milliseconds zeroed explicitly: setHours(h, m) leaves them
    // at whatever the Date was constructed with, so an event set for 14:00 was
    // stored as 14:00:49.
    eventDate.setHours(hours, minutes, 0, 0);

    const newEvent: CalendarEvent = {
      id: Date.now().toString(),
      title: eventForm.title,
      description: eventForm.description,
      date: eventDate,
      type: eventForm.type,
      color: getEventTypeColor(eventForm.type),
      createdBy: currentUser.id,
      hasReminder: eventForm.hasReminder,
      reminderMinutes: eventForm.reminderMinutes
    };

    const savedEvent = await onCreateEvent(newEvent);

    // Create reminder if requested, and only if the event itself was saved —
    // a reminder for an event that does not exist is worse than none.
    if (eventForm.hasReminder && savedEvent) {
      const reminderTime = new Date(eventDate);
      reminderTime.setMinutes(reminderTime.getMinutes() - eventForm.reminderMinutes);

      const reminder: Reminder = {
        id: `reminder-${Date.now()}`,
        title: `Reminder: ${eventForm.title}`,
        description: `Upcoming ${eventForm.type}: ${eventForm.title}`,
        reminderTime,
        eventId: savedEvent.id,
        type: 'event-reminder',
        isCompleted: false,
        createdBy: currentUser.id
      };

      onCreateReminder(reminder);
    }

    setShowEventModal(false);
    setEventForm({ 
      title: '', 
      description: '', 
      type: 'reminder', 
      color: '#F59E0B',
      time: '14:00',
      hasReminder: false,
      reminderMinutes: 15
    });
  };

  const handleCreateReminder = () => {
    if (!reminderForm.title.trim() || !reminderForm.date) return;

    const [hours, minutes] = reminderForm.time.split(':').map(Number);
    const reminderDate = parseLocalDate(reminderForm.date) ?? new Date();
    reminderDate.setHours(hours, minutes, 0, 0);

    const newReminder: Reminder = {
      id: `reminder-${Date.now()}`,
      title: reminderForm.title,
      description: reminderForm.description,
      reminderTime: reminderDate,
      eventId: reminderForm.linkedEventId || undefined,
      type: 'standalone-reminder',
      isCompleted: false,
      createdBy: currentUser.id
    };

    onCreateReminder(newReminder);
    setShowReminderModal(false);
    setReminderForm({
      title: '',
      description: '',
      date: '',
      time: '14:00',
      linkedEventId: ''
    });
  };

  const handleCreateMeeting = () => {
    if (!selectedDate || !meetingForm.title.trim()) return;

    const [hours, minutes] = meetingForm.time.split(':').map(Number);
    const meetingDate = new Date(selectedDate);
    meetingDate.setHours(hours, minutes, 0, 0);

    const newMeeting: Meeting = {
      id: Date.now().toString(),
      title: meetingForm.title,
      description: meetingForm.description,
      scheduledTime: meetingDate,
      duration: meetingForm.duration,
      hostId: currentUser.id,
      participants: [currentUser.id],
      invitees: [],
      inviteeEmails: [],
      meetingType: 'video',
      reminders: [],
      createdAt: new Date(),
      status: 'scheduled'
    };

    onCreateMeeting(newMeeting);
    setShowMeetingModal(false);
    setMeetingForm({ title: '', description: '', duration: 60, time: '14:00' });
  };

  const handleEventClick = (event: AgendaItem) => {
    setSelectedEvent(event);
    setShowEventDetails(true);
  };

  const getHostName = (hostId?: string) => {
    if (!hostId) return 'Unknown User';
    if (hostId === currentUser.id) return currentUser.name;
    const friend = friends.find(f => f.id === hostId);
    return friend?.name || 'Unknown User';
  };

  const getMeetingTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video size={16} className="text-blue-500" />;
      case 'phone': return <Phone size={16} className="text-green-500" />;
      case 'in-person': return <MapPin size={16} className="text-purple-500" />;
      default: return <Video size={16} className="text-blue-500" />;
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    // Anchor to the 1st. Keeping the current day-of-month makes setMonth
    // overflow into the following month (31 Aug + 1 month = 1 Oct), which
    // skipped September entirely for anyone browsing on the 29th-31st.
    setCurrentDate(prev => new Date(
      prev.getFullYear(),
      prev.getMonth() + (direction === 'next' ? 1 : -1),
      1
    ));
  };

  const days = getDaysInMonth(currentDate);
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Calendar Header */}
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <CalendarIcon className="text-blue-500" size={28} />
            <h2 className="text-2xl font-bold text-gray-800">Calendar</h2>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => {
                setSelectedDate(new Date());
                setShowEventModal(true);
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={16} />
              <span>Add Event</span>
            </button>
            <button
              onClick={() => {
                setSelectedDate(new Date());
                setShowReminderModal(true);
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              <Bell size={16} />
              <span>Add Reminder</span>
            </button>
            <button
              onClick={() => {
                setSelectedDate(new Date());
                setShowMeetingModal(true);
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Users size={16} />
              <span>Schedule Meeting</span>
            </button>
          </div>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <h3 className="text-xl font-semibold text-gray-800">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h3>
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Day Headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-3 text-center font-semibold text-gray-600 bg-gray-50 rounded-lg">
              {day}
            </div>
          ))}
          
          {/* Calendar Days */}
          {days.map((day, index) => {
            if (!day) {
              return <div key={index} className="p-3 h-24"></div>;
            }

            const dayEvents = getEventsForDate(day);
            const isToday = day.toDateString() === new Date().toDateString();

            return (
              <div
                key={day.toISOString()}
                className={`p-2 h-24 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors ${
                  isToday ? 'bg-blue-50 border-blue-300' : ''
                }`}
                onClick={() => {
                  setSelectedDate(day);
                  setShowEventModal(true);
                }}
              >
                <div className={`text-sm font-medium mb-1 ${
                  isToday ? 'text-blue-600' : 'text-gray-800'
                }`}>
                  {day.getDate()}
                </div>
                <div className="space-y-1">
                  {dayEvents.slice(0, 2).map(event => (
                    <div
                      key={event.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEventClick(event);
                      }}
                      className="text-xs px-2 py-1 rounded text-white truncate"
                      style={{ backgroundColor: event.color, cursor: 'pointer' }}
                    >
                      {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <div className="text-xs text-gray-500">
                      +{dayEvents.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming Events */}
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-800">Upcoming Events</h3>
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: eventTypeColors.meeting }}></div>
              <span>Meeting</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: eventTypeColors.exam }}></div>
              <span>Exam</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: eventTypeColors.class }}></div>
              <span>Class</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: eventTypeColors.reminder }}></div>
              <span>Reminder</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: eventTypeColors.todo }}></div>
              <span>Task</span>
            </div>
          </div>
        </div>
        <div className="space-y-3">
          {[...events, ...reminders.map(r => ({
            id: r.id,
            title: r.title,
            description: r.description,
            date: r.reminderTime,
            type: 'reminder' as const,
            color: eventTypeColors.reminder
          })), ...meetings.map(m => ({
            id: m.id,
            title: m.title,
            description: m.description,
            date: m.scheduledTime,
            type: 'meeting' as const,
            color: eventTypeColors.meeting
          }))]
            .filter(event => new Date(event.date) >= new Date())
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .slice(0, 5)
            .map(event => (
              <div key={event.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl">
                <button
                  onClick={() => handleEventClick(event)}
                  className="flex-1 text-left hover:bg-gray-100 rounded-lg p-2 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: event.color }}
                    ></div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">{event.title}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(event.date).toLocaleDateString()} at{' '}
                        {new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {event.description && (
                        <p className="text-sm text-gray-500 mt-1">{event.description}</p>
                      )}
                    </div>
                    <div 
                      className="text-xs px-2 py-1 text-white rounded-full capitalize font-medium"
                      style={{ backgroundColor: event.color }}
                    >
                      {eventTypeLabels[event.type as keyof typeof eventTypeLabels] || event.type}
                    </div>
                  </div>
                </button>
              </div>
            ))}
        </div>
      </div>

      {/* Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
            <h4 className="text-xl font-bold text-gray-800 mb-4">Create Event</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  value={eventForm.title}
                  onChange={(e) => setEventForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Event title"
                  maxLength={200}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={eventForm.description}
                  onChange={(e) => setEventForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                  placeholder="Event description"
                  maxLength={2000}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                <input
                  type="time"
                  value={eventForm.time}
                  onChange={(e) => setEventForm(prev => ({ ...prev, time: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <select
                  value={eventForm.type}
                  onChange={(e) => setEventForm(prev => ({ 
                    ...prev, 
                    type: asOneOf(e.target.value, SELECTABLE_EVENT_TYPES, 'study'),
                    color: getEventTypeColor(asOneOf(e.target.value, SELECTABLE_EVENT_TYPES, 'study'))
                  }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="reminder">Reminder</option>
                  <option value="study">Study Session</option>
                  <option value="exam">Exam</option>
                  <option value="class">Class</option>
                  <option value="meeting">Meeting</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Preview</label>
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: getEventTypeColor(eventForm.type) }}
                  ></div>
                  <span className="font-medium text-gray-800">{eventForm.title || 'Event Title'}</span>
                  <span 
                    className="text-xs px-2 py-1 text-white rounded-full capitalize"
                    style={{ backgroundColor: getEventTypeColor(eventForm.type) }}
                  >
                    {eventTypeLabels[eventForm.type]}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center space-x-3">
                  <Bell className="text-orange-500" size={20} />
                  <div>
                    <p className="font-medium text-gray-800">Add Reminder</p>
                    <p className="text-sm text-gray-600">Get notified before this event</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEventForm(prev => ({ ...prev, hasReminder: !prev.hasReminder }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    eventForm.hasReminder ? 'bg-orange-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      eventForm.hasReminder ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              {eventForm.hasReminder && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Remind me</label>
                  <select
                    value={eventForm.reminderMinutes}
                    onChange={(e) => setEventForm(prev => ({ ...prev, reminderMinutes: parseInt(e.target.value) }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={5}>5 minutes before</option>
                    <option value={15}>15 minutes before</option>
                    <option value={30}>30 minutes before</option>
                    <option value={60}>1 hour before</option>
                    <option value={1440}>1 day before</option>
                  </select>
                </div>
              )}
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowEventModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateEvent}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Event
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reminder Modal */}
      {showReminderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
            <h4 className="text-xl font-bold text-gray-800 mb-4">Create Reminder</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  value={reminderForm.title}
                  onChange={(e) => setReminderForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Reminder title"
                  maxLength={200}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={reminderForm.description}
                  onChange={(e) => setReminderForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                  rows={3}
                  placeholder="What do you want to be reminded about?"
                  maxLength={2000}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                  <input
                    type="date"
                    value={reminderForm.date}
                    onChange={(e) => setReminderForm(prev => ({ ...prev, date: e.target.value }))}
                    min={todayLocalDateString()}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                  <input
                    type="time"
                    value={reminderForm.time}
                    onChange={(e) => setReminderForm(prev => ({ ...prev, time: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Link to Event (Optional)</label>
                <select
                  value={reminderForm.linkedEventId}
                  onChange={(e) => setReminderForm(prev => ({ ...prev, linkedEventId: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">No linked event</option>
                  {events.filter(e => new Date(e.date) >= new Date()).map(event => (
                    <option key={event.id} value={event.id}>
                      {event.title} - {new Date(event.date).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowReminderModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateReminder}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                Create Reminder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Meeting Modal */}
      {showMeetingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
            <h4 className="text-xl font-bold text-gray-800 mb-4">Schedule Meeting</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  value={meetingForm.title}
                  onChange={(e) => setMeetingForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Meeting title"
                  maxLength={200}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={meetingForm.description}
                  onChange={(e) => setMeetingForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                  placeholder="Meeting description"
                  maxLength={2000}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                  <input
                    type="time"
                    value={meetingForm.time}
                    onChange={(e) => setMeetingForm(prev => ({ ...prev, time: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Duration (min)</label>
                  <input
                    type="number"
                    value={meetingForm.duration}
                    onChange={(e) => setMeetingForm(prev => ({ ...prev, duration: parseInt(e.target.value) || 60 }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="15"
                    max="480"
                  />
                </div>
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowMeetingModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateMeeting}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Schedule Meeting
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event Details Modal */}
      {showEventDetails && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-xl font-bold text-gray-800">Event Details</h4>
              <button
                onClick={() => setShowEventDetails(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Event Title */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">{selectedEvent.title}</h3>
                <div className="flex items-center space-x-2 mb-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: selectedEvent.color }}
                  ></div>
                  <span className="text-sm px-2 py-1 bg-gray-100 text-gray-700 rounded-full capitalize">
                    {selectedEvent.type}
                  </span>
                </div>
              </div>

              {/* Date and Time */}
              <div className="flex items-center space-x-2 text-gray-600">
                <CalendarIcon size={16} />
                <span>{new Date(selectedEvent.date).toLocaleDateString('en-US', { 
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}</span>
              </div>

              <div className="flex items-center space-x-2 text-gray-600">
                <Clock size={16} />
                <span>{new Date(selectedEvent.date).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: true 
                })}</span>
                {selectedEvent.meetingData && (
                  <span className="text-sm text-gray-500">
                    ({selectedEvent.meetingData.duration} minutes)
                  </span>
                )}
              </div>

              {/* Host Information */}
              <div className="flex items-center space-x-2 text-gray-600">
                <UserIcon size={16} />
                <span>Hosted by {getHostName(selectedEvent.createdBy)}</span>
              </div>

              {/* Meeting Type (for meetings) */}
              {selectedEvent.meetingData && (
                <div className="flex items-center space-x-2 text-gray-600">
                  {getMeetingTypeIcon(selectedEvent.meetingData.meetingType)}
                  <span className="capitalize">{selectedEvent.meetingData.meetingType} meeting</span>
                </div>
              )}

              {/* Location (for in-person meetings) */}
              {selectedEvent.meetingData?.location && (
                <div className="flex items-center space-x-2 text-gray-600">
                  <MapPin size={16} />
                  <span>{selectedEvent.meetingData.location}</span>
                </div>
              )}

              {/* Participants (for meetings) */}
              {selectedEvent.meetingData && (
                <div className="flex items-center space-x-2 text-gray-600">
                  <Users size={16} />
                  <span>{selectedEvent.meetingData.participants.length} participants</span>
                  {(selectedEvent.meetingData.invitees?.length > 0 || selectedEvent.meetingData.inviteeEmails?.length > 0) && (
                    <span className="text-sm text-blue-600">
                      • {(selectedEvent.meetingData.invitees?.length || 0) + (selectedEvent.meetingData.inviteeEmails?.length || 0)} invited
                    </span>
                  )}
                </div>
              )}

              {/* Invitees List (for meetings) */}
              {selectedEvent.meetingData && (selectedEvent.meetingData.invitees?.length > 0 || selectedEvent.meetingData.inviteeEmails?.length > 0) && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Invited People:</p>
                  <div className="space-y-1">
                    {selectedEvent.meetingData.invitees?.map((inviteeId: string) => {
                      const friend = friends.find(f => f.id === inviteeId);
                      return friend ? (
                        <div key={inviteeId} className="flex items-center space-x-2 text-sm text-gray-600">
                          <div className="w-4 h-4 rounded-full bg-gradient-to-r from-green-400 to-blue-500 flex items-center justify-center">
                            <span className="text-white text-xs font-bold">
                              {friend.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span>{friend.name}</span>
                        </div>
                      ) : null;
                    })}
                    {selectedEvent.meetingData.inviteeEmails?.map((email: string) => (
                      <div key={email} className="flex items-center space-x-2 text-sm text-gray-600">
                        <div className="w-4 h-4 rounded-full bg-gray-400 flex items-center justify-center">
                          <span className="text-white text-xs">@</span>
                        </div>
                        <span>{email}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              {selectedEvent.description && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Description:</p>
                  <p className="text-gray-600">{selectedEvent.description}</p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 mt-6">
              {selectedEvent.type === 'meeting' && selectedEvent.meetingData && (
                <>
                  <button
                    onClick={() => {
                      onJoinMeeting(selectedEvent.id);
                      setShowEventDetails(false);
                    }}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {getMeetingTypeIcon(selectedEvent.meetingData.meetingType)}
                    <span>Join Meeting</span>
                  </button>
                  
                  {selectedEvent.meetingData?.groupId && (
                    <button
                      onClick={() => {
                        onOpenChat(selectedEvent.meetingData!.groupId!);
                        setShowEventDetails(false);
                      }}
                      className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <MessageCircle size={16} />
                      <span>Open Chat</span>
                    </button>
                  )}
                </>
              )}
              
              {selectedEvent.type !== 'meeting' && (
                <button
                  onClick={() => setShowEventDetails(false)}
                  className="flex-1 px-4 py-3 rounded-lg transition-colors btn-primary"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};