import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { Clock } from 'lucide-react';


import { useAuthContext } from './contexts/AuthContext';
import { Navigation } from './components/Navigation';
import { Timer } from './components/Timer';
import { StudyStats } from './components/StudyStats';

import { Leaderboard } from './components/Leaderboard';








import { UpcomingMeetings } from './components/UpcomingMeetings';
import { SocialFeed } from './components/SocialFeed';
import { TodoList } from './components/TodoList';
import { useTheme } from './hooks/useTheme';
import { useFriends } from './hooks/useFriends';
import { useGroups } from './hooks/useGroups';
import { useNotifications } from './hooks/useNotifications';
import { usePresence } from './hooks/usePresence';
import { useTodos } from './hooks/useTodos';
import { useMeetings } from './hooks/useMeetings';
import { useCalendar } from './hooks/useCalendar';
import { useReminders } from './hooks/useReminders';
import { useTimerContext } from './contexts/TimerContext';
import { useToast } from './contexts/ToastContext';
import { NotificationsDropdown } from './components/NotificationsDropdown';

import { groupService } from './services/groupService';
import { notificationService } from './services/notificationService';
const BubblePopGame = lazyWithReload(() => import('./components/BubblePopGame').then(module => ({ default: module.BubblePopGame })));
const BlockDropGame = lazyWithReload(() => import('./components/BlockDropGame').then(module => ({ default: module.BlockDropGame })));
const JumpingGame = lazyWithReload(() => import('./components/JumpingGame').then(module => ({ default: module.JumpingGame })));
const AuthPage = lazyWithReload(() => import('./components/AuthPage').then(module => ({ default: module.AuthPage })));
const ResetPassword = lazyWithReload(() => import('./components/ResetPassword').then(module => ({ default: module.ResetPassword })));
const Calendar = lazyWithReload(() => import('./components/Calendar').then(module => ({ default: module.Calendar })));
const SearchPage = lazyWithReload(() => import('./components/SearchPage').then(module => ({ default: module.SearchPage })));
const ChatList = lazyWithReload(() => import('./components/ChatList').then(module => ({ default: module.ChatList })));
const GroupChat = lazyWithReload(() => import('./components/GroupChat').then(module => ({ default: module.GroupChat })));
const FriendsList = lazyWithReload(() => import('./components/FriendsList').then(module => ({ default: module.FriendsList })));
const Settings = lazyWithReload(() => import('./components/Settings').then(module => ({ default: module.Settings })));
const Profile = lazyWithReload(() => import('./components/Profile').then(module => ({ default: module.Profile })));
const CreateGroupModal = lazyWithReload(() => import('./components/CreateGroupModal').then(module => ({ default: module.CreateGroupModal })));
const ScheduleMeetingModal = lazyWithReload(() => import('./components/ScheduleMeetingModal').then(module => ({ default: module.ScheduleMeetingModal })));
const FriendRequestsModal = lazyWithReload(() => import('./components/FriendRequestsModal').then(module => ({ default: module.FriendRequestsModal })));
import { studySessionService } from './services/studySessionService';
import { toLocalDateString } from './utils/dates';
import { orUndefined, orEmpty, orFalse } from './utils/rows';
import type { StudySession, ChatMessage, Friend, User, StudyGroup, TodoItem } from './types';
import type { UserProfile } from './lib/supabase';
import { lazyWithReload } from './utils/lazyWithReload';

// Date reviver function to convert ISO strings back to Date objects

/*
 * Shown when a message's author cannot be resolved through `public_profiles`,
 * which now means their profile is private (or the profile is gone). That is a
 * normal state a person can reach from the Settings toggle, not a fault, so it
 * should not read like an error - "Unknown" did.
 */
const UNRESOLVED_AUTHOR = 'StudySphere user';

/*
 * Shown while a deferred chunk loads. The same treatment as the initial
 * loading screen, so switching tabs does not flash something unfamiliar.
 */
const AppLoading = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <div className="w-16 h-16 bg-surface-high rounded-xl flex items-center justify-center mx-auto mb-4">
        <Clock className="text-white animate-spin" size={32} />
      </div>
      <p className="text-ink/75">Loading…</p>
    </div>
  </div>
);

