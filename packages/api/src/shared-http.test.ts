import { describe, expect, test } from "bun:test";

import {
  SHARED_ACCESS_COOKIE,
  sharedAccessCookieOptions,
  sharedResponseHeaders,
} from "./shared-http";

describe("shared HTTP contract", () => {
  test("uses a scoped HttpOnly 30-day capability cookie", () => {
    expect(SHARED_ACCESS_COOKIE).toBe("hay_fulbo_shared");
    expect(sharedAccessCookieOptions(true)).toEqual({
      httpOnly: true,
      maxAge: 2_592_000,
      path: "/api/shared",
      sameSite: "lax",
      secure: true,
    });
    expect(sharedAccessCookieOptions(false).secure).toBe(false);
  });

  test("prevents caches, referrers and crawlers on shared responses", () => {
    expect(sharedResponseHeaders).toEqual({
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    });
  });
});
