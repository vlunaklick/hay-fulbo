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
import { useMutation } from "@tanstack/react-query";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { useRef } from "react";
import type * as React from "react";
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

export type GoalPick = { teamId: string; delta: 1 | -1 };

/**
 * "¿Quién la hizo?": picks the author of a goal (or the goal to take back) for one team.
 * The caller owns the open state so any button (próximo paso, planilla) can open it.
 */
export function GoalPicker({
  detail,
  canScore,
  onClose,
  pending,
  pick,
  returnFocus,
  run,
  side = "bottom",
}: {
  detail: Detail;
  canScore: boolean;
  onClose: () => void;
  pending: boolean;
  pick: GoalPick | null;
  /** The button that opened the picker; focus goes back there (or to a sibling) on close. */
  returnFocus: React.RefObject<HTMLButtonElement | null>;
  run: RunMatchAction;
  side?: "bottom" | "right";
}) {
  const teams = detail.teams.slice(0, 2);
  const selected = teams.find((team) => team.id === pick?.teamId);
  const rivals = teams.find((team) => team.id !== selected?.id)?.appearances ?? [];
  const editable = canScore && detail.status === "open";
  const choices = selected
    ? [
        ...selected.appearances
          .filter((row) => pick?.delta === 1 || row.goals > 0)
          .map((row) => ({
            key: row.playerId,
            label: row.playerDisplayName,
            count: row.goals,
            action: { field: "goals" as const, playerId: row.playerId },
          })),
        ...(pick?.delta === 1 || selected.unattributedGoals > 0
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
          .filter((row) => pick?.delta === 1 || row.ownGoals > 0)
          .map((row) => ({
            key: `own-${row.playerId}`,
            label: `Autogol de ${row.playerDisplayName}`,
            count: row.ownGoals,
            action: { field: "ownGoals" as const, playerId: row.playerId },
          })),
      ]
    : [];

  return (
    <Sheet
      open={pick !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        side={side}
        finalFocus={() => {
          const trigger = returnFocus.current;
          if (!trigger?.disabled) return trigger;
          return (
            trigger.parentElement?.querySelector<HTMLButtonElement>("button:not(:disabled)") ??
            false
          );
        }}
        className={side === "bottom" ? "max-h-[85dvh]" : undefined}
      >
        <SheetHeader>
          <SheetTitle>
            {pick?.delta === -1 ? "Restar un gol" : "¿Quién la hizo?"} · {selected?.displayName}
          </SheetTitle>
          <SheetDescription>
            {pick?.delta === -1
              ? "Elegí qué gol querés restar del marcador."
              : "Elegí al autor, un autogol rival o un gol sin autor."}
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="grid grid-cols-1 content-start gap-2 sm:grid-cols-2">
          {choices.map((choice) => (
            <Button
              key={choice.key}
              variant="outline"
              className="min-h-11 h-auto justify-between whitespace-normal px-4 py-3 text-left"
              disabled={!editable || pending}
              onClick={async () => {
                if (!pick) return;
                const saved = await run({
                  type: "adjustStat",
                  matchId: detail.id,
                  delta: pick.delta,
                  ...choice.action,
                });
                if (saved) {
                  onClose();
                  if ("vibrate" in navigator) navigator.vibrate(35);
                }
              }}
            >
              <span>{choice.label}</span>
              {pick?.delta === -1 ? <span className="tabular-nums">{choice.count}</span> : null}
            </Button>
          ))}
          {choices.length === 0 ? (
            <p className="text-muted-foreground">No quedan goles para restar.</p>
          ) : null}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
