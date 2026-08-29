import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Clock } from 'lucide-react';
import { AuthPage } from './components/AuthPage';
import { ResetPassword } from './components/ResetPassword';
import { useAuth } from './hooks/useAuth';
import { Navigation } from './components/Navigation';
import { Timer } from './components/Timer';
import { StudyStats } from './components/StudyStats';
import { FriendsList } from './components/FriendsList';
import { Leaderboard } from './components/Leaderboard';
import { GroupChat } from './components/GroupChat';
import { Settings } from './components/Settings';
import { Profile } from './components/Profile';
import { Calendar } from './components/Calendar';
import { SearchPage } from './components/SearchPage';
import { ChatList } from './components/ChatList';
import { CreateGroupModal } from './components/CreateGroupModal';
import { ScheduleMeetingModal } from './components/ScheduleMeetingModal';
import { UpcomingMeetings } from './components/UpcomingMeetings';
import { SocialFeed } from './components/SocialFeed';
import { TodoList } from './components/TodoList';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useTheme } from './hooks/useTheme';
import { useFriends } from './hooks/useFriends';
import { useGroups } from './hooks/useGroups';
import { useNotifications } from './hooks/useNotifications';
import { usePresence } from './hooks/usePresence';
import { useTodos } from './hooks/useTodos';
import { useMeetings } from './hooks/useMeetings';
import { useCalendar } from './hooks/useCalendar';
import { useTimer } from './hooks/useTimer';
import { NotificationsDropdown } from './components/NotificationsDropdown';
import { FriendRequestsModal } from './components/FriendRequestsModal';
import { groupService } from './services/groupService';
import { meetingService } from './services/meetingService';
import { todoService } from './services/todoService';
import { calendarService } from './services/calendarService';
const BubblePopGame = lazy(() => import('./components/BubblePopGame').then(module => ({ default: module.BubblePopGame })));
const BlockDropGame = lazy(() => import('./components/BlockDropGame').then(module => ({ default: module.BlockDropGame })));
import { studySessionService } from './services/studySessionService';
import type { StudySession, ChatMessage, Friend, User, Meeting, CalendarEvent, StudyGroup, Reminder, TodoItem } from './types';

// Date reviver function to convert ISO strings back to Date objects
const dateReviver = (key: string, value: any) => {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
    return new Date(value);
  }
  return value;
};

