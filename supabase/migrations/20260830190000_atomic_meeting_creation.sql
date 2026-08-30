/*
  # Make meeting creation atomic

  Meeting creation had the same shape that stranded an orphaned study group
  during testing: insert the meeting, then insert participants, with nothing
  rolling the first back if the second failed. A function body is one
  transaction, so either the meeting and all its participants exist or neither
  does.

  SECURITY INVOKER (the default) on purpose: RLS still applies, so this cannot
  create a meeting hosted by somebody else.
*/
CREATE OR REPLACE FUNCTION public.create_meeting(
  p_title text,
  p_scheduled_time timestamptz,
  p_duration integer DEFAULT 60,
  p_description text DEFAULT NULL,
  p_group_id uuid DEFAULT NULL,
  p_location text DEFAULT NULL,
  p_meeting_type text DEFAULT 'video',
  p_meeting_link text DEFAULT NULL,
  p_participant_ids uuid[] DEFAULT '{}'
)
RETURNS meetings
LANGUAGE plpgsql
VOLATILE
SET search_path = public, pg_temp
AS $$
DECLARE
  uid uuid := auth.uid();
  m meetings;
  other_ids uuid[];
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF coalesce(btrim(p_title), '') = '' THEN
    RAISE EXCEPTION 'meeting title is required';
  END IF;

  IF p_scheduled_time IS NULL THEN
    RAISE EXCEPTION 'scheduled time is required';
  END IF;

  INSERT INTO meetings (
    title, description, scheduled_time, duration, host_id,
    group_id, location, meeting_type, meeting_link, status
  )
  VALUES (
    btrim(p_title),
    nullif(btrim(coalesce(p_description, '')), ''),
    p_scheduled_time,
    greatest(coalesce(p_duration, 60), 1),
    uid,
    p_group_id,
    nullif(btrim(coalesce(p_location, '')), ''),
    coalesce(p_meeting_type, 'video'),
    nullif(btrim(coalesce(p_meeting_link, '')), ''),
    'scheduled'
  )
  RETURNING * INTO m;

  -- Deduplicate, and drop the host: they are identified by host_id and do not
  -- need a participant row. The client builds this list by concatenating
  -- participants and invitees, which can repeat an id.
  SELECT array_agg(DISTINCT pid)
    INTO other_ids
  FROM unnest(coalesce(p_participant_ids, '{}'::uuid[])) AS pid
  WHERE pid <> uid;

  IF other_ids IS NOT NULL THEN
    INSERT INTO meeting_participants (meeting_id, user_id, status)
    SELECT m.id, pid, 'invited' FROM unnest(other_ids) AS pid;
  END IF;

  RETURN m;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_meeting(text, timestamptz, integer, text, uuid, text, text, text, uuid[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_meeting(text, timestamptz, integer, text, uuid, text, text, text, uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_meeting(text, timestamptz, integer, text, uuid, text, text, text, uuid[]) TO authenticated;
