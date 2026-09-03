-- ============================================================
-- Let a group survive its creator's account being deleted.
--
-- freeze_group_creator blocked any change to created_by, which is right: it
-- stops ownership being quietly reassigned to someone else.
--
-- But ON DELETE SET NULL is an UPDATE, so the trigger refused it and the
-- delete failed outright — an account that had created a group could not be
-- deleted at all. An integrity guard that blocks erasure is worse than the
-- reassignment it was preventing. Caught by testing the delete in a
-- rolled-back transaction rather than by reading the schema.
--
-- Releasing to NULL is now allowed; reassigning to a different person is
-- still refused. Releasing gives nobody new any power, and group
-- administration comes from study_group_members.role rather than this column.
-- ============================================================

create or replace function public.freeze_group_creator()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $function$
BEGIN
  IF NEW.created_by IS DISTINCT FROM OLD.created_by
     AND NEW.created_by IS NOT NULL THEN
    RAISE EXCEPTION 'created_by cannot be reassigned';
  END IF;

  RETURN NEW;
END;
$function$;
