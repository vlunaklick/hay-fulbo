// Baseline: the production markup of components/global-profile.tsx, unchanged, fed with mock data.
import { Badge } from "@hay-fulbo/ui/components/badge";
import { Card } from "@hay-fulbo/ui/components/card";
import { Link2OffIcon } from "lucide-react";

import { PageHeader } from "@/components/page-header";

import { fmt, type ProfileData } from "./data";

export function VariantActual({ data }: { data: ProfileData }) {
  const { groups, totals } = data.stats;
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={data.userName} description="Tus números sumados entre todos los grupos." />

      <section aria-label="Totales">
        <Card className="overflow-hidden py-0">
          <dl className="grid grid-cols-3 gap-px bg-border md:grid-cols-6">
            <Metric label="Partidos" value={totals.played} />
            <Metric label="Ganados" value={totals.wins} />
            <Metric label="Empatados" value={totals.draws} />
            <Metric label="Goles" value={totals.goals} />
            <Metric label="Asistencias" value={totals.assists} />
            <Metric label="% victorias" value={fmt.pct(totals.winPercentage)} />
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
