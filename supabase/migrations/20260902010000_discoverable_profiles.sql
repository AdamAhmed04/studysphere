-- ============================================================
-- Make private accounts findable, without making them readable.
--
-- public_profiles filters `WHERE is_public = true`, so a private account is
-- not merely photo-less in search - it does not exist. You cannot find it,
-- and you cannot send it a friend request.
--
-- That is stricter than the model people expect from Instagram or LinkedIn,
-- where a private account is discoverable by name and photo but its content
-- is not. This view implements that model: identity is always visible, detail
-- is visible only when the account is public.
--
-- What identity means here is deliberately narrow - the name someone chose to
-- display and the photo they chose to upload, both already shown to anyone
-- they interact with. Everything else is gated on is_public.
--
-- The four columns the baseline calls out - email, date_of_birth, grade,
-- graduation_date - are absent here as they are absent there, for the same
-- reason. Do not add them.
-- ============================================================

CREATE VIEW discoverable_profiles AS
  SELECT
    user_id,
    name,
    avatar_url,
    -- Lets the client label a private account rather than silently showing
    -- someone an empty profile and leaving them to wonder.
    is_public,
    CASE WHEN is_public THEN bio         END AS bio,
    CASE WHEN is_public THEN school      END AS school,
    CASE WHEN is_public THEN study_field END AS study_field,
    CASE WHEN is_public THEN interests   END AS interests
  FROM user_profiles;

GRANT SELECT ON discoverable_profiles TO authenticated;

-- Not granted to anon. Search is a signed-in feature, and an ungated list of
-- every display name and photo is exactly the enumeration surface that
-- find_user_by_email is rate-limited to avoid.
REVOKE ALL ON discoverable_profiles FROM anon;

COMMENT ON VIEW discoverable_profiles IS
  'Identity for search: name and avatar for every account, detail columns only when is_public. public_profiles stays the stricter view for everything that is not search. Never add email, date_of_birth, grade or graduation_date here.';
