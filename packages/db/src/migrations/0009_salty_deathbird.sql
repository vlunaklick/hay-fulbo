CREATE TYPE "public"."rating_quorum" AS ENUM('all_voted', 'half_plus_one', 'first_vote');--> statement-breakpoint
CREATE TABLE "match_rating" (
	"group_id" text NOT NULL,
	"match_id" uuid NOT NULL,
	"rater_player_id" uuid NOT NULL,
	"rated_player_id" uuid NOT NULL,
	"score" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "match_rating_pk" PRIMARY KEY("group_id","match_id","rater_player_id","rated_player_id"),
	CONSTRAINT "match_rating_score_allowed" CHECK ("match_rating"."score" between 1 and 10),
	CONSTRAINT "match_rating_players_different" CHECK ("match_rating"."rater_player_id" <> "match_rating"."rated_player_id")
);
--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "rating_quorum" "rating_quorum" DEFAULT 'all_voted' NOT NULL;--> statement-breakpoint
ALTER TABLE "match_rating" ADD CONSTRAINT "match_rating_group_match_fk" FOREIGN KEY ("group_id","match_id") REFERENCES "public"."match"("group_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_rating" ADD CONSTRAINT "match_rating_group_rater_fk" FOREIGN KEY ("group_id","rater_player_id") REFERENCES "public"."player"("group_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_rating" ADD CONSTRAINT "match_rating_group_rated_fk" FOREIGN KEY ("group_id","rated_player_id") REFERENCES "public"."player"("group_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "match_rating_group_match_idx" ON "match_rating" USING btree ("group_id","match_id");--> statement-breakpoint
CREATE INDEX "match_rating_group_rated_idx" ON "match_rating" USING btree ("group_id","rated_player_id");--> statement-breakpoint
ALTER TABLE "match_rating" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "match_rating" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "match_rating_group_scope" ON "match_rating"
	USING ("group_id" = nullif(current_setting('app.group_id', true), ''))
	WITH CHECK ("group_id" = nullif(current_setting('app.group_id', true), ''));--> statement-breakpoint
CREATE OR REPLACE FUNCTION "hay_fulbo_guard_rating_mutation"()
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

	IF parent_status IS DISTINCT FROM 'closed' THEN
		RAISE EXCEPTION 'ratings may only be written on a closed match';
	END IF;
	IF TG_OP = 'DELETE' THEN
		RETURN OLD;
	END IF;
	RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "match_rating_mutation_guard"
BEFORE INSERT OR UPDATE OR DELETE ON "match_rating"
FOR EACH ROW EXECUTE FUNCTION "hay_fulbo_guard_rating_mutation"();