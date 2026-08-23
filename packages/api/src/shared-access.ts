import { createHash, randomBytes } from "node:crypto";
import type {
  PlayerStats,
  StatsDashboard,
  StatsFilters,
  StatsMatchDetail,
} from "@hay-fulbo/db/stats";

import type { GroupActor, GroupAuthorization } from "./group-access";

export type SharedGroupSnapshot = {
  group: {
    id: string;
    name: string;
    slug: string;
    currencyCode: string;
    timeZone: string;
  };
  players: Array<{
    id: string;
    displayName: string;
    archivedAt: string | null;
  }>;
  courts: Array<{
    id: string;
    name: string;
    address: string;
    mapsUrl: string;
    archivedAt: string | null;
  }>;
  matches: Array<{
    id: string;
    courtId: string | null;
    scheduledAt: string;
    courtCostMinor: string | null;
    status: "open" | "closed" | "cancelled";
    teams: Array<{
      id: string;
      slot: number;
      displayName: string;
      unattributedGoals: number;
    }>;
    appearances: Array<{
      playerId: string;
      teamId: string;
      goals: number;
      assists: number;
      ownGoals: number;
      expectedMinor: string;
      paidMinor: string;
    }>;
  }>;
};

export interface SharedAccessRepository {
  replaceLink(input: {
    actorUserId: string;
    groupId: string;
    mode: "issue" | "rotate";
    tokenHash: Buffer;
  }): Promise<{ generation: number }>;
  revokeLink(input: { actorUserId: string; groupId: string }): Promise<{ generation: number }>;
  resolveLink(tokenHash: Buffer): Promise<{ groupId: string; generation: number } | null>;
  readSnapshot(context: {
    groupId: string;
    generation: number;
    tokenHash: Buffer;
  }): Promise<SharedGroupSnapshot>;
  readDashboard(
    context: { groupId: string; generation: number; tokenHash: Buffer },
    filters: StatsFilters,
  ): Promise<StatsDashboard>;
  readPlayer(
    context: { groupId: string; generation: number; tokenHash: Buffer },
    playerId: string,
    filters: StatsFilters,
  ): Promise<PlayerStats>;
  readMatch(
    context: { groupId: string; generation: number; tokenHash: Buffer },
    matchId: string,
  ): Promise<StatsMatchDetail>;
}

export type SharedAccessErrorCode =
  | "INVALID_SHARED_ACCESS"
  | "SHARED_LINK_ALREADY_ACTIVE"
  | "SHARED_LINK_NOT_ACTIVE";

export class SharedAccessError extends Error {
  readonly code: SharedAccessErrorCode;

  constructor(code: SharedAccessErrorCode, message: string) {
    super(message);
    this.name = "SharedAccessError";
    this.code = code;
  }
}

export type SharedAccessContext = {
  groupId: string;
  generation: number;
};

export interface PublicAccessRepository {
  resolvePublicGroup(slug: string): Promise<{ id: string } | null>;
  readPublicSnapshot(context: { groupId: string }): Promise<SharedGroupSnapshot>;
  readPublicDashboard(context: { groupId: string }, filters: StatsFilters): Promise<StatsDashboard>;
  readPublicPlayer(
    context: { groupId: string },
    playerId: string,
    filters: StatsFilters,
  ): Promise<PlayerStats>;
  readPublicMatch(context: { groupId: string }, matchId: string): Promise<StatsMatchDetail>;
}

export function createPublicAccess({ repository }: { repository: PublicAccessRepository }) {
  const resolve = async (slug: string) => {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      throw new SharedAccessError("INVALID_SHARED_ACCESS", "Public access is invalid");
    }
    const group = await repository.resolvePublicGroup(slug);
    if (!group) {
      throw new SharedAccessError("INVALID_SHARED_ACCESS", "Public access is invalid");
    }
    return { groupId: group.id };
  };

  return {
    async snapshot(slug: string) {
      return repository.readPublicSnapshot(await resolve(slug));
    },

    async dashboard(slug: string, filters: StatsFilters = {}) {
      return repository.readPublicDashboard(await resolve(slug), filters);
    },

    async player(slug: string, playerId: string, filters: StatsFilters = {}) {
      return repository.readPublicPlayer(await resolve(slug), playerId, filters);
    },

    async match(slug: string, matchId: string) {
      return repository.readPublicMatch(await resolve(slug), matchId);
    },
  };
}

