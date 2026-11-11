import type { AppRouter } from "@hay-fulbo/api/routers/index";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { toast } from "sonner";

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (_error, query) => {
      // Background refetches of data already on screen fail quietly; screens show their own notice.
      if (query.state.data !== undefined) return;
      toast.error("No pudimos cargar los datos.", {
        id: "query-error",
        action: {
          label: "Reintentar",
          onClick: () => {
            query.invalidate();
          },
        },
      });
    },
  }),
});

const trpcHttpClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      fetch(url, options) {
        return fetch(url, {
          ...options,
          credentials: "include",
        });
      },
    }),
  ],
});

export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: trpcHttpClient,
  queryClient,
});

export { trpcHttpClient };
