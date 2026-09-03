-- ============================================================
-- Stop one person's deletion from destroying other people's data.
--
-- Every user-keyed table already cascaded from auth.users, which is right for
-- rows that ARE the person's data — todos, sessions, notifications, messages,
-- friendships. It was wrong for two of them.
--
-- study_groups.created_by and meetings.host_id cascaded too, so deleting the
-- account that happened to create a group deleted the group itself, and with
-- it every message every other member had written. That turns one person
-- exercising their right to erasure into everyone else losing their data.
--
-- Those two become SET NULL: the group and the meeting survive, ownerless.
-- Administration does not depend on the creator — study_group_members carries
-- a role — so an ownerless group is still manageable.
-- ============================================================

alter table public.study_groups alter column created_by drop not null;
alter table public.meetings     alter column host_id    drop not null;

alter table public.study_groups drop constraint study_groups_created_by_fkey;
alter table public.study_groups
  add constraint study_groups_created_by_fkey
  foreign key (created_by) references auth.users(id) on delete set null;

alter table public.meetings drop constraint meetings_host_id_fkey;
alter table public.meetings
  add constraint meetings_host_id_fkey
  foreign key (host_id) references auth.users(id) on delete set null;
