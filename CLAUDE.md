# StudySphere

A study app: Pomodoro timer, calendar, to-dos, study groups with chat, friends,
leaderboard, and three arcade games as break rewards.

React 18 + TypeScript + Vite + Tailwind. Supabase for auth, database and storage.
Originally scaffolded in Bolt, then developed in Replit; now developed locally.

## Running it

    npm install
    npm run dev        # http://localhost:5000

`.env.local` holds `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. It is
gitignored. The anon key is public by design — RLS is the real access control.

## Layout

    src/components/   UI. The big ones: App (983), Calendar, AuthPage, Timer
    src/contexts/     AuthContext, TimerContext, ToastContext — mounted in main.tsx
    src/hooks/        useAuth, useTimer, useTodos, useCalendar, useGroups, ...
    src/services/     One module per Supabase table/domain
    src/types/        Shared types, plus database.ts generated from the schema
    src/utils/        dates.ts (calendar dates), rows.ts (the DB↔UI null boundary)
    public/           timer-worker.js — the timer runs in a Web Worker
    supabase/         11 migrations. 14 tables, all with RLS enabled

## Conventions

- Services take a `userId` and let RLS enforce ownership. Do not rely on
  client-side `.eq('user_id', ...)` filtering as a security boundary.
- `supabase` from `src/lib/supabase.ts` is `null` when env vars are missing.
  Null-check it at every call site.
- The UI passes camelCase objects; anything written to Supabase must be mapped
  to snake_case column names first. Sending a raw form object will be rejected.
- Consume auth, timer and toasts through `src/contexts/`, never by calling the
  hooks directly in a second component.
- User feedback goes through the toast context. No `alert()`.
- `npm run build` runs `tsc -b` first, with `noUnusedLocals` and
  `noUnusedParameters` on. Keep it passing.

## Known state (audited 31 Aug 2026)

**The database was rebuilt on 30 Aug 2026.** The original Supabase project was
provisioned under an organization the owner is not a member of (a Bolt/Replit
artifact), so it was unreachable from the dashboard. A new project was created
and the schema rewritten from scratch rather than patched.

- `supabase/migrations/` holds the new baseline. `migrations_archive/` holds the
  five original migrations, kept for reference only — do not run them.
- The RLS rules the baseline follows are documented in its header comment. The
  important one: **no policy may query its own table.** Membership tests go
  through SECURITY DEFINER helpers (`is_group_member`, `is_group_admin`,
  `can_see_meeting`, `can_notify`). Policies that self-referenced were what
  produced the 42P17 recursion that killed groups, chat and meetings.
- Reading *other* users goes through the `public_profiles` and
  `public_leaderboard` views, never the base tables. The views carry a column
  allowlist — that is what keeps email, date_of_birth, grade and
  graduation_date private. Never add those columns to a view.
- `user_stats` has no INSERT/UPDATE policy on purpose. All stat changes go
  through `increment_user_stats()`, which is atomic and owns streak logic.
- Profile, stats and presence rows are created by the `on_auth_user_created`
  trigger. The client must not insert them; it passes fields via
  `signUp({ options: { data } })`.

### Do not regress these

Each of these was a real bug that was silent — nothing errored and nothing
logged. They are cheap to reintroduce by accident.

- **Embeds against `public_profiles` must be LEFT joins.** The view filters
  `is_public = true`, so `!inner` does not merely leave a row nameless, it drops
  the row. With `!inner`, setting your profile to private hid every message you
  had posted, in every group, from everyone: 20 stored, 0 returned.
- **`increment_user_stats` takes a `study_sessions` id, not a number of
  minutes.** It used to take the figure on trust, so one request to
  `/rest/v1/rpc` from any signed-in account set its own totals to anything —
  measured, 1 to 1,000,000 focus minutes. It now reads the minutes off a session
  row that must belong to the caller, cannot claim more time than elapsed, and
  counts once. Never add a minutes parameter back.
- **Calendar dates go through `src/utils/dates.ts`.** `new Date('2026-09-01')`
  parses as UTC and lands a day early west of UTC. `todos.due_date` is a `date`
  column, not a timestamp.
- **Do not HTML-escape before storing.** React escapes on render, so escaping
  first displayed `&` as `&amp;`.
- **Realtime publishes nothing by default on a new project.** Tables must be
  added to `supabase_realtime` explicitly; `friends` also needs
  `REPLICA IDENTITY FULL` for filtered DELETE events.

### Outstanding, in priority order

1. `find_user_by_email` lets any signed-in account test whether an address is
   registered, as fast as it likes. Deliberate — friend-by-email needs it, and
   it never returns the address — but it wants rate limiting before launch.
2. Completing a to-do credits nothing. `tasks_completed` is plumbed through the
   hook, the service and the RPC, but no caller ever passes it.
3. Twenty-nine RLS policies re-evaluate `auth.uid()` per row; write it as
   `(select auth.uid())` so Postgres hoists it. Three foreign keys have no
   covering index: `calendar_events.group_id`, `calendar_events.todo_id`,
   `reminders.event_id`. Performance only, invisible at this size.
4. Leaked-password protection is disabled. A Supabase dashboard toggle, not a
   code change.
5. Direct messages and video calling are unbuilt; both show an honest toast
   rather than faking it. DMs would mean two-member private groups reusing the
   existing chat.

Not a fix but a decision that should be made before launch: StudySphere is a web
app, and neither app store accepts it as-is. It needs a native shell —
realistically Capacitor, which wraps the existing build with least disruption.
