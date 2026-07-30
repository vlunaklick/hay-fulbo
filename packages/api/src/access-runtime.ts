import { randomUUID } from "node:crypto";

import { auth, invitationDeliveryMode } from "@hay-fulbo/auth";
import { db } from "@hay-fulbo/db";
import { calculateScore } from "@hay-fulbo/db/matches";
import { createStatsQueries, StatsReadError } from "@hay-fulbo/db/stats";
import {
  groupSharedLink,
  groupSharedLinkEvent,
  groupJoinLink,
  match,
  matchAppearance,
  matchRsvp,
  matchTeam,
  member,
  organization,
  player,
  court,
} from "@hay-fulbo/db/schema/index";
import { env } from "@hay-fulbo/env/server";
import { and, asc, eq, inArray, isNull, max, sql } from "drizzle-orm";

import {
  GroupAccessError,
  createGroupAccess,
  type GroupAccessRepository,
  type OrganizationGateway,
} from "./group-access";
import {
  GroupJoinError,
  createGroupJoinAccess,
  type GroupJoinRepository,
} from "./group-join-access";
import {
  createMatchInviteAccess,
  MatchInviteError,
  type MatchInvitationSource,
  type MatchInviteRepository,
} from "./match-invite-access";
import {
  SharedAccessError,
  createSharedAccess,
  type SharedAccessRepository,
} from "./shared-access";

const groupAccessRepository: GroupAccessRepository = {
  async assertPlayerInGroup({ groupId, playerId }) {
    await db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.group_id', ${groupId}, true)`);
      const [target] = await tx
        .select({ id: player.id })
        .from(player)
        .where(and(eq(player.groupId, groupId), eq(player.id, playerId)))
        .limit(1);
      if (!target) {
        throw new GroupAccessError("INVALID_GROUP_INPUT", "El jugador no pertenece a este grupo");
      }
    });
  },

  async findMembership({ groupId, userId }) {
    const [membership] = await db
      .select({ role: member.role })
      .from(member)
      .where(and(eq(member.organizationId, groupId), eq(member.userId, userId)))
      .limit(1);

    if (!membership) return null;
    if (
      membership.role !== "owner" &&
      membership.role !== "leader" &&
      membership.role !== "member"
    ) {
      return null;
    }
    return { role: membership.role };
  },

  async findMembershipById({ groupId, membershipId }) {
    const [membership] = await db
      .select({ role: member.role, userId: member.userId })
      .from(member)
      .where(and(eq(member.organizationId, groupId), eq(member.id, membershipId)))
      .limit(1);
    if (
      !membership ||
      (membership.role !== "owner" && membership.role !== "leader" && membership.role !== "member")
    ) {
      return null;
    }
    return { role: membership.role, userId: membership.userId };
  },

  async linkPlayer({ groupId, playerId, linkedUserId }) {
    try {
      return await db.transaction(async (tx) => {
        await tx.execute(sql`select set_config('app.group_id', ${groupId}, true)`);
        if (linkedUserId) {
          const [targetMembership] = await tx
            .select({ userId: member.userId })
            .from(member)
            .where(and(eq(member.organizationId, groupId), eq(member.userId, linkedUserId)))
            .limit(1);
          if (!targetMembership) {
            throw new GroupAccessError(
              "PLAYER_LINK_TARGET_NOT_MEMBER",
              "La cuenta seleccionada no pertenece a este grupo",
            );
          }

          const [existingLink] = await tx
            .select({ playerId: player.id })
            .from(player)
            .where(and(eq(player.groupId, groupId), eq(player.linkedUserId, linkedUserId)))
            .limit(1);
          if (existingLink && existingLink.playerId !== playerId) {
            throw new GroupAccessError(
              "PLAYER_ACCOUNT_ALREADY_LINKED",
              "La cuenta seleccionada ya está vinculada a otro jugador",
            );
          }
        }

        const [updated] = await tx
          .update(player)
          .set({ linkedUserId, updatedAt: new Date() })
          .where(and(eq(player.groupId, groupId), eq(player.id, playerId)))
          .returning({ linkedUserId: player.linkedUserId, playerId: player.id });
        if (!updated) {
          throw new GroupAccessError("INVALID_GROUP_INPUT", "Player was not found in the group");
        }
        return updated;
      });
    } catch (error) {
      if (isPlayerAccountUniqueViolation(error)) {
        throw new GroupAccessError(
          "PLAYER_ACCOUNT_ALREADY_LINKED",
          "La cuenta seleccionada ya está vinculada a otro jugador",
        );
      }
      throw error;
    }
  },

  async unlinkMemberPlayer({ groupId, userId }) {
    await db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.group_id', ${groupId}, true)`);
      await tx
        .update(player)
        .set({ linkedUserId: null, updatedAt: new Date() })
        .where(and(eq(player.groupId, groupId), eq(player.linkedUserId, userId)));
    });
  },
};

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

