CREATE OR REPLACE FUNCTION "hay_fulbo_guard_appearance_mutation"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
	parent_status public.match_status;
	row_group_id text;
	row_match_id uuid;
BEGIN
	IF TG_OP = 'DELETE' THEN
		row_group_id := OLD.group_id;
		row_match_id := OLD.match_id;
	ELSE
		row_group_id := NEW.group_id;
		row_match_id := NEW.match_id;
	END IF;

	SELECT status INTO parent_status
	FROM public.match
	WHERE group_id = row_group_id AND id = row_match_id;

	IF parent_status = 'cancelled' THEN
		RAISE EXCEPTION 'cancelled match appearances are immutable';
	END IF;
	IF parent_status = 'closed' THEN
		IF TG_OP <> 'UPDATE' THEN
			RAISE EXCEPTION 'closed match appearances cannot be added or removed';
		END IF;
		IF OLD.group_id IS DISTINCT FROM NEW.group_id
			OR OLD.match_id IS DISTINCT FROM NEW.match_id
			OR OLD.player_id IS DISTINCT FROM NEW.player_id
			OR OLD.team_id IS DISTINCT FROM NEW.team_id
			OR OLD.joined_order IS DISTINCT FROM NEW.joined_order
			OR OLD.goals IS DISTINCT FROM NEW.goals
			OR OLD.assists IS DISTINCT FROM NEW.assists
			OR OLD.own_goals IS DISTINCT FROM NEW.own_goals
			OR OLD.expected_minor IS DISTINCT FROM NEW.expected_minor
			OR OLD.created_at IS DISTINCT FROM NEW.created_at
		THEN
			RAISE EXCEPTION 'only payment fields may change on a closed match';
		END IF;
	END IF;
	IF TG_OP = 'DELETE' THEN
		RETURN OLD;
	END IF;
	RETURN NEW;
END;
$$;
