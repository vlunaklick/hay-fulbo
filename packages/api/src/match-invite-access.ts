import { createHmac, timingSafeEqual } from "node:crypto";

export type MatchInviteResponse = "yes" | "maybe" | "no";

export type MatchInvitationSource = {
  group: {
    currency: string;
    name: string;
    timeZone: string;
  };
  match: {
    capacity: number;
    court: { address: string; mapsUrl: string; name: string } | null;
    courtCostMinor: bigint | null;
    id: string;
    scheduledAt: Date;
    status: "open" | "closed" | "cancelled";
    teams: { displayName: string; goals: number }[];
  };
  players: {
    archived: boolean;
    displayName: string;
    id: string;
    normalizedName: string;
    respondedAt: Date | null;
    response: MatchInviteResponse | null;
  }[];
};

export type MatchInvitation = {
  group: MatchInvitationSource["group"];
  match: Omit<MatchInvitationSource["match"], "courtCostMinor"> & {
    courtCostMinor: string | null;
    estimatedPerPlayerMinor: string | null;
  };
  players: {
    displayName: string;
    id: string;
    place: "playing" | "waitlist" | null;
    respondedAt: Date | null;
    response: MatchInviteResponse | null;
  }[];
  summary: {
    maybe: number;
    no: number;
    playing: number;
    remaining: number;
    waitlisted: number;
  };
};

export interface MatchInviteRepository {
  read(input: { groupId: string; matchId: string }): Promise<MatchInvitationSource | null>;
  respond(input: {
    groupId: string;
    matchId: string;
    playerId: string;
    response: MatchInviteResponse;
  }): Promise<MatchInvitationSource | null>;
}

export type MatchInviteErrorCode =
  | "INVALID_MATCH_INVITE"
  | "MATCH_INVITE_NOT_FOUND"
  | "MATCH_NOT_OPEN"
  | "PLAYER_NOT_FOUND";

export class MatchInviteError extends Error {
  constructor(
    readonly code: MatchInviteErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "MatchInviteError";
  }
}

type MatchInvitePayload = {
  groupId: string;
  matchId: string;
};

function encodePayload(payload: MatchInvitePayload) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function signPayload(payload: string, signingSecret: string) {
  return createHmac("sha256", signingSecret).update(payload, "utf8").digest("base64url");
}

function createToken(payload: MatchInvitePayload, signingSecret: string) {
  const encoded = encodePayload(payload);
  return `${encoded}.${signPayload(encoded, signingSecret)}`;
}

function readToken(token: string, signingSecret: string): MatchInvitePayload {
  const [encoded, signature, extra] = token.split(".");
  if (!encoded || !signature || extra || !/^[A-Za-z0-9_-]+$/.test(encoded)) {
    throw invalidInvite();
  }
  const expected = Buffer.from(signPayload(encoded, signingSecret), "base64url");
  const received = Buffer.from(signature, "base64url");
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    throw invalidInvite();
  }
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as unknown;
    if (
      typeof payload !== "object" ||
      payload === null ||
      !("groupId" in payload) ||
      typeof payload.groupId !== "string" ||
      payload.groupId.length < 1 ||
      payload.groupId.length > 200 ||
      !("matchId" in payload) ||
      typeof payload.matchId !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(payload.matchId)
    ) {
      throw new Error("invalid");
    }
    return { groupId: payload.groupId, matchId: payload.matchId };
  } catch {
    throw invalidInvite();
  }
}

function invalidInvite() {
  return new MatchInviteError("INVALID_MATCH_INVITE", "El link del partido no es válido");
}

export function toMatchInvitation(source: MatchInvitationSource): MatchInvitation {
  const activePlayers = source.players
    .filter((item) => !item.archived)
    .toSorted(
      (left, right) =>
        left.normalizedName.localeCompare(right.normalizedName, "es") ||
        left.id.localeCompare(right.id),
    );
  const positive = activePlayers
    .filter(
      (
        item,
      ): item is typeof item & {
        respondedAt: Date;
        response: "yes";
      } => item.response === "yes" && item.respondedAt !== null,
    )
    .toSorted(
      (left, right) =>
        left.respondedAt.getTime() - right.respondedAt.getTime() || left.id.localeCompare(right.id),
    );
  const places = new Map(
    positive.map((item, index) => [
      item.id,
      index < source.match.capacity ? ("playing" as const) : ("waitlist" as const),
    ]),
  );
  const playing = Math.min(positive.length, source.match.capacity);

  return {
    group: source.group,
    match: {
      ...source.match,
      courtCostMinor: source.match.courtCostMinor?.toString() ?? null,
      estimatedPerPlayerMinor:
        source.match.courtCostMinor === null
          ? null
          : (
              (source.match.courtCostMinor + BigInt(source.match.capacity) - 1n) /
              BigInt(source.match.capacity)
            ).toString(),
    },
    players: activePlayers.map((item) => ({
      displayName: item.displayName,
      id: item.id,
      place: places.get(item.id) ?? null,
      respondedAt: item.respondedAt,
      response: item.response,
    })),
    summary: {
      maybe: activePlayers.filter((item) => item.response === "maybe").length,
      no: activePlayers.filter((item) => item.response === "no").length,
      playing,
      remaining: Math.max(source.match.capacity - playing, 0),
      waitlisted: Math.max(positive.length - source.match.capacity, 0),
    },
  };
}

export function createMatchInviteAccess({
  appBaseUrl,
  repository,
  signingSecret,
}: {
  appBaseUrl: string;
  repository: MatchInviteRepository;
  signingSecret: string;
}) {
  if (signingSecret.length < 32) {
    throw new Error("Match invite signing secret must contain at least 32 characters");
  }

  const resolve = async (token: string) => {
    const payload = readToken(token, signingSecret);
    const source = await repository.read(payload);
    if (!source) {
      throw new MatchInviteError("MATCH_INVITE_NOT_FOUND", "Este partido ya no está disponible");
    }
    return { payload, source };
  };

  return {
    createUrl(input: MatchInvitePayload) {
      const token = createToken(input, signingSecret);
      return new URL(`/jugar/${encodeURIComponent(token)}`, appBaseUrl).href;
    },

    async preview(token: string) {
      const { source } = await resolve(token);
      return toMatchInvitation(source);
    },

    async respond(token: string, playerId: string, response: MatchInviteResponse) {
      const { payload, source } = await resolve(token);
      if (source.match.status !== "open") {
        throw new MatchInviteError("MATCH_NOT_OPEN", "La convocatoria ya está cerrada");
      }
      if (!source.players.some((player) => !player.archived && player.id === playerId)) {
        throw new MatchInviteError("PLAYER_NOT_FOUND", "El jugador no está disponible");
      }
      const updated = await repository.respond({ ...payload, playerId, response });
      if (!updated) {
        throw new MatchInviteError("MATCH_INVITE_NOT_FOUND", "Este partido ya no está disponible");
      }
      return toMatchInvitation(updated);
    },
  };
}

export type MatchInviteAccess = ReturnType<typeof createMatchInviteAccess>;
