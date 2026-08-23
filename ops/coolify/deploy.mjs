#!/usr/bin/env node

import { pathToFileURL } from "node:url";

import { createClientFromEnv, getOriginMainSha } from "./client.mjs";
import { NAMES } from "./reconcile.mjs";

const SUCCESS = new Set(["finished", "success", "completed"]);
const FAILURE = new Set(["failed", "error", "cancelled", "cancelled-by-user"]);

function exactApplication(applications) {
  const matches = applications.filter(({ name }) => name === NAMES.application);
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one application named ${NAMES.application}`);
  }
  return matches[0];
}

function applicationProjectUuid(application) {
  return (
    application.project_uuid ??
    application.environment?.project_uuid ??
    application.environment?.project?.uuid
  );
}

function protectCrecenly(client, projects, applications) {
  const protectedProjects = new Set(
    projects.filter(({ name }) => /crecenly/i.test(name)).map(({ uuid }) => uuid),
  );
  const identifiers = [...protectedProjects];
  for (const application of applications) {
    if (
      /crecenly/i.test(application.name ?? "") ||
      protectedProjects.has(applicationProjectUuid(application))
    ) {
      identifiers.push(application.uuid, application.name);
    }
  }
  client.addForbiddenIdentifiers(identifiers.filter(Boolean));
}

export async function deployRelease({
  client,
  getSha = getOriginMainSha,
  sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
  pollIntervalMs = 5_000,
  maxPolls = 180,
}) {
  const sha = getSha();
  if (!/^[0-9a-f]{40}$/i.test(sha)) {
    throw new Error("origin/main did not resolve to a full commit SHA");
  }
  const [projects, applications] = await Promise.all([
    client.get("/projects"),
    client.get("/applications"),
  ]);
  protectCrecenly(client, projects, applications);
  let application = exactApplication(applications);

  if (application.git_commit_sha !== sha) {
    await client.patch(`/applications/${application.uuid}`, {
      git_commit_sha: sha,
    });
  }

  const queued = await client.mutatePost(
    `/deploy?uuid=${encodeURIComponent(application.uuid)}&force=false`,
  );
  const deployments = queued?.deployments ?? [];
  if (deployments.length !== 1 || !deployments[0].deployment_uuid) {
    throw new Error("Coolify did not queue exactly one deployment");
  }
  const deploymentUuid = deployments[0].deployment_uuid;
  let deployment;
  for (let poll = 0; poll < maxPolls; poll += 1) {
    if (poll > 0) await sleep(pollIntervalMs);
    deployment = await client.get(`/deployments/${deploymentUuid}`);
    if (SUCCESS.has(deployment.status)) break;
    if (FAILURE.has(deployment.status)) {
      throw new Error(`Deployment ended with status ${deployment.status}`);
    }
  }
  if (!SUCCESS.has(deployment?.status)) {
    throw new Error("Deployment did not reach a terminal state");
  }

  application = await client.get(`/applications/${application.uuid}`);
  if (application.git_commit_sha !== sha) {
    throw new Error("Deployed application SHA does not match origin/main");
  }
  if (
    application.status &&
    (!application.status.includes("running") || !application.status.includes("healthy"))
  ) {
    throw new Error(`Application is not healthy: ${application.status}`);
  }

  return {
    sha,
    status: deployment.status,
    applicationUrl: application.fqdn ?? application.domains,
  };
}

async function main() {
  const result = await deployRelease({ client: createClientFromEnv() });
  process.stdout.write(
    `${JSON.stringify({
      sha: result.sha,
      status: result.status,
      applicationUrl: result.applicationUrl,
    })}\n`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    process.stderr.write(`Coolify deploy failed: ${error.message}\n`);
    process.exitCode = 1;
  });
}
