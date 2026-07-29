#!/usr/bin/env node

import { pathToFileURL } from "node:url";

import {
  buildRuntimeDatabaseUrl,
  createClientFromEnv,
  generateSecret,
  getOriginMainSha,
} from "./client.mjs";

export const COOLIFY_VERSION = "4.1.2";
export const NAMES = Object.freeze({
  project: "hay-fulbo",
  environment: "production",
  database: "hay-fulbo-postgres",
  application: "hay-fulbo-web",
});

const APP_DESCRIPTION = "Hay Fulbo production web application";
const DB_DESCRIPTION = "PostgreSQL 18 production database for Hay Fulbo";
const REPOSITORY = "https://github.com/vlunaklick/hay-fulbo";

function asArray(value, key) {
  if (Array.isArray(value)) return value;
  if (value && Array.isArray(value[key])) return value[key];
  return [];
}

function oneExact(resources, name, kind) {
  const matches = resources.filter((resource) => resource.name === name);
  if (matches.length > 1) {
    throw new Error(`Expected at most one ${kind} named ${name}`);
  }
  return matches[0];
}

function resourceProjectUuid(resource) {
  return (
    resource.project_uuid ??
    resource.environment?.project_uuid ??
    resource.environment?.project?.uuid
  );
}

function assertOwnedBy(resource, projectUuid, kind) {
  const owner = resourceProjectUuid(resource);
  if (owner && owner !== projectUuid) {
    throw new Error(`${kind} name is already used outside project ${NAMES.project}`);
  }
}

function differs(actual, desired) {
  return Object.entries(desired).some(
    ([key, value]) => JSON.stringify(actual?.[key]) !== JSON.stringify(value),
  );
}

function canonicalUrl(application) {
  const candidate = (application.fqdn ?? application.domains ?? "").split(",")[0].trim();
  if (!candidate) throw new Error("Coolify did not assign an application URL");
  const url = new URL(candidate);
  if (url.protocol !== "https:") {
    throw new Error("Coolify application URL must use HTTPS");
  }
  return url.origin;
}

function destinationUuid(application) {
  return application.destination_uuid ?? application.destination?.uuid;
}

function chooseInfrastructure(servers, applications, env) {
  const usableServers = servers.filter(
    (server) => server.is_reachable !== false && server.is_usable !== false,
  );
  const server = env.COOLIFY_SERVER_UUID
    ? servers.find(({ uuid }) => uuid === env.COOLIFY_SERVER_UUID)
    : usableServers.length === 1
      ? usableServers[0]
      : undefined;
  if (!server || !usableServers.some(({ uuid }) => uuid === server.uuid)) {
    throw new Error("Set COOLIFY_SERVER_UUID to one reachable, usable server");
  }

  const observedDestinations = [...new Set(applications.map(destinationUuid).filter(Boolean))];
  const destination = env.COOLIFY_DESTINATION_UUID
    ? env.COOLIFY_DESTINATION_UUID
    : observedDestinations.length === 1
      ? observedDestinations[0]
      : undefined;
  if (!destination) {
    throw new Error("Set COOLIFY_DESTINATION_UUID to the Docker destination");
  }
  return { serverUuid: server.uuid, destinationUuid: destination };
}

function projectEnvironment(project) {
  return oneExact(asArray(project?.environments, "environments"), NAMES.environment, "environment");
}

