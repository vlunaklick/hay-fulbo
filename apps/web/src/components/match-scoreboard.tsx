"use client";

import type { AppRouter } from "@hay-fulbo/api/routers/index";
import { Button } from "@hay-fulbo/ui/components/button";
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
  forceDark = false,
  pending,
  run,
}: {
  detail: Detail;
  canScore: boolean;
  forceDark?: boolean;
  pending: boolean;
  run: RunMatchAction;
}) {
  const [picker, setPicker] = useState<{ teamId: string; delta: 1 | -1 } | null>(null);
  const returnFocus = useRef<HTMLButtonElement | null>(null);
  const teams = detail.teams.slice(0, 2);
  const selected = teams.find((team) => team.id === picker?.teamId);
  const rivals = teams.find((team) => team.id !== selected?.id)?.appearances ?? [];
  const editable = canScore && detail.status === "open";
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
    <div className="overflow-hidden rounded-xl border bg-background text-foreground">
      <p className="border-b px-4 py-3 text-sm text-muted-foreground">
        {detail.scorekeeperName ? `Planillero: ${detail.scorekeeperName}` : "Sin planillero"}
      </p>
      <div className="grid grid-cols-2 divide-x">
        {teams.map((team) => {
          const score = detail.score.find((row) => row.teamId === team.id)?.goals ?? 0;
          return (
            <section
              key={team.id}
              className="relative flex min-h-72 flex-col items-center gap-4 px-3 py-6 sm:min-h-80"
            >
              <span
                className={cn(
                  "absolute inset-x-0 top-0 h-1",
                  team.slot === 1 ? "bg-team-blue" : "bg-team-amber",
                )}
                aria-hidden="true"
              />
              <h3 className="max-w-full truncate text-sm font-bold text-muted-foreground">
                {team.displayName}
              </h3>
              <output
                aria-label={`Marcador de ${team.displayName}`}
                className="font-mono text-[clamp(4.5rem,16vw,10rem)] font-black leading-none tabular-nums"
              >
                {score}
              </output>
              {editable ? (
                <div className="flex w-full max-w-56 flex-wrap justify-center gap-2">
                  <Button
                    aria-label={`Restar un gol a ${team.displayName}`}
                    disabled={pending || score === 0}
                    variant="outline"
                    className="min-h-11"
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
                    disabled={pending}
                    className={cn(
                      "min-h-11",
                      team.slot === 1
                        ? "bg-team-blue text-team-blue-ink hover:bg-team-blue/90"
                        : "bg-team-amber text-team-amber-ink hover:bg-team-amber/90",
                    )}
                    onClick={(event) => {
                      returnFocus.current = event.currentTarget;
                      setPicker({ teamId: team.id, delta: 1 });
                    }}
                  >
                    <PlusIcon aria-hidden="true" />
                    Gol
                  </Button>
                </div>
              ) : (
                <p className="text-center text-xs text-muted-foreground">
                  {detail.status === "open"
                    ? "El organizador y el planillero cargan los goles"
                    : "Marcador cerrado"}
                </p>
              )}
            </section>
          );
        })}
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
          className={cn("max-h-[85dvh]", forceDark && "dark")}
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
    </div>
  );
}
