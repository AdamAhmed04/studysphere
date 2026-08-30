/*
  # StudySphere baseline schema

  A single clean baseline for a fresh Supabase project, replacing the five
  migrations now in supabase/migrations_archive/. Same 14 tables and the same
  column names, so the existing client code keeps working — but the RLS is
  rewritten from scratch.

  ## Rules this schema follows

  1. No policy ever queries its own table. Membership tests live in
     SECURITY DEFINER helpers, which is what keeps Postgres from raising 42P17
     (infinite recursion) the way the archived policies did.
  2. Every SECURITY DEFINER function pins `search_path`.
  3. Every UPDATE policy has a WITH CHECK, not just a USING. USING tests the row
     before the write; without WITH CHECK a user can edit a row they own into a
     shape they should not be allowed to produce.
  4. Subqueries inside policies always alias the table they read, so an inner
     reference can never shadow the row being checked.
  5. Columns, not just rows, decide what is public. Profile data other people
     may read is exposed through a view with an explicit allowlist.
*/

-- ============================================================
-- 1. TABLES
-- ============================================================

CREATE TABLE user_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  avatar_url text,
  bio text,
  date_of_birth date,
  school text,
  study_field text,
  graduation_date date,
  grade text,
  interests text[] DEFAULT '{}',
  is_public boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE user_stats (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  sessions integer NOT NULL DEFAULT 0,
  total_focus_minutes integer NOT NULL DEFAULT 0,
  streak_days integer NOT NULL DEFAULT 0,
  tasks_completed integer NOT NULL DEFAULT 0,
  last_session_date date,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE user_presence (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_online boolean DEFAULT false,
  last_seen timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE friends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, friend_user_id),
  -- You cannot friend yourself. The client checked this; the database now does too.
  CONSTRAINT friends_no_self CHECK (user_id <> friend_user_id)
);

-- Stops the mirrored pair (A->B and B->A) that made the existence check in
-- friendService return two rows and throw on .maybeSingle().
CREATE UNIQUE INDEX friends_unique_pair
  ON friends (least(user_id, friend_user_id), greatest(user_id, friend_user_id));

CREATE TABLE study_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  duration integer NOT NULL DEFAULT 0,
  subject text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE study_groups (
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

CREATE TABLE study_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at timestamptz DEFAULT now(),
  UNIQUE(group_id, user_id)
);

/*
  chat_messages.user_id references user_profiles, NOT auth.users.

  This is the fix for the broken group chat. groupService embeds
  `user_profiles!inner(name, avatar_url)` from chat_messages, and PostgREST
  resolves embeds through foreign keys. Previously both tables pointed
  separately at auth.users, which is not a path PostgREST can follow, so every
  chat query failed with PGRST200. Integrity is unchanged: user_profiles.user_id
  is itself a FK to auth.users.
*/
CREATE TABLE chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- NOT NULL on purpose. The archived schema allowed group_id IS NULL and its
  -- SELECT policy then let every authenticated user read those rows.
  group_id uuid NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'note', 'resource')),
  attachments text[],
  created_at timestamptz DEFAULT now()
);

CREATE TABLE todos (
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

CREATE TABLE calendar_events (
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

CREATE TABLE meetings (
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

CREATE TABLE meeting_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'accepted', 'declined')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(meeting_id, user_id)
);

CREATE TABLE reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  reminder_time timestamptz NOT NULL,
  event_id uuid REFERENCES calendar_events(id) ON DELETE CASCADE,
  is_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('friend_request', 'meeting_reminder', 'study_callout', 'cheer', 'group_invite', 'meeting_invite')),
  title text NOT NULL,
  message text NOT NULL,
  action_data jsonb DEFAULT '{}'::jsonb,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 2. INDEXES
-- ============================================================

