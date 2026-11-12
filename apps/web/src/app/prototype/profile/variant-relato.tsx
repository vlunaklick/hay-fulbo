// Variant "Relato": copy-led. The numbers are told as sentences a player reads in
// one pass; no metric grid, the figures are emphasized inside the prose.
import { Badge } from "@hay-fulbo/ui/components/badge";
import type { ReactNode } from "react";

import { PageHeader } from "@/components/page-header";

import { fmt, GROUP_HINT, groupState, plural, type ProfileData } from "./data";

function N({ children }: { children: ReactNode }) {
  return <strong className="font-bold text-foreground tabular-nums">{children}</strong>;
}

export function VariantRelato({ data }: { data: ProfileData }) {
  const { groups, totals } = data.stats;
  const played = groups.filter((group) => group.aggregate);
  const pending = groups.filter((group) => !group.aggregate);
  const best =
    played.length > 1
      ? played.reduce((a, b) => (b.aggregate!.winPercentage > a.aggregate!.winPercentage ? b : a))
      : null;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={data.userName} />

      <section aria-label="Resumen" className="flex max-w-2xl flex-col gap-3">
        {totals.played > 0 ? (
          <>
            <p className="text-xl leading-relaxed font-medium text-pretty text-muted-foreground md:text-2xl md:leading-relaxed">
              Jugaste{" "}
              <N>
                {totals.played} {plural(totals.played, "partido", "partidos")}
              </N>{" "}
              en{" "}
              <N>
                {played.length} {plural(played.length, "grupo", "grupos")}
              </N>
              . Ganaste <N>{totals.wins}</N>, empataste <N>{totals.draws}</N> y perdiste{" "}
              <N>{totals.losses}</N>: <N>{fmt.pct(totals.winPercentage)}</N> de victorias.
            </p>
            <p className="text-xl leading-relaxed font-medium text-pretty text-muted-foreground md:text-2xl md:leading-relaxed">
              Hiciste{" "}
              <N>
                {totals.goals} {plural(totals.goals, "gol", "goles")}
              </N>{" "}
              y diste{" "}
              <N>
                {totals.assists} {plural(totals.assists, "asistencia", "asistencias")}
              </N>
              . Son <N>{fmt.perMatch(totals.contributions / totals.played)}</N> goles o asistencias
              por partido.
            </p>
          </>
        ) : (
          <p className="text-xl leading-relaxed font-medium text-pretty text-muted-foreground">
            Todavía no jugaste partidos cerrados. Cuando el organizador cierre uno en el que
            estuviste, tus números aparecen acá.
          </p>
        )}
      </section>

      {played.length > 0 ? (
        <section className="flex flex-col gap-4" aria-labelledby="relato-groups">
          <h2 id="relato-groups" className="text-base font-semibold">
            Grupo por grupo
          </h2>
          <div className="grid gap-x-8 md:grid-cols-2">
            {played.map((group) => {
              const a = group.aggregate!;
              return (
                <article key={group.groupName} className="flex flex-col gap-2 border-t py-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="min-w-0 text-sm font-semibold text-balance">
                      {group.groupName}
                    </h3>
                    {best === group ? (
                      <Badge variant="success" className="shrink-0">
                        Donde más ganás
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Como {group.playerName}: <N>{a.played}</N>{" "}
                    {plural(a.played, "partido", "partidos")}, <N>{a.wins}</N>{" "}
                    {plural(a.wins, "ganado", "ganados")} (<N>{fmt.pct(a.winPercentage)}</N>).{" "}
                    <N>{a.goals}</N> {plural(a.goals, "gol", "goles")} y <N>{a.assists}</N>{" "}
                    {plural(a.assists, "asistencia", "asistencias")}
                    {a.ratingAverage !== null ? (
                      <>
                        , calificación promedio <N>{fmt.rating(a.ratingAverage)}</N>
                      </>
                    ) : null}
                    .
                  </p>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {pending.length > 0 ? (
        <section className="flex flex-col gap-3" aria-labelledby="relato-pending">
          <h2 id="relato-pending" className="text-base font-semibold">
            Todavía no suman
          </h2>
          <ul className="flex flex-col">
            {pending.map((group) => {
              const state = groupState(group);
              return (
                <li
                  key={group.groupName}
                  className="flex min-h-11 flex-col justify-center gap-0.5 border-t py-2.5"
                >
                  <span className="truncate text-sm font-medium">{group.groupName}</span>
                  <span className="text-xs text-muted-foreground">
                    {state === "unlinked"
                      ? `${GROUP_HINT.unlinked} Pedile al responsable que te vincule.`
                      : GROUP_HINT["no-matches"]}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
