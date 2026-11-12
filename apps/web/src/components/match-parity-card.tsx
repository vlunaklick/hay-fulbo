"use client";

import { Alert, AlertDescription } from "@hay-fulbo/ui/components/alert";
import { Badge } from "@hay-fulbo/ui/components/badge";
import { Button } from "@hay-fulbo/ui/components/button";
import { Progress } from "@hay-fulbo/ui/components/progress";
import { Skeleton } from "@hay-fulbo/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";

import { trpc } from "@/utils/trpc";

export function MatchParityCard({ matchId }: { matchId: string }) {
  const parity = useQuery(trpc.stats.parity.queryOptions({ matchId }));

  if (parity.isPending) return <Skeleton className="h-28 w-full" />;
  if (parity.isError)
    return (
      <Alert className="gap-3 p-4">
        <AlertDescription>No pudimos cargar cómo llega cada equipo.</AlertDescription>
        <Button variant="outline" className="w-fit" onClick={() => parity.refetch()}>
          Reintentar
        </Button>
      </Alert>
    );

  const options = [
    {
      id: "left" as const,
      label: parity.data.teams[0].displayName,
      probability: parity.data.teams[0].probability,
    },
    { id: "draw" as const, label: "Empate", probability: parity.data.drawProbability },
    {
      id: "right" as const,
      label: parity.data.teams[1].displayName,
      probability: parity.data.teams[1].probability,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3 sm:gap-6">
        {options.map((option) => (
          <div key={option.id} className="flex min-w-0 flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-xs font-medium text-muted-foreground">
                {option.label}
              </span>
              <strong className="text-lg font-semibold tabular-nums">
                {Math.round(option.probability * 100)}%
              </strong>
            </div>
            <Progress aria-label={option.label} value={Math.round(option.probability * 100)} />
          </div>
        ))}
      </div>
      <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        Una referencia recreativa basada únicamente en partidos cerrados.
        <span aria-hidden="true">·</span>
        <span>Confianza</span>
        <Badge variant="outline">{confidenceLabel(parity.data.confidence)}</Badge>
        <span aria-hidden="true">·</span>
        <span>{parity.data.sample.closedMatches} partidos de historial</span>
      </p>
    </div>
  );
}

function confidenceLabel(confidence: "low" | "medium" | "high") {
  return { low: "baja", medium: "media", high: "alta" }[confidence];
}
