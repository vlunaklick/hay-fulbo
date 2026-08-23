ALTER TABLE "match_rsvp" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "match_rsvp" CASCADE;--> statement-breakpoint
ALTER TABLE "match" DROP CONSTRAINT "match_capacity_allowed";--> statement-breakpoint
ALTER TABLE "match_transition" DROP CONSTRAINT "match_transition_reason_required";--> statement-breakpoint
ALTER TABLE "match_team" DROP CONSTRAINT "match_team_captain_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "match" DROP COLUMN "capacity";--> statement-breakpoint
ALTER TABLE "match_appearance" DROP COLUMN "expected_kind";--> statement-breakpoint
ALTER TABLE "match_team" DROP COLUMN "color";--> statement-breakpoint
ALTER TABLE "match_team" DROP COLUMN "captain_user_id";--> statement-breakpoint
DROP TYPE "public"."expected_amount_kind";--> statement-breakpoint
DROP TYPE "public"."rsvp_response";