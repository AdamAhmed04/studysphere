-- ============================================================
-- Files shared in a chat.
--
-- Private, unlike `avatars`. An avatar is shown to anyone who can see the
-- person; a file dropped in a group called "Private" is not, and a public
-- bucket makes every object readable by anyone who has or guesses the URL —
-- including someone who has since been removed from the group. Reads
-- therefore go through signed URLs minted per view, not a permanent path.
--
-- The first path segment is the group id, which is what lets the policies
-- below ask the only question that matters: is the caller in that group.
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-attachments',
  'chat-attachments',
  false,
  10485760, -- 10MB, enforced by storage itself rather than only by the client
  array[
    'image/jpeg','image/png','image/gif','image/webp','image/heic','image/heif',
    'application/pdf',
    'text/plain','text/csv','text/markdown',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
on conflict (id) do nothing;

/*
 * Parses the group id out of an object path.
 *
 * The regex runs before the cast, so a name that is not shaped like one of
 * ours yields NULL and the policy simply denies — rather than raising, which
 * would turn a hostile filename into an error instead of a refusal.
 */
create or replace function public.chat_attachment_group(object_name text)
returns uuid
language sql
immutable
as $$
  select case
    when (storage.foldername(object_name))[1] ~
         '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then ((storage.foldername(object_name))[1])::uuid
  end;
$$;

-- A new function is granted EXECUTE to PUBLIC by default, and anon inherits
-- through PUBLIC rather than holding a direct grant. Revoke from PUBLIC, then
-- grant deliberately; check pg_proc.proacl afterwards rather than trusting it.
revoke all on function public.chat_attachment_group(text) from public;
revoke all on function public.chat_attachment_group(text) from anon;
grant execute on function public.chat_attachment_group(text) to authenticated;

comment on function public.chat_attachment_group(text) is
  'The group id from a chat attachment path, or NULL when the path is not shaped like one. Used by the storage policies so a malformed name is denied rather than raising on the cast.';

create policy "Group members upload attachments" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'chat-attachments'
    and public.is_group_member(public.chat_attachment_group(name))
  );

create policy "Group members read attachments" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'chat-attachments'
    and public.is_group_member(public.chat_attachment_group(name))
  );

-- Only whoever uploaded it. Deleting someone else's file is a moderation
-- feature, and there is no moderation here yet to hang it off.
create policy "Uploader deletes own attachment" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'chat-attachments'
    and owner = auth.uid()
  );
