-- ============================================================
-- Stop discarding date of birth and graduation date at signup.
--
-- Both were collected by the signup form and then dropped, for the same
-- reason the avatar was: they were written by a post-signup UPDATE, and with
-- email confirmation on there is no session at that moment, so the statement
-- guarded by `if (authData.session)` never ran. Every account created so far
-- has nulls for both.
--
-- The avatar had to be parked client-side because a file cannot travel
-- through signUp(). These two are just strings, so they can go the way the
-- other profile fields already go: through raw_user_meta_data, written by
-- this trigger, which runs as the row is created and needs no session at all.
--
-- Note what does NOT change: neither column is added to any view.
-- graduation_date stays unexposed, and date_of_birth is still only ever read
-- back as a computed age.
-- ============================================================

-- ------------------------------------------------------------
-- Signup metadata is client-supplied, so a malformed date must not be able
-- to abort the trigger and take the whole signup with it. Anything that is
-- not a real date becomes NULL, which is the same state the column was in
-- before this migration - the field is simply not set.
--
-- STABLE rather than IMMUTABLE: casting text to date consults DateStyle.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.safe_date(p_text text)
RETURNS date
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  IF p_text IS NULL OR btrim(p_text) = '' THEN
    RETURN NULL;
  END IF;

  RETURN p_text::date;
EXCEPTION
  WHEN others THEN
    RETURN NULL;
END;
$$;

-- Only handle_new_user calls this, and that runs SECURITY DEFINER as the
-- owner. Nobody else needs it. A new function is granted EXECUTE to PUBLIC by
-- default and anon inherits through PUBLIC, so revoke from PUBLIC rather than
-- from anon.
REVOKE ALL ON FUNCTION public.safe_date(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.safe_date(text) FROM anon;
REVOKE ALL ON FUNCTION public.safe_date(text) FROM authenticated;

COMMENT ON FUNCTION public.safe_date(text) IS
  'Parses a date from client-supplied signup metadata, yielding NULL rather than raising on anything malformed.';

-- ------------------------------------------------------------
-- The trigger, with the two dates added. Everything else is unchanged.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  INSERT INTO user_profiles (
    user_id, name, email, avatar_url, bio, school, study_field, grade,
    interests, is_public, date_of_birth, graduation_date
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'bio',
    NEW.raw_user_meta_data->>'school',
    NEW.raw_user_meta_data->>'study_field',
    NEW.raw_user_meta_data->>'grade',
    COALESCE(
      ARRAY(SELECT jsonb_array_elements_text(NEW.raw_user_meta_data->'interests')),
      '{}'::text[]
    ),
    COALESCE((NEW.raw_user_meta_data->>'is_public')::boolean, true),
    public.safe_date(NEW.raw_user_meta_data->>'date_of_birth'),
    public.safe_date(NEW.raw_user_meta_data->>'graduation_date')
  )
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO user_stats (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO user_presence (user_id, is_online) VALUES (NEW.id, false) ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$function$;