CREATE INDEX idx_friends_user_id ON friends(user_id);
CREATE INDEX idx_friends_friend_user_id ON friends(friend_user_id);
CREATE INDEX idx_friends_status ON friends(status);
CREATE INDEX idx_study_sessions_user_id ON study_sessions(user_id);
CREATE INDEX idx_study_sessions_start_time ON study_sessions(start_time DESC);
CREATE INDEX idx_study_groups_created_by ON study_groups(created_by);
CREATE INDEX idx_study_groups_last_activity ON study_groups(last_activity DESC);
CREATE INDEX idx_study_group_members_group_id ON study_group_members(group_id);
CREATE INDEX idx_study_group_members_user_id ON study_group_members(user_id);
CREATE INDEX idx_chat_messages_group_id ON chat_messages(group_id);
CREATE INDEX idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX idx_chat_messages_group_created ON chat_messages(group_id, created_at DESC);
CREATE INDEX idx_todos_user_id ON todos(user_id);
CREATE INDEX idx_todos_due_date ON todos(due_date);
CREATE INDEX idx_calendar_events_user_id ON calendar_events(user_id);
CREATE INDEX idx_calendar_events_event_date ON calendar_events(event_date);
CREATE INDEX idx_meetings_host_id ON meetings(host_id);
CREATE INDEX idx_meetings_group_id ON meetings(group_id);
CREATE INDEX idx_meetings_scheduled_time ON meetings(scheduled_time);
CREATE INDEX idx_meeting_participants_meeting_id ON meeting_participants(meeting_id);
CREATE INDEX idx_meeting_participants_user_id ON meeting_participants(user_id);
CREATE INDEX idx_reminders_user_id ON reminders(user_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_user_presence_is_online ON user_presence(is_online);

-- ============================================================
-- 3. SECURITY DEFINER HELPERS
--
-- These read membership tables with RLS bypassed. That is the whole point:
-- a policy on study_group_members that queried study_group_members directly
-- is what produced the 42P17 recursion in the archived schema.
-- ============================================================

CREATE FUNCTION public.is_group_member(gid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM study_group_members m
    WHERE m.group_id = gid AND m.user_id = auth.uid()
  );
$$;

CREATE FUNCTION public.is_group_admin(gid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM study_group_members m
    WHERE m.group_id = gid AND m.user_id = auth.uid() AND m.role = 'admin'
  );
$$;

CREATE FUNCTION public.is_group_public(gid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM study_groups g WHERE g.id = gid AND g.is_private = false
  );
$$;

CREATE FUNCTION public.can_see_meeting(mid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM meetings mt
    WHERE mt.id = mid
      AND (
        mt.host_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM meeting_participants p
          WHERE p.meeting_id = mt.id AND p.user_id = auth.uid()
        )
        OR (
          mt.group_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM study_group_members m
            WHERE m.group_id = mt.group_id AND m.user_id = auth.uid()
          )
        )
      )
  );
$$;

CREATE FUNCTION public.is_meeting_host(mid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (SELECT 1 FROM meetings mt WHERE mt.id = mid AND mt.host_id = auth.uid());
$$;

/*
  Gates who may write into someone else's notification feed. The archived
  policy was WITH CHECK (true), which let any user push an arbitrary title and
  body into any other user's feed — and the realtime handler turns those into
  desktop notifications.
*/
CREATE FUNCTION public.can_notify(target_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT
    auth.uid() = target_user_id
    OR EXISTS (
      SELECT 1 FROM friends f
      WHERE f.status IN ('pending', 'accepted')
        AND ((f.user_id = auth.uid() AND f.friend_user_id = target_user_id)
          OR (f.user_id = target_user_id AND f.friend_user_id = auth.uid()))
    )
    OR EXISTS (
      SELECT 1 FROM study_group_members me
      JOIN study_group_members them ON them.group_id = me.group_id
      WHERE me.user_id = auth.uid() AND them.user_id = target_user_id
    )
    OR EXISTS (
      SELECT 1 FROM meetings mt
      JOIN meeting_participants p ON p.meeting_id = mt.id
      WHERE mt.host_id = auth.uid() AND p.user_id = target_user_id
    );
$$;

REVOKE EXECUTE ON FUNCTION
  public.is_group_member(uuid), public.is_group_admin(uuid),
  public.is_group_public(uuid), public.can_see_meeting(uuid),
  public.is_meeting_host(uuid), public.can_notify(uuid)
FROM PUBLIC;

GRANT EXECUTE ON FUNCTION
  public.is_group_member(uuid), public.is_group_admin(uuid),
  public.is_group_public(uuid), public.can_see_meeting(uuid),
  public.is_meeting_host(uuid), public.can_notify(uuid)
TO authenticated;

-- ============================================================
-- 4. ENABLE RLS
-- ============================================================

ALTER TABLE user_profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats           ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence        ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends              ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_groups         ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_group_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages        ENABLE ROW LEVEL SECURITY;
ALTER TABLE todos                ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events      ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings             ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders            ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications        ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5. PROFILES — own row only. Other people read the view in section 6.
-- ============================================================

CREATE POLICY "Read own profile" ON user_profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Update own profile" ON user_profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- No INSERT policy: profiles are created by the trigger in section 13.
-- No DELETE policy: profiles die with the auth user, via ON DELETE CASCADE.

-- ============================================================
-- 6. PUBLIC PROFILE VIEW — columns, not just rows
--
-- The archived policy was USING (is_public = true) on the table itself, which
-- exposed every column: email, date_of_birth, grade, graduation_date. This view
-- carries an explicit allowlist and deliberately omits all four.
-- ============================================================

CREATE VIEW public_profiles AS
  SELECT user_id, name, avatar_url, bio, school, study_field, interests
  FROM user_profiles
  WHERE is_public = true;

GRANT SELECT ON public_profiles TO authenticated;

COMMENT ON VIEW public_profiles IS
  'Profile columns other users may read. Runs with definer rights so it bypasses the own-row-only policy on user_profiles; the column list is the access control. Never add email, date_of_birth, grade or graduation_date here.';

-- ============================================================
-- 7. STATS — readable by owner, writable only through the RPC in section 12
-- ============================================================

CREATE POLICY "Read own stats" ON user_stats
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Deliberately no INSERT/UPDATE/DELETE policy. The archived schema let users
-- PATCH their own total_focus_minutes to any value, which made the leaderboard
-- meaningless. All writes go through increment_user_stats().

CREATE VIEW public_leaderboard AS
  SELECT s.user_id, p.name, p.avatar_url, s.total_focus_minutes, s.streak_days, s.sessions
  FROM user_stats s
  JOIN user_profiles p ON p.user_id = s.user_id
  WHERE p.is_public = true;

GRANT SELECT ON public_leaderboard TO authenticated;

-- ============================================================
-- 8. PRESENCE
-- ============================================================

CREATE POLICY "Read all presence" ON user_presence
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Insert own presence" ON user_presence
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Update own presence" ON user_presence
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 9. FRIENDS
-- ============================================================

CREATE POLICY "View own friend rows" ON friends
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_user_id);

CREATE POLICY "Send friend request" ON friends
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

/*
  Only the RECIPIENT can accept. The archived policy was
  USING (auth.uid() = user_id) — the sender — so nobody could accept a request,
  and because it had no WITH CHECK the sender could flip their own outbound
  request to 'accepted' and appear in someone's friends list uninvited.
*/
CREATE POLICY "Recipient responds to request" ON friends
  FOR UPDATE TO authenticated
  USING (auth.uid() = friend_user_id)
  WITH CHECK (auth.uid() = friend_user_id AND status IN ('accepted', 'blocked'));

CREATE POLICY "Either side removes friendship" ON friends
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_user_id);

