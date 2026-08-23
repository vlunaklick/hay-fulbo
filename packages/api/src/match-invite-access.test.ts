import { describe, expect, test } from "bun:test";

import {
  createMatchInviteAccess,
  MatchInviteError,
  type MatchInvitationSource,
  type MatchInviteRepository,
} from "./match-invite-access";

const matchId = "00000000-0000-4000-8000-000000000001";
const anaId = "00000000-0000-4000-8000-000000000010";
const betoId = "00000000-0000-4000-8000-000000000011";
const caroId = "00000000-0000-4000-8000-000000000012";
const baseSource: MatchInvitationSource = {
  group: {
    currency: "ARS",
    name: "Los Miércoles",
    timeZone: "America/Argentina/Buenos_Aires",
  },
  match: {
    court: { address: "Av. Siempre Viva 123", mapsUrl: "https://maps.example", name: "El Andén" },
    courtCostMinor: 10_001n,
    id: matchId,
    scheduledAt: new Date("2026-08-06T00:00:00.000Z"),
    status: "open",
    teams: [
      { displayName: "Equipo 1", goals: 0 },
      { displayName: "Equipo 2", goals: 0 },
    ],
  },
  players: [
    {
      archived: false,
      displayName: "Ana",
      id: anaId,
      normalizedName: "ana",
      joinedTeamId: "team-1",
    },
    {
      archived: false,
      displayName: "Beto",
      id: betoId,
      normalizedName: "beto",
      joinedTeamId: null,
    },
    {
      archived: false,
      displayName: "Caro",
      id: caroId,
      normalizedName: "caro",
      joinedTeamId: null,
    },
  ],
};

function setup(source: MatchInvitationSource = structuredClone(baseSource)) {
  let current = source;
  const repository: MatchInviteRepository = {
    read: async ({ groupId, matchId: candidate }) =>
      groupId === "group-1" && candidate === matchId ? current : null,
    join: async ({ playerId, joined }) => {
      current = {
        ...current,
        players: current.players.map((player) =>
          player.id === playerId ? { ...player, joinedTeamId: joined ? "team-2" : null } : player,
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
  test("signs a private URL and derives the roster and cost split", async () => {
    const access = setup();
    const url = access.createUrl({ groupId: "group-1", matchId });
    const invitation = await access.preview(url.split("/").at(-1)!);

    expect(invitation.match.estimatedPerPlayerMinor).toBe("10001");
    expect(invitation.summary).toEqual({ playing: 1 });
    expect(invitation.players.map(({ displayName, joined }) => [displayName, joined])).toEqual([
      ["Ana", true],
      ["Beto", false],
      ["Caro", false],
    ]);
  });

  test("rejects a tampered capability before repository access", async () => {
    const access = setup();
    const token = access.createUrl({ groupId: "group-1", matchId }).split("/").at(-1)!;
    await expect(access.preview(`${token}tampered`)).rejects.toMatchObject({
      code: "INVALID_MATCH_INVITE",
    });
  });

  test("joins the roster and leaves it through the same link", async () => {
    const access = setup();
    const token = access.createUrl({ groupId: "group-1", matchId }).split("/").at(-1)!;

    const joined = await access.join(token, betoId, true);
    expect(joined.summary.playing).toBe(2);
    expect(joined.match.estimatedPerPlayerMinor).toBe("5001");

    await access.join(token, betoId, true);
    const stillIn = await access.preview(token);
    expect(stillIn.summary.playing).toBe(2);

    const left = await access.join(token, betoId, false);
    expect(left.summary.playing).toBe(1);
  });

  test("does not accept joins for closed matches or unknown players", async () => {
    const closed = setup({
      ...structuredClone(baseSource),
      match: { ...baseSource.match, status: "closed" },
    });
    const closedToken = closed.createUrl({ groupId: "group-1", matchId }).split("/").at(-1)!;
    await expect(closed.join(closedToken, anaId, true)).rejects.toBeInstanceOf(MatchInviteError);

    const open = setup();
    const openToken = open.createUrl({ groupId: "group-1", matchId }).split("/").at(-1)!;
    await expect(
      open.join(openToken, "00000000-0000-4000-8000-999999999999", true),
    ).rejects.toMatchObject({ code: "PLAYER_NOT_FOUND" });
  });
});
