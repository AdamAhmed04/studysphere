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
    supabase/         15 migrations. 15 tables, all with RLS enabled

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
- Anyone drawn as a circle goes through `src/components/Avatar.tsx`. It takes
  the name and the photo URL separately and falls back to the initial. Do not
  hand-roll another initial-in-a-gradient circle.
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
- Reading *other* users goes through the `discoverable_profiles`,
  `public_profiles` and `public_leaderboard` views, never the base tables.
  **`discoverable_profiles` is the one to read for identity**: it returns every
  account, carrying name and avatar always, and blanks bio, school, study
  field, grade, interests and age unless the row is public, your own, or an
  accepted friend. `public_profiles` still filters `is_public = true`
  outright, which is why reading it made a friend who went private vanish from
  their own friends list and left their chat messages nameless. Age is computed
  in the view; `date_of_birth` is never exposed. The views carry a column
  allowlist — that is what keeps email, date_of_birth, grade and
  graduation_date private. Never add those columns to a view.
- `user_stats` has no INSERT/UPDATE policy on purpose. All stat changes go
  through `increment_user_stats()`, which is atomic and owns streak logic.
  It takes row ids, never numbers: a session id and a to-do id, each counted
  once. `reconcile_user_stats()` checks the stored totals against those rows
  and repairs them with `p_apply => true`. It is service_role only, and worth
  running once after the test data is wiped. Note what counts as truth there:
  the session and to-do rows, not `counted_at`, which is a replay guard rather
  than a ledger.
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
- **Anything needing `auth.uid()` cannot run during `signUp()`.** With email
  confirmation on, `signUp()` returns no session, so the avatar upload sat
  inside `if (authData.session)` and never ran: the photo picked at signup was
  discarded, silently, on every single account. Storage held zero files. The
  photo is now downscaled and parked in `localStorage`, and
  `applyPendingAvatar` uploads it on the first load that has a session.
  `date_of_birth` and `graduation_date` were dropped the same way and are
  fixed differently: they are strings, so they travel in
  `signUp({ options: { data } })` and the `handle_new_user` trigger writes
  them as the row is created, needing no session at all. **Anything that can
  go through signup metadata should**; only a file needs the parking trick.
  Metadata is client-supplied, so the trigger parses dates through
  `safe_date()`, which yields NULL rather than aborting the signup on
  anything malformed.
- **Every screen that draws a person must render `avatar_url`.** The services
  all fetch and map it correctly; nine of the eleven screens then dropped it
  and rendered an initial, so a photo showed on Profile and nowhere else -
  not in chat, not in the friends list, not to anyone else. `Avatar` is now
  the only circle, so a new screen gets this by construction.
- **Avatar URLs are cache-busted with `?v=`.** The storage path is stable per
  user, so a replacement produces a byte-identical URL that every client keeps
  serving from cache for `cacheControl` seconds.
- **Calendar dates go through `src/utils/dates.ts`.** `new Date('2026-09-01')`
  parses as UTC and lands a day early west of UTC. `todos.due_date` is a `date`
  column, not a timestamp.
- **Do not HTML-escape before storing.** React escapes on render, so escaping
  first displayed `&` as `&amp;`.
- **Changing a function's argument list creates a new function**, and a new
  function is granted EXECUTE to PUBLIC by default. `revoke ... from anon` does
  not undo that, because anon inherits through PUBLIC rather than holding a
  direct grant. The earlier trap was the mirror image: revoking from PUBLIC left
  a direct grant to anon. Check `pg_proc.proacl` afterwards instead of trusting
  either revoke — an empty grantee (`=X/postgres`) is PUBLIC.
- **`find_user_by_email` is rate-limited on purpose** (20 an hour, 60 a day per
  account, misses included). Without a limit it answers "is this address
  registered?" as fast as it can be asked, which is an enumeration oracle. The
  attempts table has RLS on and no policies so nobody can read it or reset it.
- **Realtime publishes nothing by default on a new project.** Tables must be
  added to `supabase_realtime` explicitly; `friends` also needs
  `REPLICA IDENTITY FULL` for filtered DELETE events.

### Outstanding, in priority order

1. Leaked-password protection is disabled, and cannot currently be enabled:
   it needs the Pro plan and this project's organisation is on Free. It is a
   dashboard setting rather than anything in the codebase, so there is nothing
   to change here until the plan changes. The signup form already requires 8+
   characters with upper, lower, digit and symbol — the strongest server-side
   password rules Supabase offers — so the specific gap is the
   HaveIBeenPwned check, which no client-side code can stand in for.
2. Direct messages and video calling are unbuilt; both show an honest toast
   rather than faking it. DMs would mean two-member private groups reusing the
   existing chat.

Not a fix but a decision that should be made before launch: StudySphere is a web
app, and neither app store accepts it as-is. It needs a native shell —
realistically Capacitor, which wraps the existing build with least disruption.
