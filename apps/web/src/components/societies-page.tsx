"use client";

import { Alert, AlertDescription, AlertTitle } from "@hay-fulbo/ui/components/alert";
import { Button } from "@hay-fulbo/ui/components/button";
import { Card } from "@hay-fulbo/ui/components/card";
import { Skeleton } from "@hay-fulbo/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@hay-fulbo/ui/components/table";
import { cn } from "@hay-fulbo/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeftIcon, CircleAlertIcon, UsersRoundIcon } from "lucide-react";
import Link from "next/link";
import type * as React from "react";

import { PageHeader } from "@/components/page-header";
import { trpc } from "@/utils/trpc";

export function SocietiesPage() {
  const stats = useQuery(trpc.stats.dashboard.queryOptions({}));

  if (stats.isPending) {
    return (
      <div aria-label="Cargando sociedades" className="flex flex-col gap-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }
  if (stats.isError) {
    return (
      <Alert variant="destructive">
        <CircleAlertIcon aria-hidden="true" />
        <AlertTitle>No pudimos calcular las sociedades</AlertTitle>
        <AlertDescription>{stats.error.message}</AlertDescription>
      </Alert>
    );
  }

  const societies = stats.data.societies;
  const leader = societies[0] ?? null;

  return (
    <div className="flex flex-col gap-6">
      <Button
        className="-ml-3 w-fit"
        render={<Link href="/dashboard/estadisticas" />}
        nativeButton={false}
        size="sm"
        variant="ghost"
      >
        <ArrowLeftIcon data-icon="inline-start" aria-hidden="true" />
        Estadísticas
      </Button>
      <PageHeader
        title="Sociedades"
        description={`${stats.data.group.name} · las parejas que mejor funcionan cuando comparten equipo, con mínimo 2 PJ juntos.`}
      />

      {leader ? (
        <>
          <section aria-labelledby="sociedad-lider">
            <Card size="sm" className="gap-0 py-0">
              <div className="flex flex-col gap-1 px-4 py-3">
                <p id="sociedad-lider" className="text-xs font-medium text-muted-foreground">
                  Sociedad líder
                </p>
                <p className="text-lg font-semibold">
                  {leader.playerNames[0]} + {leader.playerNames[1]}
                </p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {leader.points} puntos en {leader.played} partidos juntos
                </p>
              </div>
              <dl className="grid grid-cols-2 gap-px border-t bg-border sm:grid-cols-4">
                <Metric label="Victorias" value={leader.wins} />
                <Metric label="Efectividad" value={`${formatNumber(leader.winPercentage)}%`} />
                <Metric label="Dif. gol" value={signed(leader.goalDifference)} />
                <Metric label="G+A" value={leader.contributions} />
              </dl>
            </Card>
          </section>

          <section aria-labelledby="tabla-duplas" className="flex flex-col gap-3">
            <div className="flex flex-col gap-0.5">
              <h2 id="tabla-duplas" className="text-base font-semibold">
                Tabla de duplas
              </h2>
              <p className="text-xs text-muted-foreground">
                Ordenada por puntos, efectividad y diferencia de gol.
              </p>
            </div>
            <Card className="py-0">
              <Table className="text-sm">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-8 pl-4 text-xs font-medium text-muted-foreground">
                      #
                    </TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground">
                      Dupla
                    </TableHead>
                    <NumberHead title="Partidos jugados juntos">PJ</NumberHead>
                    <NumberHead title="Partidos ganados">PG</NumberHead>
                    <NumberHead title="Partidos empatados">PE</NumberHead>
                    <NumberHead title="Diferencia de gol">DG</NumberHead>
                    <NumberHead className="pr-4" title="Puntos">
                      Pts.
                    </NumberHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {societies.map((society, index) => (
                    <TableRow className="h-11" key={society.playerIds.join(":")}>
                      <TableCell className="pl-4 text-muted-foreground tabular-nums">
                        {index + 1}
                      </TableCell>
                      <TableCell className="whitespace-normal font-medium">
                        {society.playerNames.join(" + ")}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground tabular-nums">
                        {society.played}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{society.wins}</TableCell>
                      <TableCell className="text-right text-muted-foreground tabular-nums">
                        {society.draws}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {signed(society.goalDifference)}
                      </TableCell>
                      <TableCell className="pr-4 text-right font-semibold tabular-nums">
                        {society.points}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </section>
        </>
      ) : (
        <section className="flex items-start gap-3 rounded-lg border border-dashed p-4 sm:p-5">
          <UsersRoundIcon
            aria-hidden="true"
            className="mt-0.5 size-5 shrink-0 text-muted-foreground"
          />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">Todavía no hay sociedades</h2>
            <p className="text-sm text-muted-foreground">
              Se necesitan al menos dos partidos cerrados con la misma pareja en un equipo.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}

function NumberHead({
  children,
  className,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title: string;
}) {
  return (
    <TableHead
      className={cn("w-9 text-right text-xs font-medium text-muted-foreground sm:w-14", className)}
    >
      <abbr className="no-underline" title={title}>
        {children}
      </abbr>
    </TableHead>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex flex-col gap-1 bg-card px-4 py-3">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function signed(value: number) {
  return `${value > 0 ? "+" : ""}${value}`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 }).format(value);
}