-- ============================================================
-- 10. STUDY SESSIONS, TODOS, CALENDAR, REMINDERS — plain owner-only
-- ============================================================

CREATE POLICY "Own study sessions" ON study_sessions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Own todos" ON todos
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Own calendar events" ON calendar_events
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Own reminders" ON reminders
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 11. GROUPS, MEMBERS, CHAT
-- ============================================================

CREATE POLICY "View public or joined groups" ON study_groups
  FOR SELECT TO authenticated
  USING (is_private = false OR public.is_group_member(id));

CREATE POLICY "Create own group" ON study_groups
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins update group" ON study_groups
  FOR UPDATE TO authenticated
  USING (public.is_group_admin(id))
  WITH CHECK (public.is_group_admin(id));

-- A WITH CHECK cannot see the OLD row, so it cannot express "created_by must
-- not change". A trigger can. Without this, an admin who is not the creator
-- could rewrite created_by and take the group.
CREATE FUNCTION public.freeze_group_creator()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'created_by cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER study_groups_freeze_creator
  BEFORE UPDATE ON study_groups
  FOR EACH ROW EXECUTE FUNCTION public.freeze_group_creator();

CREATE POLICY "Creator deletes group" ON study_groups
  FOR DELETE TO authenticated USING (auth.uid() = created_by);

CREATE POLICY "View members of own groups" ON study_group_members
  FOR SELECT TO authenticated USING (public.is_group_member(group_id));

/*
  Two ways in, and both name the specific group.

  The archived policy's subquery read
  `study_group_members.group_id = study_group_members.group_id` — the inner
  unaliased table shadowed the outer one, so the test was trivially true and
  collapsed to "is this user an admin of ANY group", letting anyone who created
  one group insert themselves into every group in the database.
*/
CREATE POLICY "Join public group or be added by admin" ON study_group_members
  FOR INSERT TO authenticated
  WITH CHECK (
    -- self-join, but only public groups, and only as a plain member
    (auth.uid() = user_id AND role = 'member' AND public.is_group_public(group_id))
    -- or an existing admin of THIS group adds you
    OR public.is_group_admin(group_id)
    -- or the creator seeds the group at creation time, before any admin row exists
    OR EXISTS (
      SELECT 1 FROM study_groups g
      WHERE g.id = study_group_members.group_id AND g.created_by = auth.uid()
    )
  );

CREATE POLICY "Leave group or be removed by admin" ON study_group_members
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_group_admin(group_id));

