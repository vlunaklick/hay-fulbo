import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  customType,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { organization, user } from "./auth";

const instant = (name: string) => timestamp(name, { withTimezone: true });
const updatedInstant = () =>
  instant("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull();
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => "bytea",
});

export const matchStatus = pgEnum("match_status", ["open", "closed", "cancelled"]);
export const expectedAmountKind = pgEnum("expected_amount_kind", ["automatic", "fixed"]);
export const sharedLinkAction = pgEnum("shared_link_action", ["created", "rotated", "revoked"]);

export const player = pgTable(
  "player",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: text("group_id")
      .notNull()
      .references(() => organization.id, { onDelete: "restrict" }),
    displayName: text("display_name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    linkedUserId: text("linked_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    archivedAt: instant("archived_at"),
    createdAt: instant("created_at").defaultNow().notNull(),
    updatedAt: updatedInstant(),
  },
  (table) => [
    unique("player_group_id_id_unique").on(table.groupId, table.id),
    unique("player_group_linked_user_unique").on(table.groupId, table.linkedUserId),
    check("player_display_name_nonempty", sql`btrim(${table.displayName}) <> ''`),
    check("player_normalized_name_nonempty", sql`btrim(${table.normalizedName}) <> ''`),
    index("player_group_archived_name_idx").on(
      table.groupId,
      table.archivedAt,
      table.normalizedName,
    ),
  ],
);

export const court = pgTable(
  "court",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: text("group_id")
      .notNull()
      .references(() => organization.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    address: text("address").notNull(),
    mapsUrl: text("maps_url").notNull(),
    archivedAt: instant("archived_at"),
    createdAt: instant("created_at").defaultNow().notNull(),
    updatedAt: updatedInstant(),
  },
  (table) => [
    unique("court_group_id_id_unique").on(table.groupId, table.id),
    check("court_name_nonempty", sql`btrim(${table.name}) <> ''`),
    check("court_normalized_name_nonempty", sql`btrim(${table.normalizedName}) <> ''`),
    check("court_address_nonempty", sql`btrim(${table.address}) <> ''`),
    check("court_maps_url_nonempty", sql`btrim(${table.mapsUrl}) <> ''`),
    index("court_group_archived_name_idx").on(
      table.groupId,
      table.archivedAt,
      table.normalizedName,
    ),
  ],
);

export const match = pgTable(
  "match",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: text("group_id")
      .notNull()
      .references(() => organization.id, { onDelete: "restrict" }),
    organizerUserId: text("organizer_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    courtId: uuid("court_id"),
    scheduledAt: instant("scheduled_at").notNull(),
    courtCostMinor: bigint("court_cost_minor", { mode: "bigint" }),
    status: matchStatus("status").default("open").notNull(),
    lockVersion: integer("lock_version").default(0).notNull(),
    createdAt: instant("created_at").defaultNow().notNull(),
    updatedAt: updatedInstant(),
  },
  (table) => [
    unique("match_group_id_id_unique").on(table.groupId, table.id),
    foreignKey({
      name: "match_group_court_fk",
      columns: [table.groupId, table.courtId],
      foreignColumns: [court.groupId, court.id],
    }).onDelete("restrict"),
    check(
      "match_court_cost_minor_nonnegative",
      sql`${table.courtCostMinor} is null or ${table.courtCostMinor} >= 0`,
    ),
    check("match_lock_version_nonnegative", sql`${table.lockVersion} >= 0`),
    index("match_group_closed_scheduled_idx")
      .on(table.groupId, table.scheduledAt.desc())
      .where(sql`${table.status} = 'closed'`),
    index("match_group_court_status_scheduled_idx").on(
      table.groupId,
      table.courtId,
      table.status,
      table.scheduledAt,
    ),
  ],
);

