"use client";

import { Alert, AlertDescription, AlertTitle } from "@hay-fulbo/ui/components/alert";
import { Avatar, AvatarFallback } from "@hay-fulbo/ui/components/avatar";
import { Badge } from "@hay-fulbo/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@hay-fulbo/ui/components/card";
import { Separator } from "@hay-fulbo/ui/components/separator";
import { Skeleton } from "@hay-fulbo/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { CircleAlertIcon, CircleUserRoundIcon, Link2OffIcon } from "lucide-react";

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
    <div className="flex flex-col gap-6">
      <header className="flex items-center gap-4">
        <Avatar className="size-12">
          <AvatarFallback className="bg-primary text-primary-foreground">
            <CircleUserRoundIcon aria-hidden="true" />
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-semibold text-primary">Mi perfil</p>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{user.name}</h1>
          <p className="text-sm text-muted-foreground">
            Tus números sumados entre todos los grupos.
          </p>
        </div>
      </header>

      <section aria-label="Totales">
        <dl className="grid grid-cols-3 gap-2 md:grid-cols-6">
          <Metric label="Partidos" value={totals.played} />
          <Metric label="Ganados" value={totals.wins} />
          <Metric label="Empatados" value={totals.draws} />
          <Metric label="Goles" value={totals.goals} />
          <Metric label="Asistencias" value={totals.assists} />
          <Metric label="% victorias" value={formatPercentage(totals.winPercentage)} />
        </dl>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Por grupo</CardTitle>
          <CardDescription>Solo cuentan los jugadores vinculados con tu cuenta.</CardDescription>
        </CardHeader>
        <CardContent>
          {groups.map((group, index) => (
            <div key={`${index}-${group.groupName}`}>
              {index > 0 ? <Separator /> : null}
              <div className="flex min-h-20 items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{group.groupName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {group.playerName ?? "Tu cuenta todavía no está vinculada a un jugador"}
                  </p>
                </div>
                {group.aggregate ? (
                  <div className="grid shrink-0 grid-cols-3 gap-4 text-center text-sm tabular-nums">
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
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    // dt/dd sit directly in the Card: a <dl> group may only be one <div> deep.
    <Card size="sm" className="gap-1 px-(--card-spacing)">
      <dt className="truncate text-xs text-muted-foreground">{label}</dt>
      <dd className="text-xl font-bold tabular-nums">{value}</dd>
    </Card>
  );
}

function SmallMetric({ label, value }: { label: string; value: number }) {
  return (
    <span>
      <strong className="block">{value}</strong>
      <span className="text-xs text-muted-foreground">{label}</span>
    </span>
  );
}

function formatPercentage(value: number) {
  return `${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(value)}%`;
}
