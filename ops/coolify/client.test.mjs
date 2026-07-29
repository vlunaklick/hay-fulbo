import assert from "node:assert/strict";
import { test } from "node:test";

import { buildRuntimeDatabaseUrl, createCoolifyClient, redact } from "./client.mjs";

test("blocks Crecenly identifiers before a mutating request", async () => {
  let calls = 0;
  const client = createCoolifyClient({
    baseUrl: "https://coolify.example",
    token: "super-secret",
    forbiddenIdentifiers: ["crecenly-project-uuid"],
    fetchImpl: async () => {
      calls += 1;
      return new Response("{}", { status: 200 });
    },
  });

  await assert.rejects(
    client.post("/projects", {
      name: "hay-fulbo",
      project_uuid: "crecenly-project-uuid",
    }),
    /protected Crecenly resource/i,
  );
  assert.equal(calls, 0);
});

test("does not leak authorization or body secrets in request errors", async () => {
  const client = createCoolifyClient({
    baseUrl: "https://coolify.example",
    token: "super-secret",
    fetchImpl: async () => new Response('{"message":"password=database-secret"}', { status: 500 }),
  });

  await assert.rejects(client.post("/projects", { password: "database-secret" }), (error) => {
    assert.doesNotMatch(error.message, /super-secret|database-secret/);
    assert.match(error.message, /POST \/projects failed with 500/);
    return true;
  });
});

test("accepts Coolify endpoints that return plain text", async () => {
  const client = createCoolifyClient({
    baseUrl: "https://coolify.example",
    token: "super-secret",
    fetchImpl: async () =>
      new Response("4.1.2\n", {
        status: 200,
        headers: { "content-type": "text/plain; charset=utf-8" },
      }),
  });

  assert.equal(await client.get("/version"), "4.1.2");
});

test("sends guarded DELETE requests", async () => {
  const requests = [];
  const client = createCoolifyClient({
    baseUrl: "https://coolify.example",
    token: "super-secret",
    fetchImpl: async (url, init) => {
      requests.push({ url: String(url), method: init.method });
      return new Response(null, { status: 204 });
    },
  });

  await client.delete("/applications/hay-fulbo/envs/temporary");

  assert.deepEqual(requests, [
    {
      url: "https://coolify.example/api/v1/applications/hay-fulbo/envs/temporary",
      method: "DELETE",
    },
  ]);
});

test("constructs the runtime URL through URL encoding", () => {
  assert.equal(
    buildRuntimeDatabaseUrl(
      "postgresql://hay_fulbo_migrator:owner%20pass@postgres:5432/hay_fulbo?sslmode=disable",
      "run/t?me#pass",
    ),
    "postgresql://hay_fulbo_runtime:run%2Ft%3Fme%23pass@postgres:5432/hay_fulbo?sslmode=disable",
  );
});

test("redacts credentials from values before logging", () => {
  assert.deepEqual(
    redact({
      name: "hay-fulbo",
      password: "secret",
      DATABASE_URL: "postgresql://u:p@db/hay",
    }),
    { name: "hay-fulbo", password: "[REDACTED]", DATABASE_URL: "[REDACTED]" },
  );
});
