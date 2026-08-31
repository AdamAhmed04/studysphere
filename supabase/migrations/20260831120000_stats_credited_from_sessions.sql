/*
 * Stats can no longer be credited by simply asking for a number.
 *
 * increment_user_stats was SECURITY DEFINER with EXECUTE granted to
 * `authenticated` and three unbounded integer arguments, so PostgREST exposed
 * it at /rest/v1/rpc/increment_user_stats to every signed-in account. A single
 * request set that account's totals to anything at all - measured, one call
 * moved total_focus_minutes from 1 to 1,000,000 and sessions from 1 to 501.
 *
 * The table was never the weak point. user_stats has no INSERT or UPDATE
 * policy and a direct write is correctly a no-op; that part of the design held
 * exactly as intended. The RPC was the whole gap, because it assumed only the
 * timer would ever call it.
 *
 * Now the credit is derived rather than supplied. The caller names a session
 * and the function reads the minutes off that row. The row must belong to the
 * caller, must not have been counted before, and cannot claim more focus time
 * than actually elapsed between its own start and end. Counting stamps
 * counted_at, so replaying the same call adds nothing.
 *
 * Note the check is `duration <= elapsed`, not `duration = elapsed`. Pausing
 * the timer legitimately produces less focus time than wall-clock time, so
 * equality would reject honest sessions. Only the direction that matters for
 * credit is constrained.
 *
 * What this does NOT do: make timing server-authoritative. A determined user
 * can still insert study_sessions rows with plausible timestamps and then
 * claim them. That is now bounded - a row is capped at 24h, cannot end in the
 * future, cannot claim more than its own elapsed window, and counts exactly
 * once - so forging a leaderboard means fabricating a consistent history
 * rather than sending one large number. Closing it entirely means timing
 * sessions on the server, which is a much larger piece of work and is recorded
 * in the ledger rather than attempted here.
 */

-- 1. A session can be counted exactly once.
alter table public.study_sessions
  add column if not exists counted_at timestamptz;

create index if not exists idx_study_sessions_uncounted
  on public.study_sessions (user_id)
  where counted_at is null;

-- 2. Bound what a single row may claim, so a fabricated row carries an
--    implausible number even before it reaches the function.
alter table public.study_sessions
  drop constraint if exists study_sessions_duration_sane;
alter table public.study_sessions
  add constraint study_sessions_duration_sane
  check (duration >= 0 and duration <= 1440);

alter table public.study_sessions
  drop constraint if exists study_sessions_window_ordered;
alter table public.study_sessions
  add constraint study_sessions_window_ordered
  check (end_time is null or end_time >= start_time);

-- 3. The old signature is dropped rather than left beside the new one.
--    Leaving it in place would leave the hole open.
drop function if exists public.increment_user_stats(integer, integer, integer);

create or replace function public.increment_user_stats(
  p_session_id uuid default null,
  p_tasks_completed integer default 0
)
returns user_stats
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  uid        uuid    := auth.uid();
  today      date    := (now() at time zone 'utc')::date;
  v_minutes  integer := 0;
  v_sessions integer := 0;
  v_tasks    integer;
  s_row      public.study_sessions;
  elapsed_minutes double precision;
  result     user_stats;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  if p_tasks_completed < 0 then
    raise exception 'increments must not be negative';
  end if;

  -- Tasks have no backing row to derive from, so they remain a parameter, but
  -- a bounded one. Nothing in the app completes more than a handful at a time.
  v_tasks := least(p_tasks_completed, 100);

  if p_session_id is not null then
    -- Locked, so two concurrent calls cannot both count the same session.
    select * into s_row
    from public.study_sessions
    where id = p_session_id
      and user_id = uid
      and counted_at is null
    for update;

    if found and s_row.end_time is not null then
      elapsed_minutes := extract(epoch from (s_row.end_time - s_row.start_time)) / 60.0;

      -- A session cannot have finished in the future, and cannot claim more
      -- focus time than elapsed. The tolerance absorbs rounding in the client
      -- clock; it is not meant to be generous.
      if s_row.end_time <= now() + interval '5 minutes'
         and s_row.duration <= elapsed_minutes + 2
      then
        v_minutes  := least(greatest(s_row.duration, 0), 1440);
        v_sessions := 1;

        update public.study_sessions
        set counted_at = now()
        where id = s_row.id;
      end if;
    end if;
  end if;

  -- An unknown, foreign, already-counted or implausible session credits
  -- nothing rather than raising, so a retry after a dropped response is
  -- harmless instead of surfacing an error for work already recorded.
  update user_stats s
  set
    sessions            = s.sessions + v_sessions,
    total_focus_minutes = s.total_focus_minutes + v_minutes,
    tasks_completed     = s.tasks_completed + v_tasks,
    streak_days = case
      when v_minutes = 0                    then s.streak_days
      when s.last_session_date = today      then s.streak_days
      when s.last_session_date = today - 1  then s.streak_days + 1
      else 1
    end,
    last_session_date = case when v_minutes > 0 then today else s.last_session_date end,
    updated_at = now()
  where s.user_id = uid
  returning * into result;

  return result;
end;
$$;

-- Matches the rest of the schema: signed-in users only, never anon.
revoke execute on function public.increment_user_stats(uuid, integer) from anon;
