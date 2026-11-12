"use client";

import type { AppRouter } from "@hay-fulbo/api/routers/index";
import { Button } from "@hay-fulbo/ui/components/button";
import type { inferRouterOutputs } from "@trpc/server";
import { ArrowLeftIcon, Maximize2Icon } from "lucide-react";

import { MatchScoreboard } from "@/components/match-scoreboard";

import type { Adjust, PitchMatch } from "./pitch-data";

type Detail = inferRouterOutputs<AppRouter>["matches"]["detail"];

// Variant 1 — production today, unchanged: the real MatchScoreboard fed from the in-memory match.
export function VariantActual({ match }: { match: PitchMatch }) {
  const detail = {
    id: "prototype",
    status: "open",
    lockVersion: match.version,
    organizerUserId: "me",
    scorekeeperUserId: null,
    scorekeeperName: null,
    teams: match.teams,
    score: match.teams.map((t) => ({ teamId: t.id, goals: match.score(t.id) })),
  } as unknown as Detail;

  return (
    <div className="dark fixed inset-0 z-50 flex min-h-svh flex-col overflow-auto bg-background text-foreground">
      <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b px-3 py-2 sm:px-6">
        <Button className="justify-self-start" size="sm" variant="ghost">
          <ArrowLeftIcon data-icon="inline-start" aria-hidden="true" />
          Salir
        </Button>
        <div className="min-w-0 text-center">
          <h1 className="text-sm font-semibold">Modo cancha</h1>
          <p className="truncate text-xs text-muted-foreground">Tocá Gol y elegí quién la hizo</p>
        </div>
        <Button
          aria-label="Alternar pantalla completa"
          className="justify-self-end"
          size="icon-sm"
          variant="ghost"
        >
          <Maximize2Icon aria-hidden="true" />
        </Button>
      </header>
      <main className="mx-auto grid w-full max-w-5xl flex-1 content-center gap-6 p-4 sm:p-8">
        <MatchScoreboard
          forceDark
          detail={detail}
          canScore
          pending={false}
          size="pitch"
          run={async (action) => {
            match.adjust(action as unknown as Adjust);
            return true;
          }}
        />
      </main>
    </div>
  );
}
