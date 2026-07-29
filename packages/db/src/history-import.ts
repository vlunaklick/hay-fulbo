import { createHash } from "node:crypto";

import { z } from "zod";
import { Pool, type PoolClient, type QueryResultRow } from "pg";

import { calculateExpectedContributions } from "./matches/rules";

const money = z.number().int().nonnegative().safe();
const sportingTotal = z.number().int().nonnegative();

const historyPlayerSchema = z
  .object({
    displayName: z.string().trim().min(1),
    goals: sportingTotal.default(0),
    assists: sportingTotal.default(0),
    ownGoals: sportingTotal.default(0),
    expectedMinor: money.optional(),
    paidMinor: money.optional(),
    paid: z.boolean().optional(),
  })
  .strict()
  .refine((value) => value.paidMinor === undefined || value.paid === undefined, {
    message: "paid and paidMinor are mutually exclusive",
  });

const historyTeamSchema = z
  .object({
    displayName: z.string().trim().min(1),
    color: z.string().trim().min(1).nullable().optional(),
    unattributedGoals: sportingTotal.default(0),
    players: z.array(historyPlayerSchema).min(1),
  })
  .strict();

const historyMatchSchema = z
  .object({
    externalKey: z.string().trim().min(1),
    scheduledAt: z.iso.datetime({ offset: true }),
    courtCostMinor: money,
    teams: z.tuple([historyTeamSchema, historyTeamSchema]),
  })
  .strict()
  .superRefine((value, context) => {
    const normalized = value.teams.flatMap((team) =>
      team.players.map((item) => normalizeHistoryName(item.displayName)),
    );
    if (new Set(normalized).size !== normalized.length) {
      context.addIssue({
        code: "custom",
        message: "a player may appear only once per match",
        path: ["teams"],
      });
    }

    value.teams.forEach((team, index) => {
      const attributedGoals =
        team.unattributedGoals + team.players.reduce((sum, player) => sum + player.goals, 0);
      const assists = team.players.reduce((sum, player) => sum + player.assists, 0);
      if (assists > attributedGoals) {
        context.addIssue({
          code: "custom",
          message: "assists exceed attributed goals",
          path: ["teams", index],
        });
      }
    });
  });

export const historyImportPayloadSchema = z
  .object({
    source: z.string().trim().min(1),
    groupName: z.string().trim().min(1),
    court: z
      .object({
        name: z.string().trim().min(1),
        address: z.string().trim().min(1),
        mapsUrl: z.url().refine((value) => /^https?:\/\//i.test(value), {
          message: "mapsUrl must use http or https",
        }),
      })
      .strict(),
    players: z.array(z.string().trim().min(1)).min(1),
    matches: z.array(historyMatchSchema).min(1),
  })
  .strict()
  .superRefine((value, context) => {
    const keys = value.matches.map((match) => match.externalKey);
    if (new Set(keys).size !== keys.length) {
      context.addIssue({
        code: "custom",
        message: "externalKey values must be unique",
        path: ["matches"],
      });
    }

    const normalizedPlayers = value.players.map(normalizeHistoryName);
    if (new Set(normalizedPlayers).size !== normalizedPlayers.length) {
      context.addIssue({
        code: "custom",
        message: "directory players must be unique after normalization",
        path: ["players"],
      });
    }
    const directory = new Set(normalizedPlayers);
    value.matches.forEach((match, matchIndex) => {
      match.teams.forEach((team, teamIndex) => {
        team.players.forEach((item, playerIndex) => {
          if (!directory.has(normalizeHistoryName(item.displayName))) {
            context.addIssue({
              code: "custom",
              message: "match player is missing from the directory",
              path: ["matches", matchIndex, "teams", teamIndex, "players", playerIndex],
            });
          }
        });
      });
    });
  });

export type HistoryImportPayload = z.infer<typeof historyImportPayloadSchema>;

export type HistoryImportSummary = {
  matchesImported: number;
  matchesSkipped: number;
  playersCreated: number;
  playersReused: number;
  courtsCreated: number;
  courtsReused: number;
  appearancesCreated: number;
};

