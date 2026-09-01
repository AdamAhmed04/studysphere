export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  dateOfBirth?: Date;
  school?: string;
  studyField?: string;
  graduationDate?: Date;
  grade?: string;
  isPublic: boolean;
  totalStudyTime: number; // in minutes
  currentStreak: number;
  interests: string[];
  joinDate: Date;
}

export interface StudySession {
  id: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // in minutes
  subject: string;
  notes?: string;
}

export interface Friend {
  id: string;
  name: string;
  avatar?: string;
  totalStudyTime: number;
  isOnline: boolean;
  lastSeen?: Date;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  message: string;
  timestamp: Date;
  type: 'text' | 'note' | 'resource';
  attachments?: string[];
  groupId?: string;
}

export interface StudyGroup {
  id: string;
  name: string;
  description: string;
  members: string[];
  createdBy: string;
  createdAt: Date;
  isPrivate: boolean;
  subject?: string;
  avatar?: string;
  lastMessage?: ChatMessage;
  lastActivity: Date;
}

export interface TimerState {
  isActive: boolean;
  isPaused: boolean;
  isOnBreak: boolean;
  timeElapsed: number; // in seconds
  targetDuration: number; // in seconds
  currentSubject: string;
  startTime?: Date;
  breakCount: number;
  breakDuration: number; // in seconds
  currentBreak: number;
  breakTimeElapsed: number; // in seconds
}



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

export interface Reminder {
  id: string;
  title: string;
  description?: string;
  reminderTime: Date;
  eventId?: string; // Link to an event if this reminder is for an event
  type: 'event-reminder' | 'standalone-reminder';
  isCompleted: boolean;
  createdBy: string;
}

export interface Meeting {
  id: string;
  title: string;
  description?: string;
  scheduledTime: Date;
  duration: number; // in minutes
  hostId: string;
  participants: string[];
  invitees: string[]; // User IDs of invited people
  inviteeEmails: string[]; // Email addresses of external invitees
  groupId?: string;
  meetingLink?: string;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  createdAt: Date;
  location?: string;
  meetingType: 'video' | 'in-person' | 'phone';
  reminders: number[]; // minutes before meeting
}

export interface Notification {
  id: string;
  userId: string;
  type: 'friend_request' | 'meeting_reminder' | 'study_callout' | 'cheer';
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  actionData?: Record<string, unknown>;
}

export interface CustomTheme {
  id: string;
  name: string;
  backgroundColor: string;
  secondaryBackgroundColor: string;
  buttonColor: string;
  textBoxColor: string;
  isActive: boolean;
}

export interface TodoItem {
  id: string;
  title: string;
  description?: string;
  dueDate?: Date;
  priority: 'low' | 'medium' | 'high';
  isCompleted: boolean;
  createdBy: string;
  createdAt: Date;
  completedAt?: Date;
  category?: string;
}