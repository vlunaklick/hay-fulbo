import { describe, expect, test } from "bun:test";

import {
  HistoryImportError,
  historyMatchPayloadHash,
  normalizeHistoryName,
  parseHistoryImportPayload,
} from "./history-import";

const validPayload = {
  source: "fixture-v1",
  groupName: "Fixture Group",
  court: {
    name: "Fixture Court",
    address: "Fixture Address",
    mapsUrl: "https://maps.example/fixture",
  },
  players: ["Player One", "Player Two", "Directory Only"],
  matches: [
    {
      externalKey: "match-1",
      scheduledAt: "2025-01-01T22:00:00.000-03:00",
      courtCostMinor: 10_000,
      teams: [
        {
          displayName: "A",
          players: [{ displayName: "Player One", goals: 1, assists: 1, paid: true }],
        },
        {
          displayName: "B",
          players: [{ displayName: "Player Two" }],
        },
      ],
    },
  ],
};

describe("historical import payload", () => {
  test("normalizes names exactly like the match domain", () => {
    expect(normalizeHistoryName("  ÁLVARO   Núñez ")).toBe("alvaro nunez");
  });

  test("parses defaults without accepting unknown fields", () => {
    const parsed = parseHistoryImportPayload(JSON.stringify(validPayload));
    expect(parsed.matches[0]?.teams[1]?.players[0]).toEqual({
      displayName: "Player Two",
      goals: 0,
      assists: 0,
      ownGoals: 0,
    });

    expect(() =>
      parseHistoryImportPayload(JSON.stringify({ ...validPayload, unexpected: true })),
    ).toThrow(new HistoryImportError("invalid_payload"));
  });

  test("rejects duplicate ledger keys and duplicate normalized players in a match", () => {
    expect(() =>
      parseHistoryImportPayload(
        JSON.stringify({
          ...validPayload,
          matches: [validPayload.matches[0], validPayload.matches[0]],
        }),
      ),
    ).toThrow(new HistoryImportError("invalid_payload"));

    const duplicatePlayer = structuredClone(validPayload);
    duplicatePlayer.matches[0]!.teams[1]!.players[0]!.displayName = "pláyer   one";
    expect(() => parseHistoryImportPayload(JSON.stringify(duplicatePlayer))).toThrow(
      new HistoryImportError("invalid_payload"),
    );

    expect(() =>
      parseHistoryImportPayload(
        JSON.stringify({
          ...validPayload,
          players: ["Player One", "pláyer   one"],
        }),
      ),
    ).toThrow(new HistoryImportError("invalid_payload"));
  });

  test("hashes canonical match content and detects a material change", () => {
    const parsed = parseHistoryImportPayload(JSON.stringify(validPayload));
    const first = historyMatchPayloadHash(parsed, parsed.matches[0]!);
    const reordered = {
      source: validPayload.source,
      groupName: validPayload.groupName,
      court: {
        mapsUrl: validPayload.court.mapsUrl,
        address: validPayload.court.address,
        name: validPayload.court.name,
      },
      players: validPayload.players,
      matches: validPayload.matches,
    };
    const secondParsed = parseHistoryImportPayload(JSON.stringify(reordered));
    const second = historyMatchPayloadHash(secondParsed, secondParsed.matches[0]!);
    expect(first.equals(second)).toBe(true);

    const changed = parseHistoryImportPayload(JSON.stringify(validPayload));
    changed.matches[0]!.teams[0]!.players[0]!.goals = 2;
    expect(first.equals(historyMatchPayloadHash(changed, changed.matches[0]!))).toBe(false);
  });
});