export type HistoryImportErrorCode =
  | "invalid_payload"
  | "group_not_unique"
  | "owner_not_unique"
  | "court_ambiguous"
  | "player_ambiguous"
  | "ledger_hash_mismatch"
  | "match_not_historical"
  | "postcondition_failed";

export class HistoryImportError extends Error {
  constructor(readonly code: HistoryImportErrorCode) {
    super(code);
    this.name = "HistoryImportError";
  }
}

export function parseHistoryImportPayload(raw: string): HistoryImportPayload {
  let candidate: unknown;
  try {
    candidate = JSON.parse(raw);
  } catch {
    throw new HistoryImportError("invalid_payload");
  }
  const parsed = historyImportPayloadSchema.safeParse(candidate);
  if (!parsed.success) {
    throw new HistoryImportError("invalid_payload");
  }
  return parsed.data;
}

export function normalizeHistoryName(value: string) {
  return value
    .trim()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("es");
}

export function historyMatchPayloadHash(
  payload: Pick<HistoryImportPayload, "groupName" | "court">,
  match: HistoryImportPayload["matches"][number],
) {
  return createHash("sha256")
    .update(
      canonicalJson({
        schemaVersion: 1,
        groupName: payload.groupName,
        court: payload.court,
        match,
      }),
    )
    .digest();
}

export async function importHistoricalMatches(options: {
  connectionString: string;
  payload: HistoryImportPayload;
}): Promise<HistoryImportSummary> {
  const pool = new Pool({ connectionString: options.connectionString, max: 1 });
  const client = await pool.connect();
  try {
    return await importWithClient(client, options.payload);
  } finally {
    client.release();
    await pool.end();
  }
}

