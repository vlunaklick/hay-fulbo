"use client";

// Variant "Por grupo": the group is the lens. "Todos" is one tab among the groups;
// each tab swaps the same stat panel. Mobile: scrollable tabs. Desktop: side list.
import { Card } from "@hay-fulbo/ui/components/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@hay-fulbo/ui/components/tabs";
import { cn } from "@hay-fulbo/ui/lib/utils";
import { Link2OffIcon, CalendarClockIcon } from "lucide-react";
import { useState } from "react";

import { PageHeader } from "@/components/page-header";

import {
  type Aggregate,
  fmt,
  type GroupBreakdown,
  groupState,
  plural,
  type ProfileData,
} from "./data";

const ALL = "todos";

export function VariantGrupos({ data }: { data: ProfileData }) {
  const { groups, totals } = data.stats;
  const [tab, setTab] = useState(ALL);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={data.userName} description="Elegí un grupo o mirá todo junto." />

      <Tabs
        value={tab}
        onValueChange={(value) => setTab(String(value))}
        className="gap-6 md:grid md:grid-cols-[16rem_minmax(0,1fr)] md:items-start md:gap-8"
      >
        <TabsList
          aria-label="Grupos"
          className="-mx-4 w-[calc(100%+2rem)] justify-start overflow-x-auto rounded-none bg-transparent px-4 [scrollbar-width:none] md:mx-0 md:w-full md:flex-col md:items-stretch md:gap-1 md:overflow-visible md:px-0"
        >
          <GroupTab value={ALL} title="Todos" meta={`${totals.played} PJ`} />
          {groups.map((group, index) => (
            <GroupTab
              key={group.groupName}
              value={String(index)}
              title={group.groupName}
              meta={
                group.aggregate
                  ? `${group.aggregate.played} PJ`
                  : groupState(group) === "unlinked"
                    ? "Sin vincular"
                    : "Sin partidos"
              }
              muted={!group.aggregate}
            />
          ))}
        </TabsList>

        <TabsContent value={ALL} className="text-sm">
          <AllPanel data={data} onPick={setTab} />
        </TabsContent>
        {groups.map((group, index) => (
          <TabsContent key={group.groupName} value={String(index)} className="text-sm">
            <GroupPanel group={group} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function GroupTab({
  value,
  title,
  meta,
  muted,
}: {
  value: string;
  title: string;
  meta: string;
  muted?: boolean;
}) {
  return (
    <TabsTrigger
      value={value}
      className={cn(
        "max-w-48 flex-none rounded-full border border-border px-4 data-active:border-foreground data-active:bg-foreground data-active:text-background dark:data-active:border-foreground dark:data-active:bg-foreground dark:data-active:text-background",
        "md:max-w-none md:flex-col md:items-start md:gap-0 md:rounded-md md:border-transparent md:px-3 md:py-2 md:text-left md:data-active:border-transparent md:data-active:bg-secondary md:data-active:text-foreground md:dark:data-active:border-transparent md:dark:data-active:bg-secondary md:dark:data-active:text-foreground",
        muted && "text-muted-foreground",
      )}
    >
      <span className="w-full truncate">{title}</span>
      <span className="hidden text-xs font-normal text-muted-foreground tabular-nums md:block">
        {meta}
      </span>
    </TabsTrigger>
  );
}

function AllPanel({ data, onPick }: { data: ProfileData; onPick: (tab: string) => void }) {
  const { groups, totals } = data.stats;
  const withStats = groups
    .map((group, index) => ({ group, index }))
    .filter((item) => item.group.aggregate);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-bold">Todos los grupos</h2>
        <p className="text-sm text-muted-foreground">
          {withStats.length > 0
            ? `Sumado entre ${withStats.length} ${plural(withStats.length, "grupo", "grupos")} donde jugaste.`
            : "Todavía no jugaste partidos cerrados en ningún grupo."}
        </p>
      </div>

      <MetricGrid
        items={[
          { label: "Partidos", value: totals.played },
          {
            label: "G · E · P",
            value: totals.played ? `${totals.wins}·${totals.draws}·${totals.losses}` : null,
          },
          { label: "% victorias", value: totals.played ? fmt.pct(totals.winPercentage) : null },
          { label: "Goles", value: totals.goals },
          { label: "Asistencias", value: totals.assists },
          { label: "G+A", value: totals.contributions },
        ]}
      />

      {withStats.length > 0 ? (
        <section className="flex flex-col gap-3" aria-labelledby="grupos-share">
          <h3 id="grupos-share" className="text-base font-semibold">
            Dónde jugaste
          </h3>
          <Card className="gap-0 divide-y py-0">
            {withStats.map(({ group, index }) => {
              const played = group.aggregate!.played;
              return (
                <button
                  key={group.groupName}
                  type="button"
                  onClick={() => onPick(String(index))}
                  className="flex min-h-14 flex-col gap-2 px-4 py-3 text-left transition-colors duration-150 ease-out outline-none hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset"
                >
                  <span className="flex w-full items-baseline justify-between gap-3">
                    <span className="truncate text-sm font-medium">{group.groupName}</span>
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                      {played} de {totals.played}
                    </span>
                  </span>
                  <span
                    className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
                    aria-hidden="true"
                  >
                    <span
                      className="block h-full rounded-full bg-foreground/60"
                      style={{ width: `${(played / totals.played) * 100}%` }}
                    />
                  </span>
                </button>
              );
            })}
          </Card>
        </section>
      ) : null}
    </div>
  );
}

function GroupPanel({ group }: { group: GroupBreakdown }) {
  const state = groupState(group);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-bold text-balance">{group.groupName}</h2>
        {group.playerName ? (
          <p className="text-sm text-muted-foreground">Jugás como {group.playerName}</p>
        ) : null}
      </div>
      {group.aggregate ? <GroupStats aggregate={group.aggregate} /> : <GroupEmpty state={state} />}
    </div>
  );
}

function GroupStats({ aggregate }: { aggregate: Aggregate }) {
  return (
    <>
      <MetricGrid
        items={[
          { label: "Partidos", value: aggregate.played },
          { label: "G · E · P", value: `${aggregate.wins}·${aggregate.draws}·${aggregate.losses}` },
          { label: "% victorias", value: fmt.pct(aggregate.winPercentage) },
          { label: "Goles", value: aggregate.goals },
          { label: "Asistencias", value: aggregate.assists },
          { label: "G+A", value: aggregate.contributions },
        ]}
      />
      <section className="flex flex-col gap-3" aria-label="Por partido y más datos">
        <h3 className="text-base font-semibold">Por partido</h3>
        <Card className="gap-0 divide-y py-0">
          <Row label="Goles por partido" value={fmt.perMatch(aggregate.goalsPerMatch)} />
          <Row label="Asistencias por partido" value={fmt.perMatch(aggregate.assistsPerMatch)} />
          <Row label="G+A por partido" value={fmt.perMatch(aggregate.contributionsPerMatch)} />
          <Row label="Diferencia de gol" value={fmt.signed(aggregate.goalDifference)} />
          <Row
            label="Calificación promedio"
            value={aggregate.ratingAverage === null ? "—" : fmt.rating(aggregate.ratingAverage)}
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

function GroupEmpty({ state }: { state: "no-matches" | "unlinked" | "stats" }) {
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
