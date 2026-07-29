export type PlayerAccountMember = {
  email: string;
  id: string;
  linkedPlayerId: string | null;
  name: string;
  role: "member" | "owner";
};

export function accountLinkOptions(members: readonly PlayerAccountMember[], playerId: string) {
  return members.map((member) => ({
    ...member,
    disabled: member.linkedPlayerId !== null && member.linkedPlayerId !== playerId,
  }));
}

export function linkedAccount(
  members: readonly PlayerAccountMember[],
  linkedUserId: string | null,
) {
  if (!linkedUserId) return null;
  return members.find((member) => member.id === linkedUserId) ?? null;
}

export function accountPresentationLabel(
  members: readonly PlayerAccountMember[],
  linkedUserId: string | null,
) {
  const account = linkedAccount(members, linkedUserId);
  return account ? `${account.name} · ${account.email}` : "Sin cuenta vinculada";
}