async function importWithClient(
  client: PoolClient,
  payload: HistoryImportPayload,
): Promise<HistoryImportSummary> {
  const summary: HistoryImportSummary = {
    matchesImported: 0,
    matchesSkipped: 0,
    playersCreated: 0,
    playersReused: 0,
    courtsCreated: 0,
    courtsReused: 0,
    appearancesCreated: 0,
  };

  await client.query("begin");
  try {
    await client.query(
      "select pg_advisory_xact_lock(hashtextextended('hay_fulbo_history_import:' || $1, 0))",
      [payload.source],
    );

    const group = await exactlyOne<{ id: string }>(
      client,
      `
        select id
        from organization
        where name = $1 and archived_at is null
        for update
      `,
      [payload.groupName],
      "group_not_unique",
    );
    await client.query("select set_config('app.group_id', $1, true)", [group.id]);

    const owner = await exactlyOne<{ user_id: string }>(
      client,
      `
        select user_id
        from member
        where organization_id = $1 and role = 'owner'
        for update
      `,
      [group.id],
      "owner_not_unique",
    );

    await client.query(
      "select pg_advisory_xact_lock(hashtextextended('hay_fulbo_history_group:' || $1, 0))",
      [group.id],
    );

    const skipped = new Set<string>();
    for (const item of payload.matches) {
      const payloadHash = historyMatchPayloadHash(payload, item);
      const ledger = await client.query<{ payload_hash: Buffer }>(
        `
          select payload_hash
          from history_import
          where group_id = $1 and source = $2 and external_key = $3
          for update
        `,
        [group.id, payload.source, item.externalKey],
      );
      if (ledger.rowCount === 1) {
        if (!ledger.rows[0]!.payload_hash.equals(payloadHash)) {
          throw new HistoryImportError("ledger_hash_mismatch");
        }
        skipped.add(item.externalKey);
      }
    }
    summary.matchesSkipped = skipped.size;

    const players = new Map<string, string>();
    for (const displayName of payload.players) {
      await resolvePlayer(client, group.id, displayName, players, summary);
    }
    if (skipped.size === payload.matches.length) {
      await assertImportPostconditions(client, group.id, payload, summary, players.size);
      await client.query("commit");
      return summary;
    }

    const courtId = await resolveCourt(client, group.id, payload, summary);

    for (const item of payload.matches) {
      if (skipped.has(item.externalKey)) continue;
      const payloadHash = historyMatchPayloadHash(payload, item);

      const scheduledAt = new Date(item.scheduledAt);
      if (scheduledAt.getTime() > Date.now()) {
        throw new HistoryImportError("match_not_historical");
      }

      const matchResult = await client.query<{ id: string }>(
        `
          insert into match (
            group_id, organizer_user_id, court_id, scheduled_at, court_cost_minor, status
          )
          values ($1, $2, $3, $4, $5, 'open')
          returning id
        `,
        [group.id, owner.user_id, courtId, scheduledAt, item.courtCostMinor.toString()],
      );
      const matchId = matchResult.rows[0]!.id;
      const teamIds: string[] = [];

      for (const [teamIndex, team] of item.teams.entries()) {
        const teamResult = await client.query<{ id: string }>(
          `
            insert into match_team (
              group_id, match_id, slot, display_name, color, unattributed_goals
            )
            values ($1, $2, $3, $4, $5, $6)
            returning id
          `,
          [
            group.id,
            matchId,
            teamIndex + 1,
            team.displayName,
            team.color ?? null,
            team.unattributedGoals,
          ],
        );
        teamIds.push(teamResult.rows[0]!.id);
      }

      await client.query(
        `
          insert into match_transition (
            group_id, match_id, sequence, from_status, to_status, actor_user_id, occurred_at
          )
          values ($1, $2, 1, null, 'open', $3, $4)
        `,
        [group.id, matchId, owner.user_id, scheduledAt],
      );

      const flattened = item.teams.flatMap((team, teamIndex) =>
        team.players.map((historyPlayer) => ({ historyPlayer, teamIndex })),
      );
      const appearances = [];
      for (const [index, entry] of flattened.entries()) {
        const playerId = await resolvePlayer(
          client,
          group.id,
          entry.historyPlayer.displayName,
          players,
          summary,
        );
        appearances.push({
          ...entry,
          playerId,
          joinedOrder: index + 1,
        });
      }

      const contributions = calculateExpectedContributions({
        courtCostMinor: BigInt(item.courtCostMinor),
        contributions: appearances.map(({ historyPlayer, playerId, joinedOrder }) =>
          historyPlayer.expectedMinor === undefined
            ? { playerId, joinedOrder, kind: "automatic" as const }
            : {
                playerId,
                joinedOrder,
                kind: "fixed" as const,
                expectedMinor: BigInt(historyPlayer.expectedMinor),
              },
        ),
      });
      const expectedByPlayer = new Map(
        contributions.map(({ playerId, expectedMinor }) => [playerId, expectedMinor]),
      );

      for (const appearance of appearances) {
        const expectedMinor = expectedByPlayer.get(appearance.playerId);
        if (expectedMinor === undefined) {
          throw new HistoryImportError("postcondition_failed");
        }
        const paidMinor =
          appearance.historyPlayer.paidMinor === undefined
            ? appearance.historyPlayer.paid
              ? expectedMinor
              : 0n
            : BigInt(appearance.historyPlayer.paidMinor);
        await client.query(
          `
            insert into match_appearance (
              group_id, match_id, player_id, team_id, joined_order,
              goals, assists, own_goals, expected_kind, expected_minor,
              paid_minor, paid_updated_at, paid_updated_by_user_id
            )
            values (
              $1, $2, $3, $4, $5,
              $6, $7, $8, $9, $10,
              $11, $12, $13
            )
          `,
          [
            group.id,
            matchId,
            appearance.playerId,
            teamIds[appearance.teamIndex],
            appearance.joinedOrder,
            appearance.historyPlayer.goals,
            appearance.historyPlayer.assists,
            appearance.historyPlayer.ownGoals,
            appearance.historyPlayer.expectedMinor === undefined ? "automatic" : "fixed",
            expectedMinor.toString(),
            paidMinor.toString(),
            appearance.historyPlayer.paid !== undefined ||
            appearance.historyPlayer.paidMinor !== undefined
              ? scheduledAt
              : null,
            appearance.historyPlayer.paid !== undefined ||
            appearance.historyPlayer.paidMinor !== undefined
              ? owner.user_id
              : null,
          ],
        );
      }

      await client.query(
        `
          update match
          set status = 'closed', lock_version = lock_version + 1
          where group_id = $1 and id = $2 and status = 'open'
        `,
        [group.id, matchId],
      );
      await client.query(
        `
          insert into match_transition (
            group_id, match_id, sequence, from_status, to_status, actor_user_id, occurred_at
          )
          values ($1, $2, 2, 'open', 'closed', $3, greatest($4::timestamptz, now()))
        `,
        [group.id, matchId, owner.user_id, scheduledAt],
      );
      await client.query(
        `
          insert into history_import (
            source, external_key, payload_hash, group_id, match_id
          )
          values ($1, $2, $3, $4, $5)
        `,
        [payload.source, item.externalKey, payloadHash, group.id, matchId],
      );
      await assertMatchPostconditions(client, group.id, matchId, flattened.length, item);

      summary.matchesImported += 1;
      summary.appearancesCreated += flattened.length;
    }

    await assertImportPostconditions(client, group.id, payload, summary, players.size);
    await client.query("commit");
    return summary;
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  }
}

