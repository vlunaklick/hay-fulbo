import { and, asc, eq, max, notInArray, sql } from "drizzle-orm";

import {
  court,
  match,
  matchAppearance,
  matchOrganizerTransfer,
  matchRsvp,
  matchTeam,
  matchTransition,
  member,
  organization,
  player,
} from "../schema";
import { calculateExpectedContributions, MatchRuleError, validateMatchClosure } from "./rules";
import {
  MatchCommandError,
  type MatchCommand,
  type MatchCommandResultFor,
  type MatchDatabase,
  type MatchMutationResult,
  type MatchScope,
  type MatchTransaction,
} from "./types";

export { MatchCommandError } from "./types";
export type {
  MatchCommand,
  MatchCommandErrorCode,
  MatchCommandResult,
  MatchMutationResult,
  MatchScope,
} from "./types";

type LockedMatch = typeof match.$inferSelect;
type TeamRow = typeof matchTeam.$inferSelect;
type AppearanceRow = typeof matchAppearance.$inferSelect;

export type MatchCommands = {
  execute<TCommand extends MatchCommand>(
    scope: MatchScope,
    command: TCommand,
  ): Promise<MatchCommandResultFor<TCommand>>;
};

export function createMatchCommands(
  database: MatchDatabase,
  options?: { now?: () => Date },
): MatchCommands {
  const now = options?.now ?? (() => new Date());

  return {
    async execute<TCommand extends MatchCommand>(
      scope: MatchScope,
      command: TCommand,
    ): Promise<MatchCommandResultFor<TCommand>> {
      const result = await database.transaction(async (transaction) => {
        const access = await establishScope(transaction, scope);
        scope = {
          ...scope,
          role: access.role === "owner" || access.role === "leader" ? access.role : "member",
        };

        if (command.type === "createMatch") {
          requireManager(access);
          return createMatch(transaction, scope, command);
        }
        if (command.type === "upsertPlayer") {
          requireManager(access);
          return upsertPlayer(transaction, scope, command);
        }
        if (command.type === "archivePlayer") {
          requireManager(access);
          return archivePlayer(transaction, scope, command);
        }
        if (command.type === "upsertCourt") {
          requireManager(access);
          return upsertCourt(transaction, scope, command);
        }
        if (command.type === "archiveCourt") {
          requireManager(access);
          return archiveCourt(transaction, scope, command);
        }

        const locked = await lockMatch(
          transaction,
          scope,
          command.matchId,
          command.expectedLockVersion,
        );

        switch (command.type) {
          case "updateMatch":
            return updateMatch(transaction, scope, locked, command);
          case "updateTeam":
            return updateTeam(transaction, scope, locked, command);
          case "setCaptain":
            return setCaptain(transaction, scope, locked, command);
          case "addParticipant":
            return addParticipant(transaction, scope, locked, command);
          case "createAndAddParticipant":
            return createAndAddParticipant(transaction, scope, locked, command);
          case "removeParticipant":
            return removeParticipant(transaction, scope, locked, command);
          case "assignParticipantTeam":
            return assignParticipantTeam(transaction, scope, locked, command);
          case "updateAppearance":
            return updateAppearance(transaction, scope, locked, command);
          case "setUnattributedGoals":
            return setUnattributedGoals(transaction, scope, locked, command);
          case "setExpectedContribution":
            return setExpectedContribution(transaction, scope, locked, command);
          case "updatePaid":
            return updatePaid(transaction, scope, locked, command, now());
          case "closeMatch":
            return closeMatch(transaction, scope, locked, now());
          case "reopenMatch":
            return reopenMatch(transaction, scope, locked, command.reason);
          case "cancelMatch":
            return cancelMatch(transaction, scope, locked, command.reason);
          case "restoreMatch":
            return restoreMatch(transaction, scope, locked, command.reason);
          case "transferOrganizer":
            return transferOrganizer(transaction, scope, locked, command);
        }
      });
      return result as MatchCommandResultFor<TCommand>;
    },
  };
}

async function establishScope(transaction: MatchTransaction, scope: MatchScope) {
  const [access] = await transaction
    .select({
      role: member.role,
      archivedAt: organization.archivedAt,
    })
    .from(member)
    .innerJoin(organization, eq(organization.id, member.organizationId))
    .where(and(eq(member.organizationId, scope.groupId), eq(member.userId, scope.actorUserId)))
    .limit(1);
  if (!access) {
    throw new MatchCommandError("membership_required");
  }
  if (access.archivedAt) {
    throw new MatchCommandError("group_archived");
  }
  await transaction.execute(sql`select set_config('app.group_id', ${scope.groupId}, true)`);
  return access;
}

