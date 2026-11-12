"use client";

import type { AppRouter } from "@hay-fulbo/api/routers/index";
import { Alert, AlertDescription, AlertTitle } from "@hay-fulbo/ui/components/alert";
import { Button } from "@hay-fulbo/ui/components/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@hay-fulbo/ui/components/sheet";
import { Skeleton } from "@hay-fulbo/ui/components/skeleton";
import { Spinner } from "@hay-fulbo/ui/components/spinner";
import { cn } from "@hay-fulbo/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import {
  ArrowLeftIcon,
  CircleAlertIcon,
  Maximize2Icon,
  MinusIcon,
  PlusIcon,
  Undo2Icon,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { useAppContext } from "@/components/app-shell";
import { useMatchCommand, type MatchAction } from "@/components/match-scoreboard";
import { isTerminalReadError } from "@/lib/match-command-error";
import { trpc } from "@/utils/trpc";

type Detail = inferRouterOutputs<AppRouter>["matches"]["detail"];
type Team = Detail["teams"][number];
type Target =
  | { field: "goals" | "ownGoals"; playerId: string }
  | { field: "unattributedGoals"; teamId: string };
type LastChange = { label: string; target: Target; delta: 1 | -1 };

export function PitchMode() {
  const { matchId } = useParams<{ matchId: string }>();
  const detail = useQuery({
    ...trpc.matches.detail.queryOptions({ matchId }),
    refetchInterval: (query) => (query.state.data?.status === "open" ? 5000 : false),
  });

  if (detail.isPending) {
    return (
      <div className="dark fixed inset-0 z-50 grid bg-background p-4">
        <Skeleton className="m-auto h-[80svh] w-full max-w-4xl" />
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

  // A failed background poll keeps the live board (and an open own-goal picker) mounted.
  return (
    <PitchShell
      detail={detail.data}
      refreshFailed={detail.isError}
      onRetry={() => void detail.refetch()}
    />
  );
}

/**
 * "Planilla": both rosters stay on screen and tapping a player is the goal.
 * One tap per goal; the last change stays one tap from being undone.
 */
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

  const [fixing, setFixing] = useState(false);
  const [ownGoalFor, setOwnGoalFor] = useState<string | null>(null);
  const [last, setLast] = useState<LastChange | null>(null);
  // The row being saved, so a tap gets feedback before the server answers.
  const [saving, setSaving] = useState<string | null>(null);

  const teams = detail.teams.slice(0, 2);
  const delta = fixing ? -1 : 1;
  const ownGoalTeam = teams.find((team) => team.id === ownGoalFor);
  const ownGoalRival = teams.find((team) => team.id !== ownGoalFor);
  const scoreOf = (team: Team) => detail.score.find((row) => row.teamId === team.id)?.goals ?? 0;
  const hint = !canScore
    ? detail.status === "open"
      ? "El organizador y el planillero cargan los goles"
      : "Marcador cerrado"
    : fixing
      ? "Tocá un gol para restarlo"
      : "Tocá al que la hizo";

  async function change(target: Target, step: 1 | -1, label: string) {
    setSaving("playerId" in target ? target.playerId : target.teamId);
    const saved = await run({
      type: "adjustStat",
      matchId: detail.id,
      delta: step,
      ...target,
    } as MatchAction).finally(() => setSaving(null));
    if (!saved) return false;
    if ("vibrate" in navigator) navigator.vibrate(35);
    setLast({ label, target, delta: step });
    return true;
  }

  async function undo() {
    if (!last) return;
    const reverse = last.delta === 1 ? -1 : 1;
    const saved = await run({
      type: "adjustStat",
      matchId: detail.id,
      delta: reverse,
      ...last.target,
    } as MatchAction);
    if (saved) setLast(null);
  }

  const describe = (what: string) => (delta === 1 ? what : `Restado: ${what.toLowerCase()}`);

  async function toggleFullscreen() {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    await document.documentElement.requestFullscreen();
  }

  return (
    <div className="dark fixed inset-0 z-50 flex touch-manipulation flex-col bg-background text-foreground">
      <header className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b px-3 py-1 sm:px-6">
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
          <p className="truncate text-xs text-muted-foreground">{hint}</p>
        </div>
        <div className="flex items-center gap-1 justify-self-end">
          {canScore ? (
            <Button
              aria-pressed={fixing}
              onClick={() => setFixing((value) => !value)}
              size="sm"
              variant={fixing ? "secondary" : "ghost"}
            >
              {fixing ? "Listo" : "Corregir"}
            </Button>
          ) : null}
          <Button
            aria-label="Alternar pantalla completa"
            onClick={toggleFullscreen}
            size="icon-sm"
            variant="ghost"
          >
            <Maximize2Icon aria-hidden="true" />
          </Button>
        </div>
      </header>

      <section
        aria-label="Marcador"
        className="mx-auto grid w-full max-w-4xl shrink-0 grid-cols-2 divide-x border-b"
      >
        {teams.map((team) => (
          <div
            key={team.id}
            className="flex min-w-0 items-center justify-between gap-2 px-4 py-3 even:flex-row-reverse"
          >
            <h2 className="flex min-w-0 items-center gap-2 text-sm font-semibold">
              <TeamDot team={team} />
              <span className="truncate">{team.displayName}</span>
            </h2>
            <output
              aria-label={`Marcador de ${team.displayName}`}
              className="text-5xl leading-none font-black tabular-nums"
            >
              {scoreOf(team)}
            </output>
          </div>
        ))}
      </section>

      {refreshFailed ? (
        <Alert role="status" className="mx-auto mt-2 w-[calc(100%-1rem)] max-w-4xl">
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

      {fixing ? (
        <p className="shrink-0 bg-destructive/10 px-4 py-2 text-center text-sm font-medium text-destructive">
          Modo corrección: cada toque resta un gol
        </p>
      ) : null}

      <section
        aria-busy={pending}
        aria-label="Planteles"
        className="mx-auto grid min-h-0 w-full max-w-4xl flex-1 grid-cols-2 content-start gap-x-2 overflow-y-auto px-2 py-3"
      >
        {teams.map((team) => (
          <ul
            key={team.id}
            aria-label={`Jugadores de ${team.displayName}`}
            className="flex min-w-0 flex-col gap-2"
          >
            {team.appearances.length === 0 ? (
              <li className="px-2 py-3 text-sm text-muted-foreground">Sin jugadores todavía</li>
            ) : null}
            {team.appearances.map((row) => (
              <li key={row.playerId}>
                {canScore ? (
                  <Button
                    aria-label={`${fixing ? "Restar gol a" : "Gol de"} ${row.playerDisplayName}`}
                    className={cn(
                      "h-auto min-h-14 w-full justify-between gap-2 border-l-4 py-2 pr-2 pl-3 text-left whitespace-normal",
                      team.slot === 1 ? "border-l-team-blue" : "border-l-team-amber",
                    )}
                    disabled={fixing && row.goals === 0}
                    onClick={() =>
                      void change(
                        { field: "goals", playerId: row.playerId },
                        delta,
                        describe(`Gol de ${row.playerDisplayName}`),
                      )
                    }
                    variant="outline"
                  >
                    <span className="line-clamp-2 min-w-0 text-sm font-semibold">
                      {row.playerDisplayName}
                    </span>
                    {saving === row.playerId ? (
                      <Spinner aria-hidden="true" className="size-8 shrink-0 p-1.5" />
                    ) : (
                      <GoalCount value={row.goals} fixing={fixing} />
                    )}
                  </Button>
                ) : (
                  <div
                    className={cn(
                      "flex min-h-14 items-center justify-between gap-2 rounded-md border border-l-4 py-2 pr-2 pl-3",
                      team.slot === 1 ? "border-l-team-blue" : "border-l-team-amber",
                    )}
                  >
                    <span className="line-clamp-2 min-w-0 text-sm font-semibold">
                      {row.playerDisplayName}
                    </span>
                    {row.goals > 0 ? <GoalCount value={row.goals} fixing={false} /> : null}
                  </div>
                )}
              </li>
            ))}
            {canScore ? (
              <li className="grid grid-cols-2 gap-2 pt-1">
                <Button
                  aria-label={
                    fixing
                      ? `Restar gol sin autor a ${team.displayName}`
                      : `Gol sin autor de ${team.displayName}`
                  }
                  className="h-auto min-h-12 flex-col gap-0.5 border border-dashed border-border px-2 py-1.5 text-xs"
                  disabled={fixing && team.unattributedGoals === 0}
                  onClick={() =>
                    void change(
                      { field: "unattributedGoals", teamId: team.id },
                      delta,
                      describe(`Gol sin autor de ${team.displayName}`),
                    )
                  }
                  variant="ghost"
                >
                  Sin autor
                  <span className="flex items-center gap-0.5 text-muted-foreground tabular-nums">
                    {fixing ? <MinusIcon aria-hidden="true" /> : <PlusIcon aria-hidden="true" />}
                    {team.unattributedGoals > 0 ? team.unattributedGoals : null}
                  </span>
                </Button>
                <Button
                  aria-label={
                    fixing
                      ? `Restar autogol a favor de ${team.displayName}`
                      : `Autogol a favor de ${team.displayName}`
                  }
                  className="h-auto min-h-12 flex-col gap-0.5 border border-dashed border-border px-2 py-1.5 text-xs"
                  onClick={() => setOwnGoalFor(team.id)}
                  variant="ghost"
                >
                  Autogol rival
                  <span className="text-muted-foreground">elegir…</span>
                </Button>
              </li>
            ) : (
              <li className="px-2 pt-1 text-xs text-muted-foreground">
                Sin autor: {team.unattributedGoals}
              </li>
            )}
          </ul>
        ))}
      </section>

      {canScore ? (
        <div
          aria-live="polite"
          className="flex min-h-14 shrink-0 items-center gap-3 border-t bg-card px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
        >
          <p className="min-w-0 flex-1 truncate text-sm">
            {last ? (
              <>
                <span className="text-muted-foreground">Último: </span>
                {last.label}
              </>
            ) : (
              <span className="text-muted-foreground">Todavía no cargaste nada en esta sesión</span>
            )}
          </p>
          {last ? (
            <Button onClick={() => void undo()} variant="outline">
              <Undo2Icon data-icon="inline-start" aria-hidden="true" />
              Deshacer
            </Button>
          ) : null}
        </div>
      ) : (
        <p className="shrink-0 border-t px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-sm text-muted-foreground">
          {detail.scorekeeperName ? `Planillero: ${detail.scorekeeperName}` : "Sin planillero"}
        </p>
      )}

      <Sheet open={ownGoalFor !== null} onOpenChange={(open) => !open && setOwnGoalFor(null)}>
        <SheetContent side="bottom" className="dark max-h-[85dvh]">
          <SheetHeader>
            <SheetTitle>
              {fixing ? "Restar autogol" : "Autogol"} a favor de {ownGoalTeam?.displayName}
            </SheetTitle>
            <SheetDescription>
              ¿Qué jugador de {ownGoalRival?.displayName} la metió en contra?
            </SheetDescription>
          </SheetHeader>
          <SheetBody className="grid grid-cols-2 gap-2">
            {ownGoalRival?.appearances.map((row) => (
              <Button
                key={row.playerId}
                aria-label={`Autogol de ${row.playerDisplayName}`}
                className="h-auto min-h-14 justify-between gap-2 px-3 py-2 text-left whitespace-normal"
                disabled={fixing && row.ownGoals === 0}
                onClick={async () => {
                  const saved = await change(
                    { field: "ownGoals", playerId: row.playerId },
                    delta,
                    describe(`Autogol de ${row.playerDisplayName}`),
                  );
                  if (saved) setOwnGoalFor(null);
                }}
                variant="outline"
              >
                <span className="line-clamp-2 min-w-0">{row.playerDisplayName}</span>
                {row.ownGoals > 0 ? (
                  <span className="text-sm text-muted-foreground tabular-nums">{row.ownGoals}</span>
                ) : null}
              </Button>
            ))}
            {ownGoalRival && ownGoalRival.appearances.length === 0 ? (
              <p className="col-span-2 text-sm text-muted-foreground">
                {ownGoalRival.displayName} todavía no tiene jugadores.
              </p>
            ) : null}
          </SheetBody>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function TeamDot({ team }: { team: Team }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "size-2.5 shrink-0 rounded-full",
        team.slot === 1 ? "bg-team-blue" : "bg-team-amber",
      )}
    />
  );
}

function GoalCount({ value, fixing }: { value: number; fixing: boolean }) {
  if (fixing) {
    return (
      <span className="flex shrink-0 items-center gap-0.5 text-sm text-destructive tabular-nums">
        <MinusIcon aria-hidden="true" />
        {value}
      </span>
    );
  }
  if (value === 0) {
    return <PlusIcon aria-hidden="true" className="shrink-0 text-muted-foreground" />;
  }
  return (
    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-base font-bold tabular-nums">
      {value}
    </span>
  );
}
