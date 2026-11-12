"use client";

import type { AppRouter } from "@hay-fulbo/api/routers/index";
import { Alert, AlertDescription, AlertTitle } from "@hay-fulbo/ui/components/alert";
import { Card } from "@hay-fulbo/ui/components/card";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@hay-fulbo/ui/components/sheet";
import { Skeleton } from "@hay-fulbo/ui/components/skeleton";
import { useIsMobile } from "@hay-fulbo/ui/hooks/use-mobile";
import { cn } from "@hay-fulbo/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import { CalendarClockIcon, CircleAlertIcon, Link2OffIcon } from "lucide-react";
import { useState } from "react";

import { useAppContext } from "@/components/app-shell";
import { DrillList, DrillRow, HeroNumber, NextStep, StatusHeader } from "@/components/next-step";
import { trpc } from "@/utils/trpc";

type GlobalStats = inferRouterOutputs<AppRouter>["stats"]["global"];
type GroupBreakdown = GlobalStats["groups"][number];
type Aggregate = NonNullable<GroupBreakdown["aggregate"]>;
type GroupState = "stats" | "no-matches" | "unlinked";
/** Which sheet is open: the "Todos" summary, a group by index, or none. */
type OpenSheet = "all" | number | null;

/**
 * The signed-in user's numbers across every group. Hero is the total of matches played;
 * the summary and each group open a sheet with their detail.
 */
