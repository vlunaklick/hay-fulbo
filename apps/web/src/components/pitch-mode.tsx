"use client";

import type { AppRouter } from "@hay-fulbo/api/routers/index";
import { Alert, AlertDescription, AlertTitle } from "@hay-fulbo/ui/components/alert";
import { Button } from "@hay-fulbo/ui/components/button";
import { Skeleton } from "@hay-fulbo/ui/components/skeleton";
import { cn } from "@hay-fulbo/ui/lib/utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import {
  ArrowLeftIcon,
  CircleAlertIcon,
  Maximize2Icon,
  MinusIcon,
  PlusIcon,
  RotateCcwIcon,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { useAppContext } from "@/components/app-shell";
import { queryClient, trpc } from "@/utils/trpc";

type Detail = inferRouterOutputs<AppRouter>["matches"]["detail"];
type ScoreChange = { goals: number; teamId: string };

export function PitchMode() {
  const { matchId } = useParams<{ matchId: string }>();
  const detail = useQuery(trpc.matches.detail.queryOptions({ matchId }));

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
          <AlertDescription>{detail.error.message}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return <PitchScoreboard initialDetail={detail.data} />;
}

function PitchScoreboard({ initialDetail }: { initialDetail: Detail }) {
  const { role, user } = useAppContext();
  const boardRef = useRef<HTMLDivElement>(null);
  const [version, setVersion] = useState(initialDetail.lockVersion);
  const [unattributed, setUnattributed] = useState<Record<string, number>>(
    Object.fromEntries(
      initialDetail.teams.map((team) => [team.id, team.unattributedGoals] as const),
    ),
  );
  const [lastChange, setLastChange] = useState<ScoreChange | null>(null);
  const updateScore = useMutation(
    trpc.matches.execute.mutationOptions({
      onError: (error) => {
        toast.error("No se pudo guardar el gol", { description: error.message });
        queryClient.invalidateQueries({
          queryKey: trpc.matches.detail.queryKey({ matchId: initialDetail.id }),
        });
      },
    }),
  );
  const isOrganizer = initialDetail.organizerUserId === user.id || role !== "member";
  const teams = initialDetail.teams.slice(0, 2);

  async function setGoals(teamId: string, goals: number, remember: boolean) {
    const previous = unattributed[teamId] ?? 0;
    try {
      const result = await updateScore.mutateAsync({
        expectedLockVersion: version,
        goals,
        matchId: initialDetail.id,
        teamId,
        type: "setUnattributedGoals",
      });
      if (!("lockVersion" in result))
        throw new Error("El marcador devolvió una respuesta inválida");
      setUnattributed((current) => ({ ...current, [teamId]: goals }));
      setVersion(result.lockVersion);
      setLastChange(remember ? { goals: previous, teamId } : null);
      if ("vibrate" in navigator) navigator.vibrate(35);
      queryClient.invalidateQueries({
        queryKey: trpc.matches.detail.queryKey({ matchId: initialDetail.id }),
      });
    } catch {
      // The mutation owns the user-facing error and refreshes the stale score.
    }
  }

  async function toggleFullscreen() {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    await boardRef.current?.requestFullscreen();
  }

  return (
    <div
      ref={boardRef}
      className="fixed inset-0 z-50 flex min-h-svh flex-col overflow-auto bg-zinc-950 text-zinc-50"
    >
      <header className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-3 sm:px-6">
        <Button
          className="text-zinc-100 hover:bg-white/10 hover:text-white"
          render={<Link href={`/dashboard/partidos/${initialDetail.id}`} />}
          nativeButton={false}
          size="sm"
          variant="ghost"
        >
          <ArrowLeftIcon data-icon="inline-start" aria-hidden="true" />
          Salir
        </Button>
        <div className="text-center">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.24em] text-emerald-400">
            Modo cancha
          </p>
          <p className="text-xs text-zinc-400">Toque grande, guardado inmediato</p>
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

      <main className="grid flex-1 grid-cols-2">
        {teams.map((team, index) => {
          const canEdit =
            initialDetail.status === "open" && (isOrganizer || team.captainUserId === user.id);
          const attributed =
            (initialDetail.score.find((item) => item.teamId === team.id)?.goals ?? 0) -
            team.unattributedGoals;
          const goals = attributed + (unattributed[team.id] ?? 0);

          return (
            <section
              key={team.id}
              className={cn(
                "flex min-h-[34rem] flex-col items-center justify-between gap-5 px-3 py-8 sm:px-8",
                index === 0 ? "border-r border-white/10 bg-emerald-950/30" : "bg-sky-950/25",
              )}
            >
              <h1 className="max-w-full truncate text-center text-lg font-black uppercase tracking-wide sm:text-3xl">
                {team.displayName}
              </h1>
              <output
                aria-label={`${goals} goles para ${team.displayName}`}
                className="font-mono text-[clamp(6rem,25vw,15rem)] font-black leading-none tabular-nums"
              >
                {goals}
              </output>
              <div className="grid w-full max-w-xs grid-cols-[4.5rem_1fr] gap-3">
                <Button
                  aria-label={`Restar un gol a ${team.displayName}`}
                  className="h-20 border-white/20 bg-white/5 text-zinc-50 hover:bg-white/10"
                  disabled={!canEdit || updateScore.isPending || (unattributed[team.id] ?? 0) === 0}
                  onClick={() =>
                    setGoals(team.id, Math.max((unattributed[team.id] ?? 0) - 1, 0), true)
                  }
                  variant="outline"
                >
                  <MinusIcon className="size-7" aria-hidden="true" />
                </Button>
                <Button
                  aria-label={`Sumar un gol a ${team.displayName}`}
                  className="h-20 bg-emerald-400 text-xl font-black text-zinc-950 hover:bg-emerald-300"
                  disabled={!canEdit || updateScore.isPending}
                  onClick={() => setGoals(team.id, (unattributed[team.id] ?? 0) + 1, true)}
                >
                  <PlusIcon className="size-7" data-icon="inline-start" aria-hidden="true" />
                  Gol
                </Button>
              </div>
              {!canEdit ? (
                <p className="text-center text-xs text-zinc-500">
                  {initialDetail.status === "open"
                    ? "Solo el organizador o capitán puede editar"
                    : "Marcador cerrado"}
                </p>
              ) : null}
            </section>
          );
        })}
      </main>

      <footer className="flex min-h-16 items-center justify-center border-t border-white/10 px-4 py-3">
        <Button
          className="border-white/20 bg-white/5 text-zinc-50 hover:bg-white/10"
          disabled={!lastChange || updateScore.isPending}
          onClick={() =>
            lastChange ? setGoals(lastChange.teamId, lastChange.goals, false) : undefined
          }
          variant="outline"
        >
          <RotateCcwIcon data-icon="inline-start" aria-hidden="true" />
          Deshacer último cambio
        </Button>
      </footer>
    </div>
  );
}
