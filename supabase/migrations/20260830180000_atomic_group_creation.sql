/*
  # Make group creation atomic

  Creating a group was two separate client statements: insert the group, then
  insert the members. Nothing rolled the first back if the second failed, so a
  failure stranded a group row with no members — invisible in the UI, since the
  group list filters by membership, and impossible to delete from it. This
  happened for real during testing when the member insert hit a duplicate key.

  A function body is a single transaction, so either the group and all its
  members exist or neither does.

  SECURITY INVOKER (the default) on purpose: RLS still applies, so this cannot
  be used to insert members into a group the caller does not own.
*/
CREATE OR REPLACE FUNCTION public.create_study_group(
  p_name text,
  p_description text DEFAULT '',
  p_subject text DEFAULT NULL,
  p_is_private boolean DEFAULT false,
  p_member_ids uuid[] DEFAULT '{}'
)
RETURNS study_groups
LANGUAGE plpgsql
VOLATILE
SET search_path = public, pg_temp
AS $$
DECLARE
  uid uuid := auth.uid();
  g study_groups;
  other_ids uuid[];
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF coalesce(btrim(p_name), '') = '' THEN
    RAISE EXCEPTION 'group name is required';
  END IF;

  INSERT INTO study_groups (name, description, subject, is_private, created_by)
  VALUES (btrim(p_name), coalesce(p_description, ''), nullif(btrim(coalesce(p_subject, '')), ''),
          coalesce(p_is_private, false), uid)
  RETURNING * INTO g;

  INSERT INTO study_group_members (group_id, user_id, role)
  VALUES (g.id, uid, 'admin');

  -- Deduplicate, and drop the creator if the caller included them. The client
  -- passes its own id in the member list, which used to collide with the admin
  -- row above and violate UNIQUE(group_id, user_id).
  SELECT array_agg(DISTINCT m)
    INTO other_ids
  FROM unnest(coalesce(p_member_ids, '{}'::uuid[])) AS m
  WHERE m <> uid;

  IF other_ids IS NOT NULL THEN
    INSERT INTO study_group_members (group_id, user_id, role)
    SELECT g.id, m, 'member' FROM unnest(other_ids) AS m;
  END IF;

  RETURN g;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_study_group(text, text, text, boolean, uuid[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_study_group(text, text, text, boolean, uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_study_group(text, text, text, boolean, uuid[]) TO authenticated;