async function createMatch(
  transaction: MatchTransaction,
  scope: MatchScope,
  command: Extract<MatchCommand, { type: "createMatch" }>,
) {
  assertDate(command.scheduledAt);
  if (command.teams.length !== 2) {
    throw new MatchCommandError("invalid_input", "Exactly two teams are required");
  }
  for (const team of command.teams) {
    assertNonempty(team.displayName);
  }
  if (command.courtCostMinor !== undefined && command.courtCostMinor !== null) {
    assertNonnegativeMoney(command.courtCostMinor);
  }
  if (command.capacity !== undefined) assertCapacity(command.capacity);
  if (command.courtId) {
    await requireActiveCourt(transaction, scope.groupId, command.courtId);
  }

  const [created] = await transaction
    .insert(match)
    .values({
      groupId: scope.groupId,
      organizerUserId: scope.actorUserId,
      scheduledAt: command.scheduledAt,
      courtId: command.courtId ?? null,
      courtCostMinor: command.courtCostMinor ?? null,
      capacity: command.capacity ?? 10,
    })
    .returning({ id: match.id, lockVersion: match.lockVersion });
  if (!created) {
    throw new MatchCommandError("invalid_input", "Match could not be created");
  }

  const teams = await transaction
    .insert(matchTeam)
    .values(
      command.teams.map((team, index) => ({
        groupId: scope.groupId,
        matchId: created.id,
        slot: index + 1,
        displayName: team.displayName.trim(),
        color: team.color ?? null,
      })),
    )
    .returning({ id: matchTeam.id, slot: matchTeam.slot });
  await transaction.insert(matchTransition).values({
    groupId: scope.groupId,
    matchId: created.id,
    sequence: 1,
    fromStatus: null,
    toStatus: "open",
    actorUserId: scope.actorUserId,
  });

  const teamIds = teams.toSorted((left, right) => left.slot - right.slot).map((team) => team.id);
  if (teamIds.length !== 2) {
    throw new MatchCommandError("invalid_input", "Match teams could not be created");
  }
  return {
    matchId: created.id,
    lockVersion: created.lockVersion,
    teamIds: [teamIds[0]!, teamIds[1]!] as [string, string],
  };
}

async function upsertPlayer(
  transaction: MatchTransaction,
  scope: MatchScope,
  command: Extract<MatchCommand, { type: "upsertPlayer" }>,
) {
  assertNonempty(command.displayName);
  if (command.linkedUserId) {
    await requireMember(transaction, scope.groupId, command.linkedUserId);
    const [existingLink] = await transaction
      .select({ playerId: player.id })
      .from(player)
      .where(and(eq(player.groupId, scope.groupId), eq(player.linkedUserId, command.linkedUserId)))
      .limit(1);
    if (existingLink && existingLink.playerId !== command.playerId) {
      throw new MatchCommandError(
        "player_account_already_linked",
        "Esta cuenta ya está vinculada a otro jugador",
      );
    }
  }
  const values = {
    displayName: command.displayName.trim(),
    normalizedName: normalizeName(command.displayName),
    linkedUserId: command.linkedUserId ?? null,
    archivedAt: null,
  };
  if (!command.playerId) {
    try {
      const [created] = await transaction
        .insert(player)
        .values({ groupId: scope.groupId, ...values })
        .returning({ playerId: player.id });
      if (!created) throw new MatchCommandError("invalid_input");
      return created;
    } catch (error) {
      throwPlayerAccountConflict(error);
    }
  }
  try {
    const [updated] = await transaction
      .update(player)
      .set(values)
      .where(and(eq(player.groupId, scope.groupId), eq(player.id, command.playerId)))
      .returning({ playerId: player.id });
    if (!updated) throw new MatchCommandError("not_found");
    return updated;
  } catch (error) {
    throwPlayerAccountConflict(error);
  }
}

async function archivePlayer(
  transaction: MatchTransaction,
  scope: MatchScope,
  command: Extract<MatchCommand, { type: "archivePlayer" }>,
) {
  const [updated] = await transaction
    .update(player)
    .set({ archivedAt: command.archived ? new Date() : null })
    .where(and(eq(player.groupId, scope.groupId), eq(player.id, command.playerId)))
    .returning({ playerId: player.id });
  if (!updated) throw new MatchCommandError("not_found");
  return updated;
}