async function resolveCourt(
  client: PoolClient,
  groupId: string,
  payload: HistoryImportPayload,
  summary: HistoryImportSummary,
) {
  const normalizedName = normalizeHistoryName(payload.court.name);
  const courts = await client.query<{ id: string }>(
    `
      select id
      from court
      where group_id = $1 and normalized_name = $2 and archived_at is null
      for update
    `,
    [groupId, normalizedName],
  );
  if (courts.rows.length > 1) throw new HistoryImportError("court_ambiguous");
  if (courts.rows[0]) {
    summary.courtsReused += 1;
    return courts.rows[0].id;
  }
  const created = await client.query<{ id: string }>(
    `
      insert into court (group_id, name, normalized_name, address, maps_url)
      values ($1, $2, $3, $4, $5)
      returning id
    `,
    [groupId, payload.court.name, normalizedName, payload.court.address, payload.court.mapsUrl],
  );
  summary.courtsCreated += 1;
  return created.rows[0]!.id;
}

async function resolvePlayer(
  client: PoolClient,
  groupId: string,
  displayName: string,
  cache: Map<string, string>,
  summary: HistoryImportSummary,
) {
  const normalizedName = normalizeHistoryName(displayName);
  const cached = cache.get(normalizedName);
  if (cached) return cached;
  const existing = await client.query<{ id: string; archived_at: Date | null }>(
    `
      select id, archived_at
      from player
      where group_id = $1 and normalized_name = $2
      for update
    `,
    [groupId, normalizedName],
  );
  if (existing.rows.length > 1) throw new HistoryImportError("player_ambiguous");
  if (existing.rows[0]) {
    let playerId = existing.rows[0].id;
    if (existing.rows[0].archived_at) {
      const reused = await client.query<{ id: string }>(
        `
          update player
          set archived_at = null
          where group_id = $1 and id = $2
          returning id
        `,
        [groupId, playerId],
      );
      playerId = reused.rows[0]!.id;
    }
    cache.set(normalizedName, playerId);
    summary.playersReused += 1;
    return playerId;
  }
  const created = await client.query<{ id: string }>(
    `
      insert into player (group_id, display_name, normalized_name)
      values ($1, $2, $3)
      returning id
    `,
    [groupId, displayName, normalizedName],
  );
  const playerId = created.rows[0]!.id;
  cache.set(normalizedName, playerId);
  summary.playersCreated += 1;
  return playerId;
}

