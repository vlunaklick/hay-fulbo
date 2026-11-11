import { describe, expect, test } from "bun:test";

import { safeReturnTo } from "./return-to";

describe("safeReturnTo", () => {
  test("keeps invitation and join links", () => {
    expect(safeReturnTo("/invitaciones/abc_123")).toBe("/invitaciones/abc_123");
    expect(safeReturnTo("/sumarse/grupo.del-jueves")).toBe("/sumarse/grupo.del-jueves");
  });

  test("sends anything else to the dashboard", () => {
    expect(safeReturnTo(null)).toBe("/dashboard");
    expect(safeReturnTo("https://evil.example/invitaciones/x")).toBe("/dashboard");
    expect(safeReturnTo("//evil.example")).toBe("/dashboard");
    expect(safeReturnTo("/dashboard/grupo")).toBe("/dashboard");
  });
});
