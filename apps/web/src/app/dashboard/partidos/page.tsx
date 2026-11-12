"use client";

import { Alert, AlertDescription, AlertTitle } from "@hay-fulbo/ui/components/alert";
import { Button } from "@hay-fulbo/ui/components/button";
import { Card } from "@hay-fulbo/ui/components/card";
import { Skeleton } from "@hay-fulbo/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { CalendarDaysIcon, CircleAlertIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { useAppContext } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { NewMatchDialog } from "@/components/new-match-dialog";
import { formatDate } from "@/lib/format";
import { trpc } from "@/utils/trpc";

const statusLabel = { open: "Abierto", closed: "Cerrado", cancelled: "Cancelado" } as const;

type MatchItem = NonNullable<ReturnType<typeof useMatches>["data"]>[number];

function useMatches() {
  return useQuery(trpc.matches.list.queryOptions({ limit: 50 }));
}

export default function DashboardPage() {
  const { role } = useAppContext();
  const matches = useMatches();
  const [createOpen, setCreateOpen] = useState(false);
  const canManage = role !== "member";
  const upcoming = (matches.data ?? []).filter((match) => match.status === "open");
  const played = (matches.data ?? []).filter((match) => match.status !== "open");

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Partidos"
        actions={
          canManage ? (
            <Button onClick={() => setCreateOpen(true)}>
              <PlusIcon data-icon="inline-start" aria-hidden="true" />
              <span className="hidden sm:inline">Nuevo partido</span>
              <span className="sm:hidden">Nuevo</span>
            </Button>
          ) : null
        }
      />

      {matches.isPending ? (
        <Skeleton className="h-64 w-full" />
      ) : matches.isError ? (
        <Alert variant="destructive">
          <CircleAlertIcon aria-hidden="true" />
          <AlertTitle>No pudimos cargar los partidos</AlertTitle>
          <AlertDescription>{matches.error.message}</AlertDescription>
        </Alert>
      ) : matches.data.length === 0 ? (
        <div className="flex flex-col items-start gap-4 rounded-lg border border-dashed p-4 sm:flex-row sm:items-center">
          <CalendarDaysIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <p className="min-w-0 flex-1 text-sm font-medium">Todavía no hay partidos</p>
          {canManage ? (
            <Button variant="outline" onClick={() => setCreateOpen(true)}>
              Crear el primero
            </Button>
          ) : null}
        </div>
      ) : (
        <>
          <MatchSection title="Próximos" matches={upcoming} />
          <MatchSection title="Jugados" matches={played} />
        </>
      )}

      <NewMatchDialog onOpenChange={setCreateOpen} open={createOpen} />
    </div>
  );
}

function MatchSection({ matches, title }: { matches: MatchItem[]; title: string }) {
  if (matches.length === 0) return null;
  return (
    <section className="flex flex-col gap-3" aria-label={title}>
      <h2 className="text-base font-semibold">{title}</h2>
      <Card className="gap-0 divide-y py-0">
        {matches.map((match) => {
          const home = match.teams[0]?.displayName ?? "Equipo 1";
          const away = match.teams[1]?.displayName ?? "Equipo 2";
          return (
            <Link
              key={match.id}
              href={`/dashboard/partidos/${match.id}`}
              aria-label={`Abrir ${home} vs. ${away}`}
              className="flex min-h-14 items-center justify-between gap-4 px-4 py-3 outline-none transition-colors first:rounded-t-xl last:rounded-b-xl hover:bg-muted/50 focus-visible:bg-muted/50"
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <p className="truncate text-sm font-medium">
                  {home} <span className="font-normal text-muted-foreground">vs.</span> {away}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {formatDate(match.scheduledAt)} · {statusLabel[match.status]}
                </p>
              </div>
              <span
                className="shrink-0 text-base font-semibold tabular-nums"
                aria-label={`Resultado ${match.teams[0]?.goals ?? 0} a ${match.teams[1]?.goals ?? 0}`}
              >
                {match.teams[0]?.goals ?? 0} – {match.teams[1]?.goals ?? 0}
              </span>
            </Link>
          );
        })}
      </Card>
    </section>
  );
}
