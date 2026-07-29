import assert from "node:assert/strict";
import { test } from "node:test";

import { createCoolifyClient } from "./client.mjs";
import { smokeRelease } from "./smoke.mjs";

test("verifies exact SHA, HTTPS, and three healthy database probes", async () => {
  const sha = "f".repeat(40);
  const app = {
    uuid: "hay-app",
    name: "hay-fulbo-web",
    git_commit_sha: sha,
    fqdn: "https://hay-fulbo.example.test",
    status: "running:healthy",
  };
  const client = createCoolifyClient({
    baseUrl: "https://coolify.example",
    token: "api-token",
    fetchImpl: async (input) => {
      const path = new URL(input).pathname.replace("/api/v1", "");
      if (path === "/projects") return Response.json([]);
      if (path === "/applications") return Response.json([app]);
      if (path === "/applications/hay-app") return Response.json(app);
      return Response.json({}, { status: 404 });
    },
  });
  let healthCalls = 0;
  const externalFetch = async (input) => {
    assert.equal(input.toString(), "https://hay-fulbo.example.test/api/health");
    healthCalls += 1;
    return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  };

  const result = await smokeRelease({
    client,
    getSha: () => sha,
    externalFetch,
  });

  assert.equal(result.status, "healthy");
  assert.equal(result.url, "https://hay-fulbo.example.test");
  assert.equal(healthCalls, 3);
});

test("fails before health probes when Coolify SHA is stale", async () => {
  const client = createCoolifyClient({
    baseUrl: "https://coolify.example",
    token: "api-token",
    fetchImpl: async (input) => {
      const path = new URL(input).pathname.replace("/api/v1", "");
      if (path === "/projects") return Response.json([]);
      if (path === "/applications")
        return Response.json([
          {
            uuid: "hay-app",
            name: "hay-fulbo-web",
            git_commit_sha: "0".repeat(40),
          },
        ]);
      return Response.json({});
    },
  });
  let healthCalls = 0;

  await assert.rejects(
    smokeRelease({
      client,
      getSha: () => "1".repeat(40),
      externalFetch: async () => {
        healthCalls += 1;
      },
    }),
    /does not match origin\/main/,
  );
  assert.equal(healthCalls, 0);
});
