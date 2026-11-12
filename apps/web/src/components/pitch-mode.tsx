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
import { isTerminalReadError } from "@/lib/match-command-error";
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
      <div className="dark fixed inset-0 z-50 grid bg-background p-4">
        <Skeleton className="m-auto h-[80svh] w-full max-w-5xl" />
      </div>
    );
  }
  if (!detail.data || isTerminalReadError(detail.error)) {
    return (
      <div className="dark fixed inset-0 z-50 grid place-items-center bg-background p-4">
        <Alert className="max-w-md" variant="destructive">
          <CircleAlertIcon aria-hidden="true" />
          <AlertTitle>No pudimos abrir el modo cancha</AlertTitle>
          <AlertDescription>
            Volvé al partido para revisar el acceso o intentar de nuevo.
            <Button
              className="mt-3 min-h-11"
              nativeButton={false}
              render={<Link href={`/dashboard/partidos/${matchId}`} />}
              variant="link"
            >
              Volver al partido
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // A failed background poll keeps the live board (and an open goal picker) mounted.
  return (
    <PitchShell
      detail={detail.data}
      refreshFailed={detail.isError}
      onRetry={() => void detail.refetch()}
    />
  );
}

function PitchShell({
  detail,
  onRetry,
  refreshFailed,
}: {
  detail: Detail;
  onRetry: () => void;
  refreshFailed: boolean;
}) {
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
    <div className="dark fixed inset-0 z-50 flex min-h-svh flex-col overflow-auto bg-background text-foreground">
      <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b px-3 py-2 sm:px-6">
        <Button
          render={<Link href={`/dashboard/partidos/${detail.id}`} />}
          nativeButton={false}
          className="justify-self-start"
          size="sm"
          variant="ghost"
        >
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
          onClick={toggleFullscreen}
          size="icon-sm"
          variant="ghost"
        >
          <Maximize2Icon aria-hidden="true" />
        </Button>
      </header>

      <main className="mx-auto grid w-full max-w-5xl flex-1 content-center gap-6 p-4 sm:p-8">
        {refreshFailed ? (
          <Alert role="status">
            <CircleAlertIcon aria-hidden="true" />
            <AlertTitle>No pudimos actualizar el marcador</AlertTitle>
            <AlertDescription className="flex flex-wrap items-center gap-3">
              Lo que ves puede estar desactualizado.
              <Button onClick={onRetry} size="sm" variant="outline">
                Reintentar
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}
        <MatchScoreboard
          forceDark
          detail={detail}
          canScore={canScore}
          pending={pending}
          run={run}
          size="pitch"
        />
      </main>
    </div>
  );
}