export const matchTeam = pgTable(
  "match_team",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: text("group_id").notNull(),
    matchId: uuid("match_id").notNull(),
    slot: smallint("slot").notNull(),
    displayName: text("display_name").notNull(),
    color: text("color"),
    captainUserId: text("captain_user_id").references(() => user.id, {
      onDelete: "restrict",
    }),
    unattributedGoals: integer("unattributed_goals").default(0).notNull(),
    createdAt: instant("created_at").defaultNow().notNull(),
    updatedAt: updatedInstant(),
  },
  (table) => [
    foreignKey({
      name: "match_team_group_match_fk",
      columns: [table.groupId, table.matchId],
      foreignColumns: [match.groupId, match.id],
    }).onDelete("cascade"),
    unique("match_team_group_match_id_unique").on(table.groupId, table.matchId, table.id),
    unique("match_team_group_match_slot_unique").on(table.groupId, table.matchId, table.slot),
    check("match_team_slot_allowed", sql`${table.slot} in (1, 2)`),
    check("match_team_display_name_nonempty", sql`btrim(${table.displayName}) <> ''`),
    check("match_team_unattributed_goals_nonnegative", sql`${table.unattributedGoals} >= 0`),
  ],
);

export const matchAppearance = pgTable(
  "match_appearance",
  {
    groupId: text("group_id").notNull(),
    matchId: uuid("match_id").notNull(),
    playerId: uuid("player_id").notNull(),
    teamId: uuid("team_id").notNull(),
    joinedOrder: integer("joined_order").notNull(),
    goals: integer("goals").default(0).notNull(),
    assists: integer("assists").default(0).notNull(),
    ownGoals: integer("own_goals").default(0).notNull(),
    expectedKind: expectedAmountKind("expected_kind").default("automatic").notNull(),
    expectedMinor: bigint("expected_minor", { mode: "bigint" })
      .default(sql`0`)
      .notNull(),
    paidMinor: bigint("paid_minor", { mode: "bigint" })
      .default(sql`0`)
      .notNull(),
    paidUpdatedAt: instant("paid_updated_at"),
    paidUpdatedByUserId: text("paid_updated_by_user_id").references(() => user.id, {
      onDelete: "restrict",
    }),
    createdAt: instant("created_at").defaultNow().notNull(),
    updatedAt: updatedInstant(),
  },
  (table) => [
    primaryKey({
      name: "match_appearance_pk",
      columns: [table.groupId, table.matchId, table.playerId],
    }),
    foreignKey({
      name: "match_appearance_group_match_fk",
      columns: [table.groupId, table.matchId],
      foreignColumns: [match.groupId, match.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "match_appearance_group_player_fk",
      columns: [table.groupId, table.playerId],
      foreignColumns: [player.groupId, player.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "match_appearance_group_match_team_fk",
      columns: [table.groupId, table.matchId, table.teamId],
      foreignColumns: [matchTeam.groupId, matchTeam.matchId, matchTeam.id],
    }).onDelete("cascade"),
    unique("match_appearance_group_match_joined_order_unique").on(
      table.groupId,
      table.matchId,
      table.joinedOrder,
    ),
    check("match_appearance_joined_order_positive", sql`${table.joinedOrder} > 0`),
    check("match_appearance_goals_nonnegative", sql`${table.goals} >= 0`),
    check("match_appearance_assists_nonnegative", sql`${table.assists} >= 0`),
    check("match_appearance_own_goals_nonnegative", sql`${table.ownGoals} >= 0`),
    check("match_appearance_expected_minor_nonnegative", sql`${table.expectedMinor} >= 0`),
    check("match_appearance_paid_minor_nonnegative", sql`${table.paidMinor} >= 0`),
    index("match_appearance_group_player_match_idx").on(
      table.groupId,
      table.playerId,
      table.matchId,
    ),
    index("match_appearance_group_match_team_idx").on(table.groupId, table.matchId, table.teamId),
  ],
);

export const matchTransition = pgTable(
  "match_transition",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: text("group_id").notNull(),
    matchId: uuid("match_id").notNull(),
    sequence: integer("sequence").notNull(),
    fromStatus: matchStatus("from_status"),
    toStatus: matchStatus("to_status").notNull(),
    actorUserId: text("actor_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    reason: text("reason"),
    occurredAt: instant("occurred_at").defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      name: "match_transition_group_match_fk",
      columns: [table.groupId, table.matchId],
      foreignColumns: [match.groupId, match.id],
    }).onDelete("cascade"),
    unique("match_transition_group_match_sequence_unique").on(
      table.groupId,
      table.matchId,
      table.sequence,
    ),
    check("match_transition_sequence_positive", sql`${table.sequence} > 0`),
    check(
      "match_transition_allowed",
      sql`(
        (${table.fromStatus} is null and ${table.toStatus} = 'open')
        or (${table.fromStatus} = 'open' and ${table.toStatus} in ('closed', 'cancelled'))
        or (${table.fromStatus} in ('closed', 'cancelled') and ${table.toStatus} = 'open')
      )`,
    ),
    check(
      "match_transition_reason_required",
      sql`(
        (${table.fromStatus} is null and ${table.toStatus} = 'open')
        or (${table.fromStatus} = 'open' and ${table.toStatus} = 'closed')
        or (${table.reason} is not null and btrim(${table.reason}) <> '')
      )`,
    ),
    index("match_transition_group_match_occurred_idx").on(
      table.groupId,
      table.matchId,
      table.occurredAt.desc(),
    ),
  ],
);