CREATE POLICY "Members read group messages" ON chat_messages
  FOR SELECT TO authenticated USING (public.is_group_member(group_id));

CREATE POLICY "Members post to their groups" ON chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_group_member(group_id));

CREATE POLICY "Delete own message" ON chat_messages
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- 12. MEETINGS
-- ============================================================

CREATE POLICY "View meetings you are part of" ON meetings
  FOR SELECT TO authenticated USING (public.can_see_meeting(id));

CREATE POLICY "Host creates meeting" ON meetings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Host updates meeting" ON meetings
  FOR UPDATE TO authenticated
  USING (auth.uid() = host_id) WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Host deletes meeting" ON meetings
  FOR DELETE TO authenticated USING (auth.uid() = host_id);

CREATE POLICY "View participants of visible meetings" ON meeting_participants
  FOR SELECT TO authenticated USING (public.can_see_meeting(meeting_id));

CREATE POLICY "Host invites participants" ON meeting_participants
  FOR INSERT TO authenticated WITH CHECK (public.is_meeting_host(meeting_id));

CREATE POLICY "Respond to own invitation" ON meeting_participants
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Host removes or participant leaves" ON meeting_participants
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_meeting_host(meeting_id));

-- ============================================================
-- 13. NOTIFICATIONS
-- ============================================================

CREATE POLICY "Read own notifications" ON notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Update own notifications" ON notifications
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Notify people you have a relationship with" ON notifications
  FOR INSERT TO authenticated WITH CHECK (public.can_notify(user_id));

CREATE POLICY "Delete own notifications" ON notifications
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- 14. STATS RPC — atomic increment, real streak
--
-- Replaces the client-side read-modify-write in userService.incrementStats,
-- which lost updates when two sessions finished close together, and replaces
-- calculateStreak, which returned a hard-coded 1 on every path.
-- ============================================================

CREATE FUNCTION public.increment_user_stats(
  p_sessions integer DEFAULT 0,
  p_focus_minutes integer DEFAULT 0,
  p_tasks_completed integer DEFAULT 0
)
RETURNS user_stats
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  uid uuid := auth.uid();
  today date := (now() AT TIME ZONE 'utc')::date;
  result user_stats;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF p_sessions < 0 OR p_focus_minutes < 0 OR p_tasks_completed < 0 THEN
    RAISE EXCEPTION 'increments must not be negative';
  END IF;

  UPDATE user_stats s
  SET
    sessions            = s.sessions + p_sessions,
    total_focus_minutes = s.total_focus_minutes + p_focus_minutes,
    tasks_completed     = s.tasks_completed + p_tasks_completed,
    streak_days = CASE
      WHEN p_focus_minutes = 0 THEN s.streak_days
      WHEN s.last_session_date = today THEN s.streak_days
      WHEN s.last_session_date = today - 1 THEN s.streak_days + 1
      ELSE 1
    END,
    last_session_date = CASE WHEN p_focus_minutes > 0 THEN today ELSE s.last_session_date END,
    updated_at = now()
  WHERE s.user_id = uid
  RETURNING * INTO result;

  RETURN result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_user_stats(integer, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_user_stats(integer, integer, integer) TO authenticated;

-- ============================================================
-- 15. TRIGGERS
-- ============================================================

CREATE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER user_profiles_touch BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER todos_touch BEFORE UPDATE ON todos
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE FUNCTION public.touch_presence()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.is_online THEN NEW.last_seen = now(); END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER user_presence_touch BEFORE UPDATE ON user_presence
  FOR EACH ROW EXECUTE FUNCTION public.touch_presence();

/*
  Profile, stats and presence are created by the database when the auth user
  appears — not by the client after signUp().

  The archived flow inserted the profile from the browser immediately after
  signUp(), which fails outright when email confirmation is enabled (no session
  yet, so auth.uid() is null and the INSERT policy rejects it), and left an
  account with no profile whenever the second call failed.
*/
CREATE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  INSERT INTO user_profiles (user_id, name, email, avatar_url, bio, school, study_field, grade, interests, is_public)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'bio',
    NEW.raw_user_meta_data->>'school',
    NEW.raw_user_meta_data->>'study_field',
    NEW.raw_user_meta_data->>'grade',
    COALESCE(
      ARRAY(SELECT jsonb_array_elements_text(NEW.raw_user_meta_data->'interests')),
      '{}'::text[]
    ),
    COALESCE((NEW.raw_user_meta_data->>'is_public')::boolean, true)
  )
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO user_stats (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO user_presence (user_id, is_online) VALUES (NEW.id, false) ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 16. AVATAR STORAGE
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "Upload own avatar" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Update own avatar" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Delete own avatar" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone views avatars" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'avatars');
