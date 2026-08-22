import type { GroupActor, GroupAuthorization } from "./group-access";

export type GroupSettings = {
  id: string;
  name: string;
  slug: string;
  publicVisibility: boolean;
};

export interface GroupSettingsRepository {
  read(groupId: string): Promise<GroupSettings | null>;
  updateVisibility(input: {
    groupId: string;
    publicVisibility: boolean;
  }): Promise<GroupSettings | null>;
}

export function createGroupSettings({
  repository,
  authorizeOwner,
}: {
  repository: GroupSettingsRepository;
  authorizeOwner: (actor: GroupActor, groupId: string) => Promise<GroupAuthorization>;
}) {
  return {
    async read(actor: GroupActor, groupId: string) {
      await authorizeOwner(actor, groupId);
      return repository.read(groupId);
    },

    async updateVisibility(
      actor: GroupActor,
      input: { groupId: string; publicVisibility: boolean },
    ) {
      await authorizeOwner(actor, input.groupId);
      const updated = await repository.updateVisibility(input);
      if (!updated) {
        throw new Error("Group not found");
      }
      return updated;
    },
  };
}

export type GroupSettingsAccess = ReturnType<typeof createGroupSettings>;