export const matchOrganizerTransfer = pgTable(
  "match_organizer_transfer",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: text("group_id").notNull(),
    matchId: uuid("match_id").notNull(),
    previousUserId: text("previous_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    nextUserId: text("next_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    actorUserId: text("actor_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    reason: text("reason").notNull(),
    occurredAt: instant("occurred_at").defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      name: "match_organizer_transfer_group_match_fk",
      columns: [table.groupId, table.matchId],
      foreignColumns: [match.groupId, match.id],
    }).onDelete("cascade"),
    check(
      "match_organizer_transfer_users_different",
      sql`${table.previousUserId} <> ${table.nextUserId}`,
    ),
    check("match_organizer_transfer_reason_nonempty", sql`btrim(${table.reason}) <> ''`),
  ],
);

export const groupSharedLink = pgTable(
  "group_shared_link",
  {
    groupId: text("group_id")
      .primaryKey()
      .references(() => organization.id, { onDelete: "cascade" }),
    tokenHash: bytea("token_hash").notNull(),
    generation: integer("generation").notNull(),
    issuedAt: instant("issued_at").defaultNow().notNull(),
    issuedByUserId: text("issued_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
  },
  (table) => [
    unique("group_shared_link_token_hash_unique").on(table.tokenHash),
    check("group_shared_link_token_hash_32_bytes", sql`octet_length(${table.tokenHash}) = 32`),
    check("group_shared_link_generation_positive", sql`${table.generation} > 0`),
  ],
);

export const groupSharedLinkEvent = pgTable(
  "group_shared_link_event",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: text("group_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    generation: integer("generation").notNull(),
    action: sharedLinkAction("action").notNull(),
    actorUserId: text("actor_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    occurredAt: instant("occurred_at").defaultNow().notNull(),
  },
  (table) => [
    check("group_shared_link_event_generation_positive", sql`${table.generation} > 0`),
    unique("group_shared_link_event_group_generation_action_unique").on(
      table.groupId,
      table.generation,
      table.action,
    ),
  ],
);

export const historyImport = pgTable(
  "history_import",
  {
    source: text("source").notNull(),
    externalKey: text("external_key").notNull(),
    payloadHash: bytea("payload_hash").notNull(),
    groupId: text("group_id").notNull(),
    matchId: uuid("match_id").notNull(),
    importedAt: instant("imported_at").defaultNow().notNull(),
  },
  (table) => [
    primaryKey({
      name: "history_import_pk",
      columns: [table.groupId, table.source, table.externalKey],
    }),
    foreignKey({
      name: "history_import_group_match_fk",
      columns: [table.groupId, table.matchId],
      foreignColumns: [match.groupId, match.id],
    }).onDelete("restrict"),
    unique("history_import_group_match_unique").on(table.groupId, table.matchId),
    check("history_import_source_nonempty", sql`btrim(${table.source}) <> ''`),
    check("history_import_external_key_nonempty", sql`btrim(${table.externalKey}) <> ''`),
    check("history_import_payload_hash_32_bytes", sql`octet_length(${table.payloadHash}) = 32`),
  ],
);
