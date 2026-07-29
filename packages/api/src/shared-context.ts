import type { NextRequest } from "next/server";

import { sharedAccess } from "./access-runtime";
import { SHARED_ACCESS_COOKIE } from "./shared-http";

export async function createSharedContext(req: NextRequest) {
  const token = req.cookies.get(SHARED_ACCESS_COOKIE)?.value;
  return {
    shared: token ? await sharedAccess.authenticate(token).catch(() => null) : null,
    sharedAccess,
  };
}

export type SharedContext = Awaited<ReturnType<typeof createSharedContext>>;