function desiredApplication({
  projectUuid,
  environmentUuid,
  serverUuid,
  destinationUuid: selectedDestination,
  sha,
}) {
  return {
    project_uuid: projectUuid,
    server_uuid: serverUuid,
    environment_name: NAMES.environment,
    environment_uuid: environmentUuid,
    destination_uuid: selectedDestination,
    name: NAMES.application,
    description: APP_DESCRIPTION,
    git_repository: REPOSITORY,
    git_branch: "main",
    git_commit_sha: sha,
    build_pack: "dockerfile",
    base_directory: "/",
    dockerfile_location: "/apps/web/Dockerfile",
    ports_exposes: "3001",
    health_check_enabled: true,
    health_check_path: "/api/health",
    health_check_port: "3001",
    health_check_method: "GET",
    health_check_return_code: 200,
    health_check_scheme: "http",
    health_check_interval: 10,
    health_check_timeout: 5,
    health_check_retries: 5,
    health_check_start_period: 60,
    is_auto_deploy_enabled: false,
    is_force_https_enabled: true,
    autogenerate_domain: true,
    instant_deploy: false,
  };
}

function desiredDatabase({
  projectUuid,
  environmentUuid,
  serverUuid,
  destinationUuid: selectedDestination,
  password,
}) {
  return {
    server_uuid: serverUuid,
    project_uuid: projectUuid,
    environment_name: NAMES.environment,
    environment_uuid: environmentUuid,
    destination_uuid: selectedDestination,
    name: NAMES.database,
    description: DB_DESCRIPTION,
    image: "postgres:18",
    postgres_user: "hay_fulbo_migrator",
    postgres_password: password,
    postgres_db: "hay_fulbo",
    is_public: false,
    instant_deploy: true,
  };
}

const BACKUP = Object.freeze({
  frequency: "daily",
  enabled: true,
  save_s3: false,
  dump_all: false,
  databases_to_backup: "hay_fulbo",
  backup_now: false,
  database_backup_retention_amount_locally: 7,
});

function environmentItem(key, value, secret = false) {
  return {
    key,
    value,
    is_runtime: true,
    is_buildtime: false,
    is_preview: false,
    is_literal: true,
    is_multiline: false,
    is_shown_once: secret,
  };
}

function envComparable(item) {
  const {
    key,
    value,
    is_runtime,
    is_buildtime,
    is_preview,
    is_literal,
    is_multiline,
    is_shown_once,
  } = item;
  return {
    key,
    value: item.real_value ?? value,
    is_runtime,
    is_buildtime,
    is_preview,
    is_literal,
    is_multiline,
    is_shown_once,
  };
}

function sameEnvironment(actual, desired) {
  if (actual.length !== desired.length) return false;
  const byKey = new Map(actual.map((item) => [item.key, item]));
  return desired.every((item) => {
    const current = byKey.get(item.key);
    return current && !differs(envComparable(current), envComparable(item));
  });
}

function discoverProtected(projects, applications, databases) {
  const projectIds = new Set(
    projects
      .filter(({ name }) => /crecenly/i.test(name))
      .map(({ uuid }) => uuid)
      .filter(Boolean),
  );
  const identifiers = new Set(projectIds);
  for (const resource of [...projects, ...applications, ...databases]) {
    if (/crecenly/i.test(resource.name ?? "") || projectIds.has(resourceProjectUuid(resource))) {
      if (resource.uuid) identifiers.add(resource.uuid);
      if (resource.name) identifiers.add(resource.name);
    }
  }
  return identifiers;
}

async function discover(client) {
  const [version, team, servers, projects, applications, databases] = await Promise.all([
    client.get("/version"),
    client.get("/teams/current"),
    client.get("/servers"),
    client.get("/projects"),
    client.get("/applications"),
    client.get("/databases"),
  ]);
  return {
    version: typeof version === "string" ? version : version.version,
    team,
    servers: asArray(servers, "servers"),
    projects: asArray(projects, "projects"),
    applications: asArray(applications, "applications"),
    databases: asArray(databases, "databases"),
  };
}

