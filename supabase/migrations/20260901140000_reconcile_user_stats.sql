/*
 * A way to check user_stats against the rows that back it.
 *
 * user_stats is a stored running total. Since the increment function was
 * rewritten it is only ever written from a real session or to-do row, which
 * makes drift unlikely - but nothing compared the total to those rows, so if it
 * ever did drift, nothing would notice and nothing could put it right.
 *
 * What counts as truth here is the rows, not the counted_at stamps. counted_at
 * is a replay guard - it stops the same session being credited twice - and not
 * a ledger. The distinction matters right now: one session predates the column
 * and is credited but unstamped, so reconciling against counted_at would erase
 * real work. Reconciling against the rows themselves leaves it alone, which is
 * why it is written this way.
 *
 * Expected values:
 *   sessions  completed study_sessions (end_time set)
 *   minutes   the sum of their durations
 *   tasks     to-dos currently marked complete
 *   streak    the run of consecutive UTC days ending on the most recent day
 *             that has a session with time on it
 *
 * Read-only by default. p_apply => true repairs the row and stamps counted_at
 * on any backing row that lacks it, so the replay guard agrees with the total
 * afterwards. Restricted to service_role: this is a maintenance tool, not
 * something the app calls.
 */

create or replace function public.reconcile_user_stats(
  p_user_id uuid default null,
  p_apply   boolean default false
)
returns table (
  user_id             uuid,
  sessions_stored     integer,
  sessions_expected   integer,
  minutes_stored      integer,
  minutes_expected    integer,
  tasks_stored        integer,
  tasks_expected      integer,
  streak_stored       integer,
  streak_expected     integer,
  last_date_stored    date,
  last_date_expected  date,
  drifted             boolean,
  repaired            boolean
)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
-- The RETURNS TABLE column names are also plpgsql variables, so a bare
-- user_id inside the query is ambiguous. Parameters are p_-prefixed, so
-- preferring the column is unambiguous and keeps the query readable.
#variable_conflict use_column
begin
  return query
  with target as (
    select s.user_id, s.sessions, s.total_focus_minutes, s.tasks_completed,
           s.streak_days, s.last_session_date
    from public.user_stats s
    where p_user_id is null or s.user_id = p_user_id
  ),
  session_totals as (
    select t.user_id,
           count(ss.id)::int as n,
           coalesce(sum(ss.duration), 0)::int as minutes
    from target t
    left join public.study_sessions ss
      on ss.user_id = t.user_id and ss.end_time is not null
    group by t.user_id
  ),
  task_totals as (
    select t.user_id, count(td.id)::int as n
    from target t
    left join public.todos td
      on td.user_id = t.user_id and td.is_completed
    group by t.user_id
  ),
  -- one row per user per day that has study time on it
  active_days as (
    select distinct t.user_id, (ss.start_time at time zone 'utc')::date as day
    from target t
    join public.study_sessions ss
      on ss.user_id = t.user_id and ss.end_time is not null and ss.duration > 0
  ),
  -- consecutive days share a value of (day - row_number)
  grouped as (
    select user_id, day,
           day - (row_number() over (partition by user_id order by day))::int as run
    from active_days
  ),
  runs as (
    select user_id, run, count(*)::int as length, max(day) as ends_on
    from grouped group by user_id, run
  ),
  current_run as (
    select distinct on (user_id) user_id, length, ends_on
    from runs order by user_id, ends_on desc
  ),
  comparison as (
    select t.user_id,
           t.sessions            as sessions_stored,
           st.n                  as sessions_expected,
           t.total_focus_minutes as minutes_stored,
           st.minutes            as minutes_expected,
           t.tasks_completed     as tasks_stored,
           tt.n                  as tasks_expected,
           t.streak_days         as streak_stored,
           coalesce(cr.length, 0) as streak_expected,
           t.last_session_date   as last_date_stored,
           cr.ends_on            as last_date_expected,
           (t.sessions is distinct from st.n
             or t.total_focus_minutes is distinct from st.minutes
             or t.tasks_completed is distinct from tt.n
             or t.streak_days is distinct from coalesce(cr.length, 0)
             or t.last_session_date is distinct from cr.ends_on) as drifted
    from target t
    join session_totals st on st.user_id = t.user_id
    join task_totals   tt on tt.user_id = t.user_id
    left join current_run cr on cr.user_id = t.user_id
  ),
  -- Data-modifying CTEs run to completion whether or not the outer query reads
  -- them, so the p_apply guard has to live in the WHERE clause.
  repair as (
    update public.user_stats s
    set sessions            = c.sessions_expected,
        total_focus_minutes = c.minutes_expected,
        tasks_completed     = c.tasks_expected,
        streak_days         = c.streak_expected,
        last_session_date   = c.last_date_expected,
        updated_at          = now()
    from comparison c
    where p_apply and c.drifted and s.user_id = c.user_id
    returning s.user_id
  ),
  stamp_sessions as (
    update public.study_sessions ss
    set counted_at = now()
    where p_apply
      and ss.counted_at is null
      and ss.end_time is not null
      and ss.user_id in (select c.user_id from comparison c)
    returning ss.id
  ),
  stamp_todos as (
    update public.todos td
    set counted_at = now()
    where p_apply
      and td.counted_at is null
      and td.is_completed
      and td.user_id in (select c.user_id from comparison c)
    returning td.id
  )
  select c.user_id,
         c.sessions_stored, c.sessions_expected,
         c.minutes_stored,  c.minutes_expected,
         c.tasks_stored,    c.tasks_expected,
         c.streak_stored,   c.streak_expected,
         c.last_date_stored, c.last_date_expected,
         c.drifted,
         (p_apply and c.drifted) as repaired
  from comparison c
  order by c.drifted desc, c.user_id;
end;
$$;

-- Maintenance only. The app never calls this, and a user must not be able to
-- rewrite their own totals with it.
revoke execute on function public.reconcile_user_stats(uuid, boolean) from public;
revoke execute on function public.reconcile_user_stats(uuid, boolean) from anon;
revoke execute on function public.reconcile_user_stats(uuid, boolean) from authenticated;
grant  execute on function public.reconcile_user_stats(uuid, boolean) to service_role;
