/*
 * Takes EXECUTE on increment_user_stats away from PUBLIC.
 *
 * A regression from the two migrations that changed this function's signature.
 * Each changed the argument list, so `create or replace function` did not
 * replace anything - it created a new function, and a new function is granted
 * EXECUTE to PUBLIC by default. Both migrations ended with
 * `revoke execute ... from anon`, which looks like it covers this and does not:
 * anon was never granted EXECUTE directly, it inherits it through PUBLIC, so
 * revoking from the role left the PUBLIC grant untouched.
 *
 * This is the same trap as the earlier revoke_anon_execute migration, in
 * reverse. There, revoking from PUBLIC left a direct grant to anon in place.
 * Here, revoking from anon left the PUBLIC grant in place. The rule that
 * catches both: check pg_proc.proacl afterwards rather than trusting the
 * revoke. An empty grantee in the ACL (`=X/postgres`) is PUBLIC.
 *
 * The practical impact was small - the function raises 'not authenticated'
 * when auth.uid() is null, so an anonymous caller got an exception rather than
 * a stat change - but "signed-in users only" is the rule the rest of the schema
 * follows, and this was quietly outside it.
 */

revoke execute on function public.increment_user_stats(uuid, uuid) from public;
revoke execute on function public.increment_user_stats(uuid, uuid) from anon;
grant  execute on function public.increment_user_stats(uuid, uuid) to authenticated;
