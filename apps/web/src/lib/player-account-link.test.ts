import { describe, expect, test } from "bun:test";

import {
  accountLinkOptions,
  accountPresentationLabel,
  linkedAccount,
  type PlayerAccountMember,
} from "./player-account-link";

const members: PlayerAccountMember[] = [
  {
    email: "owner@example.com",
    id: "owner",
    linkedPlayerId: "player-one",
    membershipId: "membership-owner",
    name: "Organizador",
    role: "owner",
  },
  {
    email: "member@example.com",
    id: "member",
    linkedPlayerId: null,
    membershipId: "membership-member",
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

  test("resolves the visible current link", () => {
    expect(linkedAccount(members, "member")).toEqual(members[1]);
    expect(linkedAccount(members, null)).toBeNull();
  });

  test("uses a human presentation label for linked and unlinked accounts", () => {
    expect(accountPresentationLabel(members, "member")).toBe("Miembro · member@example.com");
    expect(accountPresentationLabel(members, null)).toBe("Sin cuenta vinculada");
  });

  test("never exposes technical values as a presentation label", () => {
    expect(accountPresentationLabel(members, "__unlinked__")).toBe("Sin cuenta vinculada");
    expect(accountPresentationLabel(members, "unknown-user-id")).toBe("Sin cuenta vinculada");
  });
});
