/*
  # Fix the meetings SELECT policy so a host can read back their own new meeting

  Creating a meeting failed with 42501 "new row violates row-level security
  policy for table meetings". The INSERT check was not the problem — an insert
  without RETURNING succeeded. The failure was the RETURNING clause, which
  requires SELECT permission on the new row, and Postgres reports that with the
  same misleading message.

  The SELECT policy was `can_see_meeting(id)`, a STABLE function that queries
  `meetings`. A STABLE function sees the snapshot from the start of the
  statement, in which the row being inserted does not exist yet, so it returned
  false for the caller's own new meeting. Meetings could therefore never be
  created through any client that reads the row back — which is every client.

  That helper also broke the rule the baseline schema states in its own header:
  a policy on `meetings` should not query `meetings`. It avoided infinite
  recursion only because SECURITY DEFINER bypasses RLS, so the fault surfaced
  as this instead.

  The host branch now reads host_id off the row directly, which is the shape
  that makes the equivalent study_groups policy work. The other two branches
  read different tables, where the snapshot problem does not arise.

  can_see_meeting is kept: the meeting_participants policies use it, and there
  the meeting row already exists.
*/

CREATE OR REPLACE FUNCTION public.is_meeting_participant(mid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM meeting_participants p
    WHERE p.meeting_id = mid AND p.user_id = auth.uid()
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_meeting_participant(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_meeting_participant(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_meeting_participant(uuid) TO authenticated;

DROP POLICY IF EXISTS "View meetings you are part of" ON meetings;

CREATE POLICY "View meetings you are part of"
  ON meetings
  FOR SELECT
  TO authenticated
  USING (
    -- Read off the row being checked, so it works for a row still being inserted.
    auth.uid() = host_id
    OR public.is_meeting_participant(id)
    OR (group_id IS NOT NULL AND public.is_group_member(group_id))
  );