const organizationGateway: OrganizationGateway = {
  async create({ headers, name, slug }) {
    const created = await auth.api.createOrganization({
      body: { name, slug },
      headers,
    });
    if (!created) {
      throw new GroupAccessError("INVALID_GROUP_INPUT", "Group could not be created");
    }
    return { id: created.id, name: created.name, slug: created.slug };
  },

  async list({ headers }) {
    const groups = await auth.api.listOrganizations({ headers });
    return groups.map(({ id, name, slug }) => ({ id, name, slug }));
  },

  async select({ headers, groupId }) {
    const selected = await auth.api.setActiveOrganization({
      body: { organizationId: groupId },
      headers,
    });
    if (!selected) {
      throw new GroupAccessError("MEMBERSHIP_REQUIRED", "Group membership is required");
    }
    return { id: selected.id, name: selected.name, slug: selected.slug };
  },

  async invite({ email, groupId, headers, playerId }) {
    const created = await auth.api.createInvitation({
      body: {
        email,
        organizationId: groupId,
        playerId,
        resend: true,
        role: "member",
      },
      headers,
    });
    return {
      email: created.email,
      expiresAt: created.expiresAt,
      id: created.id,
    };
  },

  async removeMember({ groupId, headers, membershipId }) {
    await auth.api.removeMember({
      body: { memberIdOrEmail: membershipId, organizationId: groupId },
      headers,
    });
  },

  async updateMemberRole({ groupId, headers, membershipId, role }) {
    await auth.api.updateMemberRole({
      body: { memberId: membershipId, organizationId: groupId, role },
      headers,
    });
  },
};

export const groupAccess = createGroupAccess({
  appBaseUrl: env.BETTER_AUTH_URL,
  invitationEmailDelivery: invitationDeliveryMode,
  organizations: organizationGateway,
  repository: groupAccessRepository,
  requireVerifiedEmailForGroupCreation: invitationDeliveryMode === "email",
});

