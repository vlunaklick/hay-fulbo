ALTER TABLE "invitation" DROP CONSTRAINT "invitation_role_allowed";--> statement-breakpoint
ALTER TABLE "member" DROP CONSTRAINT "member_role_allowed";--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_role_allowed" CHECK ("invitation"."role" in ('owner', 'leader', 'member'));--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_role_allowed" CHECK ("member"."role" in ('owner', 'leader', 'member'));