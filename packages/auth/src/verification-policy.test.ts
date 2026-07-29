import { describe, expect, test } from "bun:test";

import { createVerificationPolicy } from "./verification-policy";

describe("createVerificationPolicy", () => {
  test("keeps manual-link onboarding usable when email delivery is unavailable", () => {
    const policy = createVerificationPolicy(false);

    expect(policy.canCreateOrganization({ emailVerified: false })).toBe(true);
    expect(policy.requireVerifiedEmailForInvitation).toBe(false);
  });

  test("requires verified email when transactional delivery is configured", () => {
    const policy = createVerificationPolicy(true);

    expect(policy.canCreateOrganization({ emailVerified: false })).toBe(false);
    expect(policy.canCreateOrganization({ emailVerified: true })).toBe(true);
    expect(policy.requireVerifiedEmailForInvitation).toBe(true);
  });
});
