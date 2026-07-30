import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { NodePgDatabase, NodePgTransaction } from "drizzle-orm/node-postgres";

import type * as schema from "../schema";

export type MatchDatabase = NodePgDatabase<typeof schema>;
export type MatchTransaction = NodePgTransaction<
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;

export type MatchScope = {
  groupId: string;
  actorUserId: string;
  role?: "leader" | "member" | "owner";
};

export type MatchCommandErrorCode =
  | "membership_required"
  | "owner_required"
  | "group_archived"
  | "not_found"
  | "forbidden"
  | "concurrent_update"
  | "match_not_open"
  | "match_not_closed"
  | "match_not_cancelled"
  | "invalid_input"
  | "invalid_transition"
  | "closure_invalid"
  | "player_archived"
  | "court_archived"
  | "player_account_already_linked";

export class MatchCommandError extends Error {
  constructor(
    readonly code: MatchCommandErrorCode,
    message: string = code,
    readonly details?: readonly string[],
  ) {
    super(message);
    this.name = "MatchCommandError";
  }
}

export type MatchMutationResult = {
  matchId: string;
  lockVersion: number;
};

export type MatchCommand =
  | {
      type: "createMatch";
      scheduledAt: Date;
      courtId?: string | null;
      courtCostMinor?: bigint | null;
      capacity?: number;
      teams: readonly [
        { displayName: string; color?: string | null },
        { displayName: string; color?: string | null },
      ];
    }
  | {
      type: "upsertPlayer";
      playerId?: string;
      displayName: string;
      linkedUserId?: string | null;
    }
  | { type: "archivePlayer"; playerId: string; archived: boolean }
  | {
      type: "upsertCourt";
      courtId?: string;
      name: string;
      address: string;
      mapsUrl: string;
    }
  | { type: "archiveCourt"; courtId: string; archived: boolean }
  | {
      type: "updateMatch";
      matchId: string;
      expectedLockVersion: number;
      scheduledAt?: Date;
      courtId?: string | null;
      courtCostMinor?: bigint | null;
      capacity?: number;
    }
  | {
      type: "updateTeam";
      matchId: string;
      expectedLockVersion: number;
      teamId: string;
      displayName: string;
      color?: string | null;
    }
  | {
      type: "setCaptain";
      matchId: string;
      expectedLockVersion: number;
      teamId: string;
      captainUserId: string | null;
    }
  | {
      type: "addParticipant";
      matchId: string;
      expectedLockVersion: number;
      teamId: string;
      playerId: string;
    }
  | {
      type: "createAndAddParticipant";
      matchId: string;
      expectedLockVersion: number;
      teamId: string;
      displayName: string;
    }
  | {
      type: "removeParticipant";
      matchId: string;
      expectedLockVersion: number;
      playerId: string;
    }
  | {
      type: "assignParticipantTeam";
      matchId: string;
      expectedLockVersion: number;
      playerId: string;
      teamId: string;
    }
  | {
      type: "updateAppearance";
      matchId: string;
      expectedLockVersion: number;
      playerId: string;
      goals: number;
      assists: number;
      ownGoals: number;
    }
  | {
      type: "setUnattributedGoals";
      matchId: string;
      expectedLockVersion: number;
      teamId: string;
      goals: number;
    }
  | {
      type: "setExpectedContribution";
      matchId: string;
      expectedLockVersion: number;
      playerId: string;
      kind: "automatic" | "fixed";
      expectedMinor?: bigint;
    }
  | {
      type: "updatePaid";
      matchId: string;
      expectedLockVersion: number;
      playerId: string;
      paidMinor: bigint;
    }
  | {
      type: "closeMatch";
      matchId: string;
      expectedLockVersion: number;
    }
  | {
      type: "reopenMatch";
      matchId: string;
      expectedLockVersion: number;
      reason: string;
    }
  | {
      type: "cancelMatch";
      matchId: string;
      expectedLockVersion: number;
      reason: string;
    }
  | {
      type: "restoreMatch";
      matchId: string;
      expectedLockVersion: number;
      reason: string;
    }
  | {
      type: "transferOrganizer";
      matchId: string;
      expectedLockVersion: number;
      nextOrganizerUserId: string;
      reason: string;
    };

export type MatchCommandResult =
  | (MatchMutationResult & { teamIds: [string, string] })
  | (MatchMutationResult & { playerId: string })
  | MatchMutationResult
  | { playerId: string }
  | { courtId: string };

export type MatchCommandResultFor<TCommand extends MatchCommand> = TCommand extends {
  type: "createMatch";
}
  ? MatchMutationResult & { teamIds: [string, string] }
  : TCommand extends { type: "upsertPlayer" | "archivePlayer" }
    ? { playerId: string }
    : TCommand extends { type: "createAndAddParticipant" }
      ? MatchMutationResult & { playerId: string }
      : TCommand extends { type: "upsertCourt" | "archiveCourt" }
        ? { courtId: string }
        : MatchMutationResult;

export type ContributionStatus = "exempt" | "pending" | "partial" | "paid" | "overpaid";
export type RsvpResponse = "yes" | "maybe" | "no";

export type MatchDetail = {
  id: string;
  groupId: string;
  organizerUserId: string;
  courtId: string | null;
  scheduledAt: Date;
  courtCostMinor: bigint | null;
  capacity: number;
  status: "open" | "closed" | "cancelled";
  lockVersion: number;
  score: readonly { teamId: string; goals: number }[];
  rsvps: readonly {
    playerId: string;
    playerDisplayName: string;
    response: RsvpResponse;
    respondedAt: Date;
  }[];
  teams: readonly {
    id: string;
    slot: number;
    displayName: string;
    color: string | null;
    captainUserId: string | null;
    unattributedGoals: number;
    appearances: readonly {
      playerId: string;
      playerDisplayName: string;
      teamId: string;
      joinedOrder: number;
      goals: number;
      assists: number;
      ownGoals: number;
      expectedKind: "automatic" | "fixed";
      expectedMinor: bigint;
      paidMinor: bigint;
      contributionStatus: ContributionStatus;
      debtMinor: bigint;
      overpaidMinor: bigint;
    }[];
  }[];
};

export type MatchListItem = Omit<MatchDetail, "teams"> & {
  teams: readonly {
    id: string;
    slot: number;
    displayName: string;
    color: string | null;
    goals: number;
  }[];
};

export type MatchDirectory = {
  players: {
    id: string;
    displayName: string;
    archivedAt: Date | null;
    linkedUserId: string | null;
  }[];
  courts: {
    id: string;
    name: string;
    address: string;
    mapsUrl: string;
    archivedAt: Date | null;
  }[];
  members: {
    id: string;
    membershipId: string;
    name: string;
    email: string;
    role: "owner" | "leader" | "member";
    linkedPlayerId: string | null;
  }[];
};
