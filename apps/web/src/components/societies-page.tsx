"use client";

import { Alert, AlertDescription, AlertTitle } from "@hay-fulbo/ui/components/alert";
import { Badge } from "@hay-fulbo/ui/components/badge";
import { Button } from "@hay-fulbo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@hay-fulbo/ui/components/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@hay-fulbo/ui/components/empty";
import { Skeleton } from "@hay-fulbo/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@hay-fulbo/ui/components/table";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeftIcon,
  CircleAlertIcon,
  HandshakeIcon,
  MedalIcon,
  UsersRoundIcon,
} from "lucide-react";
import Link from "next/link";

import { trpc } from "@/utils/trpc";

export function SocietiesPage() {
  const stats = useQuery(trpc.stats.dashboard.queryOptions({}));

  if (stats.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-36" />
        <Skeleton className="h-48 w-full" />
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
    <div className="flex flex-col gap-5">
      <header>
        <Button
          render={<Link href="/dashboard/estadisticas" />}
          nativeButton={false}
          size="sm"
          variant="ghost"
        >
          <ArrowLeftIcon data-icon="inline-start" aria-hidden="true" />
          Estadísticas
        </Button>
        <div className="mt-3 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-primary">{stats.data.group.name}</p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Sociedades</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Las parejas que mejor funcionan cuando comparten equipo.
            </p>
          </div>
          <Badge variant="outline">mínimo 2 PJ juntos</Badge>
        </div>
      </header>

      {leader ? (
        <Card className="overflow-hidden border-primary/30">
          <CardHeader className="border-b bg-primary/5">
            <div className="flex items-center gap-2 text-primary">
              <MedalIcon className="size-4" aria-hidden="true" />
              <span className="text-xs font-bold uppercase tracking-[0.15em]">Sociedad líder</span>
            </div>
            <CardTitle className="text-2xl">
              {leader.playerNames[0]} + {leader.playerNames[1]}
            </CardTitle>
            <CardDescription>
              {leader.points} puntos en {leader.played} partidos juntos
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-4 divide-x py-5">
            <Metric label="Victorias" value={leader.wins} />
            <Metric label="Efectividad" value={`${formatNumber(leader.winPercentage)}%`} />
            <Metric
              label="Dif. gol"
              value={`${leader.goalDifference > 0 ? "+" : ""}${leader.goalDifference}`}
            />
            <Metric label="G+A" value={leader.contributions} />
          </CardContent>
        </Card>
      ) : (
        <Empty className="min-h-72 border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UsersRoundIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>Todavía no hay sociedades</EmptyTitle>
            <EmptyDescription>
              Se necesitan al menos dos partidos cerrados con la misma pareja en un equipo.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {societies.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HandshakeIcon className="size-5 text-primary" aria-hidden="true" />
              Tabla de duplas
            </CardTitle>
            <CardDescription>Ordenada por puntos, efectividad y diferencia de gol.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dupla</TableHead>
                  <TableHead className="text-center">PJ</TableHead>
                  <TableHead className="text-center">PG</TableHead>
                  <TableHead className="text-center">PE</TableHead>
                  <TableHead className="text-center">DG</TableHead>
                  <TableHead className="text-right">Pts.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {societies.map((society, index) => (
                  <TableRow key={society.playerIds.join(":")}>
                    <TableCell>
                      <span className="mr-2 text-xs text-muted-foreground">{index + 1}</span>
                      <strong>{society.playerNames.join(" + ")}</strong>
                    </TableCell>
                    <TableCell className="text-center tabular-nums">{society.played}</TableCell>
                    <TableCell className="text-center tabular-nums">{society.wins}</TableCell>
                    <TableCell className="text-center tabular-nums">{society.draws}</TableCell>
                    <TableCell className="text-center tabular-nums">
                      {society.goalDifference > 0 ? "+" : ""}
                      {society.goalDifference}
                    </TableCell>
                    <TableCell className="text-right font-bold tabular-nums">
                      {society.points}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="px-2 text-center">
      <strong className="block text-xl tabular-nums sm:text-2xl">{value}</strong>
      <span className="text-[0.65rem] text-muted-foreground sm:text-xs">{label}</span>
    </div>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 }).format(value);
}
