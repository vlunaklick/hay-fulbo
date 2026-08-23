"use client";

import { Alert, AlertDescription, AlertTitle } from "@hay-fulbo/ui/components/alert";
import { Badge } from "@hay-fulbo/ui/components/badge";
import { Button } from "@hay-fulbo/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@hay-fulbo/ui/components/empty";
import { Skeleton } from "@hay-fulbo/ui/components/skeleton";
import { cn } from "@hay-fulbo/ui/lib/utils";
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
          <p className="text-sm font-semibold text-primary">Fechas</p>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Partidos</h1>
          <p className="text-sm text-muted-foreground">Lo próximo y lo que ya quedó cerrado.</p>
        </div>
        {role !== "member" ? (
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
        <div className="flex flex-col">
          {[0, 1, 2, 3].map((item) => (
            <Skeleton
              key={item}
              className="h-16 w-full rounded-none first:rounded-t-md last:rounded-b-md"
            />
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
          {role !== "member" ? (
            <EmptyContent>
              <Button render={<Link href="/dashboard/partidos/nuevo" />} nativeButton={false}>
                Crear el primero
              </Button>
            </EmptyContent>
          ) : null}
        </Empty>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          {matches.data.map((match, index) => (
            <Link
              key={match.id}
              href={`/dashboard/partidos/${match.id}`}
              aria-label={`Abrir ${match.teams[0]?.displayName ?? "Equipo 1"} vs. ${
                match.teams[1]?.displayName ?? "Equipo 2"
              }`}
              className={cn(
                "flex min-h-16 items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none sm:px-5",
                index > 0 && "border-t",
              )}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">
                  {match.teams[0]?.displayName ?? "Equipo 1"}{" "}
                  <strong className="tabular-nums">{match.teams[0]?.goals ?? 0}</strong>
                  <span className="px-1.5 text-muted-foreground">–</span>
                  <strong className="tabular-nums">{match.teams[1]?.goals ?? 0}</strong>{" "}
                  {match.teams[1]?.displayName ?? "Equipo 2"}
                </span>
                <span className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatDate(match.scheduledAt)}</span>
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
                </span>
              </span>
              <ArrowRightIcon
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
