export const SHARED_ACCESS_COOKIE = "hay_fulbo_shared";

export const SHARED_ACCESS_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export const sharedResponseHeaders = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
} as const;

export function sharedAccessCookieOptions(production: boolean) {
  return {
    httpOnly: true,
    maxAge: SHARED_ACCESS_MAX_AGE_SECONDS,
    path: "/api/shared",
    sameSite: "lax" as const,
    secure: production,
  };
}
