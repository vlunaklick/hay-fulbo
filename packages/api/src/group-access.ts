export type GroupRole = "member" | "leader" | "owner";

export type GroupActor = {
  userId: string;
  email: string;
  emailVerified: boolean;
  headers: Headers;
};

export type GroupAuthorization = {
  groupId: string;
  role: GroupRole;
  userId: string;
};

export type GroupSummary = {
  id: string;
  name: string;
  slug: string;
};

export interface GroupAccessRepository {
  findMembership(input: { groupId: string; userId: string }): Promise<{ role: GroupRole } | null>;
  findMembershipById(input: {
    groupId: string;
    membershipId: string;
  }): Promise<{ role: GroupRole; userId: string } | null>;
  assertPlayerInGroup(input: { groupId: string; playerId: string }): Promise<void>;
  linkPlayer(input: {
    groupId: string;
    playerId: string;
    linkedUserId: string | null;
  }): Promise<{ playerId: string; linkedUserId: string | null }>;
  unlinkMemberPlayer(input: { groupId: string; userId: string }): Promise<void>;
}

export interface OrganizationGateway {
  create(input: { headers: Headers; name: string; slug: string }): Promise<GroupSummary>;
  list(input: { headers: Headers }): Promise<GroupSummary[]>;
  select(input: { headers: Headers; groupId: string }): Promise<GroupSummary>;
  invite(input: {
    email: string;
    groupId: string;
    headers: Headers;
    playerId: string;
  }): Promise<{ id: string; email: string; expiresAt: Date }>;
  removeMember(input: { groupId: string; headers: Headers; membershipId: string }): Promise<void>;
  updateMemberRole(input: {
    groupId: string;
    headers: Headers;
    membershipId: string;
    role: "leader" | "member";
  }): Promise<void>;
}

export type GroupAccessErrorCode =
  | "EMAIL_NOT_VERIFIED"
  | "INVALID_GROUP_INPUT"
  | "LEADER_REQUIRED"
  | "MEMBERSHIP_REQUIRED"
  | "OWNER_REQUIRED"
  | "PLAYER_ACCOUNT_ALREADY_LINKED"
  | "PLAYER_LINK_TARGET_NOT_MEMBER";

export class GroupAccessError extends Error {
  readonly code: GroupAccessErrorCode;

  constructor(code: GroupAccessErrorCode, message: string) {
    super(message);
    this.name = "GroupAccessError";
    this.code = code;
  }
}

type GroupAccessDependencies = {
  repository: GroupAccessRepository;
  organizations: OrganizationGateway;
  appBaseUrl: string;
  invitationEmailDelivery: "email" | "link";
  requireVerifiedEmailForGroupCreation: boolean;
};

function cleanRequired(value: string, label: string) {
  const cleaned = value.trim();
  if (!cleaned) {
    throw new GroupAccessError("INVALID_GROUP_INPUT", `${label} is required`);
  }
  return cleaned;
}

function cleanSlug(value: string) {
  const slug = cleanRequired(value, "Group slug").toLocaleLowerCase("en-US");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new GroupAccessError("INVALID_GROUP_INPUT", "Group slug is invalid");
  }
  return slug;
}

const roleRank: Record<GroupRole, number> = {
  member: 0,
  leader: 1,
  owner: 2,
};

export function createGroupAccess({
  repository,
  organizations,
  appBaseUrl,
  invitationEmailDelivery,
  requireVerifiedEmailForGroupCreation,
}: GroupAccessDependencies) {
  const authorize = async (
    actor: GroupActor,
    groupId: string,
    requiredRole: GroupRole,
  ): Promise<GroupAuthorization> => {
    const membership = await repository.findMembership({
      groupId,
      userId: actor.userId,
    });
    if (!membership) {
      throw new GroupAccessError("MEMBERSHIP_REQUIRED", "Group membership is required");
    }
    if (roleRank[membership.role] < roleRank[requiredRole]) {
      throw new GroupAccessError(
        requiredRole === "owner" ? "OWNER_REQUIRED" : "LEADER_REQUIRED",
        requiredRole === "owner"
          ? "Group owner access is required"
          : "Group leader access is required",
      );
    }
    return { groupId, role: membership.role, userId: actor.userId };
  };

  return {
    authorize,

    async createGroup(
      actor: GroupActor,
      input: { name: string; slug: string },
    ): Promise<GroupSummary> {
      if (requireVerifiedEmailForGroupCreation && !actor.emailVerified) {
        throw new GroupAccessError(
          "EMAIL_NOT_VERIFIED",
          "A verified email is required to create a group",
        );
      }
      return organizations.create({
        headers: actor.headers,
        name: cleanRequired(input.name, "Group name"),
        slug: cleanSlug(input.slug),
      });
    },

    async listGroups(actor: GroupActor) {
      return organizations.list({ headers: actor.headers });
    },

    async selectGroup(actor: GroupActor, groupId: string) {
      await authorize(actor, groupId, "member");
      return organizations.select({ headers: actor.headers, groupId });
    },

    async inviteMember(
      actor: GroupActor,
      input: { email: string; groupId: string; playerId: string },
    ) {
      await authorize(actor, input.groupId, "leader");
      await repository.assertPlayerInGroup({
        groupId: input.groupId,
        playerId: input.playerId,
      });
      const email = input.email.trim().toLocaleLowerCase("en-US");
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        throw new GroupAccessError("INVALID_GROUP_INPUT", "Invitation email is invalid");
      }
      const invitation = await organizations.invite({
        email,
        groupId: input.groupId,
        headers: actor.headers,
        playerId: input.playerId,
      });
      return {
        delivery: invitationEmailDelivery,
        email,
        expiresAt: invitation.expiresAt.toISOString(),
        invitationId: invitation.id,
        inviteUrl: new URL(`/invitaciones/${encodeURIComponent(invitation.id)}`, appBaseUrl).href,
        status: "pending" as const,
      };
    },

    async linkPlayer(
      actor: GroupActor,
      input: { groupId: string; playerId: string; linkedUserId: string | null },
    ) {
      await authorize(actor, input.groupId, "leader");
      return repository.linkPlayer(input);
    },

    async updateMemberRole(
      actor: GroupActor,
      input: { groupId: string; membershipId: string; role: "leader" | "member" },
    ) {
      await authorize(actor, input.groupId, "owner");
      const target = await repository.findMembershipById(input);
      if (!target || target.role === "owner") {
        throw new GroupAccessError("INVALID_GROUP_INPUT", "La membresía no se puede modificar");
      }
      await organizations.updateMemberRole({
        ...input,
        headers: actor.headers,
      });
      return { membershipId: input.membershipId, role: input.role };
    },

    async removeMember(actor: GroupActor, input: { groupId: string; membershipId: string }) {
      await authorize(actor, input.groupId, "owner");
      const target = await repository.findMembershipById(input);
      if (!target || target.role === "owner" || target.userId === actor.userId) {
        throw new GroupAccessError("INVALID_GROUP_INPUT", "La membresía no se puede eliminar");
      }
      await organizations.removeMember({
        ...input,
        headers: actor.headers,
      });
      await repository.unlinkMemberPlayer({
        groupId: input.groupId,
        userId: target.userId,
      });
      return { membershipId: input.membershipId };
    },
  };
}

export type GroupAccess = ReturnType<typeof createGroupAccess>;
