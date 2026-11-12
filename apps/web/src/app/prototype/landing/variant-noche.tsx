"use client";

import { Badge } from "@hay-fulbo/ui/components/badge";
import { cn } from "@hay-fulbo/ui/lib/utils";
import { useState } from "react";

import { formatMoney } from "@/lib/format";

import { Brand, PrimaryCta, SignInLink } from "./cta";
import { match, paidCount } from "./data";
import { Footer, MatchCard } from "./snippets";

// La noche — depth from time. The night of a match is a short timeline;
// tapping a moment sets the result card to that moment.

type Moment = {
  time: string;
  title: string;
  status: string;
  statusVariant: "outline" | "secondary" | "success";
  blue: number | null;
  amber: number | null;
  footer: React.ReactNode;
};

const share = formatMoney(match.shareMinor);

const moments: Moment[] = [
  {
    time: "Lunes",
    title: "Convocatoria",
    status: "Abierto",
    statusVariant: "outline",
    blue: null,
    amber: null,
    footer: (
      <>
        <span className="text-muted-foreground">Confirmados</span>
        <span className="font-semibold tabular-nums">{match.players} de 12</span>
      </>
    ),
  },
  {
    time: "21:30",
    title: "En juego",
    status: "En juego",
    statusVariant: "secondary",
    blue: 3,
    amber: 2,
    footer: (
      <>
        <span className="text-muted-foreground">Último gol</span>
        <span className="font-semibold">Tomi Bustos</span>
      </>
    ),
  },
  {
    time: "22:00",
    title: "Final",
    status: "Final",
    statusVariant: "secondary",
    blue: match.blue.score,
    amber: match.amber.score,
    footer: (
      <>
        <span className="text-muted-foreground">Figura</span>
        <span className="font-semibold">Juan Ignacio, 3 goles</span>
      </>
    ),
  },
  {
    time: "22:15",
    title: "Cerrado",
    status: "Cerrado",
    statusVariant: "outline",
    blue: match.blue.score,
    amber: match.amber.score,
    footer: (
      <>
        <span>
          <span className="font-semibold tabular-nums">{share}</span>{" "}
          <span className="text-muted-foreground">c/u</span>
        </span>
        <Badge variant="destructive">Faltan {match.players - paidCount}</Badge>
      </>
    ),
  },
];

export function NocheVariant() {
  const [active, setActive] = useState(moments.length - 1);
  const moment = moments[active]!;

  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
        <Brand />
        <SignInLink />
      </header>

      <main className="mx-auto grid w-full max-w-5xl gap-8 px-4 pt-10 pb-20 sm:px-6 md:min-h-[calc(100svh-5rem)] md:grid-cols-[1fr_minmax(0,24rem)] md:items-center md:gap-x-16 md:pt-0">
        <div className="flex flex-col gap-6 md:col-start-1 md:row-start-1">
          <h1 className="text-5xl font-bold tracking-tight text-balance sm:text-6xl">
            El partido, en orden.
          </h1>
          <p className="text-base text-muted-foreground">De la convocatoria a la plata.</p>
          <PrimaryCta className="hidden w-fit md:inline-flex" />
        </div>

        <div className="flex flex-col gap-4 md:col-start-2 md:row-span-2 md:row-start-1">
          <MatchCard
            status={moment.status}
            statusVariant={moment.statusVariant}
            blue={moment.blue}
            amber={moment.amber}
            footer={moment.footer}
          />

          {/* The night, as a track of tappable moments. */}
          <ol className="relative grid grid-cols-4" aria-label="La noche del partido">
            <span
              aria-hidden="true"
              className="absolute top-[1.375rem] right-[12.5%] left-[12.5%] h-px bg-border"
            />
            <span
              aria-hidden="true"
              className="absolute top-[1.375rem] left-[12.5%] h-px bg-primary transition-[width] duration-200 ease-out"
              style={{ width: `${(active / (moments.length - 1)) * 75}%` }}
            />
            {moments.map((m, i) => (
              <li key={m.title} className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setActive(i)}
                  aria-pressed={i === active}
                  className="group flex min-h-11 flex-col items-center gap-1.5 rounded-md px-1 pt-4 outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  <span
                    className={cn(
                      "relative size-3 rounded-full border-2 border-background ring-1 transition-colors",
                      i <= active ? "bg-primary ring-primary" : "bg-muted ring-border",
                    )}
                  />
                  <span
                    className={cn(
                      "text-xs font-medium",
                      i === active ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {m.title}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">{m.time}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>

        <PrimaryCta className="w-full md:hidden" />
      </main>

      <Footer />
    </div>
  );
}
