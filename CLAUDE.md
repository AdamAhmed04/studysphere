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

    src/components/   UI. The big ones: App (900), Calendar, AuthPage, Timer
    src/hooks/        useAuth, useTimer, useTodos, useCalendar, useGroups, ...
    src/services/     One module per Supabase table/domain
    src/types/        Shared types. Note: the UI uses camelCase, the DB snake_case
    public/           timer-worker.js — the timer runs in a Web Worker
    supabase/         Five migrations. 14 tables, all with RLS enabled

## Conventions

- Services take a `userId` and let RLS enforce ownership. Do not rely on
  client-side `.eq('user_id', ...)` filtering as a security boundary.
- `supabase` from `src/lib/supabase.ts` is `null` when env vars are missing.
  Null-check it at every call site.
- The UI passes camelCase objects; anything written to Supabase must be mapped
  to snake_case column names first. Sending a raw form object will be rejected.
- `npm run build` runs `tsc -b` first. Keep it passing.

## Known state (audited 29 Aug 2026)

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

A full audit on 30 Aug 2026 catalogued 40 issues. The schema rebuild plus the
paired client changes closed findings 1-3, 5-9, 12, 15, 16, 19-21, 30, 31.
Still outstanding, roughly in priority order:

1. `useTimer` and `useAuth` are each mounted twice, so two Web Workers and two
   auth subscriptions run at once. Both need lifting into a context provider.
2. Date handling parses `YYYY-MM-DD` as UTC then mutates in local time, so due
   dates land a day early west of UTC. `TodoList.tsx:37,65` and
   `Calendar.tsx:172`. `ScheduleMeetingModal.tsx:91` already does it correctly —
   copy that pattern. `authService.toLocalDateString` is the helper.
3. `presenceService.startHeartbeat` re-registers its `beforeunload` and
   `visibilitychange` listeners on every call, and its own handler calls it
   again, so listeners accumulate without bound.
4. `sanitizeInput` HTML-escapes before storing, and React escapes again on
   render, so `&` displays as `&amp;`. The escaping is unnecessary.
5. `FriendsList`'s add-friend search returns hard-coded `@example.com` mock
   users with `Math.random()` study times. It is not wired to `searchService`.
6. Direct messages were removed rather than fixed — `handleStartChat` now says
   so instead of fabricating a non-persisted group. Building them for real
   means creating two-member private groups.
7. 52 unused symbols; `noUnusedLocals` is off in tsconfig.app.json to hide them.
8. 23 `alert()` calls are the entire user feedback layer.

`noUnusedLocals` is currently off in tsconfig.app.json — 52 unused imports need
cleaning up before it goes back on.
