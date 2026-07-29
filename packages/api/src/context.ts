import { auth } from "@hay-fulbo/auth";
import type { NextRequest } from "next/server";

import { groupAccess, sharedAccess } from "./access-runtime";

export async function createContext(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: req.headers,
  });
  return {
    groupAccess,
    requestHeaders: req.headers,
    session,
    sharedAccess,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
