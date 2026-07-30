"use client";

import { Badge } from "@hay-fulbo/ui/components/badge";
import { Button } from "@hay-fulbo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@hay-fulbo/ui/components/card";
import { Skeleton } from "@hay-fulbo/ui/components/skeleton";
import { cn } from "@hay-fulbo/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { DicesIcon } from "lucide-react";
import { useState } from "react";

import { trpc } from "@/utils/trpc";

export function MatchParityCard({ matchId }: { matchId: string }) {
  const parity = useQuery(trpc.stats.parity.queryOptions({ matchId }));
  const [stake, setStake] = useState(100);
  const [selection, setSelection] = useState<"left" | "draw" | "right">("left");

  if (parity.isPending) return <Skeleton className="h-72 w-full" />;
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
  const selected = options.find((option) => option.id === selection) ?? options[0]!;
  const projected = Math.round(stake / Math.max(selected.probability, 0.01));

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-muted/30">
        <div className="flex items-center gap-2 text-primary">
          <DicesIcon className="size-4" aria-hidden="true" />
          <span className="text-xs font-bold uppercase tracking-[0.16em]">Índice de paridad</span>
        </div>
        <CardTitle>¿Cómo llega cada equipo?</CardTitle>
        <CardDescription>
          Estimación recreativa basada en los partidos cerrados del grupo.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 py-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="flex flex-col gap-3">
          {options.map((option) => (
            <button
              key={option.id}
              className={cn(
                "grid min-h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border px-3 text-left transition-colors",
                selection === option.id
                  ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                  : "hover:bg-accent",
              )}
              onClick={() => setSelection(option.id)}
              type="button"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{option.label}</span>
                <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-muted">
                  <span
                    className="block h-full rounded-full bg-primary"
                    style={{ width: `${Math.round(option.probability * 100)}%` }}
                  />
                </span>
              </span>
              <strong className="text-lg tabular-nums">
                {Math.round(option.probability * 100)}%
              </strong>
            </button>
          ))}
          <p className="text-xs text-muted-foreground">
            Confianza{" "}
            <Badge className="ml-1" variant="outline">
              {confidenceLabel(parity.data.confidence)}
            </Badge>{" "}
            · {parity.data.sample.closedMatches} partidos de historial
          </p>
        </div>

        <div className="flex flex-col justify-between gap-4 rounded-xl border bg-card p-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Simulador ficticio
            </p>
            <p className="mt-1 text-sm">
              Si ponés <strong>{stake} puntos</strong> a {selected.label}
            </p>
          </div>
          <div>
            <output className="block text-4xl font-black tabular-nums">{projected}</output>
            <p className="text-xs text-muted-foreground">puntos totales si acertás</p>
          </div>
          <label className="flex flex-col gap-2 text-xs font-medium">
            Puntos: {stake}
            <input
              aria-label="Puntos ficticios a simular"
              className="accent-primary"
              max={1000}
              min={10}
              onChange={(event) => setStake(Number(event.target.value))}
              step={10}
              type="range"
              value={stake}
            />
          </label>
          <Button onClick={() => setStake(100)} size="sm" variant="outline">
            Reiniciar
          </Button>
          <p className="text-[0.68rem] leading-relaxed text-muted-foreground">
            Son puntos de juego: no se apuesta ni se paga dinero real.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function confidenceLabel(confidence: "low" | "medium" | "high") {
  return { low: "baja", medium: "media", high: "alta" }[confidence];
}
