"use client";

import type { AppRouter } from "@hay-fulbo/api/routers/index";
import { Button } from "@hay-fulbo/ui/components/button";
import { Card } from "@hay-fulbo/ui/components/card";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@hay-fulbo/ui/components/sheet";
import { cn } from "@hay-fulbo/ui/lib/utils";
import { useMutation } from "@tanstack/react-query";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { MinusIcon, PlusIcon } from "lucide-react";
import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { matchCommandErrorMessage, isMatchConflict } from "@/lib/match-command-error";

import { queryClient, trpc } from "@/utils/trpc";

type Detail = inferRouterOutputs<AppRouter>["matches"]["detail"];
type ExecuteInput = inferRouterInputs<AppRouter>["matches"]["execute"];
type WithoutVersion<T> = T extends { expectedLockVersion: number }
  ? Omit<T, "expectedLockVersion">
  : T;
export type MatchAction = WithoutVersion<ExecuteInput>;
export type RunMatchAction = (
  action: MatchAction,
  options?: { expectedLockVersion: number; onConflict: (lockVersion: number) => void },
) => Promise<boolean>;

export function useMatchCommand(detail: Detail) {
  const inFlight = useRef(false);
  const detailKey = trpc.matches.detail.queryKey({ matchId: detail.id });
  const execute = useMutation(
    trpc.matches.execute.mutationOptions({
      onSettled: async () => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: detailKey }),
          queryClient.invalidateQueries({ queryKey: trpc.matches.list.queryKey() }),
          queryClient.invalidateQueries({ queryKey: trpc.matches.directory.queryKey() }),
        ]);
      },
    }),
  );
  const run: RunMatchAction = async (action, options) => {
    if (inFlight.current) return false;
    inFlight.current = true;
    try {
      const current = queryClient.getQueryData<Detail>(detailKey) ?? detail;
      await execute.mutateAsync({
        ...action,
        expectedLockVersion: options?.expectedLockVersion ?? current.lockVersion,
      } as ExecuteInput);
      return true;
    } catch (cause) {
      toast.error(matchCommandErrorMessage(cause, action));
      if (options && isMatchConflict(cause)) {
        const refreshed = queryClient.getQueryData<Detail>(detailKey);
        if (refreshed) options.onConflict(refreshed.lockVersion);
      }
      return false;
    } finally {
      inFlight.current = false;
    }
  };
  return { run, pending: execute.isPending };
}

