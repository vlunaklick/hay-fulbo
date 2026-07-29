"use client";

import type { SharedRouter } from "@hay-fulbo/api/routers/shared";
import { createTRPCClient, httpBatchLink } from "@trpc/client";

export const sharedStatsClient = createTRPCClient<SharedRouter>({
  links: [
    httpBatchLink({
      url: "/api/shared/trpc",
      fetch(url, options) {
        return fetch(url, {
          ...options,
          credentials: "include",
        });
      },
    }),
  ],
});
