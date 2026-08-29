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

A full audit found 48 issues; the four app-breaking ones and the type errors
blocking `tsc` are fixed. Still outstanding, roughly in priority order:

1. RLS: `notifications` INSERT is `WITH CHECK (true)` — any user can write into
   any other user's notification feed, which the realtime handler turns into a
   desktop notification. Phishing vector.
2. RLS: the `user_profiles` public SELECT policy exposes every column, including
   email, date_of_birth, school and grade, for all `is_public = true` rows.
3. RLS: policies on `study_group_members` and `meetings`/`meeting_participants`
   are recursive (Postgres 42P17), so groups, chat and meetings are broken.
   Fix via SECURITY DEFINER helpers — and fix the shadowed self-join at
   migration 145719 line 182 in the same pass, or fixing the recursion arms a
   group-takeover bug.
4. RLS: nobody can accept a friend request (UPDATE policy covers the sender,
   not the recipient) and the app reports success anyway.
5. `useTimer` and `useAuth` are each mounted twice, so two Web Workers and two
   auth subscriptions run at once. Both need lifting into a context provider.
6. The user profile cache is a single global localStorage key with no user id
   check, and no sign-out button is wired up anywhere.
7. Realtime channels are globally named and unfiltered — every client refetches
   on every row change in `friends` for any user.
8. Date handling parses `YYYY-MM-DD` as UTC then mutates in local time, so due
   dates land a day early west of UTC. Streaks are also hard-coded to 1.

`noUnusedLocals` is currently off in tsconfig.app.json — 52 unused imports need
cleaning up before it goes back on.
