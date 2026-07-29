export type GroupRole = "member" | "owner";

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
  linkPlayer(input: {
    groupId: string;
    playerId: string;
    linkedUserId: string | null;
  }): Promise<{ playerId: string; linkedUserId: string | null }>;
}

export interface OrganizationGateway {
  create(input: { headers: Headers; name: string; slug: string }): Promise<GroupSummary>;
  list(input: { headers: Headers }): Promise<GroupSummary[]>;
  select(input: { headers: Headers; groupId: string }): Promise<GroupSummary>;
  invite(input: {
    email: string;
    groupId: string;
    headers: Headers;
  }): Promise<{ id: string; email: string; expiresAt: Date }>;
}

export type GroupAccessErrorCode =
  | "EMAIL_NOT_VERIFIED"
  | "INVALID_GROUP_INPUT"
  | "MEMBERSHIP_REQUIRED"
  | "OWNER_REQUIRED";

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

export function createGroupAccess({
  repository,
  organizations,
  appBaseUrl,
  invitationEmailDelivery,
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
    if (requiredRole === "owner" && membership.role !== "owner") {
      throw new GroupAccessError("OWNER_REQUIRED", "Group owner access is required");
    }
    return { groupId, role: membership.role, userId: actor.userId };
  };

  return {
    authorize,

    async createGroup(
      actor: GroupActor,
      input: { name: string; slug: string },
    ): Promise<GroupSummary> {
      if (!actor.emailVerified) {
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

    async inviteMember(actor: GroupActor, input: { email: string; groupId: string }) {
      await authorize(actor, input.groupId, "owner");
      const email = input.email.trim().toLocaleLowerCase("en-US");
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        throw new GroupAccessError("INVALID_GROUP_INPUT", "Invitation email is invalid");
      }
      const invitation = await organizations.invite({
        email,
        groupId: input.groupId,
        headers: actor.headers,
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
      await authorize(actor, input.groupId, "owner");
      return repository.linkPlayer(input);
    },
  };
}

export type GroupAccess = ReturnType<typeof createGroupAccess>;