export type PublicAccess = ReturnType<typeof createPublicAccess>;

type SharedAccessDependencies = {
  repository: SharedAccessRepository;
  authorizeOwner: (actor: GroupActor, groupId: string) => Promise<GroupAuthorization>;
  appBaseUrl: string;
};

function hashToken(token: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
    throw new SharedAccessError("INVALID_SHARED_ACCESS", "Shared access is invalid");
  }
  return createHash("sha256").update(token, "utf8").digest();
}

export function createSharedAccess({
  repository,
  authorizeOwner,
  appBaseUrl,
}: SharedAccessDependencies) {
  const contextHashes = new WeakMap<SharedAccessContext, Buffer>();

  const replace = async (actor: GroupActor, groupId: string, mode: "issue" | "rotate") => {
    await authorizeOwner(actor, groupId);
    const token = randomBytes(32).toString("base64url");
    const link = await repository.replaceLink({
      actorUserId: actor.userId,
      groupId,
      mode,
      tokenHash: hashToken(token),
    });
    return {
      generation: link.generation,
      token,
      url: `${new URL("/compartido", appBaseUrl).href}#${token}`,
    };
  };

  const authenticateHash = async (tokenHash: Buffer): Promise<SharedAccessContext> => {
    const resolved = await repository.resolveLink(tokenHash);
    if (!resolved) {
      throw new SharedAccessError("INVALID_SHARED_ACCESS", "Shared access is invalid");
    }
    const context: SharedAccessContext = {
      groupId: resolved.groupId,
      generation: resolved.generation,
    };
    contextHashes.set(context, tokenHash);
    return context;
  };

  return {
    issue: (actor: GroupActor, groupId: string) => replace(actor, groupId, "issue"),
    rotate: (actor: GroupActor, groupId: string) => replace(actor, groupId, "rotate"),

    async revoke(actor: GroupActor, groupId: string) {
      await authorizeOwner(actor, groupId);
      return repository.revokeLink({ actorUserId: actor.userId, groupId });
    },

    async authenticate(token: string) {
      return authenticateHash(hashToken(token));
    },

    async readSnapshot(context: SharedAccessContext) {
      const tokenHash = contextHashes.get(context);
      if (!tokenHash) {
        throw new SharedAccessError("INVALID_SHARED_ACCESS", "Shared access is invalid");
      }
      return repository.readSnapshot({ ...context, tokenHash });
    },

    async readDashboard(context: SharedAccessContext, filters: StatsFilters = {}) {
      const tokenHash = contextHashes.get(context);
      if (!tokenHash) {
        throw new SharedAccessError("INVALID_SHARED_ACCESS", "Shared access is invalid");
      }
      return repository.readDashboard({ ...context, tokenHash }, filters);
    },

    async readPlayer(context: SharedAccessContext, playerId: string, filters: StatsFilters = {}) {
      const tokenHash = contextHashes.get(context);
      if (!tokenHash) {
        throw new SharedAccessError("INVALID_SHARED_ACCESS", "Shared access is invalid");
      }
      return repository.readPlayer({ ...context, tokenHash }, playerId, filters);
    },

    async readMatch(context: SharedAccessContext, matchId: string) {
      const tokenHash = contextHashes.get(context);
      if (!tokenHash) {
        throw new SharedAccessError("INVALID_SHARED_ACCESS", "Shared access is invalid");
      }
      return repository.readMatch({ ...context, tokenHash }, matchId);
    },
  };
}

export type SharedAccess = ReturnType<typeof createSharedAccess>;
