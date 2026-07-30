"use client";

import { Badge } from "@hay-fulbo/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@hay-fulbo/ui/components/card";
import { Skeleton } from "@hay-fulbo/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { ScaleIcon } from "lucide-react";

import { trpc } from "@/utils/trpc";

export function MatchParityCard({ matchId }: { matchId: string }) {
  const parity = useQuery(trpc.stats.parity.queryOptions({ matchId }));

  if (parity.isPending) return <Skeleton className="h-56 w-full" />;
  if (parity.isError) return null;

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
    <Card size="sm">
      <CardHeader className="border-b">
        <div className="flex items-center gap-2 text-primary">
          <ScaleIcon aria-hidden="true" />
          <span className="text-xs font-bold uppercase tracking-[0.12em]">
            Lectura del historial
          </span>
        </div>
        <CardTitle>Cómo llega cada equipo</CardTitle>
        <CardDescription>
          Una referencia recreativa basada únicamente en partidos cerrados.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-4">
          {options.map((option) => (
            <div key={option.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{option.label}</span>
                <span className="mt-2 block h-2 overflow-hidden rounded-full bg-muted">
                  <span
                    className="block h-full rounded-full bg-primary"
                    style={{ width: `${Math.round(option.probability * 100)}%` }}
                  />
                </span>
              </span>
              <strong className="text-xl tabular-nums">
                {Math.round(option.probability * 100)}%
              </strong>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t pt-4 text-xs text-muted-foreground">
          <span>Confianza</span>
          <Badge variant="outline">{confidenceLabel(parity.data.confidence)}</Badge>
          <span aria-hidden="true">·</span>
          <span>{parity.data.sample.closedMatches} partidos de historial</span>
        </div>
      </CardContent>
    </Card>
  );
}

function confidenceLabel(confidence: "low" | "medium" | "high") {
  return { low: "baja", medium: "media", high: "alta" }[confidence];
}
