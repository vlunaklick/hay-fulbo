const ALLOWED_RETURN = /^\/(?:invitaciones\/[A-Za-z0-9_-]+|sumarse\/[A-Za-z0-9_.-]+)$/;

/** Only invitation and join links may survive a login round-trip; anything else lands on the dashboard. */
export function safeReturnTo(requested: string | null | undefined): string {
  return requested && ALLOWED_RETURN.test(requested) ? requested : "/dashboard";
}