const groupJoinRepository: GroupJoinRepository = {
  async findLink(groupId) {
    const [link] = await db
      .select({
        generation: groupJoinLink.generation,
        revokedAt: groupJoinLink.revokedAt,
      })
      .from(groupJoinLink)
      .where(eq(groupJoinLink.groupId, groupId))
      .limit(1);
    return link
      ? {
          active: link.revokedAt === null,
          generation: link.generation,
        }
      : null;
  },

  async replaceLink({ actorUserId, groupId }) {
    return db.transaction(async (tx) => {
      await tx.execute(
        sql`select ${organization.id} from ${organization} where ${organization.id} = ${groupId} for update`,
      );
      const [current] = await tx
        .select({ generation: groupJoinLink.generation })
        .from(groupJoinLink)
        .where(eq(groupJoinLink.groupId, groupId))
        .limit(1);
      const generation = (current?.generation ?? 0) + 1;
      await tx
        .insert(groupJoinLink)
        .values({
          generation,
          groupId,
          issuedAt: new Date(),
          issuedByUserId: actorUserId,
          revokedAt: null,
        })
        .onConflictDoUpdate({
          set: {
            generation,
            issuedAt: new Date(),
            issuedByUserId: actorUserId,
            revokedAt: null,
          },
          target: groupJoinLink.groupId,
        });
      return { generation };
    });
  },

  async revokeLink(groupId) {
    const [revoked] = await db
      .update(groupJoinLink)
      .set({ revokedAt: new Date() })
      .where(and(eq(groupJoinLink.groupId, groupId), isNull(groupJoinLink.revokedAt)))
      .returning({ groupId: groupJoinLink.groupId });
    if (!revoked) {
      throw new GroupJoinError("JOIN_LINK_NOT_ACTIVE", "No hay un link activo");
    }
  },

  async resolveLink({ generation, groupId }) {
    const [group] = await db
      .select({
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
      })
      .from(groupJoinLink)
      .innerJoin(organization, eq(organization.id, groupJoinLink.groupId))
      .where(
        and(
          eq(groupJoinLink.groupId, groupId),
          eq(groupJoinLink.generation, generation),
          isNull(groupJoinLink.revokedAt),
          isNull(organization.archivedAt),
        ),
      )
      .limit(1);
    return group ?? null;
  },

  async acceptLink({ generation, groupId, userId }) {
    return db.transaction(async (tx) => {
      const [group] = await tx
        .select({
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
        })
        .from(groupJoinLink)
        .innerJoin(organization, eq(organization.id, groupJoinLink.groupId))
        .where(
          and(
            eq(groupJoinLink.groupId, groupId),
            eq(groupJoinLink.generation, generation),
            isNull(groupJoinLink.revokedAt),
            isNull(organization.archivedAt),
          ),
        )
        .limit(1)
        .for("share");
      if (!group) {
        throw new GroupJoinError("JOIN_LINK_NOT_ACTIVE", "Este link fue desactivado o reemplazado");
      }

      const [existing] = await tx
        .select({ id: member.id })
        .from(member)
        .where(and(eq(member.organizationId, groupId), eq(member.userId, userId)))
        .limit(1);
      if (!existing) {
        await tx
          .insert(member)
          .values({
            id: randomUUID(),
            organizationId: groupId,
            role: "member",
            userId,
          })
          .onConflictDoNothing({
            target: [member.organizationId, member.userId],
          });
      }
      return {
        alreadyMember: Boolean(existing),
        group,
      };
    });
  },
};

export const groupJoinAccess = createGroupJoinAccess({
  appBaseUrl: env.BETTER_AUTH_URL,
  authorizeOwner: (actor, groupId) => groupAccess.authorize(actor, groupId, "owner"),
  repository: groupJoinRepository,
  signingSecret: env.BETTER_AUTH_SECRET,
});

type RuntimeTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function loadMatchInvitation(
  tx: RuntimeTransaction,
  groupId: string,
  matchId: string,
): Promise<MatchInvitationSource | null> {
  const [root] = await tx
    .select({
      capacity: match.capacity,
      courtAddress: court.address,
      courtCostMinor: match.courtCostMinor,
      courtMapsUrl: court.mapsUrl,
      courtName: court.name,
      currency: organization.currencyCode,
      groupName: organization.name,
      id: match.id,
      scheduledAt: match.scheduledAt,
      status: match.status,
      timeZone: organization.timeZone,
    })
    .from(match)
    .innerJoin(organization, eq(organization.id, match.groupId))
    .leftJoin(court, and(eq(court.groupId, match.groupId), eq(court.id, match.courtId)))
    .where(and(eq(match.groupId, groupId), eq(match.id, matchId), isNull(organization.archivedAt)))
    .limit(1);
  if (!root) return null;

  const [teams, appearances, players] = await Promise.all([
    tx
      .select({
        displayName: matchTeam.displayName,
        id: matchTeam.id,
        slot: matchTeam.slot,
        unattributedGoals: matchTeam.unattributedGoals,
      })
      .from(matchTeam)
      .where(and(eq(matchTeam.groupId, groupId), eq(matchTeam.matchId, matchId)))
      .orderBy(asc(matchTeam.slot)),
    tx
      .select({
        assists: matchAppearance.assists,
        goals: matchAppearance.goals,
        ownGoals: matchAppearance.ownGoals,
        teamId: matchAppearance.teamId,
      })
      .from(matchAppearance)
      .where(and(eq(matchAppearance.groupId, groupId), eq(matchAppearance.matchId, matchId))),
    tx
      .select({
        archivedAt: player.archivedAt,
        displayName: player.displayName,
        id: player.id,
        normalizedName: player.normalizedName,
        respondedAt: matchRsvp.respondedAt,
        response: matchRsvp.response,
      })
      .from(player)
      .leftJoin(
        matchRsvp,
        and(
          eq(matchRsvp.groupId, player.groupId),
          eq(matchRsvp.playerId, player.id),
          eq(matchRsvp.matchId, matchId),
        ),
      )
      .where(eq(player.groupId, groupId))
      .orderBy(asc(player.normalizedName), asc(player.id)),
  ]);
  const score = calculateScore({
    appearances,
    teams: teams.map(({ id, unattributedGoals }) => ({ id, unattributedGoals })),
  });

  return {
    group: {
      currency: root.currency,
      name: root.groupName,
      timeZone: root.timeZone,
    },
    match: {
      capacity: root.capacity,
      court:
        root.courtName && root.courtAddress && root.courtMapsUrl
          ? {
              address: root.courtAddress,
              mapsUrl: root.courtMapsUrl,
              name: root.courtName,
            }
          : null,
      courtCostMinor: root.courtCostMinor,
      id: root.id,
      scheduledAt: root.scheduledAt,
      status: root.status,
      teams: teams.map((team) => ({
        displayName: team.displayName,
        goals: score.find((item) => item.teamId === team.id)?.goals ?? 0,
      })),
    },
    players: players.map((item) => ({
      archived: item.archivedAt !== null,
      displayName: item.displayName,
      id: item.id,
      normalizedName: item.normalizedName,
      respondedAt: item.respondedAt,
      response: item.response,
    })),
  };
}

