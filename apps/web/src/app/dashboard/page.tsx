"use client";

import { Alert, AlertDescription, AlertTitle } from "@hay-fulbo/ui/components/alert";
import { Badge } from "@hay-fulbo/ui/components/badge";
import { Button } from "@hay-fulbo/ui/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@hay-fulbo/ui/components/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@hay-fulbo/ui/components/empty";
import { Skeleton } from "@hay-fulbo/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { ArrowRightIcon, CalendarDaysIcon, CircleAlertIcon, PlusIcon } from "lucide-react";
import Link from "next/link";

import { useAppContext } from "@/components/app-shell";
import { formatDate } from "@/lib/format";
import { trpc } from "@/utils/trpc";

const statusLabel = { open: "Abierto", closed: "Cerrado", cancelled: "Cancelado" } as const;

export default function DashboardPage() {
  const { role } = useAppContext();
  const matches = useQuery(trpc.matches.list.queryOptions({ limit: 50 }));

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-primary">Mesa de control</p>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Partidos</h1>
          <p className="text-sm text-muted-foreground">Lo próximo y lo que ya quedó cerrado.</p>
        </div>
        {role === "owner" ? (
          <Button render={<Link href="/dashboard/partidos/nuevo" />} nativeButton={false}>
            <PlusIcon data-icon="inline-start" aria-hidden="true" />
            <span className="hidden sm:inline">Nuevo partido</span>
            <span className="sm:hidden">Nuevo</span>
          </Button>
        ) : null}
      </header>

      {role === "member" ? (
        <Alert>
          <CircleAlertIcon aria-hidden="true" />
          <AlertTitle>Vista de consulta</AlertTitle>
          <AlertDescription>
            Podés ver toda la información. Si sos capitán, también podés administrar tu equipo.
          </AlertDescription>
        </Alert>
      ) : null}

      {matches.isPending ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-40 w-full" />
          ))}
        </div>
      ) : matches.isError ? (
        <Alert variant="destructive">
          <CircleAlertIcon aria-hidden="true" />
          <AlertTitle>No pudimos cargar los partidos</AlertTitle>
          <AlertDescription>{matches.error.message}</AlertDescription>
        </Alert>
      ) : matches.data.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarDaysIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>Todavía no hay partidos</EmptyTitle>
            <EmptyDescription>
              Cargá la fecha, la cancha y los dos equipos para arrancar.
            </EmptyDescription>
          </EmptyHeader>
          {role === "owner" ? (
            <EmptyContent>
              <Button render={<Link href="/dashboard/partidos/nuevo" />} nativeButton={false}>
                Crear el primero
              </Button>
            </EmptyContent>
          ) : null}
        </Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {matches.data.map((match) => (
            <Card key={match.id}>
              <CardHeader>
                <CardTitle>
                  {match.teams[0]?.displayName ?? "Equipo 1"}{" "}
                  <span className="text-muted-foreground">vs.</span>{" "}
                  {match.teams[1]?.displayName ?? "Equipo 2"}
                </CardTitle>
                <CardDescription>{formatDate(match.scheduledAt)}</CardDescription>
                <CardAction>
                  <Badge
                    variant={
                      match.status === "cancelled"
                        ? "destructive"
                        : match.status === "closed"
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {statusLabel[match.status]}
                  </Badge>
                </CardAction>
              </CardHeader>
              <CardContent className="flex items-end justify-between gap-4">
                <div className="flex items-baseline gap-3" aria-label="Resultado">
                  <strong className="text-4xl tabular-nums">{match.teams[0]?.goals ?? 0}</strong>
                  <span className="text-muted-foreground">—</span>
                  <strong className="text-4xl tabular-nums">{match.teams[1]?.goals ?? 0}</strong>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  render={<Link href={`/dashboard/partidos/${match.id}`} />}
                  nativeButton={false}
                  aria-label="Abrir partido"
                >
                  <ArrowRightIcon aria-hidden="true" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
