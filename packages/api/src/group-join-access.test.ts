import { describe, expect, test } from "bun:test";

import type { GroupActor } from "./group-access";
import {
  GroupJoinError,
  createGroupJoinAccess,
  type GroupJoinRepository,
} from "./group-join-access";

const actor: GroupActor = {
  email: "owner@example.com",
  emailVerified: true,
  headers: new Headers(),
  userId: "user-owner",
};

function setup({ owner = true } = {}) {
  let generation = 0;
  let active = false;
  const repository: GroupJoinRepository = {
    acceptLink: async ({ generation: candidate, groupId, userId }) => {
      if (!active || candidate !== generation || groupId !== "group-1") {
        throw new GroupJoinError("JOIN_LINK_NOT_ACTIVE", "Inactive");
      }
      return {
        alreadyMember: userId === "user-existing",
        group: { id: groupId, name: "Fulbito", slug: "fulbito" },
      };
    },
    findLink: async () => (generation ? { active, generation } : null),
    replaceLink: async () => {
      generation += 1;
      active = true;
      return { generation };
    },
    resolveLink: async ({ generation: candidate, groupId }) =>
      active && candidate === generation && groupId === "group-1"
        ? { id: groupId, name: "Fulbito", slug: "fulbito" }
        : null,
    revokeLink: async () => {
      if (!active) throw new GroupJoinError("JOIN_LINK_NOT_ACTIVE", "Inactive");
      active = false;
    },
  };
  return createGroupJoinAccess({
    appBaseUrl: "https://fulbo.example",
    authorizeOwner: async (candidate, groupId) => {
      if (!owner) throw new Error("OWNER_REQUIRED");
      return { groupId, role: "owner", userId: candidate.userId };
    },
    repository,
    signingSecret: "test-secret-that-is-longer-than-thirty-two-characters",
  });
}

describe("group join links", () => {
  test("issues a reusable link and reconstructs it from active state", async () => {
    const access = setup();
    const issued = await access.renew(actor, "group-1");

    expect(issued.active).toBe(true);
    await expect(access.status(actor, "group-1")).resolves.toEqual(issued);
    await expect(access.preview(issued.url.split("/").at(-1)!)).resolves.toEqual({
      group: { id: "group-1", name: "Fulbito", slug: "fulbito" },
    });
  });

  test("renewing invalidates the previous link and revocation disables the current one", async () => {
    const access = setup();
    const first = await access.renew(actor, "group-1");
    const second = await access.renew(actor, "group-1");
    const firstToken = first.url.split("/").at(-1)!;
    const secondToken = second.url.split("/").at(-1)!;

    await expect(access.preview(firstToken)).rejects.toMatchObject({
      code: "JOIN_LINK_NOT_ACTIVE",
    });
    await expect(access.preview(secondToken)).resolves.toBeDefined();

    await access.revoke(actor, "group-1");
    await expect(access.preview(secondToken)).rejects.toMatchObject({
      code: "JOIN_LINK_NOT_ACTIVE",
    });
  });

  test("rejects tampered tokens before resolving a group", async () => {
    const access = setup();
    const issued = await access.renew(actor, "group-1");
    const token = issued.url.split("/").at(-1)!;

    await expect(access.preview(`${token}tampered`)).rejects.toMatchObject({
      code: "INVALID_JOIN_LINK",
    });
  });

  test("accepts idempotently as a member and keeps owner operations owner-only", async () => {
    const access = setup();
    const issued = await access.renew(actor, "group-1");
    const token = issued.url.split("/").at(-1)!;

    await expect(
      access.accept({ ...actor, userId: "user-existing" }, token),
    ).resolves.toMatchObject({
      alreadyMember: true,
      group: { id: "group-1" },
    });

    const memberAccess = setup({ owner: false });
    await expect(memberAccess.renew(actor, "group-1")).rejects.toThrow("OWNER_REQUIRED");
  });
});