async function upsertCourt(
  transaction: MatchTransaction,
  scope: MatchScope,
  command: Extract<MatchCommand, { type: "upsertCourt" }>,
) {
  assertNonempty(command.name);
  assertNonempty(command.address);
  assertHttpUrl(command.mapsUrl);
  const values = {
    name: command.name.trim(),
    normalizedName: normalizeName(command.name),
    address: command.address.trim(),
    mapsUrl: command.mapsUrl.trim(),
    archivedAt: null,
  };
  if (!command.courtId) {
    const [created] = await transaction
      .insert(court)
      .values({ groupId: scope.groupId, ...values })
      .returning({ courtId: court.id });
    if (!created) throw new MatchCommandError("invalid_input");
    return created;
  }
  const [updated] = await transaction
    .update(court)
    .set(values)
    .where(and(eq(court.groupId, scope.groupId), eq(court.id, command.courtId)))
    .returning({ courtId: court.id });
  if (!updated) throw new MatchCommandError("not_found");
  return updated;
}

async function archiveCourt(
  transaction: MatchTransaction,
  scope: MatchScope,
  command: Extract<MatchCommand, { type: "archiveCourt" }>,
) {
  const [updated] = await transaction
    .update(court)
    .set({ archivedAt: command.archived ? new Date() : null })
    .where(and(eq(court.groupId, scope.groupId), eq(court.id, command.courtId)))
    .returning({ courtId: court.id });
  if (!updated) throw new MatchCommandError("not_found");
  return updated;
}

async function lockMatch(
  transaction: MatchTransaction,
  scope: MatchScope,
  matchId: string,
  expectedLockVersion: number,
) {
  if (!Number.isInteger(expectedLockVersion) || expectedLockVersion < 0) {
    throw new MatchCommandError("invalid_input", "Invalid lock version");
  }
  const [locked] = await transaction
    .select()
    .from(match)
    .where(and(eq(match.groupId, scope.groupId), eq(match.id, matchId)))
    .for("update")
    .limit(1);
  if (!locked) throw new MatchCommandError("not_found");
  if (locked.lockVersion !== expectedLockVersion) {
    throw new MatchCommandError("concurrent_update");
  }
  return locked;
}

async function updateMatch(
  transaction: MatchTransaction,
  scope: MatchScope,
  locked: LockedMatch,
  command: Extract<MatchCommand, { type: "updateMatch" }>,
) {
  requireOrganizer(locked, scope);
  requireOpen(locked);
  if (command.scheduledAt !== undefined) assertDate(command.scheduledAt);
  if (command.courtCostMinor !== undefined && command.courtCostMinor !== null) {
    assertNonnegativeMoney(command.courtCostMinor);
  }
  if (command.capacity !== undefined) assertCapacity(command.capacity);
  if (command.courtId) {
    await requireActiveCourt(transaction, scope.groupId, command.courtId);
  }
  await transaction
    .update(match)
    .set({
      ...(command.scheduledAt !== undefined ? { scheduledAt: command.scheduledAt } : {}),
      ...(command.courtId !== undefined ? { courtId: command.courtId } : {}),
      ...(command.courtCostMinor !== undefined ? { courtCostMinor: command.courtCostMinor } : {}),
      ...(command.capacity !== undefined ? { capacity: command.capacity } : {}),
    })
    .where(and(eq(match.groupId, scope.groupId), eq(match.id, locked.id)));
  if (command.courtCostMinor !== undefined) {
    await recalculateContributions(transaction, scope.groupId, locked.id, command.courtCostMinor);
  }
  return bumpVersion(transaction, scope.groupId, locked);
}

async function updateTeam(
  transaction: MatchTransaction,
  scope: MatchScope,
  locked: LockedMatch,
  command: Extract<MatchCommand, { type: "updateTeam" }>,
) {
  requireOrganizer(locked, scope);
  requireOpen(locked);
  assertNonempty(command.displayName);
  await requireTeam(transaction, scope.groupId, locked.id, command.teamId);
  await transaction
    .update(matchTeam)
    .set({ displayName: command.displayName.trim(), color: command.color ?? null })
    .where(
      and(
        eq(matchTeam.groupId, scope.groupId),
        eq(matchTeam.matchId, locked.id),
        eq(matchTeam.id, command.teamId),
      ),
    );
  return bumpVersion(transaction, scope.groupId, locked);
}

