/*
  # Add Notifications and Online Status Tracking

  ## Summary
  This migration adds support for user notifications and real-time online status tracking
  to enable better social interactions within StudySphere.

  ## New Tables
  
  ### `notifications`
  Stores user notifications for friend requests, meeting reminders, study callouts, and cheers
  - `id` (uuid, primary key) - Unique notification identifier
  - `user_id` (uuid, foreign key to auth.users) - User receiving the notification
  - `type` (text) - Type of notification: 'friend_request', 'meeting_reminder', 'study_callout', 'cheer', 'group_invite'
  - `title` (text) - Notification title
  - `message` (text) - Notification message body
  - `action_data` (jsonb) - Additional data for notification actions (e.g., friend request ID, meeting ID)
  - `is_read` (boolean, default false) - Whether notification has been read
  - `created_at` (timestamptz) - When notification was created

  ### `user_presence`
  Tracks online status of users for real-time presence indication
  - `user_id` (uuid, primary key, foreign key to auth.users) - User being tracked
  - `is_online` (boolean, default false) - Current online status
  - `last_seen` (timestamptz) - Last time user was seen online
  - `updated_at` (timestamptz) - When presence was last updated

  ## Security
  - Enable RLS on both tables
  - Users can read their own notifications
  - Users can read presence info for all users (for friend lists)
  - Only authenticated users can insert/update their own presence
  - System can insert notifications for users
  
  ## Indexes
  - Index on notifications.user_id for fast notification queries
  - Index on notifications.is_read for filtering unread notifications
  - Index on user_presence.is_online for finding online users
*/

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('friend_request', 'meeting_reminder', 'study_callout', 'cheer', 'group_invite', 'meeting_invite')),
  title text NOT NULL,
  message text NOT NULL,
  action_data jsonb DEFAULT '{}'::jsonb,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create user_presence table
CREATE TABLE IF NOT EXISTS user_presence (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_online boolean DEFAULT false,
  last_seen timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_presence_is_online ON user_presence(is_online);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- Notifications policies
CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- User presence policies
CREATE POLICY "Users can read all presence info"
  ON user_presence FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own presence"
  ON user_presence FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own presence"
  ON user_presence FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create trigger to auto-create presence record for new users
CREATE OR REPLACE FUNCTION create_user_presence()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_presence (user_id, is_online, last_seen)
  VALUES (NEW.user_id, false, now())
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_user_profile_created
  AFTER INSERT ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_user_presence();

-- Create function to update last_seen timestamp
CREATE OR REPLACE FUNCTION update_presence_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.is_online = true THEN
    NEW.last_seen = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_presence_timestamp
  BEFORE UPDATE ON user_presence
  FOR EACH ROW
  EXECUTE FUNCTION update_presence_timestamp();