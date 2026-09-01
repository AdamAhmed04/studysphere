/*
 * Bounds every piece of text a user can submit.
 *
 * `sanitizeInput` exists and trims and caps, but it was applied in exactly one
 * place - chat messages, at 2000 characters. Everything else reached the
 * database unbounded and untrimmed: todo titles, group names, bios, event
 * titles, reminder titles, descriptions, notes. No text column had a length
 * constraint and no required column had a non-empty one, so a whitespace-only
 * title or a multi-megabyte description was accepted and stored.
 *
 * This is not an injection concern - React escapes on render, and the earlier
 * double-escaping fix settled that question. It is storage and integrity: a
 * client is free to send anything, and the only place that cannot be skipped by
 * a future client, a different app, or a direct PostgREST call is the database.
 *
 * Two rules, applied separately and on purpose:
 *
 *   - Required fields (titles, names, the message body) get a length cap AND a
 *     non-empty check, so "   " is no longer a valid title.
 *   - Optional fields get the cap only. `calendar_events.description` and
 *     `study_groups.description` are NOT NULL but legitimately hold '' today -
 *     4 and 5 rows respectively - so a non-empty check there would reject data
 *     the app itself wrote. Checked before writing this rather than after.
 *
 * Limits are deliberately generous. The point is to stop the absurd, not to
 * pick a product opinion about how long a bio should be. The longest value
 * anywhere in the table today is 53 characters, so nothing existing is at risk.
 *
 * Array columns are bounded by element count and by total joined length rather
 * than per element: a CHECK constraint cannot contain a subquery, so
 * `array_to_string` is the immutable way to bound the whole thing.
 */

-- Required text: capped and non-empty -------------------------------------

alter table public.calendar_events
  add constraint calendar_events_title_bounded
  check (length(title) <= 200 and btrim(title) <> '');

alter table public.chat_messages
  add constraint chat_messages_message_bounded
  check (length(message) <= 2000 and btrim(message) <> '');

alter table public.meetings
  add constraint meetings_title_bounded
  check (length(title) <= 200 and btrim(title) <> '');

alter table public.notifications
  add constraint notifications_title_bounded
  check (length(title) <= 200 and btrim(title) <> '');

alter table public.notifications
  add constraint notifications_message_bounded
  check (length(message) <= 1000 and btrim(message) <> '');

alter table public.reminders
  add constraint reminders_title_bounded
  check (length(title) <= 200 and btrim(title) <> '');

alter table public.study_groups
  add constraint study_groups_name_bounded
  check (length(name) <= 100 and btrim(name) <> '');

alter table public.study_sessions
  add constraint study_sessions_subject_bounded
  check (length(subject) <= 200 and btrim(subject) <> '');

alter table public.todos
  add constraint todos_title_bounded
  check (length(title) <= 500 and btrim(title) <> '');

alter table public.user_profiles
  add constraint user_profiles_name_bounded
  check (length(name) <= 100 and btrim(name) <> '');

-- Optional text: capped only, blank still allowed ---------------------------

alter table public.calendar_events
  add constraint calendar_events_description_bounded check (description is null or length(description) <= 2000),
  add constraint calendar_events_color_bounded       check (length(color) <= 32);

alter table public.meetings
  add constraint meetings_description_bounded  check (description is null or length(description) <= 2000),
  add constraint meetings_location_bounded     check (location is null or length(location) <= 300),
  add constraint meetings_link_bounded         check (meeting_link is null or length(meeting_link) <= 2000);

alter table public.reminders
  add constraint reminders_description_bounded check (description is null or length(description) <= 2000);

alter table public.study_groups
  add constraint study_groups_description_bounded check (length(description) <= 2000),
  add constraint study_groups_subject_bounded     check (subject is null or length(subject) <= 100),
  add constraint study_groups_avatar_bounded      check (avatar_url is null or length(avatar_url) <= 2000);

alter table public.study_sessions
  add constraint study_sessions_notes_bounded check (notes is null or length(notes) <= 5000);

alter table public.todos
  add constraint todos_description_bounded check (description is null or length(description) <= 2000),
  add constraint todos_category_bounded    check (category is null or length(category) <= 100);

alter table public.user_profiles
  add constraint user_profiles_email_bounded       check (length(email) <= 320),
  add constraint user_profiles_avatar_bounded      check (avatar_url is null or length(avatar_url) <= 2000),
  add constraint user_profiles_bio_bounded         check (bio is null or length(bio) <= 2000),
  add constraint user_profiles_school_bounded      check (school is null or length(school) <= 200),
  add constraint user_profiles_study_field_bounded check (study_field is null or length(study_field) <= 200),
  add constraint user_profiles_grade_bounded       check (grade is null or length(grade) <= 50);

-- Arrays: bounded by count and by total size --------------------------------

alter table public.user_profiles
  add constraint user_profiles_interests_bounded
  check (
    interests is null
    or (coalesce(array_length(interests, 1), 0) <= 20
        and length(array_to_string(interests, ',')) <= 500)
  );

alter table public.chat_messages
  add constraint chat_messages_attachments_bounded
  check (
    attachments is null
    or (coalesce(array_length(attachments, 1), 0) <= 10
        and length(array_to_string(attachments, ',')) <= 4000)
  );