async function setCaptain(
  transaction: MatchTransaction,
  scope: MatchScope,
  locked: LockedMatch,
  command: Extract<MatchCommand, { type: "setCaptain" }>,
) {
  requireOrganizer(locked, scope);
  requireOpen(locked);
  await requireTeam(transaction, scope.groupId, locked.id, command.teamId);
  if (command.captainUserId) {
    await requireMember(transaction, scope.groupId, command.captainUserId);
  }
  await transaction
    .update(matchTeam)
    .set({ captainUserId: command.captainUserId })
    .where(
      and(
        eq(matchTeam.groupId, scope.groupId),
        eq(matchTeam.matchId, locked.id),
        eq(matchTeam.id, command.teamId),
      ),
    );
  return bumpVersion(transaction, scope.groupId, locked);
}

async function addParticipant(
  transaction: MatchTransaction,
  scope: MatchScope,
  locked: LockedMatch,
  command: Extract<MatchCommand, { type: "addParticipant" }>,
) {
  requireOpen(locked);
  const team = await requireTeam(transaction, scope.groupId, locked.id, command.teamId);
  requireTeamAuthority(locked, team, scope);
  await requireActivePlayer(transaction, scope.groupId, command.playerId);
  const [order] = await transaction
    .select({ highest: max(matchAppearance.joinedOrder) })
    .from(matchAppearance)
    .where(and(eq(matchAppearance.groupId, scope.groupId), eq(matchAppearance.matchId, locked.id)));
  await transaction.insert(matchAppearance).values({
    groupId: scope.groupId,
    matchId: locked.id,
    playerId: command.playerId,
    teamId: command.teamId,
    joinedOrder: (order?.highest ?? 0) + 1,
  });
  await transaction
    .insert(matchRsvp)
    .values({
      groupId: scope.groupId,
      matchId: locked.id,
      playerId: command.playerId,
      response: "yes",
    })
    .onConflictDoUpdate({
      target: [matchRsvp.groupId, matchRsvp.matchId, matchRsvp.playerId],
      set: {
        response: "yes",
        respondedAt: sql`case when ${matchRsvp.response} = 'yes' then ${matchRsvp.respondedAt} else now() end`,
        updatedAt: new Date(),
      },
    });
  await recalculateContributions(transaction, scope.groupId, locked.id, locked.courtCostMinor);
  return bumpVersion(transaction, scope.groupId, locked);
}

async function createAndAddParticipant(
  transaction: MatchTransaction,
  scope: MatchScope,
  locked: LockedMatch,
  command: Extract<MatchCommand, { type: "createAndAddParticipant" }>,
) {
  requireOpen(locked);
  assertNonempty(command.displayName);
  const team = await requireTeam(transaction, scope.groupId, locked.id, command.teamId);
  requireTeamAuthority(locked, team, scope);
  const [created] = await transaction
    .insert(player)
    .values({
      groupId: scope.groupId,
      displayName: command.displayName.trim(),
      normalizedName: normalizeName(command.displayName),
    })
    .returning({ playerId: player.id });
  if (!created) throw new MatchCommandError("invalid_input");

  const mutation = await addParticipant(transaction, scope, locked, {
    type: "addParticipant",
    matchId: locked.id,
    expectedLockVersion: locked.lockVersion,
    teamId: command.teamId,
    playerId: created.playerId,
  });
  return { ...mutation, playerId: created.playerId };
}

async function removeParticipant(
  transaction: MatchTransaction,
  scope: MatchScope,
  locked: LockedMatch,
  command: Extract<MatchCommand, { type: "removeParticipant" }>,
) {
  requireOpen(locked);
  const appearance = await requireAppearance(
    transaction,
    scope.groupId,
    locked.id,
    command.playerId,
  );
  const team = await requireTeam(transaction, scope.groupId, locked.id, appearance.teamId);
  requireTeamAuthority(locked, team, scope);
  await transaction
    .delete(matchAppearance)
    .where(
      and(
        eq(matchAppearance.groupId, scope.groupId),
        eq(matchAppearance.matchId, locked.id),
        eq(matchAppearance.playerId, command.playerId),
      ),
    );
  await transaction
    .delete(matchRsvp)
    .where(
      and(
        eq(matchRsvp.groupId, scope.groupId),
        eq(matchRsvp.matchId, locked.id),
        eq(matchRsvp.playerId, command.playerId),
      ),
    );
  await recalculateContributions(transaction, scope.groupId, locked.id, locked.courtCostMinor);
  return bumpVersion(transaction, scope.groupId, locked);
}

