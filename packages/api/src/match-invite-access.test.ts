import { describe, expect, test } from "bun:test";

import {
  createMatchInviteAccess,
  MatchInviteError,
  type MatchInvitationSource,
  type MatchInviteRepository,
} from "./match-invite-access";

const matchId = "00000000-0000-4000-8000-000000000001";
const baseSource: MatchInvitationSource = {
  group: {
    currency: "ARS",
    name: "Los Miércoles",
    timeZone: "America/Argentina/Buenos_Aires",
  },
  match: {
    capacity: 2,
    court: { address: "Av. Siempre Viva 123", mapsUrl: "https://maps.example", name: "El Andén" },
    courtCostMinor: 10_001n,
    id: matchId,
    scheduledAt: new Date("2026-08-06T00:00:00.000Z"),
    status: "open",
    teams: [
      { displayName: "Oscuros", goals: 0 },
      { displayName: "Claros", goals: 0 },
    ],
  },
  players: [
    {
      archived: false,
      displayName: "Ana",
      id: "00000000-0000-4000-8000-000000000010",
      normalizedName: "ana",
      respondedAt: new Date("2026-08-01T10:00:00.000Z"),
      response: "yes",
    },
    {
      archived: false,
      displayName: "Beto",
      id: "00000000-0000-4000-8000-000000000011",
      normalizedName: "beto",
      respondedAt: new Date("2026-08-01T11:00:00.000Z"),
      response: "yes",
    },
    {
      archived: false,
      displayName: "Caro",
      id: "00000000-0000-4000-8000-000000000012",
      normalizedName: "caro",
      respondedAt: new Date("2026-08-01T12:00:00.000Z"),
      response: "yes",
    },
  ],
};

function setup(source: MatchInvitationSource = structuredClone(baseSource)) {
  let current = source;
  const repository: MatchInviteRepository = {
    read: async ({ groupId, matchId: candidate }) =>
      groupId === "group-1" && candidate === matchId ? current : null,
    respond: async ({ playerId, response }) => {
      current = {
        ...current,
        players: current.players.map((player) =>
          player.id === playerId
            ? {
                ...player,
                respondedAt:
                  player.response === "yes" && response === "yes"
                    ? player.respondedAt
                    : new Date("2026-08-02T10:00:00.000Z"),
                response,
              }
            : player,
        ),
      };
      return current;
    },
  };
  return createMatchInviteAccess({
    appBaseUrl: "https://fulbo.example",
    repository,
    signingSecret: "test-secret-that-is-longer-than-thirty-two-characters",
  });
}

describe("match invite access", () => {
  test("signs a private URL and derives places, waitlist and cost", async () => {
    const access = setup();
    const url = access.createUrl({ groupId: "group-1", matchId });
    const invitation = await access.preview(url.split("/").at(-1)!);

    expect(invitation.match.estimatedPerPlayerMinor).toBe("5001");
    expect(invitation.summary).toEqual({
      maybe: 0,
      no: 0,
      playing: 2,
      remaining: 0,
      waitlisted: 1,
    });
    expect(invitation.players.map(({ displayName, place }) => [displayName, place])).toEqual([
      ["Ana", "playing"],
      ["Beto", "playing"],
      ["Caro", "waitlist"],
    ]);
  });

  test("rejects a tampered capability before repository access", async () => {
    const access = setup();
    const token = access.createUrl({ groupId: "group-1", matchId }).split("/").at(-1)!;
    await expect(access.preview(`${token}tampered`)).rejects.toMatchObject({
      code: "INVALID_MATCH_INVITE",
    });
  });

  test("preserves an idempotent yes place and moves a changed answer to the end", async () => {
    const access = setup();
    const token = access.createUrl({ groupId: "group-1", matchId }).split("/").at(-1)!;
    const same = await access.respond(token, "00000000-0000-4000-8000-000000000010", "yes");
    expect(same.players.find((player) => player.displayName === "Ana")?.place).toBe("playing");

    await access.respond(token, "00000000-0000-4000-8000-000000000010", "no");
    const changed = await access.respond(token, "00000000-0000-4000-8000-000000000010", "yes");
    expect(changed.players.find((player) => player.displayName === "Ana")?.place).toBe("waitlist");
  });

  test("does not accept responses for closed matches or unknown players", async () => {
    const closed = setup({
      ...structuredClone(baseSource),
      match: { ...baseSource.match, status: "closed" },
    });
    const closedToken = closed.createUrl({ groupId: "group-1", matchId }).split("/").at(-1)!;
    await expect(
      closed.respond(closedToken, "00000000-0000-4000-8000-000000000010", "yes"),
    ).rejects.toBeInstanceOf(MatchInviteError);

    const open = setup();
    const openToken = open.createUrl({ groupId: "group-1", matchId }).split("/").at(-1)!;
    await expect(
      open.respond(openToken, "00000000-0000-4000-8000-999999999999", "yes"),
    ).rejects.toMatchObject({ code: "PLAYER_NOT_FOUND" });
  });
});
