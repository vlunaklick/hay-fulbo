CREATE TYPE "public"."rsvp_response" AS ENUM('yes', 'maybe', 'no');--> statement-breakpoint
CREATE TABLE "match_rsvp" (
	"group_id" text NOT NULL,
	"match_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"response" "rsvp_response" NOT NULL,
	"responded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "match_rsvp_pk" PRIMARY KEY("group_id","match_id","player_id")
);
--> statement-breakpoint
ALTER TABLE "match" ADD COLUMN "capacity" integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "match_rsvp" ADD CONSTRAINT "match_rsvp_group_match_fk" FOREIGN KEY ("group_id","match_id") REFERENCES "public"."match"("group_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_rsvp" ADD CONSTRAINT "match_rsvp_group_player_fk" FOREIGN KEY ("group_id","player_id") REFERENCES "public"."player"("group_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "match_rsvp_group_match_response_idx" ON "match_rsvp" USING btree ("group_id","match_id","response","responded_at");--> statement-breakpoint
ALTER TABLE "match" ADD CONSTRAINT "match_capacity_allowed" CHECK ("match"."capacity" between 2 and 40);--> statement-breakpoint
ALTER TABLE "match_rsvp" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "match_rsvp" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "match_rsvp_group_scope" ON "match_rsvp"
	USING ("group_id" = nullif(current_setting('app.group_id', true), ''))
	WITH CHECK ("group_id" = nullif(current_setting('app.group_id', true), ''));
