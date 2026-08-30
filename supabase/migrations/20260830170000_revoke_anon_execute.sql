/*
  # Remove anon EXECUTE from the SECURITY DEFINER helpers

  Supabase's default privileges grant EXECUTE on new public-schema functions
  explicitly to `anon` and `authenticated`. The baseline schema's
  `REVOKE EXECUTE ... FROM PUBLIC` did not remove those, because revoking from
  PUBLIC does not touch a grant made directly to a role.

  The result was that every helper was callable over /rest/v1/rpc without
  signing in. Nothing was catastrophically exposed — most of them key off
  auth.uid(), which is null for anon — but two were closer than they should
  have been:

    find_user_by_email  returned nothing to anon only because
                        `p.user_id <> auth.uid()` evaluates to NULL and filters
                        the row out. Safe by accident, not by design.
    is_group_public     takes no account of auth.uid() at all, so anon could
                        probe whether a given group id is public.

  Flagged by Supabase's own linter as anon_security_definer_function_executable.
*/

REVOKE EXECUTE ON FUNCTION public.can_notify(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_see_meeting(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.find_user_by_email(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_user_stats(integer, integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_group_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_group_member(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_group_public(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_meeting_host(uuid) FROM anon;

-- handle_new_user is a trigger function; nothing should reach it over the API.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
