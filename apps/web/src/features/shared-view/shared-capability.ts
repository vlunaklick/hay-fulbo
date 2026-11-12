"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";

function subscribeToFragment(listener: () => void) {
  window.addEventListener("hashchange", listener);
  return () => window.removeEventListener("hashchange", listener);
}

function currentFragment() {
  return window.location.hash.slice(1);
}

// Unknown until hydration: reading "" here would fire shared queries before
// the `#token` is exchanged and flash an "inactive link" error.
function serverFragment() {
  return null;
}

export function useSharedCapability() {
  const queryClient = useQueryClient();
  const token = useSyncExternalStore(subscribeToFragment, currentFragment, serverFragment);
  const exchange = useQuery({
    queryKey: ["shared-capability-exchange", token],
    enabled: Boolean(token),
    retry: false,
    queryFn: async () => {
      const response = await fetch("/api/shared/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!response.ok) {
        throw new Error("El enlace compartido no es válido o ya fue reemplazado.");
      }
      queryClient.removeQueries({
        predicate: (query) =>
          typeof query.queryKey[0] === "string" &&
          query.queryKey[0].startsWith("shared-") &&
          query.queryKey[0] !== "shared-capability-exchange",
      });
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
      return true;
    },
  });

  return {
    error: exchange.error,
    retry: () => void exchange.refetch(),
    ready: token === "" || exchange.isSuccess,
    exchanging: token === null || (token.length > 0 && exchange.isPending),
  };
}
