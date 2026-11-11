type ClerkEmailAddress = {
  id: string;
  emailAddress: string;
  verification: { status: string } | null;
};

export type ClerkUserLike = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string;
  hasImage?: boolean;
  primaryEmailAddressId: string | null;
  emailAddresses: ClerkEmailAddress[];
};

export type ClerkIdentity = {
  clerkUserId: string;
  email: string;
  name: string;
  image: string | null;
};

/**
 * Reduces a Clerk user to the identity Hay Fulbo trusts: only a verified primary
 * email can create or link an account, because accounts are matched by email.
 */
export function resolveClerkIdentity(user: ClerkUserLike): ClerkIdentity | null {
  const primary = user.emailAddresses.find((address) => address.id === user.primaryEmailAddressId);
  if (!primary || primary.verification?.status !== "verified") return null;
  const email = primary.emailAddress.trim().toLowerCase();
  const fullName = [user.firstName, user.lastName]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(" ")
    .trim();
  return {
    clerkUserId: user.id,
    email,
    name: fullName || email.split("@")[0] || email,
    image: user.hasImage === false ? null : user.imageUrl || null,
  };
}
