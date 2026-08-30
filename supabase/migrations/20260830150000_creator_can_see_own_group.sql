/*
  # Let a group creator see their own group

  The baseline SELECT policy on study_groups was:

      USING (is_private = false OR public.is_group_member(id))

  Creating a PRIVATE group inserts the row and then reads it back with
  .select().single(). At that moment no membership row exists yet — it is
  inserted on the next statement — so the read matched nothing and group
  creation failed for private groups only.

  Adding the creator closes the gap and is correct independently: whoever
  created a group should always be able to see it.
*/

DROP POLICY IF EXISTS "View public or joined groups" ON study_groups;

CREATE POLICY "View public, joined, or own groups"
  ON study_groups
  FOR SELECT
  TO authenticated
  USING (
    is_private = false
    OR auth.uid() = created_by
    OR public.is_group_member(id)
  );
