/*
  # One query for group previews, and fix whose messages you can see

  Two problems in getGroups, both in the same query.

  1. It fetched the ENTIRE message history of every group the user belongs to,
     then sorted in JavaScript to pick the newest of each, purely to render one
     preview line per group. That grows without bound as the chat is used.
     DISTINCT ON does it in the database, returning exactly one row per group.

  2. It embedded `user_profiles!inner`. user_profiles is own-row-only under
     RLS, so an inner join against it drops every message written by anybody
     else. Confirmed against the live database: a group member who did not
     write the messages sees 3 of 3 rows from chat_messages, 0 of 3 when joined
     to user_profiles, and 3 of 3 when joined to public_profiles. In other
     words group chat showed you only your own messages — invisible so far
     because the database has a single user.

     The client's other chat queries are switched to public_profiles for the
     same reason.

  SECURITY INVOKER (the default): chat_messages RLS still applies, so this only
  ever returns messages from groups the caller belongs to. public_profiles runs
  with definer rights, which is what lets the author's name resolve.
*/
CREATE OR REPLACE FUNCTION public.latest_group_messages(p_group_ids uuid[])
RETURNS TABLE (
  id uuid,
  group_id uuid,
  user_id uuid,
  message text,
  type text,
  attachments text[],
  created_at timestamptz,
  user_name text,
  user_avatar text
)
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT DISTINCT ON (c.group_id)
    c.id, c.group_id, c.user_id, c.message, c.type, c.attachments, c.created_at,
    p.name, p.avatar_url
  FROM chat_messages c
  LEFT JOIN public_profiles p ON p.user_id = c.user_id
  WHERE c.group_id = ANY(p_group_ids)
  ORDER BY c.group_id, c.created_at DESC;
$$;

REVOKE EXECUTE ON FUNCTION public.latest_group_messages(uuid[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.latest_group_messages(uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.latest_group_messages(uuid[]) TO authenticated;
