import { createSharedContext } from "@hay-fulbo/api/shared-context";
import { sharedResponseHeaders } from "@hay-fulbo/api/shared-http";
import { sharedRouter } from "@hay-fulbo/api/routers/shared";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { NextRequest } from "next/server";

function handler(request: NextRequest) {
  return fetchRequestHandler({
    createContext: () => createSharedContext(request),
    endpoint: "/api/shared/trpc",
    req: request,
    responseMeta: () => ({ headers: sharedResponseHeaders }),
    router: sharedRouter,
  });
}

export { handler as GET, handler as POST };
