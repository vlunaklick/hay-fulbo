"use client";

import { useQuery } from "@tanstack/react-query";

import { trpcHttpClient } from "@/utils/trpc";

import { sharedStatsClient } from "./shared-client";

/** Where the read-only view gets its data: a public group by slug, or the private link cookie. */
export type ViewSource = { kind: "public"; slug: string } | { kind: "shared" };

export type ViewDashboard = Awaited<ReturnType<typeof trpcHttpClient.public.dashboard.query>>;
export type ViewMatch = Awaited<ReturnType<typeof trpcHttpClient.public.match.query>>;
export type ViewPlayer = Awaited<ReturnType<typeof trpcHttpClient.public.player.query>>;
export type ViewHistoryItem = ViewDashboard["history"][number];
export type ViewRankingRow = ViewDashboard["ranking"][number];
export type Outcome = "win" | "draw" | "loss";

// Shared keys start with "shared-" so the capability exchange clears them when a new link is opened.
function keyPrefix(source: ViewSource) {
  return source.kind === "shared" ? ["shared-view"] : ["public-view", source.slug];
}

export function useViewDashboard(source: ViewSource, enabled: boolean) {
  return useQuery<ViewDashboard>({
    queryKey: [...keyPrefix(source), "dashboard"],
    queryFn: () =>
      source.kind === "shared"
        ? sharedStatsClient.dashboard.query({})
        : trpcHttpClient.public.dashboard.query({ slug: source.slug, filters: {} }),
    enabled,
    retry: false,
  });
}

export function useViewMatch(
  source: ViewSource,
  matchId: string | null | undefined,
  enabled = true,
) {
  return useQuery<ViewMatch>({
    queryKey: [...keyPrefix(source), "match", matchId],
    queryFn: () =>
      source.kind === "shared"
        ? sharedStatsClient.match.query({ matchId: matchId! })
        : trpcHttpClient.public.match.query({ slug: source.slug, matchId: matchId! }),
    enabled: enabled && Boolean(matchId),
    retry: false,
  });
}

export function useViewPlayer(source: ViewSource, playerId: string | null | undefined) {
  return useQuery<ViewPlayer>({
    queryKey: [...keyPrefix(source), "player", playerId],
    queryFn: () =>
      source.kind === "shared"
        ? sharedStatsClient.player.query({ playerId: playerId!, filters: {} })
        : trpcHttpClient.public.player.query({
            slug: source.slug,
            playerId: playerId!,
            filters: {},
          }),
    enabled: Boolean(playerId),
    retry: false,
  });
}
