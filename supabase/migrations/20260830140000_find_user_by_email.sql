/*
  # Look up a user by email without exposing the email column

  "Add a friend by email" needs to resolve an address to a user id. The baseline
  schema deliberately keeps `email` out of `public_profiles`, so the client can
  no longer do `.eq('email', ...)` against a readable column.

  This function closes that gap narrowly: it takes an address and returns only
  the id and display name of a matching public profile. Callers can confirm an
  address belongs to someone and address a request to them, but cannot read
  anybody's email back out.

  This does leave an enumeration oracle — you can learn whether an address has
  an account. That is inherent to the feature: any "invite by email" flow tells
  you that much. What it no longer does is hand over the address book.
*/

CREATE FUNCTION public.find_user_by_email(p_email text)
RETURNS TABLE (user_id uuid, name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT p.user_id, p.name
  FROM user_profiles p
  WHERE lower(p.email) = lower(trim(p_email))
    AND p.is_public = true
    AND p.user_id <> auth.uid()
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.find_user_by_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_user_by_email(text) TO authenticated;

COMMENT ON FUNCTION public.find_user_by_email(text) IS
  'Resolves an email address to a public profile id and name. Never returns the email itself.';