export function MatchScoreboard({
  detail,
  canScore,
  pending,
  run,
  scorekeeperControl,
}: {
  detail: Detail;
  canScore: boolean;
  pending: boolean;
  run: RunMatchAction;
  /** Optional control (the organizer's scorekeeper picker) shown next to the scorekeeper line. */
  scorekeeperControl?: ReactNode;
}) {
  const [picker, setPicker] = useState<{ teamId: string; delta: 1 | -1 } | null>(null);
  const returnFocus = useRef<HTMLButtonElement | null>(null);
  const teams = detail.teams.slice(0, 2);
  const selected = teams.find((team) => team.id === picker?.teamId);
  const rivals = teams.find((team) => team.id !== selected?.id)?.appearances ?? [];
  const editable = canScore && detail.status === "open";
  const hint =
    detail.status !== "open"
      ? "Marcador cerrado"
      : scorekeeperControl
        ? "Puede sumar y restar goles mientras el partido esté abierto."
        : editable
          ? null
          : "El organizador y el planillero cargan los goles";
  const choices = selected
    ? [
        ...selected.appearances
          .filter((row) => picker?.delta === 1 || row.goals > 0)
          .map((row) => ({
            key: row.playerId,
            label: row.playerDisplayName,
            count: row.goals,
            action: { field: "goals" as const, playerId: row.playerId },
          })),
        ...(picker?.delta === 1 || selected.unattributedGoals > 0
          ? [
              {
                key: "unattributed",
                label: "Sin autor",
                count: selected.unattributedGoals,
                action: { field: "unattributedGoals" as const, teamId: selected.id },
              },
            ]
          : []),
        ...rivals
          .filter((row) => picker?.delta === 1 || row.ownGoals > 0)
          .map((row) => ({
            key: `own-${row.playerId}`,
            label: `Autogol de ${row.playerDisplayName}`,
            count: row.ownGoals,
            action: { field: "ownGoals" as const, playerId: row.playerId },
          })),
      ]
    : [];

  return (
    <Card className="gap-0 py-0">
      <div className="grid grid-cols-2 divide-x">
        {teams.map((team) => {
          const score = detail.score.find((row) => row.teamId === team.id)?.goals ?? 0;
          return (
            <section
              key={team.id}
              aria-label={team.displayName}
              className="flex min-w-0 flex-col items-center gap-3 px-3 py-5 sm:py-6"
            >
              <h3 className="flex max-w-full items-center gap-2 text-sm font-semibold">
                <span
                  className={cn(
                    "size-2 shrink-0 rounded-full",
                    team.slot === 1 ? "bg-team-blue" : "bg-team-amber",
                  )}
                  aria-hidden="true"
                />
                <span className="truncate">{team.displayName}</span>
              </h3>
              <output
                aria-label={`Marcador de ${team.displayName}`}
                className="text-6xl leading-none font-black tabular-nums sm:text-7xl"
              >
                {score}
              </output>
              {editable ? (
                <div className="flex w-full max-w-60 flex-wrap justify-center gap-2">
                  <Button
                    aria-label={`Restar un gol a ${team.displayName}`}
                    className="flex-1"
                    disabled={pending || score === 0}
                    variant="outline"
                    onClick={(event) => {
                      returnFocus.current = event.currentTarget;
                      setPicker({ teamId: team.id, delta: -1 });
                    }}
                  >
                    <MinusIcon aria-hidden="true" />
                    Restar
                  </Button>
                  <Button
                    aria-label={`Sumar un gol a ${team.displayName}`}
                    className="flex-1"
                    disabled={pending}
                    variant={team.slot === 1 ? "team-blue" : "team-amber"}
                    onClick={(event) => {
                      returnFocus.current = event.currentTarget;
                      setPicker({ teamId: team.id, delta: 1 });
                    }}
                  >
                    <PlusIcon aria-hidden="true" />
                    Gol
                  </Button>
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
      <div className="flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t px-4 py-2">
        <div className="flex min-w-0 flex-col">
          <p className="text-sm">
            {detail.scorekeeperName ? `Planillero: ${detail.scorekeeperName}` : "Sin planillero"}
          </p>
          {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        {scorekeeperControl}
      </div>
      <Sheet
        open={picker !== null}
        onOpenChange={(open) => {
          if (!open) setPicker(null);
        }}
      >
        <SheetContent
          side="bottom"
          finalFocus={() => {
            const trigger = returnFocus.current;
            if (!trigger?.disabled) return trigger;
            return (
              trigger.parentElement?.querySelector<HTMLButtonElement>("button:not(:disabled)") ??
              false
            );
          }}
          className="max-h-[85dvh]"
        >
          <SheetHeader>
            <SheetTitle>
              {picker?.delta === -1 ? "Restar un gol" : "¿Quién la hizo?"} · {selected?.displayName}
            </SheetTitle>
            <SheetDescription>
              {picker?.delta === -1
                ? "Elegí qué gol querés restar del marcador."
                : "Elegí al autor, un autogol rival o un gol sin autor."}
            </SheetDescription>
          </SheetHeader>
          <SheetBody className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {choices.map((choice) => (
              <Button
                key={choice.key}
                variant="outline"
                className="min-h-11 h-auto justify-between whitespace-normal px-4 py-3 text-left"
                disabled={!editable || pending}
                onClick={async () => {
                  if (!picker) return;
                  const saved = await run({
                    type: "adjustStat",
                    matchId: detail.id,
                    delta: picker.delta,
                    ...choice.action,
                  });
                  if (saved) {
                    setPicker(null);
                    if ("vibrate" in navigator) navigator.vibrate(35);
                  }
                }}
              >
                <span>{choice.label}</span>
                {picker?.delta === -1 ? <span className="tabular-nums">{choice.count}</span> : null}
              </Button>
            ))}
            {choices.length === 0 ? (
              <p className="text-muted-foreground">No quedan goles para restar.</p>
            ) : null}
          </SheetBody>
        </SheetContent>
      </Sheet>
    </Card>
  );
}