const matchInviteRepository: MatchInviteRepository = {
  async read({ groupId, matchId }) {
    return db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.group_id', ${groupId}, true)`);
      return loadMatchInvitation(tx, groupId, matchId);
    });
  },

  async respond({ groupId, matchId, playerId, response }) {
    return db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.group_id', ${groupId}, true)`);
      const [root] = await tx
        .select({ status: match.status })
        .from(match)
        .where(and(eq(match.groupId, groupId), eq(match.id, matchId)))
        .limit(1)
        .for("update");
      if (!root) return null;
      if (root.status !== "open") {
        throw new MatchInviteError("MATCH_NOT_OPEN", "La convocatoria ya está cerrada");
      }
      const [eligible] = await tx
        .select({ id: player.id })
        .from(player)
        .where(and(eq(player.groupId, groupId), eq(player.id, playerId), isNull(player.archivedAt)))
        .limit(1);
      if (!eligible) {
        throw new MatchInviteError("PLAYER_NOT_FOUND", "El jugador no está disponible");
      }
      const [current] = await tx
        .select({
          respondedAt: matchRsvp.respondedAt,
          response: matchRsvp.response,
        })
        .from(matchRsvp)
        .where(
          and(
            eq(matchRsvp.groupId, groupId),
            eq(matchRsvp.matchId, matchId),
            eq(matchRsvp.playerId, playerId),
          ),
        )
        .limit(1);
      const respondedAt =
        current?.response === "yes" && response === "yes" ? current.respondedAt : new Date();
      await tx
        .insert(matchRsvp)
        .values({ groupId, matchId, playerId, respondedAt, response })
        .onConflictDoUpdate({
          target: [matchRsvp.groupId, matchRsvp.matchId, matchRsvp.playerId],
          set: { respondedAt, response, updatedAt: new Date() },
        });
      return loadMatchInvitation(tx, groupId, matchId);
    });
  },
};

export const matchInviteAccess = createMatchInviteAccess({
  appBaseUrl: env.BETTER_AUTH_URL,
  repository: matchInviteRepository,
  signingSecret: env.BETTER_AUTH_SECRET,
});

const statsQueries = createStatsQueries(db);