export function GlobalProfile() {
  const { user } = useAppContext();
  const stats = useQuery(trpc.stats.global.queryOptions());
  const isMobile = useIsMobile();
  const [open, setOpen] = useState<OpenSheet>(null);

  if (stats.isPending) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6" aria-label="Cargando perfil">
        <Skeleton className="h-9 w-2/3 max-w-sm" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-44 w-full" />
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
  const withStats = groups.filter((group) => group.aggregate).length;
  const unlinked = groups.filter((group) => groupState(group) === "unlinked");
  const openGroup = typeof open === "number" ? groups[open] : undefined;
  const sheetOpen = open === "all" || Boolean(openGroup);
  const sheetTitle = open === "all" ? "Todos los grupos" : (openGroup?.groupName ?? "");

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <StatusHeader
        title={user.name}
        meta={
          groups.length > 0
            ? `En ${groups.length} ${plural(groups.length, "grupo", "grupos")}`
            : "Sin grupos"
        }
      />

      <HeroNumber
        caption={
          totals.played > 0
            ? `${plural(totals.played, "partido", "partidos")} en todos tus grupos · ${totals.contributions} G+A`
            : "Todavía no jugaste partidos cerrados"
        }
      >
        {totals.played}
      </HeroNumber>

      {unlinked.length > 0 ? (
        <NextStep
          kicker="Sin vincular"
          title={
            unlinked.length === 1
              ? `Tu cuenta no está vinculada en ${unlinked[0]?.groupName}`
              : `Tu cuenta no está vinculada en ${unlinked.length} grupos`
          }
        >
          Pedile al responsable del grupo que vincule tu cuenta con tu jugador. Tus partidos
          anteriores se suman solos.
        </NextStep>
      ) : null}

      {groups.length > 0 ? (
        <>
          <DrillList title="Resumen">
            <DrillRow
              label="Todos los grupos"
              value={withStats > 0 ? `${totals.contributions} G+A` : "Sin partidos"}
              onClick={() => setOpen("all")}
            />
          </DrillList>
          <DrillList title="Tus grupos">
            {groups.map((group, index) => (
              <DrillRow
                key={`${index}-${group.groupName}`}
                label={group.groupName}
                value={groupMeta(group)}
                onClick={() => setOpen(index)}
              />
            ))}
          </DrillList>
        </>
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          Todavía no estás en ningún grupo. Cuando te sumes a uno, tus números aparecen acá.
        </p>
      )}

      <Sheet open={sheetOpen} onOpenChange={(next) => (next ? null : setOpen(null))}>
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          className="max-h-[92dvh] md:max-h-none md:max-w-md"
        >
          <SheetHeader>
            <SheetTitle className="text-balance">{sheetTitle}</SheetTitle>
            <SheetDescription>
              {open === "all"
                ? withStats > 0
                  ? `Sumado entre ${withStats} ${plural(withStats, "grupo", "grupos")} donde jugaste.`
                  : "Todavía no jugaste partidos cerrados en ningún grupo."
                : openGroup?.playerName
                  ? `Jugás como ${openGroup.playerName}`
                  : "Sin jugador vinculado"}
            </SheetDescription>
          </SheetHeader>
          <SheetBody className="flex flex-col gap-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {open === "all" ? <AllPanel stats={stats.data} /> : null}
            {openGroup ? <GroupPanel group={openGroup} /> : null}
          </SheetBody>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function groupState(group: GroupBreakdown): GroupState {
  if (group.aggregate) return "stats";
  return group.linked ? "no-matches" : "unlinked";
}

function groupMeta(group: GroupBreakdown) {
  if (group.aggregate) {
    return `${group.aggregate.played} PJ · ${group.aggregate.wins} G`;
  }
  return groupState(group) === "unlinked" ? "Sin vincular" : "Sin partidos";
}

function AllPanel({ stats }: { stats: GlobalStats }) {
  const { groups, totals } = stats;
  const withStats = groups.flatMap((group, index) =>
    group.aggregate ? [{ name: group.groupName, played: group.aggregate.played, index }] : [],
  );

  return (
    <>
      <MetricGrid
        items={[
          { label: "Partidos", value: totals.played },
          {
            label: "G · E · P",
            value: totals.played ? `${totals.wins}·${totals.draws}·${totals.losses}` : null,
          },
          { label: "% victorias", value: totals.played ? formatPct(totals.winPercentage) : null },
          { label: "Goles", value: totals.goals },
          { label: "Asistencias", value: totals.assists },
          { label: "G+A", value: totals.contributions },
        ]}
      />

      {withStats.length > 0 ? (
        <section className="flex flex-col gap-3" aria-labelledby="profile-share">
          <h3 id="profile-share" className="text-base font-semibold">
            Dónde jugaste
          </h3>
          <Card className="gap-0 divide-y py-0">
            {withStats.map((item) => (
              <div
                key={`${item.index}-${item.name}`}
                className="flex min-h-14 flex-col gap-2 px-4 py-3"
              >
                <span className="flex w-full items-baseline justify-between gap-3">
                  <span className="truncate text-sm font-medium">{item.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {item.played} de {totals.played}
                  </span>
                </span>
                <span
                  className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
                  aria-hidden="true"
                >
                  <span
                    className="block h-full rounded-full bg-foreground/60"
                    style={{ width: `${(item.played / totals.played) * 100}%` }}
                  />
                </span>
              </div>
            ))}
          </Card>
        </section>
      ) : null}
    </>
  );
}

function GroupPanel({ group }: { group: GroupBreakdown }) {
  return group.aggregate ? (
    <GroupStats aggregate={group.aggregate} />
  ) : (
    <GroupEmpty state={groupState(group)} />
  );
}

function GroupStats({ aggregate }: { aggregate: Aggregate }) {
  return (
    <>
      <MetricGrid
        items={[
          { label: "Partidos", value: aggregate.played },
          { label: "G · E · P", value: `${aggregate.wins}·${aggregate.draws}·${aggregate.losses}` },
          { label: "% victorias", value: formatPct(aggregate.winPercentage) },
          { label: "Goles", value: aggregate.goals },
          { label: "Asistencias", value: aggregate.assists },
          { label: "G+A", value: aggregate.contributions },
        ]}
      />
      <section className="flex flex-col gap-3" aria-labelledby="profile-per-match">
        <h3 id="profile-per-match" className="text-base font-semibold">
          Por partido
        </h3>
        <Card className="gap-0 divide-y py-0">
          <Row label="Goles por partido" value={formatPerMatch(aggregate.goalsPerMatch)} />
          <Row label="Asistencias por partido" value={formatPerMatch(aggregate.assistsPerMatch)} />
          <Row label="G+A por partido" value={formatPerMatch(aggregate.contributionsPerMatch)} />
          <Row label="Diferencia de gol" value={formatSigned(aggregate.goalDifference)} />
          <Row
            label="Calificación promedio"
            value={aggregate.ratingAverage === null ? "—" : formatRating(aggregate.ratingAverage)}
            hint={
              aggregate.ratingAverage === null
                ? "Sin calificaciones"
                : `${aggregate.ratingMatchCount} ${plural(aggregate.ratingMatchCount, "partido", "partidos")}`
            }
          />
          <Row label="Ausencias" value={String(aggregate.absences)} />
          {aggregate.ownGoals > 0 ? (
            <Row label="Autogoles" value={String(aggregate.ownGoals)} />
          ) : null}
        </Card>
      </section>
    </>
  );
}

function GroupEmpty({ state }: { state: GroupState }) {
  const unlinked = state === "unlinked";
  const Icon = unlinked ? Link2OffIcon : CalendarClockIcon;
  return (
    <div className="flex items-start gap-3 rounded-lg border border-dashed p-4">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">
          {unlinked ? "No estás vinculado en este grupo" : "Todavía no hay partidos cerrados"}
        </p>
        <p className="text-sm text-muted-foreground">
          {unlinked
            ? "Pedile al responsable del grupo que vincule tu cuenta con tu jugador. Tus partidos anteriores se suman solos."
            : "Tus números aparecen cuando el organizador cierre un partido en el que jugaste."}
        </p>
      </div>
    </div>
  );
}

function MetricGrid({ items }: { items: { label: string; value: number | string | null }[] }) {
  return (
    <Card className="overflow-hidden py-0">
      <dl className="grid grid-cols-3 gap-px bg-border">
        {items.map((item) => (
          <div key={item.label} className="flex flex-col gap-1 bg-card p-4">
            <dt className="truncate text-xs font-medium text-muted-foreground">{item.label}</dt>
            <dd
              className={cn(
                "text-lg font-semibold tabular-nums",
                item.value === null && "text-muted-foreground",
              )}
            >
              {item.value ?? "—"}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-4 px-4 py-2.5">
      <span className="text-sm">{label}</span>
      <span className="flex shrink-0 items-baseline gap-2 tabular-nums">
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
        <span className="text-sm font-semibold">{value}</span>
      </span>
    </div>
  );
}

function plural(count: number, one: string, many: string) {
  return count === 1 ? one : many;
}

const perMatchFormat = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const ratingFormat = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const percentFormat = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

function formatPerMatch(value: number) {
  return perMatchFormat.format(value);
}

function formatRating(value: number) {
  return ratingFormat.format(value);
}

function formatPct(value: number) {
  return `${percentFormat.format(value)}%`;
}

function formatSigned(value: number) {
  return value > 0 ? `+${value}` : String(value);
}
