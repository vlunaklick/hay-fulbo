"use client";

import { Badge } from "@hay-fulbo/ui/components/badge";
import { Button } from "@hay-fulbo/ui/components/button";
import { Card } from "@hay-fulbo/ui/components/card";
import { Progress } from "@hay-fulbo/ui/components/progress";
import { cn } from "@hay-fulbo/ui/lib/utils";
import { MapPinIcon, MinusIcon, PlusIcon } from "lucide-react";
import { useState } from "react";

import { formatMoney } from "@/lib/format";

import { Brand, PrimaryCta, SignInLink } from "./cta";
import { contributions, group, lineup, match, paidCount, scorers } from "./data";

// La fecha — product-led. The hero is a real closed match; the page then walks
// one fecha from lineup to live score to settled money, each with real UI.

function TeamDot({ team }: { team: "blue" | "amber" }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "size-2 shrink-0 rounded-full",
        team === "blue" ? "bg-team-blue" : "bg-team-amber",
      )}
    />
  );
}

function ResultCard() {
  const pending = match.players - paidCount;
  return (
    <Card className="gap-0 py-0">
      <div className="flex flex-col gap-1 px-4 pt-4">
        <div className="flex items-center justify-between gap-3">
          <span className="truncate text-xs font-medium text-muted-foreground">{group}</span>
          <Badge variant="outline">Cerrado</Badge>
        </div>
        <p className="text-sm font-semibold">{match.date}</p>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPinIcon className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{match.venue}</span>
        </p>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-6">
        <div className="flex flex-col items-center gap-2">
          <span className="rounded-full bg-team-blue px-2.5 py-0.5 text-xs font-semibold text-team-blue-ink">
            {match.blue.name}
          </span>
          <span className="text-6xl font-black tabular-nums">{match.blue.score}</span>
        </div>
        <span className="text-2xl font-bold text-muted-foreground" aria-hidden="true">
          –
        </span>
        <div className="flex flex-col items-center gap-2">
          <span className="rounded-full bg-team-amber px-2.5 py-0.5 text-xs font-semibold text-team-amber-ink">
            {match.amber.name}
          </span>
          <span className="text-6xl font-black tabular-nums">{match.amber.score}</span>
        </div>
      </div>

      <ul className="flex flex-col gap-1.5 border-t px-4 py-3">
        {scorers.map((s) => (
          <li key={s.name} className="flex items-center gap-2 text-sm">
            <TeamDot team={s.team} />
            <span className="min-w-0 flex-1 truncate">{s.name}</span>
            <span className="text-muted-foreground tabular-nums">{s.goals} goles</span>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-2 border-t bg-muted/40 px-4 py-3">
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span>
            <span className="font-semibold tabular-nums">{formatMoney(match.shareMinor)}</span>{" "}
            <span className="text-muted-foreground">por jugador</span>
          </span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {paidCount} de {match.players} pagaron
          </span>
        </div>
        <Progress value={(paidCount / match.players) * 100} aria-label="Aportes pagados" />
        <p className="text-xs font-medium text-destructive">Faltan {pending} aportes</p>
      </div>
    </Card>
  );
}

function Step({
  n,
  title,
  text,
  children,
  flip = false,
}: {
  n: number;
  title: string;
  text: string;
  children: React.ReactNode;
  flip?: boolean;
}) {
  return (
    <section className="grid items-center gap-6 md:grid-cols-2 md:gap-12">
      <div className={cn("flex flex-col gap-2", flip && "md:order-2")}>
        <span className="text-sm font-semibold text-muted-foreground tabular-nums">Paso {n}</span>
        <h2 className="text-2xl font-bold tracking-tight text-balance">{title}</h2>
        <p className="max-w-sm text-base leading-relaxed text-muted-foreground text-pretty">
          {text}
        </p>
      </div>
      {children}
    </section>
  );
}

function LineupSnippet() {
  return (
    <Card size="sm" className="grid grid-cols-2 gap-x-3 gap-y-0 px-3">
      {(["blue", "amber"] as const).map((team) => (
        <ul key={team} className="flex min-w-0 flex-col">
          <li className="flex items-center gap-2 pb-2 text-xs font-medium text-muted-foreground">
            <TeamDot team={team} />
            {team === "blue" ? "Azul" : "Naranja"} · 6
          </li>
          {lineup[team].map((name) => (
            <li key={name} className="truncate border-t py-2 text-sm">
              {name}
            </li>
          ))}
        </ul>
      ))}
    </Card>
  );
}

function LiveScore() {
  const [score, setScore] = useState({ blue: 3, amber: 2 });
  const bump = (team: "blue" | "amber", delta: number) =>
    setScore((s) => ({ ...s, [team]: Math.max(0, s[team] + delta) }));

  return (
    <Card className="gap-3 px-4">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-muted-foreground">Probalo: sumá un gol</span>
        <Badge variant="secondary">En juego</Badge>
      </div>
      {(["blue", "amber"] as const).map((team) => (
        <div key={team} className="flex items-center gap-3">
          <TeamDot team={team} />
          <span className="flex-1 text-sm font-semibold">
            {team === "blue" ? "Azul" : "Naranja"}
          </span>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Restar gol a ${team === "blue" ? "Azul" : "Naranja"}`}
            onClick={() => bump(team, -1)}
            disabled={score[team] === 0}
          >
            <MinusIcon />
          </Button>
          <span className="w-10 text-center text-4xl font-black tabular-nums" aria-live="polite">
            {score[team]}
          </span>
          <Button
            variant={team === "blue" ? "team-blue" : "team-amber"}
            size="icon"
            aria-label={`Sumar gol a ${team === "blue" ? "Azul" : "Naranja"}`}
            onClick={() => bump(team, 1)}
          >
            <PlusIcon />
          </Button>
        </div>
      ))}
    </Card>
  );
}

const stateBadge = {
  pagado: { variant: "success", label: "Pagado" },
  parcial: { variant: "secondary", label: "Parcial" },
  pendiente: { variant: "destructive", label: "Pendiente" },
} as const;

function MoneySnippet() {
  return (
    <Card size="sm" className="gap-0 py-0">
      {contributions.map((c) => (
        <div key={c.name} className="flex min-h-11 items-center gap-3 px-3 py-2 not-first:border-t">
          <span className="min-w-0 flex-1 truncate text-sm">{c.name}</span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatMoney(c.paidMinor)} / {formatMoney(match.shareMinor)}
          </span>
          <Badge variant={stateBadge[c.state].variant}>{stateBadge[c.state].label}</Badge>
        </div>
      ))}
    </Card>
  );
}

export function FechaVariant() {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
        <Brand />
        <SignInLink />
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-20 px-4 pt-8 pb-32 sm:px-6 md:gap-28 md:pt-16">
        <section className="grid items-center gap-8 md:grid-cols-[1fr_minmax(0,24rem)] md:gap-16">
          <div className="flex flex-col gap-6">
            <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
              Del “¿quién viene?” al “¿quién debe?”, en la misma fecha.
            </h1>
            <p className="max-w-md text-base leading-relaxed text-muted-foreground text-pretty">
              Hay Fulbo guarda cada partido del grupo: equipos, resultado, goleadores y lo que puso
              cada uno.
            </p>
            <PrimaryCta className="w-full sm:w-fit" />
          </div>
          <ResultCard />
        </section>

        <Step
          n={1}
          title="Armá los equipos"
          text="Confirmás quién viene y repartís en Azul y Naranja. El costo de la cancha se divide entre los que juegan."
        >
          <LineupSnippet />
        </Step>

        <Step
          n={2}
          title="Cargá el partido en vivo"
          text="Un gol, un toque. Podés designar a alguien para que anote mientras vos jugás."
          flip
        >
          <LiveScore />
        </Step>

        <Step
          n={3}
          title="Cerrá y que nadie discuta"
          text="Al cerrar, el resultado cuenta para las estadísticas y cada aporte queda a la vista: pagado, parcial o pendiente."
        >
          <MoneySnippet />
        </Step>

        <section className="flex flex-col items-start gap-4 border-t pt-10 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold tracking-tight">
              El resto del grupo no necesita cuenta.
            </h2>
            <p className="text-sm text-muted-foreground">
              Comparten un enlace privado y ven partidos, deudas y ranking.
            </p>
          </div>
          <PrimaryCta size="default" className="w-full sm:w-fit" />
        </section>
      </main>
    </div>
  );
}