const sharedAccessRepository: SharedAccessRepository = {
  async replaceLink({ actorUserId, groupId, mode, tokenHash }) {
    return db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.group_id', ${groupId}, true)`);
      await tx.execute(
        sql`select ${organization.id} from ${organization} where ${organization.id} = ${groupId} for update`,
      );
      const [active] = await tx
        .select({ generation: groupSharedLink.generation })
        .from(groupSharedLink)
        .where(eq(groupSharedLink.groupId, groupId))
        .limit(1);
      const [history] = await tx
        .select({ generation: max(groupSharedLinkEvent.generation) })
        .from(groupSharedLinkEvent)
        .where(eq(groupSharedLinkEvent.groupId, groupId));
      if (mode === "issue" && active) {
        throw new SharedAccessError("SHARED_LINK_ALREADY_ACTIVE", "Shared link is already active");
      }
      if (mode === "rotate" && !active) {
        throw new SharedAccessError("SHARED_LINK_NOT_ACTIVE", "Shared link is not active");
      }
      const generation = Math.max(active?.generation ?? 0, history?.generation ?? 0) + 1;

      await tx
        .insert(groupSharedLink)
        .values({
          generation,
          groupId,
          issuedAt: new Date(),
          issuedByUserId: actorUserId,
          tokenHash,
        })
        .onConflictDoUpdate({
          set: {
            generation,
            issuedAt: new Date(),
            issuedByUserId: actorUserId,
            tokenHash,
          },
          target: groupSharedLink.groupId,
        });
      await tx.insert(groupSharedLinkEvent).values({
        action: mode === "rotate" ? "rotated" : "created",
        actorUserId,
        generation,
        groupId,
      });
      return { generation };
    });
  },

  async revokeLink({ actorUserId, groupId }) {
    return db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.group_id', ${groupId}, true)`);
      await tx.execute(
        sql`select ${organization.id} from ${organization} where ${organization.id} = ${groupId} for update`,
      );
      const [active] = await tx
        .delete(groupSharedLink)
        .where(eq(groupSharedLink.groupId, groupId))
        .returning({ generation: groupSharedLink.generation });
      if (!active) {
        throw new SharedAccessError("SHARED_LINK_NOT_ACTIVE", "Shared link is not active");
      }
      await tx.insert(groupSharedLinkEvent).values({
        action: "revoked",
        actorUserId,
        generation: active.generation,
        groupId,
      });
      return active;
    });
  },

  async resolveLink(tokenHash) {
    const resolution = await db.execute<{ group_id: string }>(
      sql`select hay_fulbo_resolve_shared_group(${tokenHash}) as group_id`,
    );
    const groupId = resolution.rows[0]?.group_id;
    if (!groupId) return null;

    return db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.group_id', ${groupId}, true)`);
      const [active] = await tx
        .select({ generation: groupSharedLink.generation, groupId: groupSharedLink.groupId })
        .from(groupSharedLink)
        .where(and(eq(groupSharedLink.groupId, groupId), eq(groupSharedLink.tokenHash, tokenHash)))
        .limit(1);
      return active ?? null;
    });
  },

  async readSnapshot({ generation, groupId, tokenHash }) {
    return db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.group_id', ${groupId}, true)`);
      const [active] = await tx
        .select({ generation: groupSharedLink.generation })
        .from(groupSharedLink)
        .where(
          and(
            eq(groupSharedLink.groupId, groupId),
            eq(groupSharedLink.generation, generation),
            eq(groupSharedLink.tokenHash, tokenHash),
          ),
        )
        .limit(1)
        .for("share");
      if (!active) {
        throw new SharedAccessError("INVALID_SHARED_ACCESS", "Shared access is invalid");
      }
      const [group] = await tx
        .select({
          currencyCode: organization.currencyCode,
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          timeZone: organization.timeZone,
        })
        .from(organization)
        .where(and(eq(organization.id, groupId), sql`${organization.archivedAt} is null`))
        .limit(1);
      if (!group) {
        throw new SharedAccessError("INVALID_SHARED_ACCESS", "Shared access is invalid");
      }

      const players = await tx
        .select({
          archivedAt: player.archivedAt,
          displayName: player.displayName,
          id: player.id,
        })
        .from(player)
        .where(eq(player.groupId, groupId))
        .orderBy(asc(player.normalizedName), asc(player.id));
      const courts = await tx
        .select({
          address: court.address,
          archivedAt: court.archivedAt,
          id: court.id,
          mapsUrl: court.mapsUrl,
          name: court.name,
        })
        .from(court)
        .where(eq(court.groupId, groupId))
        .orderBy(asc(court.normalizedName), asc(court.id));
      const matches = await tx
        .select({
          courtCostMinor: match.courtCostMinor,
          courtId: match.courtId,
          id: match.id,
          scheduledAt: match.scheduledAt,
          status: match.status,
        })
        .from(match)
        .where(eq(match.groupId, groupId))
        .orderBy(asc(match.scheduledAt), asc(match.id));

      const matchIds = matches.map(({ id }) => id);
      const teams =
        matchIds.length === 0
          ? []
          : await tx
              .select({
                color: matchTeam.color,
                displayName: matchTeam.displayName,
                id: matchTeam.id,
                matchId: matchTeam.matchId,
                slot: matchTeam.slot,
                unattributedGoals: matchTeam.unattributedGoals,
              })
              .from(matchTeam)
              .where(and(eq(matchTeam.groupId, groupId), inArray(matchTeam.matchId, matchIds)))
              .orderBy(asc(matchTeam.matchId), asc(matchTeam.slot));
      const appearances =
        matchIds.length === 0
          ? []
          : await tx
              .select({
                assists: matchAppearance.assists,
                expectedMinor: matchAppearance.expectedMinor,
                goals: matchAppearance.goals,
                matchId: matchAppearance.matchId,
                ownGoals: matchAppearance.ownGoals,
                paidMinor: matchAppearance.paidMinor,
                playerId: matchAppearance.playerId,
                teamId: matchAppearance.teamId,
              })
              .from(matchAppearance)
              .where(
                and(
                  eq(matchAppearance.groupId, groupId),
                  inArray(matchAppearance.matchId, matchIds),
                ),
              )
              .orderBy(asc(matchAppearance.matchId), asc(matchAppearance.joinedOrder));

      return {
        courts: courts.map((item) => ({
          ...item,
          archivedAt: item.archivedAt?.toISOString() ?? null,
        })),
        group,
        matches: matches.map((item) => ({
          ...item,
          appearances: appearances
            .filter(({ matchId }) => matchId === item.id)
            .map(({ matchId: _matchId, ...appearance }) => ({
              ...appearance,
              expectedMinor: appearance.expectedMinor.toString(),
              paidMinor: appearance.paidMinor.toString(),
            })),
          courtCostMinor: item.courtCostMinor?.toString() ?? null,
          scheduledAt: item.scheduledAt.toISOString(),
          teams: teams
            .filter(({ matchId }) => matchId === item.id)
            .map(({ matchId: _matchId, ...team }) => team),
        })),
        players: players.map((item) => ({
          ...item,
          archivedAt: item.archivedAt?.toISOString() ?? null,
        })),
      };
    });
  },

  async readDashboard({ generation, groupId, tokenHash }, filters) {
    return readSharedStats(() =>
      statsQueries.dashboard({ kind: "shared", generation, groupId, tokenHash }, filters),
    );
  },

  async readPlayer({ generation, groupId, tokenHash }, playerId, filters) {
    return readSharedStats(() =>
      statsQueries.player({ kind: "shared", generation, groupId, tokenHash }, playerId, filters),
    );
  },

  async readMatch({ generation, groupId, tokenHash }, matchId) {
    return readSharedStats(() =>
      statsQueries.match({ kind: "shared", generation, groupId, tokenHash }, matchId),
    );
  },
};

async function readSharedStats<T>(operation: () => Promise<T>) {
  try {
    return await operation();
  } catch (error) {
    if (
      error instanceof StatsReadError &&
      (error.code === "invalid_shared_access" || error.code === "group_not_found")
    ) {
      throw new SharedAccessError("INVALID_SHARED_ACCESS", "Shared access is invalid");
    }
    throw error;
  }
}

export const sharedAccess = createSharedAccess({
  appBaseUrl: env.BETTER_AUTH_URL,
  authorizeOwner: (actor, groupId) => groupAccess.authorize(actor, groupId, "owner"),
  repository: sharedAccessRepository,
});
