-- ============================================================
-- Pin search_path on the two helpers added recently without one.
--
-- Neither is SECURITY DEFINER, so the exposure is smaller than the linter's
-- warning implies. But chat_attachment_group is evaluated inside a storage
-- policy, and a function that takes part in an access decision should not
-- resolve its own dependencies through whatever search_path the caller
-- happens to have set.
--
-- Note the grants at the bottom. CREATE OR REPLACE resets a function's ACL,
-- so they are restored deliberately rather than assumed to have survived —
-- the same trap CLAUDE.md records for increment_user_stats, where a changed
-- signature silently handed EXECUTE back to PUBLIC.
-- ============================================================

create or replace function public.safe_date(p_text text)
returns date
language plpgsql
stable
set search_path = pg_catalog, public
as $$
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

create or replace function public.chat_attachment_group(object_name text)
returns uuid
language sql
immutable
set search_path = pg_catalog, storage, public
as $$
  select case
    when (storage.foldername(object_name))[1] ~
         '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then ((storage.foldername(object_name))[1])::uuid
  end;
$$;

revoke all on function public.safe_date(text) from public;
revoke all on function public.safe_date(text) from anon;
revoke all on function public.safe_date(text) from authenticated;

revoke all on function public.chat_attachment_group(text) from public;
revoke all on function public.chat_attachment_group(text) from anon;
grant execute on function public.chat_attachment_group(text) to authenticated;
