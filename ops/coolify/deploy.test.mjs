import assert from "node:assert/strict";
import { test } from "node:test";

import { createCoolifyClient } from "./client.mjs";
import { deployRelease } from "./deploy.mjs";

test("updates origin/main SHA, triggers exactly once, and waits for finished", async () => {
  const sha = "c".repeat(40);
  const calls = [];
  let polls = 0;
  const app = {
    uuid: "hay-app",
    name: "hay-fulbo-web",
    git_commit_sha: "d".repeat(40),
    status: "running:healthy",
  };
  const fetchImpl = async (input, init = {}) => {
    const url = new URL(input);
    const path = url.pathname.replace("/api/v1", "");
    const method = init.method ?? "GET";
    calls.push({ method, path, search: url.search, body: init.body });
    if (path === "/projects" && method === "GET") return Response.json([]);
    if (path === "/applications" && method === "GET") return Response.json([app]);
    if (path === "/applications/hay-app" && method === "PATCH") {
      Object.assign(app, JSON.parse(init.body));
      return Response.json(app);
    }
    if (path === "/deploy" && method === "POST")
      return Response.json({
        deployments: [{ resource_uuid: "hay-app", deployment_uuid: "deployment-1" }],
      });
    if (path === "/deployments/deployment-1" && method === "GET") {
      polls += 1;
      return Response.json({
        deployment_uuid: "deployment-1",
        status: polls === 1 ? "in_progress" : "finished",
      });
    }
    if (path === "/applications/hay-app" && method === "GET") return Response.json(app);
    return Response.json({}, { status: 404 });
  };
  const client = createCoolifyClient({
    baseUrl: "https://coolify.example",
    token: "api-token",
    fetchImpl,
  });

  const result = await deployRelease({
    client,
    getSha: () => sha,
    sleep: async () => {},
    pollIntervalMs: 0,
  });

  assert.equal(result.sha, sha);
  assert.equal(result.status, "finished");
  assert.equal(calls.filter(({ path }) => path === "/deploy").length, 1);
  const deployCall = calls.find(({ path }) => path === "/deploy");
  assert.equal(deployCall.method, "POST");
  assert.equal(deployCall.body, JSON.stringify({ uuid: "hay-app", force: false }));
  assert.equal(polls, 2);
});

test("rejects a non-terminal deployment after the polling budget", async () => {
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
            git_commit_sha: "e".repeat(40),
          },
        ]);
      if (path === "/deploy")
        return Response.json({
          deployments: [{ deployment_uuid: "deployment-1" }],
        });
      return Response.json({ status: "in_progress" });
    },
  });

  await assert.rejects(
    deployRelease({
      client,
      getSha: () => "e".repeat(40),
      sleep: async () => {},
      maxPolls: 2,
    }),
    /did not reach a terminal state/,
  );
});
