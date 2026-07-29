import { describe, expect, test } from "bun:test";

import { createHealthHandler } from "./route";

describe("GET /api/health", () => {
  test("reports ready only after the database probe succeeds", async () => {
    const response = await createHealthHandler(async () => {})();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ status: "ok" });
  });

  test("reports unavailable without leaking the database failure", async () => {
    const response = await createHealthHandler(async () => {
      throw new Error("postgresql://user:secret@database/hay-fulbo");
    })();

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ status: "unavailable" });
  });
});
