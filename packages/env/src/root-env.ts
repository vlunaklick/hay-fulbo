import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

import { config } from "dotenv";

/**
 * Loads the monorepo root .env regardless of the process working directory,
 * so tools that run inside a workspace package (next dev, tests, scripts)
 * see the same environment as those started from the repository root.
 */
export function loadRootEnv() {
  let directory = process.cwd();
  for (let depth = 0; depth < 8; depth += 1) {
    const candidate = join(directory, ".env");
    if (existsSync(candidate)) {
      config({ path: candidate });
      return;
    }
    const parent = dirname(directory);
    if (parent === directory) break;
    directory = parent;
  }
  config();
}
