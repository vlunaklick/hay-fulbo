import { describe, expect, test } from "bun:test";
import type { StatsDashboard } from "@hay-fulbo/db/stats";

import type { SharedAccess } from "../shared-access";
import { sharedRouter } from "./shared";

const dashboard: StatsDashboard = {
  group: {
    id: "group-1",
    name: "Los del martes",
    timeZone: "America/Argentina/Buenos_Aires",
    currency: "ARS",
  },
  courts: [],
  filters: { result: "draws" },
  summary: { matchesPlayed: 0, totalGoals: 0, goalsPerMatch: 0 },
  ranking: [],
  societies: [],
  history: [],
  upcoming: null,
  finances: null,
};

describe("shared stats router", () => {
  test("forwards filters through the authenticated shared capability", async () => {
    const calls: unknown[] = [];
    const sharedAccess = {
      readDashboard: async (context: unknown, filters: unknown) => {
        calls.push({ context, filters });
        return dashboard;
      },
    } as unknown as SharedAccess;
    const shared = { groupId: "group-1", generation: 4 };
    const caller = sharedRouter.createCaller({ shared, sharedAccess });

    await expect(caller.dashboard({ result: "draws" })).resolves.toEqual(dashboard);
    expect(calls).toEqual([{ context: shared, filters: { result: "draws" } }]);
  });

  test("publishes queries only", () => {
    const procedures = sharedRouter._def.procedures;

    expect(Object.keys(procedures).sort()).toEqual(["dashboard", "match", "player", "snapshot"]);
    for (const procedure of Object.values(procedures)) {
      expect(procedure._def.type).toBe("query");
    }
  });

  test("rejects calls without an exchanged capability", async () => {
    const caller = sharedRouter.createCaller({
      shared: null,
      sharedAccess: {} as SharedAccess,
    });

    await expect(caller.dashboard({})).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
