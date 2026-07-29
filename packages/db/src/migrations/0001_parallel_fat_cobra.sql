CREATE TABLE "history_import" (
	"source" text NOT NULL,
	"external_key" text NOT NULL,
	"payload_hash" "bytea" NOT NULL,
	"group_id" text NOT NULL,
	"match_id" uuid NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "history_import_pk" PRIMARY KEY("group_id","source","external_key"),
	CONSTRAINT "history_import_group_match_unique" UNIQUE("group_id","match_id"),
	CONSTRAINT "history_import_source_nonempty" CHECK (btrim("history_import"."source") <> ''),
	CONSTRAINT "history_import_external_key_nonempty" CHECK (btrim("history_import"."external_key") <> ''),
	CONSTRAINT "history_import_payload_hash_32_bytes" CHECK (octet_length("history_import"."payload_hash") = 32)
);
--> statement-breakpoint
ALTER TABLE "history_import" ADD CONSTRAINT "history_import_group_match_fk" FOREIGN KEY ("group_id","match_id") REFERENCES "public"."match"("group_id","id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "history_import" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "history_import" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "history_import_group_scope" ON "history_import"
USING ("group_id" = nullif(current_setting('app.group_id', true), ''))
WITH CHECK ("group_id" = nullif(current_setting('app.group_id', true), ''));--> statement-breakpoint
CREATE TRIGGER "history_import_append_only"
BEFORE UPDATE OR DELETE ON "history_import"
FOR EACH ROW EXECUTE FUNCTION "hay_fulbo_reject_audit_mutation"();
