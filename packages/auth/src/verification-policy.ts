type AuthUser = {
  emailVerified: boolean;
};

export function createVerificationPolicy(emailDeliveryConfigured: boolean) {
  return {
    canCreateOrganization: (user: AuthUser) =>
      emailDeliveryConfigured ? user.emailVerified : true,
    requireVerifiedEmailForInvitation: emailDeliveryConfigured,
  };
}
