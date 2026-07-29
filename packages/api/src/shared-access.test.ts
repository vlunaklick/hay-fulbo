import { describe, expect, test } from "bun:test";

import {
  SharedAccessError,
  createSharedAccess,
  type SharedAccessRepository,
  type SharedGroupSnapshot,
} from "./shared-access";

const actor = {
  userId: "user-owner",
  email: "owner@example.com",
  emailVerified: true,
  headers: new Headers(),
};

const snapshot: SharedGroupSnapshot = {
  group: {
    id: "group-1",
    name: "Los Pibes",
    slug: "los-pibes",
    currencyCode: "ARS",
    timeZone: "America/Argentina/Buenos_Aires",
  },
  players: [],
  courts: [],
  matches: [],
};

function setup() {
  const savedHashes: Buffer[] = [];
  const lookedUpHashes: Buffer[] = [];
  const revoked: string[] = [];
  let active = false;
  const repository: SharedAccessRepository = {
    replaceLink: async ({ mode, tokenHash }) => {
      if (mode === "issue" && active) {
        throw new SharedAccessError("SHARED_LINK_ALREADY_ACTIVE", "Shared link is already active");
      }
      if (mode === "rotate" && !active) {
        throw new SharedAccessError("SHARED_LINK_NOT_ACTIVE", "Shared link is not active");
      }
      savedHashes.push(tokenHash);
      active = true;
      return { generation: savedHashes.length };
    },
    revokeLink: async ({ groupId }) => {
      revoked.push(groupId);
      active = false;
      return { generation: 1 };
    },
    resolveLink: async (tokenHash) => {
      lookedUpHashes.push(tokenHash);
      return active && tokenHash.equals(savedHashes.at(-1) ?? Buffer.alloc(0))
        ? { groupId: "group-1", generation: savedHashes.length }
        : null;
    },
    readSnapshot: async ({ generation, groupId, tokenHash }) => {
      lookedUpHashes.push(tokenHash);
      expect(groupId).toBe("group-1");
      if (
        !active ||
        generation !== savedHashes.length ||
        !tokenHash.equals(savedHashes.at(-1) ?? Buffer.alloc(0))
      ) {
        throw new SharedAccessError("INVALID_SHARED_ACCESS", "Shared access is invalid");
      }
      return snapshot;
    },
  };

  const access = createSharedAccess({
    repository,
    authorizeOwner: async (_actor, groupId) => ({
      groupId,
      role: "owner",
      userId: actor.userId,
    }),
    appBaseUrl: "https://fulbo.example",
  });

  return { access, lookedUpHashes, revoked, savedHashes };
}

describe("sharedAccess public interface", () => {
  test("issues a 256-bit secret while persisting only its SHA-256 hash", async () => {
    const { access, savedHashes } = setup();

    const result = await access.issue(actor, "group-1");

    expect(result.generation).toBe(1);
    expect(result.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(result.url).toBe(`https://fulbo.example/compartido#${result.token}`);
    expect(savedHashes).toHaveLength(1);
    expect(savedHashes[0]).toHaveLength(32);
    expect(savedHashes[0]?.toString("base64url")).not.toBe(result.token);
  });

  test("authenticates from the secret and rechecks it before producing a read-only snapshot", async () => {
    const { access, lookedUpHashes } = setup();
    const issued = await access.issue(actor, "group-1");

    const context = await access.authenticate(issued.token);
    await expect(access.readSnapshot(context)).resolves.toEqual(snapshot);

    expect(context).toEqual({ groupId: "group-1", generation: 1 });
    expect(lookedUpHashes).toHaveLength(2);
    expect(lookedUpHashes[0]).toEqual(lookedUpHashes[1]);
  });

  test("old secrets stop working immediately after rotation", async () => {
    const { access } = setup();
    const first = await access.issue(actor, "group-1");
    const second = await access.rotate(actor, "group-1");

    await expect(access.authenticate(first.token)).rejects.toMatchObject({
      code: "INVALID_SHARED_ACCESS",
    });
    await expect(access.authenticate(second.token)).resolves.toEqual({
      generation: 2,
      groupId: "group-1",
    });
  });

  test("does not silently rotate an active link through the issue operation", async () => {
    const { access } = setup();
    await access.issue(actor, "group-1");

    await expect(access.issue(actor, "group-1")).rejects.toMatchObject({
      code: "SHARED_LINK_ALREADY_ACTIVE",
    });
  });

  test("revocation removes the active capability", async () => {
    const { access, revoked } = setup();
    const issued = await access.issue(actor, "group-1");

    await expect(access.revoke(actor, "group-1")).resolves.toEqual({ generation: 1 });
    expect(revoked).toEqual(["group-1"]);
    await expect(access.authenticate(issued.token)).rejects.toBeInstanceOf(SharedAccessError);
  });

  test("rejects malformed tokens before touching persistence", async () => {
    const { access, lookedUpHashes } = setup();

    await expect(access.authenticate("too-short")).rejects.toMatchObject({
      code: "INVALID_SHARED_ACCESS",
    });
    expect(lookedUpHashes).toHaveLength(0);
  });
});
