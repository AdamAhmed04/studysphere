/*
  # Create social and study feature tables

  1. New Tables
    - `friends`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users) - the user who has this friend
      - `friend_user_id` (uuid, references auth.users) - the friend
      - `status` (text) - pending, accepted, blocked
      - `created_at` (timestamptz)
      - Unique constraint on (user_id, friend_user_id)
    
    - `study_sessions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `start_time` (timestamptz)
      - `end_time` (timestamptz, optional)
      - `duration` (integer) - in minutes
      - `subject` (text)
      - `notes` (text, optional)
      - `created_at` (timestamptz)
    
    - `study_groups`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `subject` (text, optional)
      - `created_by` (uuid, references auth.users)
      - `is_private` (boolean)
      - `avatar_url` (text, optional)
      - `created_at` (timestamptz)
      - `last_activity` (timestamptz)
    
    - `study_group_members`
      - `id` (uuid, primary key)
      - `group_id` (uuid, references study_groups)
      - `user_id` (uuid, references auth.users)
      - `role` (text) - admin, member
      - `joined_at` (timestamptz)
      - Unique constraint on (group_id, user_id)
    
    - `chat_messages`
      - `id` (uuid, primary key)
      - `group_id` (uuid, references study_groups, optional)
      - `user_id` (uuid, references auth.users)
      - `message` (text)
      - `type` (text) - text, note, resource
      - `attachments` (text[], optional)
      - `created_at` (timestamptz)
    
    - `todos`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `title` (text)
      - `description` (text, optional)
      - `due_date` (timestamptz, optional)
      - `priority` (text) - low, medium, high
      - `category` (text, optional)
      - `is_completed` (boolean)
      - `completed_at` (timestamptz, optional)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `calendar_events`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `title` (text)
      - `description` (text, optional)
      - `event_date` (timestamptz)
      - `event_type` (text) - meeting, reminder, study, exam, class, todo
      - `color` (text)
      - `group_id` (uuid, references study_groups, optional)
      - `todo_id` (uuid, references todos, optional)
      - `has_reminder` (boolean)
      - `reminder_minutes` (integer, optional)
      - `created_at` (timestamptz)
    
    - `meetings`
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text, optional)
      - `scheduled_time` (timestamptz)
      - `duration` (integer) - in minutes
      - `host_id` (uuid, references auth.users)
      - `group_id` (uuid, references study_groups, optional)
      - `location` (text, optional)
      - `meeting_type` (text) - video, in-person, phone
      - `meeting_link` (text, optional)
      - `status` (text) - scheduled, active, completed, cancelled
      - `created_at` (timestamptz)
    
    - `meeting_participants`
      - `id` (uuid, primary key)
      - `meeting_id` (uuid, references meetings)
      - `user_id` (uuid, references auth.users)
      - `status` (text) - invited, accepted, declined
      - `created_at` (timestamptz)
      - Unique constraint on (meeting_id, user_id)
    
    - `reminders`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `title` (text)
      - `description` (text, optional)
      - `reminder_time` (timestamptz)
      - `event_id` (uuid, references calendar_events, optional)
      - `is_completed` (boolean)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add appropriate policies for each table
    
  3. Indexes
    - Add indexes on foreign keys and commonly queried fields
*/

-- Friends table
CREATE TABLE IF NOT EXISTS friends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, friend_user_id)
);

CREATE INDEX IF NOT EXISTS idx_friends_user_id ON friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend_user_id ON friends(friend_user_id);
CREATE INDEX IF NOT EXISTS idx_friends_status ON friends(status);

-- Study sessions table
CREATE TABLE IF NOT EXISTS study_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  duration integer NOT NULL DEFAULT 0,
  subject text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_start_time ON study_sessions(start_time DESC);

-- Study groups table
CREATE TABLE IF NOT EXISTS study_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  subject text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_private boolean DEFAULT false,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  last_activity timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_study_groups_created_by ON study_groups(created_by);
CREATE INDEX IF NOT EXISTS idx_study_groups_last_activity ON study_groups(last_activity DESC);

-- Study group members table
CREATE TABLE IF NOT EXISTS study_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at timestamptz DEFAULT now(),
  UNIQUE(group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_study_group_members_group_id ON study_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_study_group_members_user_id ON study_group_members(user_id);

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES study_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'note', 'resource')),
  attachments text[],
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_group_id ON chat_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);

-- Todos table
CREATE TABLE IF NOT EXISTS todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  due_date timestamptz,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  category text,
  is_completed boolean DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id);
CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(due_date);
CREATE INDEX IF NOT EXISTS idx_todos_is_completed ON todos(is_completed);

-- Calendar events table
CREATE TABLE IF NOT EXISTS calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  event_date timestamptz NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('meeting', 'reminder', 'study', 'exam', 'class', 'todo')),
  color text NOT NULL DEFAULT '#3B82F6',
  group_id uuid REFERENCES study_groups(id) ON DELETE SET NULL,
  todo_id uuid REFERENCES todos(id) ON DELETE CASCADE,
  has_reminder boolean DEFAULT false,
  reminder_minutes integer,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_event_date ON calendar_events(event_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_group_id ON calendar_events(group_id);

-- Meetings table
CREATE TABLE IF NOT EXISTS meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  scheduled_time timestamptz NOT NULL,
  duration integer NOT NULL DEFAULT 60,
  host_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id uuid REFERENCES study_groups(id) ON DELETE SET NULL,
  location text,
  meeting_type text NOT NULL DEFAULT 'video' CHECK (meeting_type IN ('video', 'in-person', 'phone')),
  meeting_link text,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meetings_host_id ON meetings(host_id);
CREATE INDEX IF NOT EXISTS idx_meetings_group_id ON meetings(group_id);
CREATE INDEX IF NOT EXISTS idx_meetings_scheduled_time ON meetings(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status);

-- Meeting participants table
CREATE TABLE IF NOT EXISTS meeting_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'accepted', 'declined')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(meeting_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_meeting_participants_meeting_id ON meeting_participants(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_user_id ON meeting_participants(user_id);

-- Reminders table
CREATE TABLE IF NOT EXISTS reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  reminder_time timestamptz NOT NULL,
  event_id uuid REFERENCES calendar_events(id) ON DELETE CASCADE,
  is_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_reminder_time ON reminders(reminder_time);
CREATE INDEX IF NOT EXISTS idx_reminders_is_completed ON reminders(is_completed);

-- Enable RLS on all tables
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- Trigger for updating updated_at on todos
CREATE TRIGGER update_todos_updated_at
  BEFORE UPDATE ON todos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();