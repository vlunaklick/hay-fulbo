#!/usr/bin/env node

import { pathToFileURL } from "node:url";

import { createClientFromEnv, getOriginMainSha } from "./client.mjs";
import { NAMES } from "./reconcile.mjs";

function projectUuid(application) {
  return (
    application.project_uuid ??
    application.environment?.project_uuid ??
    application.environment?.project?.uuid
  );
}

function applicationUrl(application) {
  const value = (application.fqdn ?? application.domains ?? "").split(",")[0].trim();
  if (!value) throw new Error("Application has no public URL");
  const url = new URL(value);
  if (url.protocol !== "https:") {
    throw new Error("Application public URL is not HTTPS");
  }
  return url.origin;
}

export async function smokeRelease({
  client,
  getSha = getOriginMainSha,
  externalFetch = globalThis.fetch,
  healthAttempts = 3,
  requestTimeoutMs = 15_000,
}) {
  const sha = getSha();
  if (!/^[0-9a-f]{40}$/i.test(sha)) {
    throw new Error("origin/main did not resolve to a full commit SHA");
  }
  const [projects, applications] = await Promise.all([
    client.get("/projects"),
    client.get("/applications"),
  ]);
  const protectedProjects = new Set(
    projects.filter(({ name }) => /crecenly/i.test(name)).map(({ uuid }) => uuid),
  );
  const matches = applications.filter(({ name }) => name === NAMES.application);
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one application named ${NAMES.application}`);
  }
  if (/crecenly/i.test(matches[0].name) || protectedProjects.has(projectUuid(matches[0]))) {
    throw new Error("Refusing to inspect a protected Crecenly resource");
  }
  if (matches[0].git_commit_sha !== sha) {
    throw new Error("Coolify application SHA does not match origin/main");
  }

  const application = await client.get(`/applications/${matches[0].uuid}`);
  if (application.git_commit_sha !== sha) {
    throw new Error("Coolify application SHA does not match origin/main");
  }
  if (!application.status?.includes("running") || !application.status?.includes("healthy")) {
    throw new Error(`Coolify application is not healthy: ${application.status}`);
  }
  const origin = applicationUrl(application);
  const healthUrl = new URL("/api/health", origin);

  for (let attempt = 0; attempt < healthAttempts; attempt += 1) {
    const response = await externalFetch(healthUrl, {
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(requestTimeoutMs),
    });
    if (!response.ok) {
      throw new Error(`Health probe failed with HTTP ${response.status}`);
    }
    if (response.url && new URL(response.url).protocol !== "https:") {
      throw new Error("Health probe redirected away from HTTPS");
    }
    if (!response.headers.get("cache-control")?.includes("no-store")) {
      throw new Error("Health endpoint is missing Cache-Control: no-store");
    }
    const body = await response.json();
    if (body?.status !== "ok") {
      throw new Error("Health endpoint did not report status ok");
    }
  }

  return { sha, status: "healthy", url: origin, healthAttempts };
}

async function main() {
  const result = await smokeRelease({ client: createClientFromEnv() });
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    process.stderr.write(`Coolify smoke test failed: ${error.message}\n`);
    process.exitCode = 1;
  });
}