function App() {
  const { user, profile, stats, loading, incrementStats, updateProfile, isAuthenticated } = useAuthContext();
  const [activeTab, setActiveTab] = useState('timer');
  const { currentTheme } = useTheme();
  const [isPasswordReset, setIsPasswordReset] = useState(false);

  const { friends, pendingRequests, sendFriendRequest: sendFriendReq, sendFriendRequestById, acceptFriendRequest, rejectFriendRequest } = useFriends(user?.id);
  const { groups, createGroup } = useGroups(user?.id);
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications(user?.id);
  const { todos, addTodo, updateTodo, deleteTodo } = useTodos(user?.id);
  const { meetings, createMeeting, updateMeeting } = useMeetings(user?.id);
  const { events: calendarEvents, createEvent, updateEvent, deleteEvent } = useCalendar(user?.id);
  const { reminders, createReminder } = useReminders(user?.id);
  usePresence(user?.id, isAuthenticated);
  const { timer: globalTimerState, formatTime } = useTimerContext();
  const toast = useToast();

  const [showFriendRequests, setShowFriendRequests] = useState(false);

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get('type');

    if (type === 'recovery') {
      setIsPasswordReset(true);
    }
  }, []);

  const loadUserData = useCallback(async () => {
    if (!user?.id) return;

    try {
      const [sessionsData] = await Promise.all([
        studySessionService.getSessions(user.id, 50),
      ]);

      if (sessionsData) {
        setSessions(sessionsData.map(s => ({
          id: s.id,
          userId: s.user_id,
          startTime: new Date(s.start_time),
          endTime: s.end_time ? new Date(s.end_time) : undefined,
          duration: s.duration,
          subject: s.subject,
          notes: orUndefined(s.notes),
        })));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id && isAuthenticated) {
      loadUserData();
    } else {
      setSessions([]);
    }
  }, [user?.id, isAuthenticated, loadUserData]);

  useEffect(() => {
    setStudyGroups(groups.map(g => ({
      id: g.id,
      name: g.name,
      description: g.description,
      subject: g.subject,
      members: g.members || [],
      createdBy: g.created_by,
      createdAt: new Date(g.created_at),
      isPrivate: g.is_private,
      lastActivity: new Date(g.last_activity),
      lastMessage: g.last_message ? {
        id: g.last_message.id,
        userId: g.last_message.user_id,
        userName: g.last_message.user_name || UNRESOLVED_AUTHOR,
        message: g.last_message.message,
        timestamp: new Date(g.last_message.created_at),
        type: g.last_message.type,
        groupId: g.last_message.group_id
      } : undefined
    })));
  }, [groups]);

  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [studyGroups, setStudyGroups] = useState<StudyGroup[]>(groups.map(g => ({
    id: g.id,
    name: g.name,
    description: g.description,
    subject: g.subject,
    members: g.members || [],
    createdBy: g.created_by,
    createdAt: new Date(g.created_at),
    isPrivate: g.is_private,
    lastActivity: new Date(g.last_activity)
  })));

  /*
   * What the Social panel shows.
   *
   * It used to be handed a `chatMessages` state that was only ever assigned
   * [], so the panel sat in its "No recent messages" state permanently, however
   * much people were talking. The group list already carries each group's
   * latest message - loaded for the chat previews - so the feed is derived from
   * that rather than fetched again. SocialFeed does its own sorting and
   * slicing.
   */
  const recentGroupMessages = useMemo(
    () => studyGroups
      .map(group => group.lastMessage)
      .filter((message): message is ChatMessage => Boolean(message)),
    [studyGroups]
  );

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [groupMessagesCache, setGroupMessagesCache] = useState<{ [key: string]: ChatMessage[] }>({});
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showScheduleMeeting, setShowScheduleMeeting] = useState(false);
  const [showMiniGame, setShowMiniGame] = useState(false);
  const [showBlockDropGame, setShowBlockDropGame] = useState(false);
  const [showJumpingGame, setShowJumpingGame] = useState(false);
  const [schedulingContext, setSchedulingContext] = useState<{
    group?: StudyGroup;
    friend?: Friend;
  }>({});

  const handleSessionComplete = async (duration: number, subject: string, startTime: Date, endTime: Date) => {
    if (!user?.id) return;

    try {
      const savedSession = await studySessionService.createSession(user.id, {
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        duration,
        subject,
      });

      const newSession: StudySession = {
        id: savedSession.id,
        userId: savedSession.user_id,
        startTime: new Date(savedSession.start_time),
        endTime: savedSession.end_time ? new Date(savedSession.end_time) : undefined,
        duration: savedSession.duration,
        subject: savedSession.subject,
      };

      setSessions(prev => [newSession, ...prev]);

      // The session row is what earns the credit; the server reads the minutes
      // off it rather than believing a number sent from here.
      await incrementStats({
        sessionId: savedSession.id,
        expectedFocusMinutes: duration,
      });

      toast.success(`Saved ${duration} minute${duration === 1 ? '' : 's'} of ${subject}.`);
    } catch (error) {
      toast.error('Your session finished but could not be saved.', error);
    }
  };

  // From search results, where we have a real user id.
  const handleAddFriendById = async (userId: string, name?: string) => {
    const result = await sendFriendRequestById(userId, name);
    if (result.success) toast.success(result.message);
    else toast.error(result.message);
  };

  // From the "add by email" box.
  const handleAddFriend = async (email: string) => {
    const result = await sendFriendReq(email);
    if (result.success) toast.success(result.message);
    else toast.error(result.message);
  };


  /*
   * Nudge a friend to get studying.
   *
   * This used to show an encouraging alert to whoever clicked it and send
   * nothing to the other person. The `study_callout` notification type has
   * existed in the schema the whole time; nothing ever wrote one. The
   * notification policy permits it now, because it checks for a real
   * relationship and these two are friends.
   */
  const handleCallOut = async (friendId: string) => {
    const friend = friends.find(f => f.id === friendId);
    if (!friend || !profile) return;

    try {
      await notificationService.createNotification(
        friendId,
        'study_callout',
        'Time to study',
        `${profile.name} is nudging you to get started.`,
        { from_user_id: user?.id, from_name: profile.name }
      );
      toast.success(`Nudged ${friend.name}.`);
    } catch (error) {
      toast.error(`Could not nudge ${friend.name}.`, error);
    }
  };

  /** Cheer a friend on. Same story as handleCallOut: the `cheer` type existed,
   *  nothing ever wrote one. */
  const handleSendStar = async (friendId: string) => {
    const friend = friends.find(f => f.id === friendId);
    if (!friend || !profile) return;

    try {
      await notificationService.createNotification(
        friendId,
        'cheer',
        'Someone cheered you on',
        `${profile.name} says keep it up.`,
        { from_user_id: user?.id, from_name: profile.name }
      );
      toast.success(`Cheered ${friend.name}.`);
    } catch (error) {
      toast.error(`Could not cheer ${friend.name}.`, error);
    }
  };

  const handleUpdateProfile = (updates: Partial<User>) => {
    if (profile) {
      // Map the camelCase UI shape onto the table's snake_case columns and
      // drop keys that aren't columns at all (id, username, joinDate, ...).
      // Sending the raw form object made every profile save fail.
      const toDateString = (value: unknown) =>
        value instanceof Date ? toLocalDateString(value) : (value as string | undefined);

      const columnPatch: Record<string, unknown> = {
        name: updates.name,
        email: updates.email,
        bio: updates.bio,
        school: updates.school,
        grade: updates.grade,
        interests: updates.interests,
        avatar_url: updates.avatar,
        study_field: updates.studyField,
        is_public: updates.isPublic,
        date_of_birth: toDateString(updates.dateOfBirth),
        graduation_date: toDateString(updates.graduationDate),
      };

      const patch = Object.fromEntries(
        Object.entries(columnPatch).filter(([, value]) => value !== undefined)
      );

      // fromEntries erases the key types, so this asserts back to the shape
      // updateProfile declares. A real type rather than any: a wrong column name
      // is still a compile error.
      updateProfile(patch as Partial<UserProfile>).then(() => {
        toast.success('Profile updated.');
      }).catch((error) => {
        toast.error('Could not save your profile.', error);
      });
    }
  };

  /*
   * Opens an existing two-person group with this friend, if one exists.
   *
   * This used to fabricate a group in React state with the id
   * `direct-${Date.now()}` and never write it to the database. Nothing
   * persisted, the other person never saw it, and opening it queried
   * chat_messages with a group_id that is not a UUID — which Postgres rejects
   * outright (22P02). Creating real direct-message groups is a feature that
   * needs building; presenting a fake one was worse than not offering it.
   */
  const handleStartChat = (friendId: string) => {
    const existingDirectChat = studyGroups.find(group =>
      group.members.length === 2 &&
      group.members.includes(user?.id || '') &&
      group.members.includes(friendId)
    );

    if (existingDirectChat) {
      setActiveTab('chat');
      setSelectedGroupId(existingDirectChat.id);
      return;
    }

    const friend = friends.find(f => f.id === friendId);
    toast.info(
      `Direct messages aren't built yet. Create a study group with ${friend?.name || 'them'} to chat.`
    );
  };

  const handleScheduleMeeting = () => {
    const selectedGroup = selectedGroupId ? studyGroups.find(g => g.id === selectedGroupId) : undefined;
    setSchedulingContext({ group: selectedGroup });
    setShowScheduleMeeting(true);
  };

  const handleStartVideoCall = () => {
    toast.info("Video calling isn't built yet.");
  };

  const handleCreateGroup = async (groupData: {
    name: string;
    description: string;
    subject?: string;
    isPrivate: boolean;
    members: string[];
  }) => {
    try {
      await createGroup({
        name: groupData.name,
        description: groupData.description,
        subject: groupData.subject,
        isPrivate: groupData.isPrivate,
        memberIds: groupData.members
      });
      toast.success(`Created the group "${groupData.name}".`);
    } catch (error) {
      toast.error('Could not create the group.', error);
    }
  };

  const handleSelectGroup = (groupId: string) => {
    setSelectedGroupId(groupId);
  };

  const handleBackToList = () => {
    setSelectedGroupId(null);
  };

  const getGroupMessages = (groupId: string) => {
    return groupMessagesCache[groupId] || [];
  };

  useEffect(() => {
    if (selectedGroupId) {
      loadGroupMessages(selectedGroupId);

      const subscription = groupService.subscribeToGroupMessages(selectedGroupId, (newMessage) => {
        setGroupMessagesCache(prev => {
          const currentMessages = prev[selectedGroupId] || [];
          const messageExists = currentMessages.some(m => m.id === newMessage.id);
          if (messageExists) return prev;

          const chatMessage: ChatMessage = {
            id: newMessage.id,
            userId: newMessage.user_id,
            userName: newMessage.user_name || UNRESOLVED_AUTHOR,
            userAvatar: newMessage.user_avatar,
            message: newMessage.message,
            timestamp: new Date(newMessage.created_at),
            type: newMessage.type,
            attachments: newMessage.attachments,
            groupId: newMessage.group_id
          };
          return {
            ...prev,
            [selectedGroupId]: [...currentMessages, chatMessage].slice(-100)
          };
        });
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [selectedGroupId]);

  const loadGroupMessages = async (groupId: string) => {
    try {
      const messages = await groupService.getGroupMessages(groupId);
      const chatMessages: ChatMessage[] = messages.map(msg => ({
        id: msg.id,
        userId: msg.user_id,
        userName: msg.user_name || UNRESOLVED_AUTHOR,
        userAvatar: msg.user_avatar,
        message: msg.message,
        timestamp: new Date(msg.created_at),
        type: msg.type,
        attachments: msg.attachments,
        groupId: msg.group_id
      }));
      setGroupMessagesCache(prev => ({
        ...prev,
        [groupId]: chatMessages
      }));
    } catch (error) {
      console.error('Failed to load group messages:', error);
    }
  };

  const handleSendGroupMessage = async (message: string, type: 'text' | 'note' | 'resource') => {
    if (!selectedGroupId) return;

    try {
      await groupService.sendMessage(selectedGroupId, message, type);
    } catch (error) {
      toast.error('Message not sent.', error);
    }
  };

  const handleCreateMeeting = async (meetingData: {
    title: string;
    description?: string;
    scheduledTime: Date;
    duration: number;
    participants: string[];
    invitees: string[];
    inviteeEmails: string[];
    groupId?: string;
    location?: string;
    meetingType: 'video' | 'in-person' | 'phone';
    reminders: number[];
  }) => {
    try {
      await createMeeting(meetingData);

      // Add to calendar
      await createEvent({
        title: meetingData.title,
        description: meetingData.description,
        date: meetingData.scheduledTime,
        type: 'meeting',
        color: '#10B981',
        groupId: meetingData.groupId
      });

      // Send notification message to group chat if it's a group meeting
      if (meetingData.groupId) {
        await groupService.sendMessage(
          meetingData.groupId,
          `📅 Meeting scheduled: "${meetingData.title}" on ${meetingData.scheduledTime.toLocaleDateString()} at ${meetingData.scheduledTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          'text'
        );
      }

      const inviteCount = meetingData.invitees.length + meetingData.inviteeEmails.length;
      const inviteText = inviteCount > 0 ? ` and ${inviteCount} people have been invited` : '';
      toast.success(`Scheduled "${meetingData.title}"${inviteText}.`);
    } catch (error) {
      toast.error('Could not schedule the meeting.', error);
    }
  };

  const handleJoinMeeting = async (meetingId: string) => {
    const meeting = meetings.find(m => m.id === meetingId);
    if (meeting) {
      try {
        await updateMeeting(meetingId, { status: 'active' });

        if (meeting.meetingType === 'video') {
          toast.info(`Video calling isn't built yet — "${meeting.title}" is marked as active.`);
        } else if (meeting.meetingType === 'phone') {
          toast.info(`Phone calls aren't built yet — "${meeting.title}" is marked as active.`);
        } else {
          toast.info(`"${meeting.title}" is at ${meeting.location}.`);
        }
      } catch (error) {
        console.error('Failed to join meeting:', error);
      }
    }
  };

  const handleOpenChatFromMeeting = (groupId: string) => {
    setActiveTab('chat');
    setSelectedGroupId(groupId);
  };

  const handleAddTodo = async (todoData: Omit<TodoItem, 'id' | 'createdAt'>) => {
    try {
      const newTodo = await addTodo({
        title: todoData.title,
        description: todoData.description,
        // A calendar date, not an instant — the column is `date` now.
        due_date: toLocalDateString(todoData.dueDate) || undefined,
        priority: todoData.priority,
        category: todoData.category
      });

      // Add to calendar if it has a due date
      if (todoData.dueDate) {
        await createEvent({
          title: `📋 ${todoData.title}`,
          description: todoData.description,
          date: todoData.dueDate,
          type: 'todo',
          color: '#EC4899',
          todoId: newTodo.id
        });
      }
    } catch (error) {
      toast.error('Could not add that task.', error);
    }
  };

  const handleUpdateTodo = async (id: string, updates: Partial<TodoItem>) => {
    try {
      await updateTodo(id, {
        title: updates.title,
        description: updates.description,
        // A calendar date, not an instant — matching the `date` column.
        // Undefined still means "not specified", so a partial update (ticking
        // a todo complete) leaves the existing due date alone.
        due_date: toLocalDateString(updates.dueDate) || undefined,
        priority: updates.priority,
        category: updates.category,
        is_completed: updates.isCompleted
      });

      // Credit the tasks counter the first time a to-do is ticked complete.
      // The server decides whether it actually counts — it credits a to-do
      // once and remembers, so un-ticking and re-ticking does not keep adding.
      // Deliberately not awaited alongside the update above: the tick should
      // not appear to fail because the counter did.
      if (updates.isCompleted === true) {
        try {
          await incrementStats({ todoId: id });
        } catch {
          // Already surfaced by useAuth, and the to-do itself is saved.
        }
      }

      // Update calendar event if due date changed.
      // Note: a partial update (e.g. ticking a todo complete) has no dueDate
      // key at all, which is NOT the same as the user clearing the due date.
      // Only treat it as cleared when the key is present and falsy.
      const existingCalendarEvent = calendarEvents.find(e => e.todoId === id);
      const dueDateProvided = 'dueDate' in updates;

      if (updates.dueDate && existingCalendarEvent) {
        await updateEvent(existingCalendarEvent.id, {
          title: `📋 ${updates.title}`,
          description: updates.description,
          event_date: updates.dueDate.toISOString(),
          event_type: 'todo',
          color: '#EC4899'
        });
      } else if (updates.dueDate && !existingCalendarEvent) {
        await createEvent({
          title: `📋 ${updates.title}`,
          description: updates.description,
          date: updates.dueDate,
          type: 'todo',
          color: '#EC4899',
          todoId: id
        });
      } else if (dueDateProvided && !updates.dueDate && existingCalendarEvent) {
        await deleteEvent(existingCalendarEvent.id);
      }
    } catch (error) {
      toast.error('Could not update that task.', error);
    }
  };

  const handleDeleteTodo = async (id: string) => {
    try {
      await deleteTodo(id);

      // Remove from calendar
      const calendarEvent = calendarEvents.find(e => e.todoId === id);
      if (calendarEvent) {
        await deleteEvent(calendarEvent.id);
      }
    } catch (error) {
      toast.error('Could not delete that task.', error);
    }
  };

  const handleOpenChatFromSocial = (groupId: string) => {
    if (groupId) {
      setActiveTab('chat');
      setSelectedGroupId(groupId);
    } else {
      // Open chat list if no specific group
      setActiveTab('chat');
      setSelectedGroupId(null);
    }
  };

  // Show password reset page if user is resetting password
  if (isPasswordReset) {
    return (
      <Suspense fallback={<AppLoading />}>
      <ResetPassword
        onComplete={() => {
          setIsPasswordReset(false);
          window.location.hash = '';
        }}
      />
      </Suspense>
    );
  }

  // Show loading or auth page
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-surface-high rounded-xl flex items-center justify-center mx-auto mb-4">
            <Clock className="text-white animate-spin" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-ink mb-2">StudySphere</h2>
          <p className="text-ink/75">Loading your study space...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !profile) {
    return (
      <Suspense fallback={<AppLoading />}>
        <AuthPage />
      </Suspense>
    );
  }

  // Convert profile and stats to legacy User format for compatibility
  const legacyUser: User = {
    id: user?.id || '',
    username: profile.name,
    name: profile.name,
    email: profile.email,
    avatar: orUndefined(profile.avatar_url),
    bio: orUndefined(profile.bio),
    dateOfBirth: profile.date_of_birth ? new Date(profile.date_of_birth) : undefined,
    school: orUndefined(profile.school),
    studyField: orUndefined(profile.study_field),
    graduationDate: profile.graduation_date ? new Date(profile.graduation_date) : undefined,
    grade: orUndefined(profile.grade),
    isPublic: orFalse(profile.is_public),
    totalStudyTime: stats?.total_focus_minutes || 0,
    currentStreak: stats?.streak_days || 0,
    interests: profile.interests ?? [],
    joinDate: new Date(orEmpty(profile.created_at)),
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'timer':
        return (
          <div className="max-w-6xl mx-auto space-y-4 md:space-y-6">
            <StudyStats sessions={sessions} stats={stats} />
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
              <div className="lg:col-span-2 space-y-4 md:space-y-6">
                <Timer onSessionComplete={handleSessionComplete} />
                <TodoList
                  todos={todos}
                  onAddTodo={handleAddTodo}
                  onUpdateTodo={handleUpdateTodo}
                  onDeleteTodo={handleDeleteTodo}
                  currentUserId={user?.id || ''}
                />
                
                {/* Mini-Game Access Button */}
                <div className="theme-secondary-bg rounded-2xl shadow-xl p-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">🫧</span>
                    </div>
                    <h3 className="text-lg font-bold text-ink mb-2">Need a Break?</h3>
                    <p className="text-sm text-ink/75 mb-4">
                      Take a quick mental break with our relaxing bubble-popping game!
                    </p>
                    <button
                      onClick={() => setShowMiniGame(true)}
                      className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      Play Bubble Pop 🎮
                    </button>
                  </div>
                </div>
                
                {/* Block Drop Tetris Game */}
                <div className="theme-secondary-bg rounded-2xl shadow-xl p-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-surface-high rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">🧩</span>
                    </div>
                    <h3 className="text-lg font-bold text-ink mb-2">Puzzle Challenge</h3>
                    <p className="text-sm text-ink/75 mb-4">
                      Exercise your mind with this classic block-stacking puzzle game!
                    </p>
                    <button
                      onClick={() => setShowBlockDropGame(true)}
                      className="px-6 py-3 bg-surface-high text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      Play Block Drop 🎯
                    </button>
                  </div>
                </div>

                {/*
                  The third game. It was written, complete, and imported by
                  nothing — so the app promised three break games and offered
                  two. Same {isOpen, onClose} contract as its siblings; it only
                  ever needed wiring up.
                */}
                <div className="theme-secondary-bg rounded-2xl shadow-xl p-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">🏃</span>
                    </div>
                    <h3 className="text-lg font-bold text-ink mb-2">Quick Reflexes</h3>
                    <p className="text-sm text-ink/75 mb-4">
                      Jump the obstacles and see how far you can get before your break is over!
                    </p>
                    <button
                      onClick={() => setShowJumpingGame(true)}
                      className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      Play Jump Run 🏃
                    </button>
                  </div>
                </div>

              </div>
              <div className="lg:col-span-2 space-y-4 md:space-y-6">
                <SocialFeed
                  groups={studyGroups}
                  messages={recentGroupMessages}
                  onOpenChat={handleOpenChatFromSocial}
                />
                <UpcomingMeetings
                  meetings={meetings}
                  groups={studyGroups}
                  onJoinMeeting={handleJoinMeeting}
                  onOpenChat={handleOpenChatFromMeeting}
                />
              </div>
            </div>
          </div>
        );
      
      case 'search':
        return (
          <SearchPage
            onAddFriend={handleAddFriendById}
            currentUser={legacyUser}
            friends={friends}
          />
        );
      
      case 'stats':
        return (
          <div className="max-w-4xl mx-auto">
            <div className="bg-surface rounded-2xl shadow-xl p-6">
              <h3 className="text-2xl font-bold text-ink mb-4">Recent Sessions</h3>

              {/* Without this a new account sees a bare heading over nothing,
                  which reads as a page that failed to load. */}
              {sessions.length === 0 && (
                <div className="text-center py-10 text-muted">
                  <p className="font-medium text-ink/75">No sessions yet</p>
                  <p className="text-sm mt-1">
                    Finish a study session on the Home tab and it will show up here.
                  </p>
                </div>
              )}

              <div className="space-y-3">
                {sessions.slice(0, 5).map(session => (
                  <div key={session.id} className="flex items-center justify-between p-4 bg-surface rounded-xl">
                    <div>
                      <p className="font-semibold text-ink">{session.subject}</p>
                      <p className="text-sm text-ink/75">
                        {new Date(session.startTime).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="text-lg font-bold text-sand">
                      {session.duration >= 60 ? `${Math.floor(session.duration / 60)}h ` : ''}
                      {session.duration % 60}m
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      
      case 'friends':
        return (
          <div className="max-w-4xl mx-auto grid lg:grid-cols-2 gap-6">
            <FriendsList
              friends={friends}
              onAddFriend={handleAddFriend}
              onAddFriendById={handleAddFriendById}
              onStartChat={handleStartChat}
            />
            <Leaderboard
              friends={[...friends, {
                id: user?.id || '',
                // Not `name + ' (You)'` — Leaderboard already appends "(You)"
                // for whoever matches currentUserId, and doing both produced
                // "Adam Ahmed (You) (You)".
                name: legacyUser.name,
                // Your own row is built here rather than fetched, so it has to
                // carry the photo too — without it everyone had a face on the
                // leaderboard except you.
                avatar: legacyUser.avatar,
                totalStudyTime: legacyUser.totalStudyTime,
                isOnline: true
              }]}
              currentUserId={user?.id || ''}
              onCallOut={handleCallOut}
              onSendStar={handleSendStar}
            />
          </div>
        );
      
      case 'chat':
        return (
          <div className="max-w-4xl mx-auto">
            {selectedGroupId ? (
              <GroupChat
                groupName={studyGroups.find(g => g.id === selectedGroupId)?.name}
                groupSubject={studyGroups.find(g => g.id === selectedGroupId)?.subject}
                memberCount={studyGroups.find(g => g.id === selectedGroupId)?.members.length}
                messages={getGroupMessages(selectedGroupId)}
                onSendMessage={handleSendGroupMessage}
                onScheduleMeeting={handleScheduleMeeting}
                onStartVideoCall={handleStartVideoCall}
                onBackToList={handleBackToList}
              />
            ) : (
              <ChatList
                groups={studyGroups}
                onSelectGroup={handleSelectGroup}
                onCreateGroup={() => setShowCreateGroup(true)}
                currentUser={legacyUser}
                friends={friends}
              />
            )}
          </div>
        );
      
      case 'calendar':
        return (
          <Calendar
            events={calendarEvents}
            reminders={reminders}
            meetings={meetings}
            onCreateEvent={(event) =>
              // Returned, not swallowed: the Calendar needs the saved event's
              // real id to attach a reminder to it.
              createEvent({
                title: event.title,
                description: event.description,
                date: event.date,
                type: event.type,
                color: event.color,
                hasReminder: event.hasReminder,
                reminderMinutes: event.reminderMinutes,
              }).catch((error) => {
                toast.error('Could not create that event.', error);
                return undefined;
              })
            }
            onCreateReminder={(reminder) => {
              // The Calendar builds a Reminder with a placeholder id; the real
              // one comes back from the database, so only the fields go across.
              createReminder({
                title: reminder.title,
                description: reminder.description,
                reminderTime: reminder.reminderTime,
                eventId: reminder.eventId,
              }).catch((error) => {
                toast.error('Could not save that reminder.', error);
              });
            }}
            onCreateMeeting={(meeting) => {
              handleCreateMeeting({
                title: meeting.title,
                description: meeting.description,
                scheduledTime: meeting.scheduledTime,
                duration: meeting.duration,
                participants: meeting.participants || [],
                invitees: [],
                inviteeEmails: [],
                meetingType: 'video',
                reminders: [],
              });
            }}
            currentUser={legacyUser}
            onJoinMeeting={handleJoinMeeting}
            onOpenChat={handleOpenChatFromMeeting}
            friends={friends}
          />
        );
      
      case 'profile':
        return (
          <Profile
            userProfile={legacyUser}
            onUpdateProfile={handleUpdateProfile}
            sessions={sessions}
            friends={friends}
          />
        );
      
      case 'settings':
        return (
          <Settings
            userProfile={legacyUser}
            onUpdateProfile={handleUpdateProfile}
          />
        );
      
      default:
        return renderContent();
    }
  };

  return (
    <Suspense fallback={<AppLoading />}>
    {/*
      * The ground is AuroraGround, mounted once in main.tsx and fixed behind
      * everything at z-index -1, so every screen shares the same drifting hue
      * rather than each one painting its own background. The shell stays
      * transparent unless someone has set a custom theme colour.
      */}
    <div
      className="min-h-screen theme-bg"
      style={
        currentTheme.backgroundColor && currentTheme.backgroundColor !== 'transparent'
          ? { background: currentTheme.backgroundColor }
          : undefined
      }
    >
      <Navigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        userProfile={{
          username: legacyUser.username,
          isPublic: legacyUser.isPublic,
          avatar: legacyUser.avatar,
          name: legacyUser.name || legacyUser.username
        }}
        timerState={{
          isActive: globalTimerState.isActive,
          isPaused: globalTimerState.isPaused,
          timeElapsed: globalTimerState.timeElapsed,
          currentSubject: globalTimerState.currentSubject
        }}
        formatTime={formatTime}
      />

      <div className="fixed top-2 right-2 md:top-4 md:right-4 z-50 flex flex-col md:flex-row items-end md:items-center space-y-2 md:space-y-0 md:space-x-4">
        {pendingRequests.length > 0 && (
          <button
            onClick={() => setShowFriendRequests(true)}
            className="px-3 py-2 md:px-4 md:py-2 bg-sand text-white rounded-lg hover:bg-sand-lo transition-colors font-medium shadow-lg relative text-sm md:text-base min-h-[44px] min-w-[44px]"
          >
            {pendingRequests.length} Friend Request{pendingRequests.length !== 1 ? 's' : ''}
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
          </button>
        )}
        <div className="bg-surface rounded-lg shadow-lg p-1 min-h-[44px] min-w-[44px]">
          <NotificationsDropdown
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkAsRead={markAsRead}
            onMarkAllAsRead={markAllAsRead}
            onDelete={deleteNotification}
          />
        </div>
      </div>
      
      <main className="container mx-auto px-3 md:px-4 py-4 md:py-8 pb-20 md:pb-8">
        {renderContent()}
      </main>
      
      <CreateGroupModal
        isOpen={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        onCreateGroup={handleCreateGroup}
        currentUser={legacyUser}
        friends={friends}
      />
      
      <ScheduleMeetingModal
        isOpen={showScheduleMeeting}
        onClose={() => {
          setShowScheduleMeeting(false);
          setSchedulingContext({});
        }}
        onScheduleMeeting={handleCreateMeeting}
        currentUser={legacyUser}
        friends={friends}
        selectedGroup={schedulingContext.group}
        selectedFriend={schedulingContext.friend}
      />
      
      <Suspense fallback={<div />}>
        {showMiniGame && (
          <BubblePopGame
            isOpen={showMiniGame}
            onClose={() => setShowMiniGame(false)}
          />
        )}

        {showBlockDropGame && (
          <BlockDropGame
            isOpen={showBlockDropGame}
            onClose={() => setShowBlockDropGame(false)}
          />
        )}

        {showJumpingGame && (
          <JumpingGame
            isOpen={showJumpingGame}
            onClose={() => setShowJumpingGame(false)}
          />
        )}
      </Suspense>

      <FriendRequestsModal
        isOpen={showFriendRequests}
        onClose={() => setShowFriendRequests(false)}
        requests={pendingRequests}
        onAccept={async (requestId) => {
          await acceptFriendRequest(requestId);
          toast.success('Friend request accepted.');
        }}
        onReject={async (requestId) => {
          await rejectFriendRequest(requestId);
          toast.info('Friend request declined.');
        }}
      />
    </div>
    </Suspense>
  );
}

export default App;