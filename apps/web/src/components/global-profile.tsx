"use client";

import { Alert, AlertDescription, AlertTitle } from "@hay-fulbo/ui/components/alert";
import { Badge } from "@hay-fulbo/ui/components/badge";
import { Card } from "@hay-fulbo/ui/components/card";
import { Skeleton } from "@hay-fulbo/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { CircleAlertIcon, Link2OffIcon } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { useAppContext } from "@/components/app-shell";
import { trpc } from "@/utils/trpc";

export function GlobalProfile() {
  const { user } = useAppContext();
  const stats = useQuery(trpc.stats.global.queryOptions());

  if (stats.isPending) {
    return (
      <div className="flex flex-col gap-5" aria-label="Cargando perfil">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-52 w-full" />
      </div>
    );
  }
  if (stats.isError) {
    return (
      <Alert variant="destructive">
        <CircleAlertIcon aria-hidden="true" />
        <AlertTitle>No pudimos cargar tu perfil</AlertTitle>
        <AlertDescription>{stats.error.message}</AlertDescription>
      </Alert>
    );
  }

  const { groups, totals } = stats.data;
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={user.name} description="Tus números sumados entre todos los grupos." />

      <section aria-label="Totales">
        <Card className="overflow-hidden py-0">
          <dl className="grid grid-cols-3 gap-px bg-border md:grid-cols-6">
            <Metric label="Partidos" value={totals.played} />
            <Metric label="Ganados" value={totals.wins} />
            <Metric label="Empatados" value={totals.draws} />
            <Metric label="Goles" value={totals.goals} />
            <Metric label="Asistencias" value={totals.assists} />
            <Metric label="% victorias" value={formatPercentage(totals.winPercentage)} />
          </dl>
        </Card>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="by-group-title">
        <div className="flex flex-col gap-1">
          <h2 id="by-group-title" className="text-base font-semibold">
            Por grupo
          </h2>
          <p className="text-sm text-muted-foreground">
            Solo cuentan los jugadores vinculados con tu cuenta.
          </p>
        </div>
        <Card className="gap-0 divide-y py-0">
          {groups.map((group, index) => (
            <div
              key={`${index}-${group.groupName}`}
              className="flex min-h-14 items-center justify-between gap-4 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{group.groupName}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {group.playerName ?? "Tu cuenta todavía no está vinculada a un jugador"}
                </p>
              </div>
              {group.aggregate ? (
                <div className="grid shrink-0 grid-cols-3 gap-4 text-right text-sm tabular-nums">
                  <SmallMetric label="PJ" value={group.aggregate.played} />
                  <SmallMetric label="G" value={group.aggregate.goals} />
                  <SmallMetric label="A" value={group.aggregate.assists} />
                </div>
              ) : (
                <Badge variant="outline">
                  <Link2OffIcon aria-hidden="true" />
                  Sin vincular
                </Badge>
              )}
            </div>
          ))}
        </Card>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex flex-col gap-1 bg-card p-4">
      <dt className="truncate text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function SmallMetric({ label, value }: { label: string; value: number }) {
  return (
    <span>
      <strong className="block font-semibold">{value}</strong>
      <span className="text-xs text-muted-foreground">{label}</span>
    </span>
  );
}

function formatPercentage(value: number) {
  return `${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(value)}%`;
}
