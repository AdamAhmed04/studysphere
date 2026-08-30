/*
  # Publish realtime events for the tables the app subscribes to

  A new Supabase project starts with an empty `supabase_realtime` publication.
  Until a table is added to it, Postgres emits no change events for that table
  and `postgres_changes` subscriptions stay silent forever — the channel
  connects, nothing arrives, and the UI only updates on a page reload.

  The baseline schema missed this. The five tables below are every table the
  client subscribes to:

    chat_messages   groupService.subscribeToGroupMessages
    friends         friendService.subscribeToPendingRequests / ToFriendsChanges
    notifications   notificationService.subscribeToNotifications
    user_presence   presenceService.subscribeToPresence
    user_stats      userService.subscribeToUserStats

  Idempotent: adding a table that is already published raises an error, so each
  one is checked first.
*/

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'chat_messages',
    'friends',
    'notifications',
    'user_presence',
    'user_stats'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;

/*
  `friends` additionally needs REPLICA IDENTITY FULL.

  The subscriptions filter on `user_id` / `friend_user_id`. With the default
  replica identity, a DELETE event carries only the primary key, so those
  filters cannot match and removing a friend would never reach the other
  client. FULL includes the whole old row, which is what the filter needs.

  The other four tables subscribe to INSERT or UPDATE, where the new row is
  always complete, so they are fine with the default.
*/
ALTER TABLE friends REPLICA IDENTITY FULL;