async function assignParticipantTeam(
  transaction: MatchTransaction,
  scope: MatchScope,
  locked: LockedMatch,
  command: Extract<MatchCommand, { type: "assignParticipantTeam" }>,
) {
  requireOrganizer(locked, scope);
  requireOpen(locked);
  await requireTeam(transaction, scope.groupId, locked.id, command.teamId);
  await requireAppearance(transaction, scope.groupId, locked.id, command.playerId);
  await transaction
    .update(matchAppearance)
    .set({ teamId: command.teamId })
    .where(
      and(
        eq(matchAppearance.groupId, scope.groupId),
        eq(matchAppearance.matchId, locked.id),
        eq(matchAppearance.playerId, command.playerId),
      ),
    );
  return bumpVersion(transaction, scope.groupId, locked);
}

async function updateAppearance(
  transaction: MatchTransaction,
  scope: MatchScope,
  locked: LockedMatch,
  command: Extract<MatchCommand, { type: "updateAppearance" }>,
) {
  requireOpen(locked);
  assertSportingTotal(command.goals);
  assertSportingTotal(command.assists);
  assertSportingTotal(command.ownGoals);
  const appearance = await requireAppearance(
    transaction,
    scope.groupId,
    locked.id,
    command.playerId,
  );
  const team = await requireTeam(transaction, scope.groupId, locked.id, appearance.teamId);
  requireTeamAuthority(locked, team, scope);
  await transaction
    .update(matchAppearance)
    .set({
      goals: command.goals,
      assists: command.assists,
      ownGoals: command.ownGoals,
    })
    .where(
      and(
        eq(matchAppearance.groupId, scope.groupId),
        eq(matchAppearance.matchId, locked.id),
        eq(matchAppearance.playerId, command.playerId),
      ),
    );
  return bumpVersion(transaction, scope.groupId, locked);
}

async function setUnattributedGoals(
  transaction: MatchTransaction,
  scope: MatchScope,
  locked: LockedMatch,
  command: Extract<MatchCommand, { type: "setUnattributedGoals" }>,
) {
  requireOpen(locked);
  assertSportingTotal(command.goals);
  const team = await requireTeam(transaction, scope.groupId, locked.id, command.teamId);
  requireTeamAuthority(locked, team, scope);
  await transaction
    .update(matchTeam)
    .set({ unattributedGoals: command.goals })
    .where(
      and(
        eq(matchTeam.groupId, scope.groupId),
        eq(matchTeam.matchId, locked.id),
        eq(matchTeam.id, command.teamId),
      ),
    );
  return bumpVersion(transaction, scope.groupId, locked);
}

async function setExpectedContribution(
  transaction: MatchTransaction,
  scope: MatchScope,
  locked: LockedMatch,
  command: Extract<MatchCommand, { type: "setExpectedContribution" }>,
) {
  requireOrganizer(locked, scope);
  requireOpen(locked);
  await requireAppearance(transaction, scope.groupId, locked.id, command.playerId);
  if (command.kind === "fixed") {
    if (command.expectedMinor === undefined) {
      throw new MatchCommandError("invalid_input", "A fixed contribution needs an amount");
    }
    assertNonnegativeMoney(command.expectedMinor);
  }
  await transaction
    .update(matchAppearance)
    .set({
      expectedKind: command.kind,
      ...(command.kind === "fixed" ? { expectedMinor: command.expectedMinor } : {}),
    })
    .where(
      and(
        eq(matchAppearance.groupId, scope.groupId),
        eq(matchAppearance.matchId, locked.id),
        eq(matchAppearance.playerId, command.playerId),
      ),
    );
  await recalculateContributions(transaction, scope.groupId, locked.id, locked.courtCostMinor);
  return bumpVersion(transaction, scope.groupId, locked);
}

async function updatePaid(
  transaction: MatchTransaction,
  scope: MatchScope,
  locked: LockedMatch,
  command: Extract<MatchCommand, { type: "updatePaid" }>,
  changedAt: Date,
) {
  if (locked.status === "cancelled") throw new MatchCommandError("match_not_open");
  assertNonnegativeMoney(command.paidMinor);
  const appearance = await requireAppearance(
    transaction,
    scope.groupId,
    locked.id,
    command.playerId,
    true,
  );
  const team = await requireTeam(transaction, scope.groupId, locked.id, appearance.teamId, true);
  requireTeamAuthority(locked, team, scope);
  await transaction
    .update(matchAppearance)
    .set({
      paidMinor: command.paidMinor,
      paidUpdatedAt: changedAt,
      paidUpdatedByUserId: scope.actorUserId,
    })
    .where(
      and(
        eq(matchAppearance.groupId, scope.groupId),
        eq(matchAppearance.matchId, locked.id),
        eq(matchAppearance.playerId, command.playerId),
      ),
    );
  return bumpVersion(transaction, scope.groupId, locked);
}

