"use client";

import type { AppRouter } from "@hay-fulbo/api/routers/index";
import { Alert, AlertDescription, AlertTitle } from "@hay-fulbo/ui/components/alert";
import { Button } from "@hay-fulbo/ui/components/button";
import { Skeleton } from "@hay-fulbo/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import { ArrowLeftIcon, CircleAlertIcon, Maximize2Icon } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { useAppContext } from "@/components/app-shell";
import { MatchScoreboard, useMatchCommand } from "@/components/match-scoreboard";
import { trpc } from "@/utils/trpc";

type Detail = inferRouterOutputs<AppRouter>["matches"]["detail"];

export function PitchMode() {
  const { matchId } = useParams<{ matchId: string }>();
  const detail = useQuery({
    ...trpc.matches.detail.queryOptions({ matchId }),
    refetchInterval: (query) => (query.state.data?.status === "open" ? 5000 : false),
  });

  if (detail.isPending) {
    return (
      <div className="fixed inset-0 z-50 grid bg-zinc-950 p-4">
        <Skeleton className="m-auto h-[80svh] w-full max-w-5xl bg-zinc-800" />
      </div>
    );
  }
  if (detail.isError) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-zinc-950 p-4">
        <Alert className="max-w-md" variant="destructive">
          <CircleAlertIcon aria-hidden="true" />
          <AlertTitle>No pudimos abrir el modo cancha</AlertTitle>
          <AlertDescription>
            Volvé al partido para revisar el acceso o intentar de nuevo.
            <Link
              className="mt-3 inline-flex min-h-11 items-center underline"
              href={`/dashboard/partidos/${matchId}`}
            >
              Volver al partido
            </Link>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <PitchShell detail={detail.data} />;
}

function PitchShell({ detail }: { detail: Detail }) {
  const { role, user } = useAppContext();
  const manager = detail.organizerUserId === user.id || role !== "member";

  const { run, pending } = useMatchCommand(detail);
  const canScore = detail.status === "open" && (manager || detail.scorekeeperUserId === user.id);

  async function toggleFullscreen() {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    await document.documentElement.requestFullscreen();
  }

  return (
    <div className="dark fixed inset-0 z-50 flex min-h-svh flex-col overflow-auto bg-zinc-950 text-zinc-50">
      <header className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-3 sm:px-6">
        <Button
          className="text-zinc-100 hover:bg-white/10 hover:text-white"
          render={<Link href={`/dashboard/partidos/${detail.id}`} />}
          nativeButton={false}
          size="sm"
          variant="ghost"
        >
          <ArrowLeftIcon data-icon="inline-start" aria-hidden="true" />
          Salir
        </Button>
        <div className="text-center">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.24em] text-primary">
            Modo cancha
          </p>
          <p className="text-xs text-zinc-400">Tocá Gol y elegí quién la hizo</p>
        </div>
        <Button
          aria-label="Alternar pantalla completa"
          className="text-zinc-100 hover:bg-white/10 hover:text-white"
          onClick={toggleFullscreen}
          size="icon-sm"
          variant="ghost"
        >
          <Maximize2Icon aria-hidden="true" />
        </Button>
      </header>

      <main className="grid flex-1 content-center gap-6 p-4 sm:p-8">
        <MatchScoreboard detail={detail} canScore={canScore} pending={pending} run={run} />
      </main>
    </div>
  );
}
