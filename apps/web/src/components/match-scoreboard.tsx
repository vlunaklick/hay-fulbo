"use client";

import type { AppRouter } from "@hay-fulbo/api/routers/index";
import { Button } from "@hay-fulbo/ui/components/button";
import { cn } from "@hay-fulbo/ui/lib/utils";
import { useMutation } from "@tanstack/react-query";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { MinusIcon, PlusIcon, UserXIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { queryClient, trpc } from "@/utils/trpc";

type Outputs = inferRouterOutputs<AppRouter>;
type Inputs = inferRouterInputs<AppRouter>;
type Detail = Outputs["matches"]["detail"];
type ExecuteInput = Inputs["matches"]["execute"];
type WithoutVersion<T> = T extends { expectedLockVersion: number }
  ? Omit<T, "expectedLockVersion">
  : T;
type MatchAction = WithoutVersion<ExecuteInput>;

const teamAccent = {
  1: {
    chip: "bg-team-blue text-team-blue-ink hover:bg-team-blue/90",
    bar: "bg-team-blue",
    panel: "border-team-blue/30 bg-team-blue/5",
  },
  2: {
    chip: "bg-team-amber text-team-amber-ink hover:bg-team-amber/90",
    bar: "bg-team-amber",
    panel: "border-team-amber/30 bg-team-amber/5",
  },
} as const;

export function MatchScoreboard({
  detail,
  manager,
  userId,
}: {
  detail: Detail;
  manager: boolean;
  userId: string;
}) {
  const [version, setVersion] = useState(detail.lockVersion);
  // The server may advance the lock version behind our back (another actor);
  // always send whichever is newer.
  const effectiveVersion = Math.max(version, detail.lockVersion);
  const [picker, setPicker] = useState<{ mode: "scored" | "own"; teamId: string } | null>(null);
  const [lastChange, setLastChange] = useState<{ action: MatchAction; teamId: string } | null>(
    null,
  );

  const execute = useMutation(
    trpc.matches.execute.mutationOptions({
      onSuccess: (result) => {
        if ("lockVersion" in result) setVersion(result.lockVersion);
        queryClient.invalidateQueries({
          queryKey: trpc.matches.detail.queryKey({ matchId: detail.id }),
        });
      },
      onError: (cause) => toast.error(cause.message),
    }),
  );

  function run(teamId: string, action: MatchAction, remember = true) {
    if ("field" in action && action.delta === -1) {
      setLastChange(null);
    } else if (remember) {
      setLastChange({ action: inverseOf(action), teamId });
    }
    execute.mutate({
      ...action,
      expectedLockVersion: effectiveVersion,
    } as ExecuteInput);
    if ("vibrate" in navigator) navigator.vibrate(35);
    setPicker(null);
  }

  const teams = detail.teams.slice(0, 2);
  const editable =
    detail.status === "open" &&
    (manager || detail.organizerUserId === userId) &&
    !execute.isPending;

  return (
    <div className="overflow-hidden rounded-xl border bg-zinc-950 text-zinc-50">
      <div className={cn("grid", teams.length > 1 ? "grid-cols-2 divide-x divide-white/10" : "")}>
        {teams.map((team) => {
          const accent = teamAccent[(team.slot as 1 | 2) ?? 1];
          const pickingForTeam = picker?.teamId === team.id;
          const roster = team.appearances;
          const rivals = teams.find((other) => other.id !== team.id)?.appearances ?? [];
          return (
            <section
              key={team.id}
              className="relative flex min-h-72 flex-col items-center gap-4 px-3 py-6 sm:min-h-80"
            >
              <span className={cn("absolute inset-x-0 top-0 h-1", accent.bar)} aria-hidden="true" />
              <h3 className="max-w-full truncate text-sm font-bold uppercase tracking-[0.18em] text-zinc-400">
                {team.displayName}
              </h3>
              <output className="font-mono text-[clamp(4.5rem,16vw,10rem)] font-black leading-none tabular-nums">
                {scoreFor(detail, team.id)}
              </output>
              {editable ? (
                <div className="grid w-full max-w-56 grid-cols-[1fr_2fr] gap-2">
                  <Button
                    aria-label={`Deshacer el último gol de ${team.displayName}`}
                    disabled={!editable || !lastChange || lastChange.teamId !== team.id}
                    onClick={() => {
                      if (lastChange && lastChange.teamId === team.id) {
                        run(team.id, lastChange.action, false);
                      }
                    }}
                    size="icon-lg"
                    variant="outline"
                    className="border-white/20 bg-white/5 hover:bg-white/10"
                  >
                    <MinusIcon className="size-5" aria-hidden="true" />
                  </Button>
                  <Button
                    aria-label={`Sumar un gol a ${team.displayName}`}
                    className={cn("text-base font-black", accent.chip)}
                    onClick={() => setPicker({ mode: "scored", teamId: team.id })}
                  >
                    <PlusIcon data-icon="inline-start" aria-hidden="true" />
                    Gol
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-zinc-400">
                  {detail.status === "open" ? "Solo el organizador edita" : "Marcador cerrado"}
                </p>
              )}

              {pickingForTeam ? (
                <GoalPicker
                  mode={picker.mode}
                  rosterNames={roster.map((row) => ({
                    label: row.playerDisplayName,
                    playerId: row.playerId,
                  }))}
                  rivalNames={rivals.map((row) => ({
                    label: row.playerDisplayName,
                    playerId: row.playerId,
                  }))}
                  onCancel={() => setPicker(null)}
                  onPick={(pick) =>
                    pick.kind === "unattributed"
                      ? run(team.id, {
                          type: "adjustStat",
                          field: "unattributedGoals",
                          matchId: detail.id,
                          teamId: team.id,
                          delta: 1,
                        })
                      : pick.kind === "goal"
                        ? run(team.id, {
                            type: "adjustStat",
                            field: "goals",
                            matchId: detail.id,
                            playerId: pick.playerId,
                            delta: 1,
                          })
                        : run(team.id, {
                            type: "adjustStat",
                            field: "ownGoals",
                            matchId: detail.id,
                            playerId: pick.playerId,
                            delta: 1,
                          })
                  }
                  onToggleOwn={
                    teams.length > 1
                      ? () =>
                          setPicker(
                            picker.mode === "scored"
                              ? { mode: "own", teamId: team.id }
                              : { mode: "scored", teamId: team.id },
                          )
                      : null
                  }
                />
              ) : null}
            </section>
          );
        })}
      </div>

      {editable ? (
        <p className="border-t border-white/10 px-4 py-2 text-center text-[0.65rem] uppercase tracking-[0.24em] text-zinc-400">
          Cada gol se atribuye al toque
        </p>
      ) : null}
    </div>
  );
}

function GoalPicker({
  mode,
  onCancel,
  onPick,
  onToggleOwn,
  rivalNames,
  rosterNames,
}: {
  mode: "scored" | "own";
  onCancel: () => void;
  onPick: (
    pick:
      | { kind: "goal"; playerId: string }
      | { kind: "own"; playerId: string }
      | { kind: "unattributed" },
  ) => void;
  onToggleOwn: (() => void) | null;
  rivalNames: { label: string; playerId: string }[];
  rosterNames: { label: string; playerId: string }[];
}) {
  const names = mode === "scored" ? rosterNames : rivalNames;
  return (
    <div className="absolute inset-0 z-10 flex flex-col gap-3 overflow-auto bg-zinc-950/95 p-4 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">
          {mode === "scored" ? "¿Quién la hizo?" : "Autogol de…"}
        </p>
        <Button
          aria-label="Cancelar"
          onClick={onCancel}
          size="icon-sm"
          variant="ghost"
          className="text-zinc-400 hover:bg-white/10 hover:text-white"
        >
          ✕
        </Button>
      </div>

      {mode === "scored" ? (
        <button
          type="button"
          onClick={() => onPick({ kind: "unattributed" })}
          className="flex min-h-12 items-center justify-center gap-2 rounded-lg border border-dashed border-white/25 text-sm font-semibold text-zinc-300 transition-colors hover:bg-white/5"
        >
          <UserXIcon className="size-4" aria-hidden="true" />
          Sin autor
        </button>
      ) : null}

      {names.length === 0 ? (
        <p className="py-4 text-center text-xs text-zinc-400">
          {mode === "scored"
            ? "Este equipo no tiene jugadores."
            : "El otro equipo no tiene jugadores."}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {names.map((player) => (
            <button
              key={player.playerId}
              type="button"
              onClick={() =>
                onPick(
                  mode === "scored"
                    ? { kind: "goal", playerId: player.playerId }
                    : { kind: "own", playerId: player.playerId },
                )
              }
              className="flex min-h-11 items-center justify-center truncate rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold text-white transition-transform hover:bg-white/15 active:scale-95"
            >
              {player.label}
            </button>
          ))}
        </div>
      )}

      {onToggleOwn && (mode === "own" || rivalNames.length > 0) ? (
        <button
          type="button"
          onClick={onToggleOwn}
          className="mt-auto flex min-h-10 items-center justify-center rounded-lg border border-white/15 text-xs font-semibold uppercase tracking-widest text-zinc-400 transition-colors hover:bg-white/5"
        >
          {mode === "scored" ? "Fue autogol" : "Volver"}
        </button>
      ) : null}
    </div>
  );
}

function inverseOf(command: MatchAction): MatchAction {
  if (command.type === "adjustStat") {
    return { ...command, delta: command.delta === 1 ? -1 : 1 };
  }
  return command;
}

function scoreFor(detail: Detail, teamId?: string) {
  return detail.score.find((item) => item.teamId === teamId)?.goals ?? 0;
}
