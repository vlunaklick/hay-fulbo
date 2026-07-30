CREATE TABLE "group_join_link" (
	"group_id" text PRIMARY KEY NOT NULL,
	"generation" integer NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"issued_by_user_id" text NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "group_join_link_generation_positive" CHECK ("group_join_link"."generation" > 0)
);
--> statement-breakpoint
ALTER TABLE "group_join_link" ADD CONSTRAINT "group_join_link_group_id_organization_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_join_link" ADD CONSTRAINT "group_join_link_issued_by_user_id_user_id_fk" FOREIGN KEY ("issued_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;