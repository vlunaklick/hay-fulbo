import { describe, expect, test } from "bun:test";

import {
  GroupAccessError,
  createGroupAccess,
  type GroupAccessRepository,
  type OrganizationGateway,
} from "./group-access";

const actor = {
  userId: "user-owner",
  email: "owner@example.com",
  emailVerified: true,
  headers: new Headers({ cookie: "session=owner" }),
};

function setup(
  role: "owner" | "member" | null = "owner",
  invitationEmailDelivery: "email" | "link" = "link",
) {
  const links: Array<{ groupId: string; playerId: string; linkedUserId: string | null }> = [];
  const invitations: Array<{ email: string; groupId: string }> = [];
  const selections: string[] = [];

  const repository: GroupAccessRepository = {
    findMembership: async () => (role ? { role } : null),
    linkPlayer: async (input) => {
      links.push(input);
      return { playerId: input.playerId, linkedUserId: input.linkedUserId };
    },
  };
  const organizations: OrganizationGateway = {
    create: async ({ name, slug }) => ({ id: "group-new", name, slug }),
    list: async () => [{ id: "group-1", name: "Los Pibes", slug: "los-pibes" }],
    select: async ({ groupId }) => {
      selections.push(groupId);
      return { id: groupId, name: "Los Pibes", slug: "los-pibes" };
    },
    invite: async ({ email, groupId }) => {
      invitations.push({ email, groupId });
      return { id: "inv-1", email, expiresAt: new Date("2026-07-31T12:00:00Z") };
    },
  };

  return {
    access: createGroupAccess({
      repository,
      organizations,
      appBaseUrl: "https://fulbo.example",
      invitationEmailDelivery,
      requireVerifiedEmailForGroupCreation: invitationEmailDelivery === "email",
    }),
    invitations,
    links,
    selections,
  };
}

describe("groupAccess public interface", () => {
  test("creates and selects a group only for a verified user with membership", async () => {
    const { access, selections } = setup("owner");

    await expect(
      access.createGroup(actor, { name: "  Los Miércoles  ", slug: "  Los-Miercoles " }),
    ).resolves.toEqual({
      id: "group-new",
      name: "Los Miércoles",
      slug: "los-miercoles",
    });
    await expect(access.selectGroup(actor, "group-1")).resolves.toEqual({
      id: "group-1",
      name: "Los Pibes",
      slug: "los-pibes",
    });
    expect(selections).toEqual(["group-1"]);
  });

  test("does not let an unverified user create a group when email delivery is configured", async () => {
    const { access } = setup("owner", "email");

    await expect(
      access.createGroup({ ...actor, emailVerified: false }, { name: "Los Pibes", slug: "pibes" }),
    ).rejects.toMatchObject({ code: "EMAIL_NOT_VERIFIED" });
  });

  test("allows first-group creation when verification email cannot be delivered", async () => {
    const { access } = setup("owner", "link");

    await expect(
      access.createGroup({ ...actor, emailVerified: false }, { name: "Los Pibes", slug: "pibes" }),
    ).resolves.toMatchObject({ name: "Los Pibes", slug: "pibes" });
  });

  test("centralizes member and owner guards", async () => {
    const { access: memberAccess } = setup("member");
    const { access: outsiderAccess } = setup(null);

    await expect(memberAccess.authorize(actor, "group-1", "member")).resolves.toEqual({
      groupId: "group-1",
      role: "member",
      userId: actor.userId,
    });
    await expect(memberAccess.authorize(actor, "group-1", "owner")).rejects.toMatchObject({
      code: "OWNER_REQUIRED",
    });
    await expect(outsiderAccess.authorize(actor, "group-1", "member")).rejects.toMatchObject({
      code: "MEMBERSHIP_REQUIRED",
    });
  });

  test("owners can link a user to a player while members cannot", async () => {
    const { access, links } = setup("owner");

    await access.linkPlayer(actor, {
      groupId: "group-1",
      playerId: "1059f2b1-1473-4637-badb-f3bace830c62",
      linkedUserId: "user-player",
    });

    expect(links).toEqual([
      {
        groupId: "group-1",
        playerId: "1059f2b1-1473-4637-badb-f3bace830c62",
        linkedUserId: "user-player",
      },
    ]);

    const { access: memberAccess } = setup("member");
    await expect(
      memberAccess.linkPlayer(actor, {
        groupId: "group-1",
        playerId: "1059f2b1-1473-4637-badb-f3bace830c62",
        linkedUserId: null,
      }),
    ).rejects.toBeInstanceOf(GroupAccessError);
  });

  test("normalizes invitations and returns an honest pending link when email is unavailable", async () => {
    const { access, invitations } = setup("owner");

    await expect(
      access.inviteMember(actor, {
        email: "  PLAYER@Example.COM ",
        groupId: "group-1",
      }),
    ).resolves.toEqual({
      delivery: "link",
      email: "player@example.com",
      expiresAt: "2026-07-31T12:00:00.000Z",
      invitationId: "inv-1",
      inviteUrl: "https://fulbo.example/invitaciones/inv-1",
      status: "pending",
    });
    expect(invitations).toEqual([{ email: "player@example.com", groupId: "group-1" }]);
  });
});
