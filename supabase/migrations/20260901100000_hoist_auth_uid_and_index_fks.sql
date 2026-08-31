/*
 * Two performance corrections, no behaviour change.
 *
 * 1. Twenty-nine policies called `auth.uid()` bare. Postgres treats that as
 *    volatile-ish in this position and re-evaluates it for every row scanned,
 *    rather than once per statement. Wrapping it as `(select auth.uid())` makes
 *    it an InitPlan: evaluated once, then reused. Same value, same decision,
 *    one call instead of one per row.
 *
 *    Written as ALTER POLICY rather than DROP and CREATE. ALTER changes only
 *    the USING and WITH CHECK expressions, so the command, the roles and the
 *    permissive/restrictive setting carry over untouched and cannot be lost to
 *    a transcription slip - and there is no instant where the table sits
 *    without its policy.
 *
 *    The statements below were generated from the live policy definitions by
 *    substituting `auth.uid()`, not retyped, for the same reason. The definer
 *    helpers (is_group_member, is_group_admin, is_group_public,
 *    is_meeting_host, is_meeting_participant) are deliberately left alone: they
 *    take a column as their argument, so they are genuinely per-row and cannot
 *    be hoisted.
 *
 *    Verification is a fingerprint. Hashing every policy with any
 *    `(select auth.uid())` normalised back to `auth.uid()` gives
 *    68ebaaecdee29ddb376c2569b8116f44 across 36 policies before this migration,
 *    and must give exactly that after it. Anything else means an expression
 *    changed in more than the intended way.
 *
 * 2. Three foreign keys had no covering index. Postgres needs to scan the
 *    child table to enforce the constraint on delete or update of the parent.
 *
 * Both are invisible at the current size - one user, a handful of rows. This is
 * the sort of thing that is cheap now and awkward later.
 */

-- 1. Hoist auth.uid() out of the per-row loop -------------------------------

alter policy "Own calendar events" on public.calendar_events using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));

alter policy "Delete own message" on public.chat_messages using (((select auth.uid()) = user_id));
alter policy "Members post to their groups" on public.chat_messages with check ((((select auth.uid()) = user_id) AND is_group_member(group_id)));

alter policy "Either side removes friendship" on public.friends using ((((select auth.uid()) = user_id) OR ((select auth.uid()) = friend_user_id)));
alter policy "Recipient responds to request" on public.friends using (((select auth.uid()) = friend_user_id)) with check ((((select auth.uid()) = friend_user_id) AND (status = ANY (ARRAY['accepted'::text, 'blocked'::text]))));
alter policy "Send friend request" on public.friends with check ((((select auth.uid()) = user_id) AND (status = 'pending'::text)));
alter policy "View own friend rows" on public.friends using ((((select auth.uid()) = user_id) OR ((select auth.uid()) = friend_user_id)));

alter policy "Host removes or participant leaves" on public.meeting_participants using ((((select auth.uid()) = user_id) OR is_meeting_host(meeting_id)));
alter policy "Respond to own invitation" on public.meeting_participants using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));

alter policy "Host creates meeting" on public.meetings with check (((select auth.uid()) = host_id));
alter policy "Host deletes meeting" on public.meetings using (((select auth.uid()) = host_id));
alter policy "Host updates meeting" on public.meetings using (((select auth.uid()) = host_id)) with check (((select auth.uid()) = host_id));
alter policy "View meetings you are part of" on public.meetings using ((((select auth.uid()) = host_id) OR is_meeting_participant(id) OR ((group_id IS NOT NULL) AND is_group_member(group_id))));

alter policy "Delete own notifications" on public.notifications using (((select auth.uid()) = user_id));
alter policy "Read own notifications" on public.notifications using (((select auth.uid()) = user_id));
alter policy "Update own notifications" on public.notifications using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));

alter policy "Own reminders" on public.reminders using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));

alter policy "Join public group or be added by admin" on public.study_group_members with check (((((select auth.uid()) = user_id) AND (role = 'member'::text) AND is_group_public(group_id)) OR is_group_admin(group_id) OR (EXISTS ( SELECT 1
   FROM study_groups g
  WHERE ((g.id = study_group_members.group_id) AND (g.created_by = (select auth.uid())))))));
alter policy "Leave group or be removed by admin" on public.study_group_members using ((((select auth.uid()) = user_id) OR is_group_admin(group_id)));

alter policy "Create own group" on public.study_groups with check (((select auth.uid()) = created_by));
alter policy "Creator deletes group" on public.study_groups using (((select auth.uid()) = created_by));
alter policy "View public, joined, or own groups" on public.study_groups using (((is_private = false) OR ((select auth.uid()) = created_by) OR is_group_member(id)));

alter policy "Own study sessions" on public.study_sessions using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));

alter policy "Own todos" on public.todos using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));

alter policy "Insert own presence" on public.user_presence with check (((select auth.uid()) = user_id));
alter policy "Update own presence" on public.user_presence using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));

alter policy "Read own profile" on public.user_profiles using (((select auth.uid()) = user_id));
alter policy "Update own profile" on public.user_profiles using (((select auth.uid()) = user_id)) with check (((select auth.uid()) = user_id));

alter policy "Read own stats" on public.user_stats using (((select auth.uid()) = user_id));

-- 2. Cover the foreign keys -------------------------------------------------

create index if not exists idx_calendar_events_group_id on public.calendar_events (group_id);
create index if not exists idx_calendar_events_todo_id  on public.calendar_events (todo_id);
create index if not exists idx_reminders_event_id       on public.reminders (event_id);
