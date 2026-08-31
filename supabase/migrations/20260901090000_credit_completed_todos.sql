/*
 * Completing a to-do now credits the tasks counter.
 *
 * `tasks_completed` was plumbed through the hook, the service and the RPC and
 * typed the whole way down, but no caller ever passed it, so the counter never
 * moved off zero no matter how many tasks were ticked off.
 *
 * The obvious repair - pass 1 when the box is ticked - would have introduced a
 * new bug: `increment_user_stats` only adds, so ticking a task, un-ticking it
 * and ticking it again would credit it three times. Nobody else sees this
 * number (`public_leaderboard` exposes focus minutes, streak and sessions, not
 * tasks) so the stakes are lower than the leaderboard was, but a counter that
 * inflates when you change your mind is still wrong.
 *
 * So the credit is derived rather than supplied, the same way session minutes
 * are: the caller names a to-do, and the function credits it only if that row
 * belongs to the caller, is actually marked complete, and has not been counted
 * before. counted_at is never cleared, so un-ticking and re-ticking is a no-op
 * and deleting the to-do does not take the credit away - it stays a lifetime
 * count, which is what the Stats page means by it.
 *
 * That removes p_tasks_completed, the last argument the function took on
 * trust. Both remaining parameters are now ids of rows that have to exist and
 * have to be yours.
 */

alter table public.todos
  add column if not exists counted_at timestamptz;

create index if not exists idx_todos_uncounted
  on public.todos (user_id)
  where counted_at is null;

-- Replaced rather than added to: the integer argument is what is being removed.
drop function if exists public.increment_user_stats(uuid, integer);

create or replace function public.increment_user_stats(
  p_session_id uuid default null,
  p_todo_id    uuid default null
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
  v_tasks    integer := 0;
  s_row      public.study_sessions;
  t_row      public.todos;
  elapsed_minutes double precision;
  result     user_stats;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

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

  if p_todo_id is not null then
    select * into t_row
    from public.todos
    where id = p_todo_id
      and user_id = uid
      and is_completed
      and counted_at is null
    for update;

    if found then
      v_tasks := 1;

      update public.todos
      set counted_at = now()
      where id = t_row.id;
    end if;
  end if;

  -- An unknown, foreign, already-counted or implausible row credits nothing
  -- rather than raising, so a retry after a dropped response is harmless
  -- instead of surfacing an error for work already recorded.
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
revoke execute on function public.increment_user_stats(uuid, uuid) from anon;
