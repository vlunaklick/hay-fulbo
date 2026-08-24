"use client";

import { Badge } from "@hay-fulbo/ui/components/badge";
import { Button } from "@hay-fulbo/ui/components/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hay-fulbo/ui/components/select";
import { Skeleton } from "@hay-fulbo/ui/components/skeleton";
import { cn } from "@hay-fulbo/ui/lib/utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import { EyeIcon, LockIcon, TrophyIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import type { AppRouter } from "@hay-fulbo/api/routers/index";

import { queryClient, trpc } from "@/utils/trpc";

type Outputs = inferRouterOutputs<AppRouter>;
type Detail = Outputs["matches"]["detail"];

const scoreItems = Array.from({ length: 10 }, (_, index) => ({
  label: String(index + 1),
  value: String(index + 1),
}));

export function MatchRatings({ matchId, teams }: { matchId: string; teams: Detail["teams"] }) {
  const state = useQuery(trpc.matches.ratings.queryOptions({ matchId }));
  const [draft, setDraft] = useState<Record<string, number>>({});

  const save = useMutation(
    trpc.matches.rate.mutationOptions({
      onSuccess: async () => {
        toast.success("Notas guardadas");
        setDraft({});
        await queryClient.invalidateQueries({
          queryKey: trpc.matches.ratings.queryKey({ matchId }),
        });
        queryClient.invalidateQueries({ queryKey: trpc.stats.dashboard.queryKey() });
      },
      onError: (cause) => toast.error(cause.message),
    }),
  );

  if (state.isPending) {
    return <Skeleton className="h-48 w-full" />;
  }
  if (state.isError) {
    return <p className="text-sm text-muted-foreground">{state.error.message}</p>;
  }

  const data = state.data;
  const valueFor = (playerId: string) => draft[playerId] ?? data.ownScores[playerId] ?? null;

  const pendingPlayerIds = Object.keys(draft).filter((playerId) =>
    data.players.some((player) => player.playerId === playerId),
  );

  function saveAll() {
    if (pendingPlayerIds.length === 0) return;
    save.mutate({
      matchId,
      scores: pendingPlayerIds.map((playerId) => ({
        playerId,
        score: draft[playerId] as number,
      })),
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {data.revealed ? (
          <Badge variant="secondary" className="gap-1">
            <EyeIcon className="size-3.5" aria-hidden="true" />
            Notas reveladas
          </Badge>
        ) : (
          <Badge variant="secondary" className="gap-1">
            <LockIcon className="size-3.5" aria-hidden="true" />
            Votaron {data.completeVotes} de {data.eligibleVoters}
            {data.eligibleVoters > 0 ? ` · faltan ${data.missingVotes}` : ""}
          </Badge>
        )}
        {data.figure ? (
          <span className="flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
            <TrophyIcon className="size-3.5" aria-hidden="true" />
            Figura: {data.figure.displayName} · {data.figure.average}
          </span>
        ) : null}
      </div>

      {!data.revealed ? (
        <p className="text-sm text-muted-foreground">
          Las notas son anónimas: nadie ve quién puso qué. Los promedios se revelan cuando llega el
          quórum que eligió el responsable del grupo.
        </p>
      ) : null}

      {data.viewerCanRate ? (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            {teams.map((team) => (
              <div key={team.id} className="overflow-hidden rounded-xl border bg-card">
                <div
                  className={cn("h-1", team.slot === 1 ? "bg-emerald-400" : "bg-sky-400")}
                  aria-hidden="true"
                />
                <div className="flex flex-col divide-y px-4 py-3">
                  {team.appearances.map((appearance) => {
                    const summary = data.players.find(
                      (player) => player.playerId === appearance.playerId,
                    );
                    const isSelf = appearance.playerId === data.viewerPlayerId;
                    const current = valueFor(appearance.playerId);
                    return (
                      <div
                        key={appearance.playerId}
                        className="flex min-h-11 items-center justify-between gap-3 py-1.5"
                      >
                        <span className="truncate text-sm font-medium">
                          {appearance.playerDisplayName}
                        </span>
                        <div className="flex shrink-0 items-center gap-2">
                          {data.revealed && summary?.average !== null && summary ? (
                            <span className="font-mono text-sm font-bold tabular-nums text-muted-foreground">
                              {summary.average}
                              {summary.votes !== null && summary.votes > 1
                                ? ` · ${summary.votes} votos`
                                : ""}
                            </span>
                          ) : null}
                          {isSelf ? (
                            <span className="text-xs text-muted-foreground">vos</span>
                          ) : (
                            <Select
                              disabled={save.isPending}
                              items={scoreItems}
                              value={current === null ? null : current.toString()}
                              onValueChange={(next) => {
                                const score = Number(next);
                                if (!Number.isInteger(score)) return;
                                setDraft((currentDraft) => ({
                                  ...currentDraft,
                                  [appearance.playerId]: score,
                                }));
                              }}
                            >
                              <SelectTrigger
                                aria-label={`Nota para ${appearance.playerDisplayName}`}
                                className="h-8 w-[4.5rem]"
                                size="sm"
                              >
                                <SelectValue placeholder="Nota" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectGroup>
                                  {scoreItems.map((item) => (
                                    <SelectItem key={item.value} value={item.value}>
                                      {item.label}
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div>
            <Button disabled={save.isPending || pendingPlayerIds.length === 0} onClick={saveAll}>
              Guardar notas
            </Button>
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Solo quienes jugaron este partido y tienen cuenta vinculada pueden calificarlo.
        </p>
      )}
    </div>
  );
}
