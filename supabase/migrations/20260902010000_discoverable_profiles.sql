-- ============================================================
-- Make private accounts findable, without making them readable.
--
-- public_profiles filters `WHERE is_public = true`, so a private account is
-- not merely photo-less in search - it does not exist. You cannot find it,
-- and you cannot send it a friend request. That is stricter than the model
-- people expect from Instagram or LinkedIn, where a private account is
-- discoverable by name and photo but its content is not.
--
-- This view implements that model, with one addition: friendship overrides
-- privacy. Someone who accepted your request has already shown you their
-- profile, and should not vanish from your friends list by later going
-- private.
--
-- So a row's detail columns are visible when ANY of these holds:
--   - the account is public
--   - it is your own row
--   - the two of you are accepted friends
-- and name and avatar are visible always.
--
-- Note what is NOT here. `email` and `graduation_date` stay out entirely, as
-- they are out of public_profiles, for the same reason. `date_of_birth` is
-- replaced by a computed `age`: the app only ever displays an age, and a
-- precise birth date is a security-question answer and an identity-theft
-- input, so the view does the arithmetic and never hands over the date.
-- ============================================================

-- ------------------------------------------------------------
-- Friendship test.
--
-- SECURITY DEFINER so it can read `friends` past that table's own RLS, and
-- so the view can call it without every caller needing read access to the
-- friendship graph. It answers only about the caller: there is no argument
-- for "whose friends", it is always auth.uid()'s, so this cannot be used to
-- enumerate anyone else's friendships.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_friend_of_caller(p_other uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM friends
    WHERE status = 'accepted'
      AND (
        (user_id = auth.uid() AND friend_user_id = p_other)
        OR
        (user_id = p_other AND friend_user_id = auth.uid())
      )
  );
$$;

-- A new function is granted EXECUTE to PUBLIC by default, and anon inherits
-- through PUBLIC rather than holding a direct grant - so revoking from anon
-- alone would leave it callable. Revoke from PUBLIC, then grant deliberately.
-- Verify with pg_proc.proacl afterwards; an empty grantee (=X/postgres) means
-- PUBLIC still has it.
REVOKE ALL ON FUNCTION public.is_friend_of_caller(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_friend_of_caller(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_friend_of_caller(uuid) TO authenticated;

COMMENT ON FUNCTION public.is_friend_of_caller(uuid) IS
  'True when the caller and p_other are accepted friends. Always relative to auth.uid(), so it cannot report on anyone else''s friendships.';

-- ------------------------------------------------------------
-- The view.
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW discoverable_profiles AS
  SELECT
    p.user_id,
    -- Identity: always visible, to everyone signed in.
    p.name,
    p.avatar_url,
    p.is_public,

    -- Lets the client show "this account is private" rather than an
    -- unexplained empty profile.
    (
      p.is_public
      OR p.user_id = auth.uid()
      OR public.is_friend_of_caller(p.user_id)
    ) AS can_see_details,

    CASE WHEN p.is_public
           OR p.user_id = auth.uid()
           OR public.is_friend_of_caller(p.user_id)
         THEN p.bio END AS bio,
    CASE WHEN p.is_public
           OR p.user_id = auth.uid()
           OR public.is_friend_of_caller(p.user_id)
         THEN p.school END AS school,
    CASE WHEN p.is_public
           OR p.user_id = auth.uid()
           OR public.is_friend_of_caller(p.user_id)
         THEN p.study_field END AS study_field,
    CASE WHEN p.is_public
           OR p.user_id = auth.uid()
           OR public.is_friend_of_caller(p.user_id)
         THEN p.grade END AS grade,
    CASE WHEN p.is_public
           OR p.user_id = auth.uid()
           OR public.is_friend_of_caller(p.user_id)
         THEN p.interests END AS interests,

    -- Derived, never the underlying date. See the header.
    CASE WHEN (p.is_public
           OR p.user_id = auth.uid()
           OR public.is_friend_of_caller(p.user_id))
          AND p.date_of_birth IS NOT NULL
         THEN date_part('year', age(p.date_of_birth))::int END AS age

  FROM user_profiles p;

GRANT SELECT ON discoverable_profiles TO authenticated;

-- Not granted to anon. Search is a signed-in feature, and an ungated list of
-- every display name and photo is exactly the enumeration surface that
-- find_user_by_email is rate-limited to avoid.
REVOKE ALL ON discoverable_profiles FROM anon;

COMMENT ON VIEW discoverable_profiles IS
  'Search identity. Name and avatar for every account; bio, school, study field, grade, interests and a computed age only when the account is public, is your own, or belongs to an accepted friend. public_profiles remains the stricter view for non-search reads. Never add email, date_of_birth or graduation_date here.';