async function assertMatchPostconditions(
  client: PoolClient,
  groupId: string,
  matchId: string,
  expectedAppearances: number,
  input: HistoryImportPayload["matches"][number],
) {
  const result = await client.query<{
    status: string;
    team_count: number;
    appearance_count: number;
    transition_count: number;
    expected_total: string;
    goals_total: string;
    assists_total: string;
  }>(
    `
      select
        matched.status,
        (select count(*)::int from match_team
          where group_id = matched.group_id and match_id = matched.id) as team_count,
        (select count(*)::int from match_appearance
          where group_id = matched.group_id and match_id = matched.id) as appearance_count,
        (select count(*)::int from match_transition
          where group_id = matched.group_id and match_id = matched.id) as transition_count,
        (select coalesce(sum(expected_minor), 0)::text from match_appearance
          where group_id = matched.group_id and match_id = matched.id) as expected_total,
        (select coalesce(sum(goals), 0)::text from match_appearance
          where group_id = matched.group_id and match_id = matched.id) as goals_total,
        (select coalesce(sum(assists), 0)::text from match_appearance
          where group_id = matched.group_id and match_id = matched.id) as assists_total
      from match as matched
      where matched.group_id = $1 and matched.id = $2
    `,
    [groupId, matchId],
  );
  const row = result.rows[0];
  const goals = input.teams
    .flatMap((team) => team.players)
    .reduce((sum, item) => sum + item.goals, 0);
  const assists = input.teams
    .flatMap((team) => team.players)
    .reduce((sum, item) => sum + item.assists, 0);
  if (
    !row ||
    row.status !== "closed" ||
    row.team_count !== 2 ||
    row.appearance_count !== expectedAppearances ||
    row.transition_count !== 2 ||
    BigInt(row.expected_total) !== BigInt(input.courtCostMinor) ||
    Number(row.goals_total) !== goals ||
    Number(row.assists_total) !== assists
  ) {
    throw new HistoryImportError("postcondition_failed");
  }
}

async function assertImportPostconditions(
  client: PoolClient,
  groupId: string,
  payload: HistoryImportPayload,
  summary: HistoryImportSummary,
  resolvedPlayerCount: number,
) {
  const externalKeys = payload.matches.map((item) => item.externalKey);
  const expectedAppearances = payload.matches.reduce(
    (total, item) =>
      total + item.teams.reduce((teamTotal, team) => teamTotal + team.players.length, 0),
    0,
  );
  const expectedGoals = payload.matches.reduce(
    (total, item) =>
      total +
      item.teams.reduce(
        (teamTotal, team) =>
          teamTotal + team.players.reduce((playerTotal, player) => playerTotal + player.goals, 0),
        0,
      ),
    0,
  );
  const expectedAssists = payload.matches.reduce(
    (total, item) =>
      total +
      item.teams.reduce(
        (teamTotal, team) =>
          teamTotal + team.players.reduce((playerTotal, player) => playerTotal + player.assists, 0),
        0,
      ),
    0,
  );
  const result = await client.query<{
    ledger_count: number;
    appearance_count: number;
    goals_total: string;
    assists_total: string;
  }>(
    `
      select
        count(distinct imported.match_id)::int as ledger_count,
        count(appearance.player_id)::int as appearance_count,
        coalesce(sum(appearance.goals), 0)::text as goals_total,
        coalesce(sum(appearance.assists), 0)::text as assists_total
      from history_import as imported
      left join match_appearance as appearance
        on appearance.group_id = imported.group_id
        and appearance.match_id = imported.match_id
      where imported.group_id = $1
        and imported.source = $2
        and imported.external_key = any($3::text[])
    `,
    [groupId, payload.source, externalKeys],
  );
  const playerCount = await client.query<{ count: number }>(
    `
      select count(*)::int as count
      from player
      where group_id = $1
        and normalized_name = any($2::text[])
        and archived_at is null
    `,
    [groupId, payload.players.map(normalizeHistoryName)],
  );
  const row = result.rows[0];
  if (
    resolvedPlayerCount !== payload.players.length ||
    playerCount.rows[0]?.count !== payload.players.length ||
    summary.matchesImported + summary.matchesSkipped !== payload.matches.length ||
    !row ||
    row.ledger_count !== payload.matches.length ||
    row.appearance_count !== expectedAppearances ||
    Number(row.goals_total) !== expectedGoals ||
    Number(row.assists_total) !== expectedAssists
  ) {
    throw new HistoryImportError("postcondition_failed");
  }
}

async function exactlyOne<T extends QueryResultRow>(
  client: PoolClient,
  query: string,
  values: unknown[],
  code: "group_not_unique" | "owner_not_unique",
) {
  const result = await client.query<T>(query, values);
  if (result.rowCount !== 1) throw new HistoryImportError(code);
  return result.rows[0]!;
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .toSorted()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
