import assert from "node:assert/strict";
import { test } from "node:test";

import { createCoolifyClient } from "./client.mjs";
import { reconcileCoolify } from "./reconcile.mjs";

function json(value, status = 200) {
  return Response.json(value, { status });
}

function createFakeCoolify() {
  const state = {
    mutations: [],
    projects: [{ uuid: "crecenly-project", name: "Crecenly ERP" }],
    apps: [
      {
        uuid: "other-app",
        name: "other",
        project_uuid: "other-project",
        destination_uuid: "destination-1",
      },
    ],
    databases: [],
    environments: new Map(),
    envs: new Map(),
    backups: new Map(),
    generatedFqdn: "http://hay-fulbo.example.test",
  };

  const fetchImpl = async (input, init = {}) => {
    const url = new URL(input);
    const path = url.pathname.replace("/api/v1", "");
    const method = init.method ?? "GET";
    const body = init.body ? JSON.parse(init.body) : undefined;
    if (method !== "GET") state.mutations.push({ method, path, body });

    if (method === "GET" && path === "/version") return json("4.1.2");
    if (method === "GET" && path === "/teams/current")
      return json({ id: 0, name: "Root Team", personal_team: true });
    if (method === "GET" && path === "/servers")
      return json([
        {
          uuid: "server-1",
          name: "localhost",
          is_reachable: true,
          is_usable: true,
        },
      ]);
    if (method === "GET" && path === "/projects") return json(state.projects);
    if (method === "GET" && path === "/applications") return json(state.apps);
    if (method === "GET" && path === "/databases") return json(state.databases);

    if (method === "POST" && path === "/projects") {
      const project = { uuid: "hay-project", ...body };
      state.projects.push(project);
      state.environments.set(project.uuid, [{ uuid: "production-env", name: "production" }]);
      return json(project, 201);
    }
    const projectMatch = path.match(/^\/projects\/([^/]+)$/);
    if (method === "GET" && projectMatch) {
      const project = state.projects.find(({ uuid }) => uuid === projectMatch[1]);
      return json({
        ...project,
        environments: state.environments.get(project.uuid) ?? [],
      });
    }

    if (method === "POST" && path === "/databases/postgresql") {
      const database = {
        uuid: "hay-db",
        ...body,
        internal_db_url: "postgresql://hay_fulbo_migrator:owner-secret@hay-db:5432/hay_fulbo",
      };
      state.databases.push(database);
      return json(database, 201);
    }
    const databaseMatch = path.match(/^\/databases\/([^/]+)$/);
    if (method === "GET" && databaseMatch)
      return json(state.databases.find(({ uuid }) => uuid === databaseMatch[1]));
    if (method === "PATCH" && databaseMatch) {
      const database = state.databases.find(({ uuid }) => uuid === databaseMatch[1]);
      Object.assign(database, body);
      return json(database);
    }

    if (method === "POST" && path === "/applications/public") {
      const app = {
        uuid: "hay-app",
        ...body,
        fqdn: state.generatedFqdn,
        status: "running:healthy",
      };
      delete app.autogenerate_domain;
      state.apps.push(app);
      return json(app, 201);
    }
    const appMatch = path.match(/^\/applications\/([^/]+)$/);
    if (appMatch && method === "GET")
      return json(state.apps.find(({ uuid }) => uuid === appMatch[1]));
    if (appMatch && method === "PATCH") {
      const app = state.apps.find(({ uuid }) => uuid === appMatch[1]);
      Object.assign(app, body);
      if (body.domains) app.fqdn = body.domains;
      return json(app);
    }

    const envMatch = path.match(/^\/applications\/([^/]+)\/envs$/);
    if (envMatch && method === "GET") return json(state.envs.get(envMatch[1]) ?? []);
    const envBulkMatch = path.match(/^\/applications\/([^/]+)\/envs\/bulk$/);
    if (envBulkMatch && method === "PATCH") {
      state.envs.set(envBulkMatch[1], [
        ...body.data.map((item) => ({ ...item, real_value: `'${item.value}'` })),
        ...body.data.map((item) => ({
          ...item,
          is_preview: true,
          real_value: `'${item.value}'`,
        })),
      ]);
      return json({ message: "updated" });
    }

    const backupCollection = path.match(/^\/databases\/([^/]+)\/backups$/);
    if (backupCollection && method === "GET")
      return json(state.backups.get(backupCollection[1]) ?? []);
    if (backupCollection && method === "POST") {
      const backup = { uuid: "backup-1", ...body };
      delete backup.backup_now;
      state.backups.set(backupCollection[1], [backup]);
      return json(backup, 201);
    }
    const backupItem = path.match(/^\/databases\/([^/]+)\/backups\/([^/]+)$/);
    if (backupItem && method === "PATCH") {
      const backup = state.backups.get(backupItem[1]).find(({ uuid }) => uuid === backupItem[2]);
      Object.assign(backup, body);
      return json(backup);
    }

    return json({ message: `${method} ${path} not mocked` }, 404);
  };

  return { fetchImpl, state };
}

function clientFor(fake) {
  return createCoolifyClient({
    baseUrl: "https://coolify.example",
    token: "api-token",
    fetchImpl: fake.fetchImpl,
  });
}

test("dry-run calculates an exact plan without mutations", async () => {
  const fake = createFakeCoolify();
  const result = await reconcileCoolify({
    client: clientFor(fake),
    apply: false,
    getSha: () => "a".repeat(40),
  });

  assert.equal(result.mode, "dry-run");
  assert.deepEqual(result.actions, [
    "create project hay-fulbo",
    "create PostgreSQL hay-fulbo-postgres",
    "create application hay-fulbo-web",
    "reconcile application environment",
    "create daily local backup",
  ]);
  assert.equal(fake.state.mutations.length, 0);
});

test("apply is idempotent and never sends Crecenly in a mutation", async () => {
  const fake = createFakeCoolify();
  const options = {
    client: clientFor(fake),
    apply: true,
    getSha: () => "b".repeat(40),
    randomBytesImpl: (size) => Buffer.alloc(size, 7),
  };

  const first = await reconcileCoolify(options);
  const createCount = fake.state.mutations.filter(({ method }) => method === "POST").length;
  const second = await reconcileCoolify(options);

  assert.equal(first.mode, "apply");
  assert.ok(first.actions.includes("set application HTTPS domain"));
  assert.equal(second.actions.length, 0);
  assert.equal(fake.state.mutations.filter(({ method }) => method === "POST").length, createCount);
  assert.equal(fake.state.projects.filter(({ name }) => name === "hay-fulbo").length, 1);
  assert.equal(fake.state.databases.filter(({ name }) => name === "hay-fulbo-postgres").length, 1);
  assert.equal(fake.state.apps.filter(({ name }) => name === "hay-fulbo-web").length, 1);
  assert.ok(
    fake.state.mutations
      .filter(({ method, path }) => method === "PATCH" && path === "/applications/hay-app")
      .every(({ body }) => !("autogenerate_domain" in body)),
  );
  assert.ok(fake.state.mutations.every((mutation) => !JSON.stringify(mutation).match(/crecenly/i)));
  const env = Object.fromEntries(
    fake.state.envs.get("hay-app").map(({ key, value }) => [key, value]),
  );
  assert.ok(env.RUNTIME_DATABASE_PASSWORD);
  assert.match(env.DATABASE_URL, /^postgresql:\/\/hay_fulbo_runtime:/);
  assert.equal(env.BETTER_AUTH_URL, "https://hay-fulbo.example.test");
});
