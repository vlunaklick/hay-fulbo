import { describe, expect, test } from "bun:test";

import { resolveClerkIdentity, type ClerkUserLike } from "./clerk-identity";

function clerkUser(overrides: Partial<ClerkUserLike> = {}): ClerkUserLike {
  return {
    id: "user_123",
    firstName: "Lionel",
    lastName: "Messi",
    imageUrl: "https://img.clerk.com/avatar.png",
    hasImage: true,
    primaryEmailAddressId: "idn_1",
    emailAddresses: [
      { id: "idn_1", emailAddress: "Lio@Example.com", verification: { status: "verified" } },
    ],
    ...overrides,
  };
}

describe("resolveClerkIdentity", () => {
  test("uses the verified primary email, normalized, with the full name", () => {
    expect(resolveClerkIdentity(clerkUser())).toEqual({
      clerkUserId: "user_123",
      email: "lio@example.com",
      name: "Lionel Messi",
      image: "https://img.clerk.com/avatar.png",
    });
  });

  test("rejects a primary email Clerk has not verified", () => {
    const user = clerkUser({
      emailAddresses: [
        { id: "idn_1", emailAddress: "lio@example.com", verification: { status: "unverified" } },
      ],
    });
    expect(resolveClerkIdentity(user)).toBeNull();
  });

  test("ignores verified secondary emails when the primary is missing", () => {
    expect(resolveClerkIdentity(clerkUser({ primaryEmailAddressId: null }))).toBeNull();
  });

  test("falls back to the email local part and drops Clerk's default avatar", () => {
    const identity = resolveClerkIdentity(
      clerkUser({ firstName: null, lastName: " ", hasImage: false }),
    );
    expect(identity?.name).toBe("lio");
    expect(identity?.image).toBeNull();
  });
});
