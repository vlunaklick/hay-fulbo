CREATE FUNCTION "hay_fulbo_clear_scorekeeper_on_member_delete"()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
SET row_security = off
AS $$
BEGIN
	UPDATE public.match
	SET scorekeeper_user_id = NULL, lock_version = lock_version + 1
	WHERE group_id = OLD.organization_id AND scorekeeper_user_id = OLD.user_id;
	RETURN OLD;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "hay_fulbo_clear_scorekeeper_on_member_delete"() FROM PUBLIC;
--> statement-breakpoint
COMMENT ON FUNCTION "hay_fulbo_clear_scorekeeper_on_member_delete"() IS
	'Owned by the migration role, which must bypass forced RLS, like hay_fulbo_resolve_shared_group. Invoked only by the member trigger; no runtime EXECUTE grant is needed.';
--> statement-breakpoint
CREATE TRIGGER "member_clear_scorekeeper"
AFTER DELETE ON "public"."member"
FOR EACH ROW EXECUTE FUNCTION "hay_fulbo_clear_scorekeeper_on_member_delete"();