function App() {
  const { user, profile, stats, loading, incrementStats, updateProfile, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('timer');
  const { currentTheme } = useTheme();
  const [isPasswordReset, setIsPasswordReset] = useState(false);

  const { friends, pendingRequests, sendFriendRequest: sendFriendReq, acceptFriendRequest, rejectFriendRequest } = useFriends(user?.id);
  const { groups, createGroup, refreshGroups } = useGroups(user?.id);
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications(user?.id);
  const { todos, addTodo, updateTodo, deleteTodo, toggleComplete } = useTodos(user?.id);
  const { meetings, createMeeting, updateMeeting, deleteMeeting, getUpcomingMeetings } = useMeetings(user?.id);
  const { events: calendarEvents, createEvent, updateEvent, deleteEvent } = useCalendar(user?.id);
  usePresence(user?.id, isAuthenticated);
  const { timer: globalTimerState, formatTime } = useTimer();

  const [showFriendRequests, setShowFriendRequests] = useState(false);

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get('type');

    if (type === 'recovery') {
      setIsPasswordReset(true);
    }
  }, []);

  useEffect(() => {
    if (user?.id && isAuthenticated) {
      loadUserData();
    } else {
      setSessions([]);
      setChatMessages([]);
      setReminders([]);
    }
  }, [user?.id, isAuthenticated]);

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
        userName: g.last_message.user_name || 'Unknown',
        message: g.last_message.message,
        timestamp: new Date(g.last_message.created_at),
        type: g.last_message.type,
        groupId: g.last_message.group_id
      } : undefined
    })));
  }, [groups]);

  const loadUserData = async () => {
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
          notes: s.notes,
        })));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
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
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [groupMessagesCache, setGroupMessagesCache] = useState<{ [key: string]: ChatMessage[] }>({});
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showScheduleMeeting, setShowScheduleMeeting] = useState(false);
  const [showMiniGame, setShowMiniGame] = useState(false);
  const [showBlockDropGame, setShowBlockDropGame] = useState(false);
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

      await incrementStats({
        sessions: 1,
        totalFocusMinutes: duration,
      });

      alert(`Great job! You studied ${subject} for ${duration} minutes. 🎉`);
    } catch (error) {
      console.error('Failed to save study session:', error);
      alert('Study session completed but failed to save. Please check your connection.');
    }
  };

  const handleAddFriend = async (email: string) => {
    const result = await sendFriendReq(email);
    if (result.success) {
      alert(result.message);
    } else {
      alert(result.message);
    }
  };

  const handleSendMessage = (message: string, type: 'text' | 'note' | 'resource') => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      userId: user?.id || '',
      userName: profile?.name || 'Unknown',
      message,
      timestamp: new Date(),
      type,
    };

    setChatMessages(prev => [...prev, newMessage]);
  };

  const handleCallOut = (friendId: string) => {
    const friend = friends.find(f => f.id === friendId);
    if (friend) {
      alert(`Hey ${friend.name}! Time to hit the books! 📚 Your study buddies are counting on you!`);
    }
  };

  const handleSendStar = (friendId: string) => {
    const friend = friends.find(f => f.id === friendId);
    if (friend) {
      alert(`⭐ Amazing work ${friend.name}! You're crushing your study goals! Keep up the fantastic effort! 🌟`);
    }
  };

  const handleUpdateProfile = (updates: Partial<User>) => {
    if (profile) {
      updateProfile(updates as any).then(() => {
        alert('Profile updated successfully!');
      }).catch((error) => {
        console.error('Profile update failed:', error);
        alert('Failed to update profile');
      });
    }
  };

  const handleStartChat = (friendId: string) => {
    // Find or create a direct message group with this friend
    const existingDirectChat = studyGroups.find(group => 
      group.members.length === 2 && 
      group.members.includes(user?.id || '') && 
      group.members.includes(friendId)
    );
    
    if (existingDirectChat) {
      setActiveTab('chat');
      setSelectedGroupId(existingDirectChat.id);
    } else {
      // Create a new direct message group
      const friend = friends.find(f => f.id === friendId);
      if (friend) {
        const newDirectChat: StudyGroup = {
          id: `direct-${Date.now()}`,
          name: `${profile?.name || 'You'} & ${friend.name}`,
          description: 'Direct message',
          members: [user?.id || '', friendId],
          createdBy: user?.id || '',
          createdAt: new Date(),
          isPrivate: true,
          lastActivity: new Date(),
        };
        
        setStudyGroups(prev => [newDirectChat, ...prev]);
        setActiveTab('chat');
        setSelectedGroupId(newDirectChat.id);
      }
    }
  };

  const handleScheduleMeeting = () => {
    const selectedGroup = selectedGroupId ? studyGroups.find(g => g.id === selectedGroupId) : undefined;
    setSchedulingContext({ group: selectedGroup });
    setShowScheduleMeeting(true);
  };

  const handleStartVideoCall = () => {
    alert('Starting video call... 📹 (Video calling feature coming soon!)');
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
      alert(`Study group "${groupData.name}" created successfully!`);
    } catch (error) {
      console.error('Failed to create group:', error);
      alert('Failed to create group. Please try again.');
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
            userName: newMessage.user_name || 'Unknown',
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
        userName: msg.user_name || 'Unknown',
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
      console.error('Failed to send message:', error);
      alert('Failed to send message. Please try again.');
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
      const newMeeting = await createMeeting(meetingData);

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
      alert(`Meeting "${meetingData.title}" scheduled successfully${inviteText}!`);
    } catch (error) {
      console.error('Failed to create meeting:', error);
      alert('Failed to create meeting. Please try again.');
    }
  };

  const handleJoinMeeting = async (meetingId: string) => {
    const meeting = meetings.find(m => m.id === meetingId);
    if (meeting) {
      try {
        await updateMeeting(meetingId, { status: 'active' });

        if (meeting.meetingType === 'video') {
          alert(`Joining video call for "${meeting.title}"...`);
        } else if (meeting.meetingType === 'phone') {
          alert(`Starting phone call for "${meeting.title}"...`);
        } else {
          alert(`Meeting "${meeting.title}" is at: ${meeting.location}`);
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
        due_date: todoData.dueDate?.toISOString(),
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
      console.error('Failed to add todo:', error);
      alert('Failed to add todo. Please try again.');
    }
  };

  const handleUpdateTodo = async (id: string, updates: Partial<TodoItem>) => {
    try {
      await updateTodo(id, {
        title: updates.title,
        description: updates.description,
        due_date: updates.dueDate?.toISOString(),
        priority: updates.priority,
        category: updates.category,
        is_completed: updates.isCompleted
      });

      // Update calendar event if due date changed
      const existingCalendarEvent = calendarEvents.find(e => e.todoId === id);

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
      } else if (!updates.dueDate && existingCalendarEvent) {
        await deleteEvent(existingCalendarEvent.id);
      }
    } catch (error) {
      console.error('Failed to update todo:', error);
      alert('Failed to update todo. Please try again.');
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
      console.error('Failed to delete todo:', error);
      alert('Failed to delete todo. Please try again.');
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
      <ResetPassword
        onComplete={() => {
          setIsPasswordReset(false);
          window.location.hash = '';
        }}
      />
    );
  }

  // Show loading or auth page
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Clock className="text-white animate-spin" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">StudySphere</h2>
          <p className="text-gray-600">Loading your study space...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !profile) {
    return <AuthPage />;
  }

  // Convert profile and stats to legacy User format for compatibility
  const legacyUser: User = {
    id: user?.id || '',
    username: profile.name,
    name: profile.name,
    email: profile.email,
    avatar: profile.avatar_url,
    bio: profile.bio,
    dateOfBirth: profile.date_of_birth ? new Date(profile.date_of_birth) : undefined,
    school: profile.school,
    studyField: profile.study_field,
    graduationDate: profile.graduation_date ? new Date(profile.graduation_date) : undefined,
    grade: profile.grade,
    isPublic: profile.is_public,
    totalStudyTime: stats?.total_focus_minutes || 0,
    currentStreak: stats?.streak_days || 0,
    interests: profile.interests,
    joinDate: new Date(profile.created_at),
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'timer':
        return (
          <div className="max-w-6xl mx-auto space-y-4 md:space-y-6">
            <StudyStats sessions={sessions} stats={stats} />
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
              <div className="lg:col-span-2 space-y-4 md:space-y-6">
                <Timer 
                  onSessionComplete={handleSessionComplete}
                  groups={studyGroups}
                  messages={chatMessages}
                  currentUser={legacyUser}
                  friends={friends}
                  onOpenChat={handleOpenChatFromSocial}
                />
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
                    <h3 className="text-lg font-bold text-gray-800 mb-2">Need a Break?</h3>
                    <p className="text-sm text-gray-600 mb-4">
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
                    <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">🧩</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 mb-2">Puzzle Challenge</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Exercise your mind with this classic block-stacking puzzle game!
                    </p>
                    <button
                      onClick={() => setShowBlockDropGame(true)}
                      className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      Play Block Drop 🎯
                    </button>
                  </div>
                </div>
                
              </div>
              <div className="lg:col-span-2 space-y-4 md:space-y-6">
                <SocialFeed
                  groups={studyGroups}
                  messages={chatMessages}
                  currentUser={legacyUser}
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
            onAddFriend={handleAddFriend}
            currentUser={legacyUser}
            friends={friends}
          />
        );
      
      case 'stats':
        return (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-2xl font-bold text-gray-800 mb-4">Recent Sessions</h3>
              <div className="space-y-3">
                {sessions.slice(0, 5).map(session => (
                  <div key={session.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div>
                      <p className="font-semibold text-gray-800">{session.subject}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(session.startTime).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="text-lg font-bold text-blue-600">
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
              onStartChat={handleStartChat}
            />
            <Leaderboard 
              friends={[...friends, { 
                id: user?.id || '', 
                name: legacyUser.name + ' (You)', 
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
            onCreateEvent={(event) => setCalendarEvents(prev => [...prev, event])}
            onCreateReminder={(reminder) => setReminders(prev => [...prev, reminder])}
            onCreateMeeting={(meeting) => setMeetings(prev => [...prev, meeting])}
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
    <div className="min-h-screen theme-bg" style={{
      background: currentTheme.backgroundColor !== '#f8fafc'
        ? currentTheme.backgroundColor
        : 'linear-gradient(to bottom right, #eff6ff, #f3e8ff, #ecfdf5)'
    }}>
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
            className="px-3 py-2 md:px-4 md:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-lg relative text-sm md:text-base min-h-[44px] min-w-[44px]"
          >
            {pendingRequests.length} Friend Request{pendingRequests.length !== 1 ? 's' : ''}
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
          </button>
        )}
        <div className="bg-white rounded-lg shadow-lg p-1 min-h-[44px] min-w-[44px]">
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
      </Suspense>

      <FriendRequestsModal
        isOpen={showFriendRequests}
        onClose={() => setShowFriendRequests(false)}
        requests={pendingRequests}
        onAccept={async (requestId) => {
          await acceptFriendRequest(requestId);
          alert('Friend request accepted!');
        }}
        onReject={async (requestId) => {
          await rejectFriendRequest(requestId);
          alert('Friend request rejected.');
        }}
      />
    </div>
  );
}

export default App;