CREATE TABLE "match_absence" (
	"group_id" text NOT NULL,
	"match_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"joined_order" integer NOT NULL,
	"owes_contribution" boolean DEFAULT false NOT NULL,
	"expected_minor" bigint DEFAULT 0 NOT NULL,
	"paid_minor" bigint DEFAULT 0 NOT NULL,
	"paid_updated_at" timestamp with time zone,
	"paid_updated_by_user_id" text,
	"marked_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "match_absence_pk" PRIMARY KEY("group_id","match_id","player_id"),
	CONSTRAINT "match_absence_group_match_joined_order_unique" UNIQUE("group_id","match_id","joined_order"),
	CONSTRAINT "match_absence_joined_order_positive" CHECK ("match_absence"."joined_order" > 0),
	CONSTRAINT "match_absence_expected_minor_nonnegative" CHECK ("match_absence"."expected_minor" >= 0),
	CONSTRAINT "match_absence_paid_minor_nonnegative" CHECK ("match_absence"."paid_minor" >= 0)
);
--> statement-breakpoint
ALTER TABLE "match_absence" ADD CONSTRAINT "match_absence_paid_updated_by_user_id_user_id_fk" FOREIGN KEY ("paid_updated_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_absence" ADD CONSTRAINT "match_absence_marked_by_user_id_user_id_fk" FOREIGN KEY ("marked_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_absence" ADD CONSTRAINT "match_absence_group_match_fk" FOREIGN KEY ("group_id","match_id") REFERENCES "public"."match"("group_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_absence" ADD CONSTRAINT "match_absence_group_player_fk" FOREIGN KEY ("group_id","player_id") REFERENCES "public"."player"("group_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "match_absence_group_player_idx" ON "match_absence" USING btree ("group_id","player_id");