export async function reconcileCoolify({
  client,
  apply = false,
  getSha = getOriginMainSha,
  randomBytesImpl,
  env = process.env,
}) {
  const sha = getSha();
  if (!/^[0-9a-f]{40}$/i.test(sha)) {
    throw new Error("origin/main did not resolve to a full commit SHA");
  }

  const inventory = await discover(client);
  if (inventory.version !== COOLIFY_VERSION) {
    throw new Error(`Coolify ${inventory.version} is not the audited ${COOLIFY_VERSION}`);
  }
  client.addForbiddenIdentifiers(
    discoverProtected(inventory.projects, inventory.applications, inventory.databases),
  );
  const infrastructure = chooseInfrastructure(inventory.servers, inventory.applications, env);
  let project = oneExact(inventory.projects, NAMES.project, "project");
  let database = oneExact(inventory.databases, NAMES.database, "database");
  let application = oneExact(inventory.applications, NAMES.application, "application");
  if (project) {
    assertOwnedBy(database, project.uuid, "Database");
    assertOwnedBy(application, project.uuid, "Application");
  } else if (database || application) {
    throw new Error("Target resource names exist without the target project");
  }

  if (!apply && !project) {
    return {
      mode: "dry-run",
      sha,
      version: inventory.version,
      actions: [
        `create project ${NAMES.project}`,
        `create PostgreSQL ${NAMES.database}`,
        `create application ${NAMES.application}`,
        "reconcile application environment",
        "create daily local backup",
      ],
    };
  }

  const actions = [];
  if (!project) {
    actions.push(`create project ${NAMES.project}`);
    if (apply) {
      const created = await client.post("/projects", {
        name: NAMES.project,
        description: "Hay Fulbo production",
      });
      project = await client.get(`/projects/${created.uuid}`);
    }
  } else {
    project = await client.get(`/projects/${project.uuid}`);
  }

  let environment = projectEnvironment(project);
  if (!environment) {
    actions.push(`create environment ${NAMES.environment}`);
    if (apply) {
      environment = await client.post(`/projects/${project.uuid}/environments`, {
        name: NAMES.environment,
      });
    }
  }
  if (!apply) {
    if (!database) actions.push(`create PostgreSQL ${NAMES.database}`);
    if (!application) actions.push(`create application ${NAMES.application}`);
    actions.push("reconcile application environment");
    actions.push("create or reconcile daily local backup");
    return {
      mode: "dry-run",
      sha,
      version: inventory.version,
      actions,
    };
  }

  const ownerPassword = generateSecret(36, randomBytesImpl);
  const databaseCreate = desiredDatabase({
    projectUuid: project.uuid,
    environmentUuid: environment.uuid,
    ...infrastructure,
    password: ownerPassword,
  });
  if (!database) {
    actions.push(`create PostgreSQL ${NAMES.database}`);
    const created = await client.post("/databases/postgresql", databaseCreate);
    database = await client.get(`/databases/${created.uuid}`);
  } else {
    database = await client.get(`/databases/${database.uuid}`);
    const databaseUpdate = {
      name: NAMES.database,
      description: DB_DESCRIPTION,
      image: "postgres:18",
      postgres_user: "hay_fulbo_migrator",
      postgres_db: "hay_fulbo",
      is_public: false,
    };
    if (differs(database, databaseUpdate)) {
      actions.push(`update PostgreSQL ${NAMES.database}`);
      await client.patch(`/databases/${database.uuid}`, databaseUpdate);
      database = { ...database, ...databaseUpdate };
    }
  }

  const applicationDesired = desiredApplication({
    projectUuid: project.uuid,
    environmentUuid: environment.uuid,
    sha,
    ...infrastructure,
  });
  if (!application) {
    actions.push(`create application ${NAMES.application}`);
    const created = await client.post("/applications/public", applicationDesired);
    application = await client.get(`/applications/${created.uuid}`);
  } else {
    application = await client.get(`/applications/${application.uuid}`);
    const applicationUpdate = Object.fromEntries(
      Object.entries(applicationDesired).filter(
        ([key]) =>
          ![
            "project_uuid",
            "server_uuid",
            "environment_name",
            "environment_uuid",
            "destination_uuid",
            "instant_deploy",
          ].includes(key),
      ),
    );
    if (differs(application, applicationUpdate)) {
      actions.push(`update application ${NAMES.application}`);
      await client.patch(`/applications/${application.uuid}`, applicationUpdate);
      application = { ...application, ...applicationUpdate };
    }
  }

  const ownerUrl = database.internal_db_url ?? database.internal_url ?? database.connection_string;
  if (!ownerUrl) {
    throw new Error("Database internal URL is unavailable; grant read:sensitive permission");
  }
  const currentEnvs = asArray(await client.get(`/applications/${application.uuid}/envs`), "envs");
  const currentByKey = new Map(
    currentEnvs.map((item) => [item.key, item.real_value ?? item.value]),
  );
  const existingRuntimePassword = currentByKey.get("RUNTIME_DATABASE_PASSWORD");
  const existingAuthSecret = currentByKey.get("BETTER_AUTH_SECRET");
  if (
    currentEnvs.some(
      (item) =>
        ["RUNTIME_DATABASE_PASSWORD", "BETTER_AUTH_SECRET"].includes(item.key) &&
        !(item.real_value ?? item.value),
    )
  ) {
    throw new Error("Secret environment values are hidden; grant read:sensitive permission");
  }
  const runtimePassword = existingRuntimePassword ?? generateSecret(36, randomBytesImpl);
  const authSecret = existingAuthSecret ?? generateSecret(48, randomBytesImpl);
  const appUrl = canonicalUrl(application);
  const desiredEnvs = [
    environmentItem("MIGRATION_DATABASE_URL", ownerUrl, true),
    environmentItem("DATABASE_URL", buildRuntimeDatabaseUrl(ownerUrl, runtimePassword), true),
    environmentItem("RUNTIME_DATABASE_PASSWORD", runtimePassword, true),
    environmentItem("BETTER_AUTH_SECRET", authSecret, true),
    environmentItem("BETTER_AUTH_URL", appUrl),
    environmentItem("CORS_ORIGIN", appUrl),
    environmentItem("NODE_ENV", "production"),
  ];
  if (!sameEnvironment(currentEnvs, desiredEnvs)) {
    actions.push("reconcile application environment");
    await client.patch(`/applications/${application.uuid}/envs/bulk`, {
      data: desiredEnvs,
    });
  }

  const rawBackups = await client.get(`/databases/${database.uuid}/backups`);
  const backups = asArray(rawBackups, "scheduled_backups");
  if (backups.length > 1) {
    throw new Error("Expected at most one scheduled database backup");
  }
  const backup = backups[0];
  if (!backup) {
    actions.push("create daily local backup");
    await client.post(`/databases/${database.uuid}/backups`, BACKUP);
  } else if (differs(backup, BACKUP)) {
    actions.push("update daily local backup");
    await client.patch(`/databases/${database.uuid}/backups/${backup.uuid}`, BACKUP);
  }

  return {
    mode: "apply",
    sha,
    version: inventory.version,
    projectUuid: project.uuid,
    environmentUuid: environment.uuid,
    databaseUuid: database.uuid,
    applicationUuid: application.uuid,
    applicationUrl: appUrl,
    actions,
  };
}

async function main() {
  const apply = process.argv.includes("--apply");
  if (!apply && !process.argv.includes("--dry-run")) {
    throw new Error("Pass --dry-run or --apply explicitly");
  }
  const result = await reconcileCoolify({
    client: createClientFromEnv(),
    apply,
  });
  process.stdout.write(
    `${JSON.stringify({
      ...result,
      projectUuid: result.projectUuid ? "[set]" : undefined,
      environmentUuid: result.environmentUuid ? "[set]" : undefined,
      databaseUuid: result.databaseUuid ? "[set]" : undefined,
      applicationUuid: result.applicationUuid ? "[set]" : undefined,
    })}\n`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    process.stderr.write(`Coolify reconcile failed: ${error.message}\n`);
    process.exitCode = 1;
  });
}
