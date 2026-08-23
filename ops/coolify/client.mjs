import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";

const SECRET_KEY =
  /(?:authorization|token|secret|password|database_url|migration_database_url|runtime_database_password)/i;

export function redact(value, key = "") {
  if (SECRET_KEY.test(key)) return "[REDACTED]";
  if (Array.isArray(value)) return value.map((item) => redact(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [
        entryKey,
        redact(entryValue, entryKey),
      ]),
    );
  }
  return value;
}

function hasProtectedIdentifier(value, forbiddenIdentifiers) {
  const strings = [];
  const collect = (input) => {
    if (typeof input === "string") strings.push(input);
    else if (Array.isArray(input)) input.forEach(collect);
    else if (input && typeof input === "object")
      Object.entries(input).forEach(([key, nested]) => {
        strings.push(key);
        collect(nested);
      });
  };
  collect(value);
  return strings.some(
    (candidate) =>
      /crecenly/i.test(candidate) ||
      [...forbiddenIdentifiers].some((identifier) => identifier && candidate.includes(identifier)),
  );
}

export function assertNoCrecenly(value, forbiddenIdentifiers = new Set()) {
  if (hasProtectedIdentifier(value, forbiddenIdentifiers)) {
    throw new Error("Refusing to mutate a protected Crecenly resource");
  }
}

export function createCoolifyClient({
  baseUrl,
  token,
  fetchImpl = globalThis.fetch,
  forbiddenIdentifiers = [],
}) {
  if (!baseUrl || !token) {
    throw new Error("COOLIFY_API_URL and COOLIFY_API_TOKEN are required");
  }

  const apiUrl = new URL(
    baseUrl.replace(/\/+$/, "").endsWith("/api/v1")
      ? `${baseUrl.replace(/\/+$/, "")}/`
      : `${baseUrl.replace(/\/+$/, "")}/api/v1/`,
  );
  const forbidden = new Set(forbiddenIdentifiers);

  async function request(method, path, body, { mutation = false } = {}) {
    if (mutation) assertNoCrecenly({ path, body }, forbidden);
    const relativePath = path.replace(/^\/+/, "");
    const url = new URL(relativePath, apiUrl);
    const response = await fetchImpl(url, {
      method,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });

    if (!response.ok) {
      throw new Error(`${method} /${relativePath} failed with ${response.status}`);
    }
    if (response.status === 204) return undefined;
    const text = await response.text();
    if (!text) return undefined;
    try {
      return JSON.parse(text);
    } catch {
      return text.trim();
    }
  }

  return {
    addForbiddenIdentifiers(identifiers) {
      identifiers.forEach((identifier) => forbidden.add(identifier));
    },
    get(path) {
      return request("GET", path);
    },
    post(path, body) {
      return request("POST", path, body, { mutation: true });
    },
    patch(path, body) {
      return request("PATCH", path, body, { mutation: true });
    },
    delete(path) {
      return request("DELETE", path, undefined, { mutation: true });
    },
    mutateGet(path) {
      return request("GET", path, undefined, { mutation: true });
    },
    mutatePost(path) {
      return request("POST", path, undefined, { mutation: true });
    },
  };
}

export function buildRuntimeDatabaseUrl(ownerUrl, runtimePassword) {
  const url = new URL(ownerUrl);
  url.username = "hay_fulbo_runtime";
  url.password = runtimePassword;
  return url.toString();
}

export function generateSecret(bytes = 32, randomBytesImpl = randomBytes) {
  return randomBytesImpl(bytes).toString("base64url");
}

export function getOriginMainSha(execFileSyncImpl = execFileSync) {
  execFileSyncImpl("git", ["fetch", "--quiet", "origin", "main"], {
    stdio: ["ignore", "ignore", "ignore"],
  });
  return execFileSyncImpl("git", ["rev-parse", "origin/main"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
}

export function createClientFromEnv(env = process.env, options = {}) {
  return createCoolifyClient({
    baseUrl: env.COOLIFY_API_URL,
    token: env.COOLIFY_API_TOKEN,
    ...options,
  });
}
