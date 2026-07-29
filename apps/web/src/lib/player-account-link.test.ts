import { describe, expect, test } from "bun:test";

import {
  accountLinkOptions,
  linkedAccount,
  UNLINKED_ACCOUNT_VALUE,
  type PlayerAccountMember,
} from "./player-account-link";

const members: PlayerAccountMember[] = [
  {
    email: "owner@example.com",
    id: "owner",
    linkedPlayerId: "player-one",
    name: "Organizador",
    role: "owner",
  },
  {
    email: "member@example.com",
    id: "member",
    linkedPlayerId: null,
    name: "Miembro",
    role: "member",
  },
];

describe("player account link UI state", () => {
  test("keeps the current account selectable and disables accounts used by another player", () => {
    expect(accountLinkOptions(members, "player-one")).toEqual([
      { ...members[0], disabled: false },
      { ...members[1], disabled: false },
    ]);
    expect(accountLinkOptions(members, "player-two")).toEqual([
      { ...members[0], disabled: true },
      { ...members[1], disabled: false },
    ]);
  });

  test("resolves the visible current link and exposes the unlink sentinel", () => {
    expect(linkedAccount(members, "member")).toEqual(members[1]);
    expect(linkedAccount(members, null)).toBeNull();
    expect(UNLINKED_ACCOUNT_VALUE).not.toBe("owner");
  });
});
