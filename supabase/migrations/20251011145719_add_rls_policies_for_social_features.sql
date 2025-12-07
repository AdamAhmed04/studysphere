/*
  # Add RLS policies for social and study features

  1. Friends Policies
    - Users can view their own friend relationships
    - Users can view accepted friend relationships of others (for friend discovery)
    - Users can create friend requests
    - Users can update their own friend relationships
    - Users can delete their own friend relationships

  2. Study Sessions Policies
    - Users can view only their own study sessions
    - Users can create their own study sessions
    - Users can update their own study sessions
    - Users can delete their own study sessions

  3. Study Groups Policies
    - Users can view public groups
    - Members can view private groups they belong to
    - Any authenticated user can create groups
    - Group admins can update group details
    - Group creator can delete groups

  4. Study Group Members Policies
    - Users can view members of groups they belong to
    - Group admins can add members
    - Users can remove themselves from groups
    - Group admins can remove members

  5. Chat Messages Policies
    - Group members can view messages in their groups
    - Group members can send messages
    - Users can delete their own messages

  6. Todos Policies
    - Users can view only their own todos
    - Users can create their own todos
    - Users can update their own todos
    - Users can delete their own todos

  7. Calendar Events Policies
    - Users can view only their own events
    - Users can create their own events
    - Users can update their own events
    - Users can delete their own events

  8. Meetings Policies
    - Meeting participants can view meetings
    - Any authenticated user can create meetings
    - Meeting host can update meetings
    - Meeting host can delete meetings

  9. Meeting Participants Policies
    - Meeting participants can view other participants
    - Meeting host can add participants
    - Users can update their own participation status
    - Meeting host can remove participants

  10. Reminders Policies
    - Users can view only their own reminders
    - Users can create their own reminders
    - Users can update their own reminders
    - Users can delete their own reminders
*/

-- Friends Policies
CREATE POLICY "Users can view own friend relationships"
  ON friends
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_user_id);

CREATE POLICY "Users can create friend requests"
  ON friends
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own friend relationships"
  ON friends
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own friend relationships"
  ON friends
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_user_id);

-- Study Sessions Policies
CREATE POLICY "Users can view own study sessions"
  ON study_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own study sessions"
  ON study_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own study sessions"
  ON study_sessions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own study sessions"
  ON study_sessions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Study Groups Policies
CREATE POLICY "Users can view public groups"
  ON study_groups
  FOR SELECT
  TO authenticated
  USING (is_private = false);

CREATE POLICY "Members can view private groups"
  ON study_groups
  FOR SELECT
  TO authenticated
  USING (
    is_private = true AND
    EXISTS (
      SELECT 1 FROM study_group_members
      WHERE study_group_members.group_id = study_groups.id
      AND study_group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create groups"
  ON study_groups
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group admins can update groups"
  ON study_groups
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM study_group_members
      WHERE study_group_members.group_id = study_groups.id
      AND study_group_members.user_id = auth.uid()
      AND study_group_members.role = 'admin'
    )
  );

CREATE POLICY "Group creators can delete groups"
  ON study_groups
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Study Group Members Policies
CREATE POLICY "Users can view group members"
  ON study_group_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM study_group_members sgm
      WHERE sgm.group_id = study_group_members.group_id
      AND sgm.user_id = auth.uid()
    )
  );

CREATE POLICY "Group admins can add members"
  ON study_group_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM study_group_members
      WHERE study_group_members.group_id = study_group_members.group_id
      AND study_group_members.user_id = auth.uid()
      AND study_group_members.role = 'admin'
    ) OR
    EXISTS (
      SELECT 1 FROM study_groups
      WHERE study_groups.id = study_group_members.group_id
      AND study_groups.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can remove themselves from groups"
  ON study_group_members
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Group admins can remove members"
  ON study_group_members
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM study_group_members sgm
      WHERE sgm.group_id = study_group_members.group_id
      AND sgm.user_id = auth.uid()
      AND sgm.role = 'admin'
    )
  );

-- Chat Messages Policies
CREATE POLICY "Group members can view messages"
  ON chat_messages
  FOR SELECT
  TO authenticated
  USING (
    group_id IS NULL OR
    EXISTS (
      SELECT 1 FROM study_group_members
      WHERE study_group_members.group_id = chat_messages.group_id
      AND study_group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Group members can send messages"
  ON chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND (
      group_id IS NULL OR
      EXISTS (
        SELECT 1 FROM study_group_members
        WHERE study_group_members.group_id = chat_messages.group_id
        AND study_group_members.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete own messages"
  ON chat_messages
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Todos Policies
CREATE POLICY "Users can view own todos"
  ON todos
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own todos"
  ON todos
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own todos"
  ON todos
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own todos"
  ON todos
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Calendar Events Policies
CREATE POLICY "Users can view own calendar events"
  ON calendar_events
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own calendar events"
  ON calendar_events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own calendar events"
  ON calendar_events
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own calendar events"
  ON calendar_events
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Meetings Policies
CREATE POLICY "Participants can view meetings"
  ON meetings
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = host_id OR
    EXISTS (
      SELECT 1 FROM meeting_participants
      WHERE meeting_participants.meeting_id = meetings.id
      AND meeting_participants.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM study_group_members
      WHERE study_group_members.group_id = meetings.group_id
      AND study_group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create meetings"
  ON meetings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Meeting hosts can update meetings"
  ON meetings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = host_id)
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Meeting hosts can delete meetings"
  ON meetings
  FOR DELETE
  TO authenticated
  USING (auth.uid() = host_id);

-- Meeting Participants Policies
CREATE POLICY "Participants can view other participants"
  ON meeting_participants
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meetings
      WHERE meetings.id = meeting_participants.meeting_id
      AND (
        meetings.host_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM meeting_participants mp
          WHERE mp.meeting_id = meetings.id
          AND mp.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Meeting hosts can add participants"
  ON meeting_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM meetings
      WHERE meetings.id = meeting_participants.meeting_id
      AND meetings.host_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own participation status"
  ON meeting_participants
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Meeting hosts can remove participants"
  ON meeting_participants
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meetings
      WHERE meetings.id = meeting_participants.meeting_id
      AND meetings.host_id = auth.uid()
    ) OR
    auth.uid() = user_id
  );

-- Reminders Policies
CREATE POLICY "Users can view own reminders"
  ON reminders
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own reminders"
  ON reminders
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reminders"
  ON reminders
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reminders"
  ON reminders
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);