async function closeMatch(
  transaction: MatchTransaction,
  scope: MatchScope,
  locked: LockedMatch,
  now: Date,
) {
  requireOrganizer(locked, scope);
  requireOpen(locked);
  const teams = await transaction
    .select()
    .from(matchTeam)
    .where(and(eq(matchTeam.groupId, scope.groupId), eq(matchTeam.matchId, locked.id)))
    .for("update");
  const appearances = await transaction
    .select()
    .from(matchAppearance)
    .where(and(eq(matchAppearance.groupId, scope.groupId), eq(matchAppearance.matchId, locked.id)))
    .for("update");
  await recalculateContributions(
    transaction,
    scope.groupId,
    locked.id,
    locked.courtCostMinor,
    appearances,
  );
  const refreshedAppearances =
    appearances.length === 0
      ? appearances
      : await loadAppearances(transaction, scope.groupId, locked.id);
  const closure = validateMatchClosure({
    now,
    scheduledAt: locked.scheduledAt,
    courtId: locked.courtId,
    courtCostMinor: locked.courtCostMinor,
    teams,
    appearances: refreshedAppearances,
  });
  if (!closure.ok) {
    throw new MatchCommandError("closure_invalid", "Match cannot be closed", closure.issues);
  }
  await transaction
    .update(match)
    .set({ status: "closed" })
    .where(and(eq(match.groupId, scope.groupId), eq(match.id, locked.id)));
  await appendTransition(transaction, scope, locked.id, "open", "closed", null);
  return bumpVersion(transaction, scope.groupId, locked);
}

async function reopenMatch(
  transaction: MatchTransaction,
  scope: MatchScope,
  locked: LockedMatch,
  reason: string,
) {
  requireOrganizer(locked, scope);
  if (locked.status !== "closed") throw new MatchCommandError("match_not_closed");
  assertReason(reason);
  await transaction
    .update(match)
    .set({ status: "open" })
    .where(and(eq(match.groupId, scope.groupId), eq(match.id, locked.id)));
  await clearStaleCaptains(transaction, scope.groupId, locked.id);
  await appendTransition(transaction, scope, locked.id, "closed", "open", reason);
  return bumpVersion(transaction, scope.groupId, locked);
}

async function cancelMatch(
  transaction: MatchTransaction,
  scope: MatchScope,
  locked: LockedMatch,
  reason: string,
) {
  requireOrganizer(locked, scope);
  requireOpen(locked);
  assertReason(reason);
  await transaction
    .update(match)
    .set({ status: "cancelled" })
    .where(and(eq(match.groupId, scope.groupId), eq(match.id, locked.id)));
  await appendTransition(transaction, scope, locked.id, "open", "cancelled", reason);
  return bumpVersion(transaction, scope.groupId, locked);
}

async function restoreMatch(
  transaction: MatchTransaction,
  scope: MatchScope,
  locked: LockedMatch,
  reason: string,
) {
  requireOrganizer(locked, scope);
  if (locked.status !== "cancelled") throw new MatchCommandError("match_not_cancelled");
  assertReason(reason);
  await transaction
    .update(match)
    .set({ status: "open" })
    .where(and(eq(match.groupId, scope.groupId), eq(match.id, locked.id)));
  await clearStaleCaptains(transaction, scope.groupId, locked.id);
  await appendTransition(transaction, scope, locked.id, "cancelled", "open", reason);
  return bumpVersion(transaction, scope.groupId, locked);
}

async function transferOrganizer(
  transaction: MatchTransaction,
  scope: MatchScope,
  locked: LockedMatch,
  command: Extract<MatchCommand, { type: "transferOrganizer" }>,
) {
  assertReason(command.reason);
  const actorMembership = await requireMember(transaction, scope.groupId, scope.actorUserId);
  if (
    locked.organizerUserId !== scope.actorUserId &&
    actorMembership.role !== "owner" &&
    actorMembership.role !== "leader"
  ) {
    throw new MatchCommandError("forbidden");
  }
  if (locked.organizerUserId === command.nextOrganizerUserId) {
    throw new MatchCommandError("invalid_input", "Organizer is unchanged");
  }
  await requireMember(transaction, scope.groupId, command.nextOrganizerUserId);
  await transaction
    .update(match)
    .set({ organizerUserId: command.nextOrganizerUserId })
    .where(and(eq(match.groupId, scope.groupId), eq(match.id, locked.id)));
  await transaction.insert(matchOrganizerTransfer).values({
    groupId: scope.groupId,
    matchId: locked.id,
    previousUserId: locked.organizerUserId,
    nextUserId: command.nextOrganizerUserId,
    actorUserId: scope.actorUserId,
    reason: command.reason.trim(),
  });
  return bumpVersion(transaction, scope.groupId, locked);
}

