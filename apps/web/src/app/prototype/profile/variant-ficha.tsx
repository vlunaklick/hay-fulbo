// Variant "Ficha": identity-first. One hero number (G+A), the record as a single
// bar, then the per-group list as supporting detail.
import { Avatar, AvatarFallback } from "@hay-fulbo/ui/components/avatar";
import { Badge } from "@hay-fulbo/ui/components/badge";
import { Card } from "@hay-fulbo/ui/components/card";
import { Separator } from "@hay-fulbo/ui/components/separator";
import { cn } from "@hay-fulbo/ui/lib/utils";

import { initials } from "@/lib/initials";

import { fmt, GROUP_HINT, groupState, plural, type ProfileData } from "./data";

export function VariantFicha({ data }: { data: ProfileData }) {
  const { groups, totals } = data.stats;
  const activeGroups = groups.filter((group) => group.aggregate).length;
  const hasMatches = totals.played > 0;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex items-center gap-3">
        <Avatar size="lg" className="size-12">
          <AvatarFallback className="text-base font-semibold">
            {initials(data.userName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-col gap-0.5">
          <h1 className="text-2xl font-bold tracking-tight text-balance">{data.userName}</h1>
          <p className="text-sm text-muted-foreground">
            {hasMatches
              ? `${totals.played} ${plural(totals.played, "partido", "partidos")} en ${activeGroups} ${plural(activeGroups, "grupo", "grupos")}`
              : "Todavía sin partidos cerrados"}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:items-start">
        <section aria-label="Tu resumen">
          <Card className="gap-5">
            <div className="flex flex-col gap-1 px-4">
              <p className="text-xs font-medium text-muted-foreground">Goles + asistencias</p>
              {hasMatches ? (
                <p className="flex items-baseline gap-3">
                  <span className="text-6xl font-black tracking-tight tabular-nums">
                    {totals.contributions}
                  </span>
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {fmt.perMatch(totals.contributions / totals.played)} por partido
                  </span>
                </p>
              ) : (
                <>
                  <p className="text-6xl font-black text-muted-foreground">—</p>
                  <p className="text-xs text-muted-foreground">
                    Aparece cuando se cierre tu primer partido.
                  </p>
                </>
              )}
            </div>

            {hasMatches ? (
              <div className="flex flex-col gap-2 px-4">
                <RecordBar wins={totals.wins} draws={totals.draws} losses={totals.losses} />
                <div className="flex items-baseline justify-between gap-3 text-xs text-muted-foreground tabular-nums">
                  <p>
                    <span className="font-semibold text-foreground">{totals.wins}</span> G ·{" "}
                    <span className="font-semibold text-foreground">{totals.draws}</span> E ·{" "}
                    <span className="font-semibold text-foreground">{totals.losses}</span> P
                  </p>
                  <p>
                    <span className="font-semibold text-foreground">
                      {fmt.pct(totals.winPercentage)}
                    </span>{" "}
                    victorias
                  </p>
                </div>
              </div>
            ) : null}

            <Separator />

            <dl className="grid grid-cols-3 divide-x px-0">
              <Stat label="Partidos" value={totals.played} />
              <Stat label="Goles" value={totals.goals} />
              <Stat label="Asistencias" value={totals.assists} />
            </dl>
          </Card>
        </section>

        <section className="flex flex-col gap-3" aria-labelledby="ficha-groups">
          <h2 id="ficha-groups" className="text-base font-semibold">
            Por grupo
          </h2>
          <Card className="gap-0 divide-y py-0">
            {groups.map((group) => {
              const state = groupState(group);
              return (
                <div
                  key={group.groupName}
                  className="flex min-h-14 items-center justify-between gap-4 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p
                      className={cn(
                        "truncate text-sm font-medium",
                        state !== "stats" && "text-muted-foreground",
                      )}
                    >
                      {group.groupName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {state === "stats" ? `Como ${group.playerName}` : GROUP_HINT[state]}
                    </p>
                  </div>
                  {group.aggregate ? (
                    <div className="shrink-0 text-right tabular-nums">
                      <p className="text-sm font-semibold">
                        {group.aggregate.contributions}{" "}
                        <span className="text-xs font-medium text-muted-foreground">G+A</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {group.aggregate.played} PJ · {fmt.pct(group.aggregate.winPercentage)}
                      </p>
                    </div>
                  ) : (
                    <Badge variant="ghost" className="shrink-0 text-muted-foreground">
                      {state === "unlinked" ? "Sin vincular" : "Sin partidos"}
                    </Badge>
                  )}
                </div>
              );
            })}
          </Card>
        </section>
      </div>
    </div>
  );
}

function RecordBar({ wins, draws, losses }: { wins: number; draws: number; losses: number }) {
  const total = wins + draws + losses;
  const segments = [
    { key: "wins", value: wins, className: "bg-success" },
    { key: "draws", value: draws, className: "bg-muted-foreground/50" },
    { key: "losses", value: losses, className: "bg-destructive/70" },
  ].filter((segment) => segment.value > 0);
  return (
    <div
      className="flex h-2 gap-0.5 overflow-hidden rounded-full"
      role="img"
      aria-label={`${wins} ganados, ${draws} empatados, ${losses} perdidos`}
    >
      {segments.map((segment) => (
        <span
          key={segment.key}
          className={cn("h-full first:rounded-l-full last:rounded-r-full", segment.className)}
          style={{ width: `${(segment.value / total) * 100}%` }}
        />
      ))}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1 px-4">
      <dt className="truncate text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
