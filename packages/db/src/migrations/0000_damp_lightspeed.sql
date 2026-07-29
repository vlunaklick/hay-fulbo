CREATE TYPE "public"."expected_amount_kind" AS ENUM('automatic', 'fixed');--> statement-breakpoint
CREATE TYPE "public"."match_status" AS ENUM('open', 'closed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."shared_link_action" AS ENUM('created', 'rotated', 'revoked');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"inviter_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invitation_role_allowed" CHECK ("invitation"."role" in ('owner', 'member')),
	CONSTRAINT "invitation_status_allowed" CHECK ("invitation"."status" in ('pending', 'accepted', 'rejected', 'canceled'))
);
--> statement-breakpoint
CREATE TABLE "member" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "member_organization_user_unique" UNIQUE("organization_id","user_id"),
	CONSTRAINT "member_role_allowed" CHECK ("member"."role" in ('owner', 'member'))
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo" text,
	"metadata" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"currency_code" varchar(3) DEFAULT 'ARS' NOT NULL,
	"time_zone" text DEFAULT 'America/Argentina/Buenos_Aires' NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "organization_slug_unique" UNIQUE("slug"),
	CONSTRAINT "organization_currency_code_iso_shape" CHECK ("organization"."currency_code" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"active_organization_id" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "court" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" text NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"address" text NOT NULL,
	"maps_url" text NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "court_group_id_id_unique" UNIQUE("group_id","id"),
	CONSTRAINT "court_name_nonempty" CHECK (btrim("court"."name") <> ''),
	CONSTRAINT "court_normalized_name_nonempty" CHECK (btrim("court"."normalized_name") <> ''),
	CONSTRAINT "court_address_nonempty" CHECK (btrim("court"."address") <> ''),
	CONSTRAINT "court_maps_url_nonempty" CHECK (btrim("court"."maps_url") <> '')
);
--> statement-breakpoint
CREATE TABLE "group_shared_link" (
	"group_id" text PRIMARY KEY NOT NULL,
	"token_hash" "bytea" NOT NULL,
	"generation" integer NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"issued_by_user_id" text NOT NULL,
	CONSTRAINT "group_shared_link_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "group_shared_link_token_hash_32_bytes" CHECK (octet_length("group_shared_link"."token_hash") = 32),
	CONSTRAINT "group_shared_link_generation_positive" CHECK ("group_shared_link"."generation" > 0)
);
--> statement-breakpoint
CREATE TABLE "group_shared_link_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" text NOT NULL,
	"generation" integer NOT NULL,
	"action" "shared_link_action" NOT NULL,
	"actor_user_id" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "group_shared_link_event_group_generation_action_unique" UNIQUE("group_id","generation","action"),
	CONSTRAINT "group_shared_link_event_generation_positive" CHECK ("group_shared_link_event"."generation" > 0)
);
--> statement-breakpoint
CREATE TABLE "match" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" text NOT NULL,
	"organizer_user_id" text NOT NULL,
	"court_id" uuid,
	"scheduled_at" timestamp with time zone NOT NULL,
	"court_cost_minor" bigint,
	"status" "match_status" DEFAULT 'open' NOT NULL,
	"lock_version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "match_group_id_id_unique" UNIQUE("group_id","id"),
	CONSTRAINT "match_court_cost_minor_nonnegative" CHECK ("match"."court_cost_minor" is null or "match"."court_cost_minor" >= 0),
	CONSTRAINT "match_lock_version_nonnegative" CHECK ("match"."lock_version" >= 0)
);
--> statement-breakpoint
CREATE TABLE "match_appearance" (
	"group_id" text NOT NULL,
	"match_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"joined_order" integer NOT NULL,
	"goals" integer DEFAULT 0 NOT NULL,
	"assists" integer DEFAULT 0 NOT NULL,
	"own_goals" integer DEFAULT 0 NOT NULL,
	"expected_kind" "expected_amount_kind" DEFAULT 'automatic' NOT NULL,
	"expected_minor" bigint DEFAULT 0 NOT NULL,
	"paid_minor" bigint DEFAULT 0 NOT NULL,
	"paid_updated_at" timestamp with time zone,
	"paid_updated_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "match_appearance_pk" PRIMARY KEY("group_id","match_id","player_id"),
	CONSTRAINT "match_appearance_group_match_joined_order_unique" UNIQUE("group_id","match_id","joined_order"),
	CONSTRAINT "match_appearance_joined_order_positive" CHECK ("match_appearance"."joined_order" > 0),
	CONSTRAINT "match_appearance_goals_nonnegative" CHECK ("match_appearance"."goals" >= 0),
	CONSTRAINT "match_appearance_assists_nonnegative" CHECK ("match_appearance"."assists" >= 0),
	CONSTRAINT "match_appearance_own_goals_nonnegative" CHECK ("match_appearance"."own_goals" >= 0),
	CONSTRAINT "match_appearance_expected_minor_nonnegative" CHECK ("match_appearance"."expected_minor" >= 0),
	CONSTRAINT "match_appearance_paid_minor_nonnegative" CHECK ("match_appearance"."paid_minor" >= 0)
);
--> statement-breakpoint
CREATE TABLE "match_organizer_transfer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" text NOT NULL,
	"match_id" uuid NOT NULL,
	"previous_user_id" text NOT NULL,
	"next_user_id" text NOT NULL,
	"actor_user_id" text NOT NULL,
	"reason" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "match_organizer_transfer_users_different" CHECK ("match_organizer_transfer"."previous_user_id" <> "match_organizer_transfer"."next_user_id"),
	CONSTRAINT "match_organizer_transfer_reason_nonempty" CHECK (btrim("match_organizer_transfer"."reason") <> '')
);
--> statement-breakpoint
CREATE TABLE "match_team" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" text NOT NULL,
	"match_id" uuid NOT NULL,
	"slot" smallint NOT NULL,
	"display_name" text NOT NULL,
	"color" text,
	"captain_user_id" text,
	"unattributed_goals" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "match_team_group_match_id_unique" UNIQUE("group_id","match_id","id"),
	CONSTRAINT "match_team_group_match_slot_unique" UNIQUE("group_id","match_id","slot"),
	CONSTRAINT "match_team_slot_allowed" CHECK ("match_team"."slot" in (1, 2)),
	CONSTRAINT "match_team_display_name_nonempty" CHECK (btrim("match_team"."display_name") <> ''),
	CONSTRAINT "match_team_unattributed_goals_nonnegative" CHECK ("match_team"."unattributed_goals" >= 0)
);
--> statement-breakpoint
CREATE TABLE "match_transition" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" text NOT NULL,
	"match_id" uuid NOT NULL,
	"sequence" integer NOT NULL,
	"from_status" "match_status",
	"to_status" "match_status" NOT NULL,
	"actor_user_id" text NOT NULL,
	"reason" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "match_transition_group_match_sequence_unique" UNIQUE("group_id","match_id","sequence"),
	CONSTRAINT "match_transition_sequence_positive" CHECK ("match_transition"."sequence" > 0),
	CONSTRAINT "match_transition_allowed" CHECK ((
        ("match_transition"."from_status" is null and "match_transition"."to_status" = 'open')
        or ("match_transition"."from_status" = 'open' and "match_transition"."to_status" in ('closed', 'cancelled'))
        or ("match_transition"."from_status" in ('closed', 'cancelled') and "match_transition"."to_status" = 'open')
      )),
	CONSTRAINT "match_transition_reason_required" CHECK ((
        ("match_transition"."from_status" is null and "match_transition"."to_status" = 'open')
        or ("match_transition"."from_status" = 'open' and "match_transition"."to_status" = 'closed')
        or ("match_transition"."reason" is not null and btrim("match_transition"."reason") <> '')
      ))
);
--> statement-breakpoint
CREATE TABLE "player" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" text NOT NULL,
	"display_name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"linked_user_id" text,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "player_group_id_id_unique" UNIQUE("group_id","id"),
	CONSTRAINT "player_group_linked_user_unique" UNIQUE("group_id","linked_user_id"),
	CONSTRAINT "player_display_name_nonempty" CHECK (btrim("player"."display_name") <> ''),
	CONSTRAINT "player_normalized_name_nonempty" CHECK (btrim("player"."normalized_name") <> '')
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviter_id_user_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "court" ADD CONSTRAINT "court_group_id_organization_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."organization"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_shared_link" ADD CONSTRAINT "group_shared_link_group_id_organization_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_shared_link" ADD CONSTRAINT "group_shared_link_issued_by_user_id_user_id_fk" FOREIGN KEY ("issued_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_shared_link_event" ADD CONSTRAINT "group_shared_link_event_group_id_organization_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_shared_link_event" ADD CONSTRAINT "group_shared_link_event_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match" ADD CONSTRAINT "match_group_id_organization_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."organization"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match" ADD CONSTRAINT "match_organizer_user_id_user_id_fk" FOREIGN KEY ("organizer_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match" ADD CONSTRAINT "match_group_court_fk" FOREIGN KEY ("group_id","court_id") REFERENCES "public"."court"("group_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_appearance" ADD CONSTRAINT "match_appearance_paid_updated_by_user_id_user_id_fk" FOREIGN KEY ("paid_updated_by_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_appearance" ADD CONSTRAINT "match_appearance_group_match_fk" FOREIGN KEY ("group_id","match_id") REFERENCES "public"."match"("group_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_appearance" ADD CONSTRAINT "match_appearance_group_player_fk" FOREIGN KEY ("group_id","player_id") REFERENCES "public"."player"("group_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_appearance" ADD CONSTRAINT "match_appearance_group_match_team_fk" FOREIGN KEY ("group_id","match_id","team_id") REFERENCES "public"."match_team"("group_id","match_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_organizer_transfer" ADD CONSTRAINT "match_organizer_transfer_previous_user_id_user_id_fk" FOREIGN KEY ("previous_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_organizer_transfer" ADD CONSTRAINT "match_organizer_transfer_next_user_id_user_id_fk" FOREIGN KEY ("next_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_organizer_transfer" ADD CONSTRAINT "match_organizer_transfer_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_organizer_transfer" ADD CONSTRAINT "match_organizer_transfer_group_match_fk" FOREIGN KEY ("group_id","match_id") REFERENCES "public"."match"("group_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_team" ADD CONSTRAINT "match_team_captain_user_id_user_id_fk" FOREIGN KEY ("captain_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_team" ADD CONSTRAINT "match_team_group_match_fk" FOREIGN KEY ("group_id","match_id") REFERENCES "public"."match"("group_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_transition" ADD CONSTRAINT "match_transition_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_transition" ADD CONSTRAINT "match_transition_group_match_fk" FOREIGN KEY ("group_id","match_id") REFERENCES "public"."match"("group_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player" ADD CONSTRAINT "player_group_id_organization_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."organization"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player" ADD CONSTRAINT "player_linked_user_id_user_id_fk" FOREIGN KEY ("linked_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "invitation_organization_id_idx" ON "invitation" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "invitation_email_idx" ON "invitation" USING btree ("email");--> statement-breakpoint
CREATE INDEX "member_user_id_idx" ON "member" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "member_organization_id_idx" ON "member" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "court_group_archived_name_idx" ON "court" USING btree ("group_id","archived_at","normalized_name");--> statement-breakpoint
CREATE INDEX "match_group_closed_scheduled_idx" ON "match" USING btree ("group_id","scheduled_at" DESC NULLS LAST) WHERE "match"."status" = 'closed';--> statement-breakpoint
CREATE INDEX "match_group_court_status_scheduled_idx" ON "match" USING btree ("group_id","court_id","status","scheduled_at");--> statement-breakpoint
CREATE INDEX "match_appearance_group_player_match_idx" ON "match_appearance" USING btree ("group_id","player_id","match_id");--> statement-breakpoint
CREATE INDEX "match_appearance_group_match_team_idx" ON "match_appearance" USING btree ("group_id","match_id","team_id");--> statement-breakpoint
CREATE INDEX "match_transition_group_match_occurred_idx" ON "match_transition" USING btree ("group_id","match_id","occurred_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "player_group_archived_name_idx" ON "player" USING btree ("group_id","archived_at","normalized_name");
--> statement-breakpoint
ALTER TABLE "player" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "player" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "player_group_scope" ON "player"
	USING ("group_id" = nullif(current_setting('app.group_id', true), ''))
	WITH CHECK ("group_id" = nullif(current_setting('app.group_id', true), ''));
--> statement-breakpoint
ALTER TABLE "court" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "court" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "court_group_scope" ON "court"
	USING ("group_id" = nullif(current_setting('app.group_id', true), ''))
	WITH CHECK ("group_id" = nullif(current_setting('app.group_id', true), ''));
--> statement-breakpoint
ALTER TABLE "match" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "match" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "match_group_scope" ON "match"
	USING ("group_id" = nullif(current_setting('app.group_id', true), ''))
	WITH CHECK ("group_id" = nullif(current_setting('app.group_id', true), ''));
--> statement-breakpoint
ALTER TABLE "match_team" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "match_team" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "match_team_group_scope" ON "match_team"
	USING ("group_id" = nullif(current_setting('app.group_id', true), ''))
	WITH CHECK ("group_id" = nullif(current_setting('app.group_id', true), ''));
--> statement-breakpoint
ALTER TABLE "match_appearance" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "match_appearance" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "match_appearance_group_scope" ON "match_appearance"
	USING ("group_id" = nullif(current_setting('app.group_id', true), ''))
	WITH CHECK ("group_id" = nullif(current_setting('app.group_id', true), ''));
--> statement-breakpoint
ALTER TABLE "match_transition" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "match_transition" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "match_transition_group_scope" ON "match_transition"
	USING ("group_id" = nullif(current_setting('app.group_id', true), ''))
	WITH CHECK ("group_id" = nullif(current_setting('app.group_id', true), ''));
--> statement-breakpoint
ALTER TABLE "match_organizer_transfer" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "match_organizer_transfer" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "match_organizer_transfer_group_scope" ON "match_organizer_transfer"
	USING ("group_id" = nullif(current_setting('app.group_id', true), ''))
	WITH CHECK ("group_id" = nullif(current_setting('app.group_id', true), ''));
--> statement-breakpoint
ALTER TABLE "group_shared_link" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "group_shared_link" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "group_shared_link_group_scope" ON "group_shared_link"
	USING ("group_id" = nullif(current_setting('app.group_id', true), ''))
	WITH CHECK ("group_id" = nullif(current_setting('app.group_id', true), ''));
--> statement-breakpoint
ALTER TABLE "group_shared_link_event" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "group_shared_link_event" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "group_shared_link_event_group_scope" ON "group_shared_link_event"
	USING ("group_id" = nullif(current_setting('app.group_id', true), ''))
	WITH CHECK ("group_id" = nullif(current_setting('app.group_id', true), ''));
--> statement-breakpoint
CREATE FUNCTION "hay_fulbo_guard_match_closure"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
	IF OLD.status IS DISTINCT FROM NEW.status THEN
		IF NOT (
			(OLD.status = 'open' AND NEW.status IN ('closed', 'cancelled'))
			OR (OLD.status IN ('closed', 'cancelled') AND NEW.status = 'open')
		) THEN
			RAISE EXCEPTION 'invalid match status transition: % -> %', OLD.status, NEW.status;
		END IF;
	END IF;

	IF OLD.status IN ('closed', 'cancelled') AND (
		OLD.group_id IS DISTINCT FROM NEW.group_id
		OR OLD.court_id IS DISTINCT FROM NEW.court_id
		OR OLD.scheduled_at IS DISTINCT FROM NEW.scheduled_at
		OR OLD.court_cost_minor IS DISTINCT FROM NEW.court_cost_minor
	) THEN
		RAISE EXCEPTION 'closed or cancelled match fields are immutable';
	END IF;

	IF OLD.status = 'open' AND NEW.status = 'closed' THEN
		PERFORM 1
		FROM public.match_team
		WHERE group_id = NEW.group_id AND match_id = NEW.id
		FOR UPDATE;

		PERFORM 1
		FROM public.match_appearance
		WHERE group_id = NEW.group_id AND match_id = NEW.id
		FOR UPDATE;

		IF NEW.scheduled_at > clock_timestamp() THEN
			RAISE EXCEPTION 'match has not started';
		END IF;
		IF NEW.court_id IS NULL OR NEW.court_cost_minor IS NULL THEN
			RAISE EXCEPTION 'court and court cost are required';
		END IF;
		IF (
			SELECT count(*) <> 2
				OR count(*) FILTER (WHERE slot = 1) <> 1
				OR count(*) FILTER (WHERE slot = 2) <> 1
			FROM public.match_team
			WHERE group_id = NEW.group_id AND match_id = NEW.id
		) THEN
			RAISE EXCEPTION 'match must have exactly team slots 1 and 2';
		END IF;
		IF EXISTS (
			SELECT 1
			FROM public.match_team AS team
			WHERE team.group_id = NEW.group_id
				AND team.match_id = NEW.id
				AND NOT EXISTS (
					SELECT 1
					FROM public.match_appearance AS appearance
					WHERE appearance.group_id = team.group_id
						AND appearance.match_id = team.match_id
						AND appearance.team_id = team.id
				)
		) THEN
			RAISE EXCEPTION 'each team must have at least one player';
		END IF;
		IF (
			SELECT coalesce(sum(expected_minor), 0) <> NEW.court_cost_minor
			FROM public.match_appearance
			WHERE group_id = NEW.group_id AND match_id = NEW.id
		) THEN
			RAISE EXCEPTION 'expected contributions must equal court cost';
		END IF;
		IF EXISTS (
			SELECT 1
			FROM public.match_team AS team
			WHERE team.group_id = NEW.group_id
				AND team.match_id = NEW.id
				AND (
					SELECT coalesce(sum(appearance.assists), 0)
					FROM public.match_appearance AS appearance
					WHERE appearance.group_id = team.group_id
						AND appearance.match_id = team.match_id
						AND appearance.team_id = team.id
				) > team.unattributed_goals + (
					SELECT coalesce(sum(appearance.goals), 0)
					FROM public.match_appearance AS appearance
					WHERE appearance.group_id = team.group_id
						AND appearance.match_id = team.match_id
						AND appearance.team_id = team.id
				)
		) THEN
			RAISE EXCEPTION 'assists exceed attributed goals';
		END IF;
	END IF;

	RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "match_closure_guard"
BEFORE UPDATE ON "match"
FOR EACH ROW EXECUTE FUNCTION "hay_fulbo_guard_match_closure"();
--> statement-breakpoint
CREATE FUNCTION "hay_fulbo_guard_match_child_mutation"()
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

	IF parent_status IS NOT NULL AND parent_status <> 'open' THEN
		RAISE EXCEPTION 'teams on closed or cancelled matches are immutable';
	END IF;
	IF TG_OP = 'DELETE' THEN
		RETURN OLD;
	END IF;
	RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "match_team_mutation_guard"
BEFORE INSERT OR UPDATE OR DELETE ON "match_team"
FOR EACH ROW EXECUTE FUNCTION "hay_fulbo_guard_match_child_mutation"();
--> statement-breakpoint
CREATE FUNCTION "hay_fulbo_guard_appearance_mutation"()
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
			OR OLD.expected_kind IS DISTINCT FROM NEW.expected_kind
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
--> statement-breakpoint
CREATE TRIGGER "match_appearance_mutation_guard"
BEFORE INSERT OR UPDATE OR DELETE ON "match_appearance"
FOR EACH ROW EXECUTE FUNCTION "hay_fulbo_guard_appearance_mutation"();
--> statement-breakpoint
CREATE FUNCTION "hay_fulbo_require_two_teams"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
	row_group_id text;
	row_match_id uuid;
BEGIN
	IF TG_TABLE_NAME = 'match' THEN
		row_group_id := NEW.group_id;
		row_match_id := NEW.id;
	ELSIF TG_OP = 'DELETE' THEN
		row_group_id := OLD.group_id;
		row_match_id := OLD.match_id;
	ELSE
		row_group_id := NEW.group_id;
		row_match_id := NEW.match_id;
	END IF;

	IF EXISTS (
		SELECT 1 FROM public.match
		WHERE group_id = row_group_id AND id = row_match_id
	) AND (
		SELECT count(*) <> 2
			OR count(*) FILTER (WHERE slot = 1) <> 1
			OR count(*) FILTER (WHERE slot = 2) <> 1
		FROM public.match_team
		WHERE group_id = row_group_id AND match_id = row_match_id
	) THEN
		RAISE EXCEPTION 'a match must keep exactly team slots 1 and 2';
	END IF;
	IF TG_OP = 'DELETE' THEN
		RETURN OLD;
	END IF;
	RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "match_team_pair_on_match_guard"
AFTER INSERT OR UPDATE ON "match"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "hay_fulbo_require_two_teams"();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "match_team_pair_guard"
AFTER INSERT OR UPDATE OR DELETE ON "match_team"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "hay_fulbo_require_two_teams"();
--> statement-breakpoint
CREATE FUNCTION "hay_fulbo_reject_audit_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
	RAISE EXCEPTION 'audit rows are append-only';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "match_transition_append_only"
BEFORE UPDATE OR DELETE ON "match_transition"
FOR EACH ROW EXECUTE FUNCTION "hay_fulbo_reject_audit_mutation"();
--> statement-breakpoint
CREATE TRIGGER "match_organizer_transfer_append_only"
BEFORE UPDATE OR DELETE ON "match_organizer_transfer"
FOR EACH ROW EXECUTE FUNCTION "hay_fulbo_reject_audit_mutation"();
--> statement-breakpoint
CREATE TRIGGER "group_shared_link_event_append_only"
BEFORE UPDATE OR DELETE ON "group_shared_link_event"
FOR EACH ROW EXECUTE FUNCTION "hay_fulbo_reject_audit_mutation"();
--> statement-breakpoint
CREATE FUNCTION "hay_fulbo_guard_group_settings"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
	IF (
		OLD.currency_code IS DISTINCT FROM NEW.currency_code
		OR OLD.time_zone IS DISTINCT FROM NEW.time_zone
	) AND EXISTS (
		SELECT 1 FROM public.match WHERE group_id = OLD.id
	) THEN
		RAISE EXCEPTION 'currency and time zone cannot change after the first match';
	END IF;
	RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "organization_settings_guard"
BEFORE UPDATE ON "organization"
FOR EACH ROW EXECUTE FUNCTION "hay_fulbo_guard_group_settings"();
--> statement-breakpoint
CREATE FUNCTION "hay_fulbo_resolve_shared_group"(candidate_hash bytea)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
	SELECT link.group_id
	FROM public.group_shared_link AS link
	JOIN public.organization AS organization ON organization.id = link.group_id
	WHERE link.token_hash = candidate_hash
		AND organization.archived_at IS NULL
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "hay_fulbo_resolve_shared_group"(bytea) FROM PUBLIC;
--> statement-breakpoint
COMMENT ON FUNCTION "hay_fulbo_resolve_shared_group"(bytea) IS
	'Provisioning must grant EXECUTE only to the non-owner, non-BYPASSRLS runtime role';