async function recalculateContributions(
  transaction: MatchTransaction,
  groupId: string,
  matchId: string,
  courtCostMinor: bigint | null,
  alreadyLoaded?: readonly AppearanceRow[],
) {
  const appearances = alreadyLoaded ?? (await loadAppearances(transaction, groupId, matchId));
  if (appearances.length === 0) return;
  try {
    const amounts = calculateExpectedContributions({
      courtCostMinor: courtCostMinor ?? 0n,
      contributions: appearances.map((appearance) =>
        appearance.expectedKind === "fixed"
          ? {
              playerId: appearance.playerId,
              joinedOrder: appearance.joinedOrder,
              kind: "fixed" as const,
              expectedMinor: appearance.expectedMinor,
            }
          : {
              playerId: appearance.playerId,
              joinedOrder: appearance.joinedOrder,
              kind: "automatic" as const,
            },
      ),
    });
    for (const amount of amounts) {
      await transaction
        .update(matchAppearance)
        .set({ expectedMinor: amount.expectedMinor })
        .where(
          and(
            eq(matchAppearance.groupId, groupId),
            eq(matchAppearance.matchId, matchId),
            eq(matchAppearance.playerId, amount.playerId),
          ),
        );
    }
  } catch (error) {
    if (error instanceof MatchRuleError) {
      throw new MatchCommandError("invalid_input", error.code);
    }
    throw error;
  }
}

async function bumpVersion(
  transaction: MatchTransaction,
  groupId: string,
  locked: LockedMatch,
): Promise<MatchMutationResult> {
  const nextVersion = locked.lockVersion + 1;
  const [updated] = await transaction
    .update(match)
    .set({ lockVersion: nextVersion })
    .where(
      and(
        eq(match.groupId, groupId),
        eq(match.id, locked.id),
        eq(match.lockVersion, locked.lockVersion),
      ),
    )
    .returning({ matchId: match.id, lockVersion: match.lockVersion });
  if (!updated) throw new MatchCommandError("concurrent_update");
  return updated;
}

async function appendTransition(
  transaction: MatchTransaction,
  scope: MatchScope,
  matchId: string,
  fromStatus: "open" | "closed" | "cancelled",
  toStatus: "open" | "closed" | "cancelled",
  reason: string | null,
) {
  const [last] = await transaction
    .select({ sequence: max(matchTransition.sequence) })
    .from(matchTransition)
    .where(and(eq(matchTransition.groupId, scope.groupId), eq(matchTransition.matchId, matchId)));
  await transaction.insert(matchTransition).values({
    groupId: scope.groupId,
    matchId,
    sequence: (last?.sequence ?? 0) + 1,
    fromStatus,
    toStatus,
    actorUserId: scope.actorUserId,
    reason,
  });
}

async function clearStaleCaptains(transaction: MatchTransaction, groupId: string, matchId: string) {
  const activeCaptainRows = await transaction
    .select({ userId: member.userId })
    .from(member)
    .where(eq(member.organizationId, groupId));
  const activeIds = activeCaptainRows.map((row) => row.userId);
  if (activeIds.length === 0) {
    await transaction
      .update(matchTeam)
      .set({ captainUserId: null })
      .where(and(eq(matchTeam.groupId, groupId), eq(matchTeam.matchId, matchId)));
    return;
  }
  await transaction
    .update(matchTeam)
    .set({ captainUserId: null })
    .where(
      and(
        eq(matchTeam.groupId, groupId),
        eq(matchTeam.matchId, matchId),
        sql`${matchTeam.captainUserId} is not null`,
        notInArray(matchTeam.captainUserId, activeIds),
      ),
    );
}

async function loadAppearances(transaction: MatchTransaction, groupId: string, matchId: string) {
  return transaction
    .select()
    .from(matchAppearance)
    .where(and(eq(matchAppearance.groupId, groupId), eq(matchAppearance.matchId, matchId)))
    .orderBy(asc(matchAppearance.joinedOrder));
}

async function requireTeam(
  transaction: MatchTransaction,
  groupId: string,
  matchId: string,
  teamId: string,
  lock = false,
) {
  const query = transaction
    .select()
    .from(matchTeam)
    .where(
      and(eq(matchTeam.groupId, groupId), eq(matchTeam.matchId, matchId), eq(matchTeam.id, teamId)),
    );
  const rows = lock ? await query.for("update").limit(1) : await query.limit(1);
  const [team] = rows;
  if (!team) throw new MatchCommandError("not_found");
  return team;
}

