"use client";

import { Card } from "@hay-fulbo/ui/components/card";
import { LinkIcon } from "lucide-react";

import { formatMoney } from "@/lib/format";

import { Brand, PrimaryCta, SignInLink } from "./cta";
import { match } from "./data";

// La puerta — utility. The landing is the door: one screen, one decision,
// the whole product summarized as three rows of a planilla.

const rows = [
  {
    verb: "Armá",
    text: "Convocá, confirmá quién viene y repartí los equipos.",
    value: `${match.players} confirmados`,
  },
  {
    verb: "Cargá",
    text: "Goles y asistencias mientras se juega, desde el celular.",
    value: `${match.blue.score} – ${match.amber.score}`,
  },
  {
    verb: "Cerrá",
    text: "El costo se divide solo y queda claro quién debe.",
    value: `${formatMoney(match.shareMinor)} c/u`,
  },
];

export function PuertaVariant() {
  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
        <Brand />
        <SignInLink />
      </header>

      <main className="mx-auto grid w-full max-w-5xl flex-1 content-start gap-10 px-4 pt-10 pb-28 sm:px-6 md:grid-cols-[1fr_minmax(0,26rem)] md:content-center md:items-center md:gap-16 md:pt-0">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
              Cada fecha, anotada y pagada.
            </h1>
            <p className="max-w-md text-base leading-relaxed text-muted-foreground text-pretty">
              Equipos, goles y aportes del grupo en un solo lugar. Lo carga uno, lo ven todos.
            </p>
          </div>
          <PrimaryCta className="w-full sm:w-fit" />
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <LinkIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>¿Te pasaron el enlace del grupo? Abrilo tal cual: se ve sin crear cuenta.</span>
          </p>
        </div>

        <Card className="gap-0 py-0">
          <ol>
            {rows.map((row, index) => (
              <li
                key={row.verb}
                className="grid grid-cols-[1fr_auto] items-baseline gap-x-4 gap-y-1 px-4 py-4 not-first:border-t"
              >
                <span className="flex items-baseline gap-2">
                  <span className="text-xs font-medium text-muted-foreground tabular-nums">
                    {index + 1}
                  </span>
                  <span className="text-lg font-bold">{row.verb}</span>
                </span>
                <span className="text-sm font-semibold tabular-nums">{row.value}</span>
                <span className="col-span-2 pl-4 text-sm text-muted-foreground">{row.text}</span>
              </li>
            ))}
          </ol>
        </Card>
      </main>
    </div>
  );
}
