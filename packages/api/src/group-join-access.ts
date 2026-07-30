import { createHmac, timingSafeEqual } from "node:crypto";

import type { GroupActor, GroupAuthorization, GroupSummary } from "./group-access";

export interface GroupJoinRepository {
  acceptLink(input: {
    generation: number;
    groupId: string;
    userId: string;
  }): Promise<{ alreadyMember: boolean; group: GroupSummary }>;
  findLink(groupId: string): Promise<{ active: boolean; generation: number } | null>;
  replaceLink(input: { actorUserId: string; groupId: string }): Promise<{ generation: number }>;
  resolveLink(input: { generation: number; groupId: string }): Promise<GroupSummary | null>;
  revokeLink(groupId: string): Promise<void>;
}

export type GroupJoinErrorCode = "INVALID_JOIN_LINK" | "JOIN_LINK_NOT_ACTIVE";

export class GroupJoinError extends Error {
  readonly code: GroupJoinErrorCode;

  constructor(code: GroupJoinErrorCode, message: string) {
    super(message);
    this.name = "GroupJoinError";
    this.code = code;
  }
}

type GroupJoinDependencies = {
  appBaseUrl: string;
  authorizeOwner: (actor: GroupActor, groupId: string) => Promise<GroupAuthorization>;
  repository: GroupJoinRepository;
  signingSecret: string;
};

type JoinTokenPayload = {
  generation: number;
  groupId: string;
};

function encodePayload(payload: JoinTokenPayload) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function signPayload(payload: string, signingSecret: string) {
  return createHmac("sha256", signingSecret).update(payload, "utf8").digest("base64url");
}

function createToken(payload: JoinTokenPayload, signingSecret: string) {
  const encoded = encodePayload(payload);
  return `${encoded}.${signPayload(encoded, signingSecret)}`;
}

function readToken(token: string, signingSecret: string): JoinTokenPayload {
  const [encoded, signature, extra] = token.split(".");
  if (!encoded || !signature || extra || !/^[A-Za-z0-9_-]+$/.test(encoded)) {
    throw new GroupJoinError("INVALID_JOIN_LINK", "El link de invitación no es válido");
  }

  const expected = Buffer.from(signPayload(encoded, signingSecret), "base64url");
  const received = Buffer.from(signature, "base64url");
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    throw new GroupJoinError("INVALID_JOIN_LINK", "El link de invitación no es válido");
  }

  try {
    const value = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as unknown;
    if (
      typeof value !== "object" ||
      value === null ||
      !("groupId" in value) ||
      typeof value.groupId !== "string" ||
      value.groupId.length < 1 ||
      value.groupId.length > 200 ||
      !("generation" in value) ||
      !Number.isSafeInteger(value.generation) ||
      Number(value.generation) < 1
    ) {
      throw new Error("Invalid payload");
    }
    return {
      generation: Number(value.generation),
      groupId: value.groupId,
    };
  } catch {
    throw new GroupJoinError("INVALID_JOIN_LINK", "El link de invitación no es válido");
  }
}

export function createGroupJoinAccess({
  appBaseUrl,
  authorizeOwner,
  repository,
  signingSecret,
}: GroupJoinDependencies) {
  if (signingSecret.length < 32) {
    throw new Error("Group join signing secret must contain at least 32 characters");
  }

  const joinUrl = (groupId: string, generation: number) => {
    const token = createToken({ generation, groupId }, signingSecret);
    return new URL(`/sumarse/${encodeURIComponent(token)}`, appBaseUrl).href;
  };

  const resolve = async (token: string) => {
    const payload = readToken(token, signingSecret);
    const group = await repository.resolveLink(payload);
    if (!group) {
      throw new GroupJoinError("JOIN_LINK_NOT_ACTIVE", "Este link fue desactivado o reemplazado");
    }
    return { group, payload };
  };

  return {
    async status(actor: GroupActor, groupId: string) {
      await authorizeOwner(actor, groupId);
      const link = await repository.findLink(groupId);
      if (!link?.active) return { active: false as const };
      return {
        active: true as const,
        url: joinUrl(groupId, link.generation),
      };
    },

    async renew(actor: GroupActor, groupId: string) {
      await authorizeOwner(actor, groupId);
      const link = await repository.replaceLink({
        actorUserId: actor.userId,
        groupId,
      });
      return {
        active: true as const,
        url: joinUrl(groupId, link.generation),
      };
    },

    async revoke(actor: GroupActor, groupId: string) {
      await authorizeOwner(actor, groupId);
      await repository.revokeLink(groupId);
      return { active: false as const };
    },

    async preview(token: string) {
      const { group } = await resolve(token);
      return { group };
    },

    async accept(actor: GroupActor, token: string) {
      const { payload } = await resolve(token);
      return repository.acceptLink({
        ...payload,
        userId: actor.userId,
      });
    },
  };
}

export type GroupJoinAccess = ReturnType<typeof createGroupJoinAccess>;
