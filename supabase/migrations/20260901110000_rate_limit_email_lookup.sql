/*
 * Rate-limits find_user_by_email.
 *
 * The function is deliberate and worth keeping: adding a friend by email needs
 * it, `email` is not a readable column anywhere else, and it returns only an id
 * and a name, never the address. What it lacked was any limit. Any signed-in
 * account could ask "is this address registered?" as fast as it could send
 * requests, which turns a friend-finder into an enumeration oracle - a way to
 * test a list of addresses against the user base and learn which ones have
 * accounts here.
 *
 * Two rolling windows now apply per account: 20 lookups an hour and 60 a day.
 * Adding friends is a handful of lookups in a sitting, so the ceiling is well
 * clear of real use, while enumeration needs thousands and is now bounded to
 * 60 a day per account rather than unlimited.
 *
 * Every attempt is recorded, hit or miss. Recording only successes would leave
 * exactly the case that matters unlimited, since enumeration learns as much
 * from a miss as from a hit.
 *
 * The attempts table has RLS on and no policies at all, so nothing can read or
 * write it through the API. Only this function touches it, and it can because
 * SECURITY DEFINER runs as the owner. That keeps a user from reading their own
 * usage back, and more importantly from deleting rows to reset their limit.
 *
 * The function also changes from `stable sql` to `volatile plpgsql`: a STABLE
 * function cannot write, and recording an attempt is a write.
 */

create table if not exists public.email_lookup_attempts (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  attempted_at timestamptz not null default now()
);

create index if not exists idx_email_lookup_attempts_user_time
  on public.email_lookup_attempts (user_id, attempted_at desc);

alter table public.email_lookup_attempts enable row level security;
-- Intentionally no policies: the definer function is the only way in.

revoke all on public.email_lookup_attempts from anon, authenticated;

create or replace function public.find_user_by_email(p_email text)
returns table(user_id uuid, name text)
language plpgsql
volatile
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  uid        uuid := auth.uid();
  last_hour  integer;
  last_day   integer;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  -- Cheap opportunistic prune. Lookups are themselves limited, so this runs
  -- rarely enough not to matter, and keeps the table from growing without end.
  delete from public.email_lookup_attempts
  where attempted_at < now() - interval '2 days';

  select
    count(*) filter (where attempted_at > now() - interval '1 hour'),
    count(*) filter (where attempted_at > now() - interval '1 day')
  into last_hour, last_day
  from public.email_lookup_attempts a
  where a.user_id = uid;

  if last_hour >= 20 or last_day >= 60 then
    -- 54000 = program_limit_exceeded. A distinct code so the client can tell
    -- "slow down" apart from "nobody matched", which are very different things
    -- to show someone.
    raise exception 'Too many email lookups. Please wait a while and try again.'
      using errcode = '54000';
  end if;

  insert into public.email_lookup_attempts (user_id) values (uid);

  -- Unchanged from the original: public profiles only, never yourself, and the
  -- address itself is never returned.
  return query
  select p.user_id, p.name
  from public.user_profiles p
  where lower(p.email) = lower(trim(p_email))
    and p.is_public = true
    and p.user_id <> uid
  limit 1;
end;
$$;

-- Matches the rest of the schema: signed-in users only, never anon.
revoke execute on function public.find_user_by_email(text) from anon;