async function requireAppearance(
  transaction: MatchTransaction,
  groupId: string,
  matchId: string,
  playerId: string,
  lock = false,
) {
  const query = transaction
    .select()
    .from(matchAppearance)
    .where(
      and(
        eq(matchAppearance.groupId, groupId),
        eq(matchAppearance.matchId, matchId),
        eq(matchAppearance.playerId, playerId),
      ),
    );
  const rows = lock ? await query.for("update").limit(1) : await query.limit(1);
  const [appearance] = rows;
  if (!appearance) throw new MatchCommandError("not_found");
  return appearance;
}

async function requireActivePlayer(
  transaction: MatchTransaction,
  groupId: string,
  playerId: string,
) {
  const [found] = await transaction
    .select({ id: player.id, archivedAt: player.archivedAt })
    .from(player)
    .where(and(eq(player.groupId, groupId), eq(player.id, playerId)))
    .limit(1);
  if (!found) throw new MatchCommandError("not_found");
  if (found.archivedAt) throw new MatchCommandError("player_archived");
  return found;
}

async function requireActiveCourt(transaction: MatchTransaction, groupId: string, courtId: string) {
  const [found] = await transaction
    .select({ id: court.id, archivedAt: court.archivedAt })
    .from(court)
    .where(and(eq(court.groupId, groupId), eq(court.id, courtId)))
    .limit(1);
  if (!found) throw new MatchCommandError("not_found");
  if (found.archivedAt) throw new MatchCommandError("court_archived");
  return found;
}

async function requireMember(transaction: MatchTransaction, groupId: string, userId: string) {
  const [found] = await transaction
    .select({ role: member.role })
    .from(member)
    .where(and(eq(member.organizationId, groupId), eq(member.userId, userId)))
    .limit(1);
  if (!found) throw new MatchCommandError("membership_required");
  return found;
}

function requireOrganizer(locked: LockedMatch, scope: MatchScope) {
  if (
    locked.organizerUserId !== scope.actorUserId &&
    scope.role !== "owner" &&
    scope.role !== "leader"
  ) {
    throw new MatchCommandError("forbidden");
  }
}

function requireManager(access: { role: string }) {
  if (access.role !== "owner" && access.role !== "leader") {
    throw new MatchCommandError("owner_required");
  }
}

function requireTeamAuthority(locked: LockedMatch, team: TeamRow, scope: MatchScope) {
  if (
    locked.organizerUserId !== scope.actorUserId &&
    team.captainUserId !== scope.actorUserId &&
    scope.role !== "owner" &&
    scope.role !== "leader"
  ) {
    throw new MatchCommandError("forbidden");
  }
}

function requireOpen(locked: LockedMatch) {
  if (locked.status !== "open") throw new MatchCommandError("match_not_open");
}

function assertNonempty(value: string) {
  if (value.trim().length === 0) throw new MatchCommandError("invalid_input");
}

function assertReason(value: string) {
  assertNonempty(value);
}

function assertDate(value: Date) {
  if (Number.isNaN(value.getTime())) throw new MatchCommandError("invalid_input");
}

function assertCapacity(value: number) {
  if (!Number.isInteger(value) || value < 2 || value > 40) {
    throw new MatchCommandError("invalid_input");
  }
}

function assertSportingTotal(value: number) {
  if (!Number.isInteger(value) || value < 0) {
    throw new MatchCommandError("invalid_input");
  }
}

function assertNonnegativeMoney(value: bigint) {
  if (value < 0n) throw new MatchCommandError("invalid_input");
}

function assertHttpUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("protocol");
    }
  } catch {
    throw new MatchCommandError("invalid_input", "Invalid maps URL");
  }
}

function normalizeName(value: string) {
  return value
    .trim()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("es");
}

function isPlayerAccountUniqueViolation(error: unknown) {
  let candidate = error;
  for (let depth = 0; depth < 4; depth += 1) {
    if (typeof candidate !== "object" || candidate === null) return false;
    if (
      "code" in candidate &&
      candidate.code === "23505" &&
      "constraint" in candidate &&
      candidate.constraint === "player_group_linked_user_unique"
    ) {
      return true;
    }
    candidate = "cause" in candidate ? candidate.cause : null;
  }
  return false;
}

function throwPlayerAccountConflict(error: unknown): never {
  if (isPlayerAccountUniqueViolation(error)) {
    throw new MatchCommandError(
      "player_account_already_linked",
      "Esta cuenta ya está vinculada a otro jugador",
    );
  }
  throw error;
}
