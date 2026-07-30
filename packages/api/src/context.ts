import { auth } from "@hay-fulbo/auth";
import type { NextRequest } from "next/server";

import { groupAccess, groupJoinAccess, sharedAccess } from "./access-runtime";

export async function createContext(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: req.headers,
  });
  return {
    groupAccess,
    groupJoinAccess,
    requestHeaders: req.headers,
    session,
    sharedAccess,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
