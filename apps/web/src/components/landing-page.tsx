import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from "@hay-fulbo/ui/components/avatar";
import { Badge } from "@hay-fulbo/ui/components/badge";
import { buttonVariants } from "@hay-fulbo/ui/components/button";
import { Card } from "@hay-fulbo/ui/components/card";
import { cn } from "@hay-fulbo/ui/lib/utils";
import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { LogoMark } from "@/components/logo-mark";
import { formatMoney } from "@/lib/format";

/**
 * Signed-out home. One closed match, drawn on a chalk pitch, explains the
 * product; below it, the three things that match card summarizes.
 * Decided in docs/prototypes/landing.md.
 */

type Team = "blue" | "amber";

const teamName: Record<Team, string> = { blue: "Azul", amber: "Naranja" };

// Example fecha shown on the page. Amounts are in minor units, like the API.
const example = {
  date: "Jueves 14/11 · 21:00",
  score: { blue: 7, amber: 5 },
  shareMinor: 450_000,
  lineup: {
    blue: ["Juan Ignacio", "Tomi", "Mati", "Gonza", "Lucas", "Seba"],
    amber: ["Facu", "Nico", "Pablo", "Leo", "Martín", "Fran"],
  } satisfies Record<Team, string[]>,
  scorers: [
    { name: "Juan Ignacio Fernández", team: "blue", goals: 3 },
    { name: "Tomi Bustos", team: "blue", goals: 2 },
    { name: "Facu Rinaldi", team: "amber", goals: 2 },
  ] satisfies { name: string; team: Team; goals: number }[],
  owing: [
    { name: "Nico Kowalczyk", owedMinor: 250_000 },
    { name: "Leo Saravia", owedMinor: 450_000 },
    { name: "Fran Ocampo", owedMinor: 450_000 },
  ],
};

const visibleAvatars = 4;

function TeamDot({ team }: { team: Team }) {
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

function TeamScore({ team }: { team: Team }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span
        className={cn(
          "rounded-full px-2.5 py-0.5 text-xs font-semibold",
          team === "blue" ? "bg-team-blue text-team-blue-ink" : "bg-team-amber text-team-amber-ink",
        )}
      >
        {teamName[team]}
      </span>
      <span className="text-7xl font-black tabular-nums">{example.score[team]}</span>
    </div>
  );
}

/** Chalk markings: a vertical pitch on a phone, a horizontal one from md up. */
function PitchLines() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-3 border border-foreground/10 select-none sm:inset-6"
    >
      <div className="absolute inset-x-0 top-1/2 h-px bg-foreground/10 md:inset-x-auto md:inset-y-0 md:top-0 md:left-1/2 md:h-auto md:w-px" />
      <div className="absolute top-1/2 left-1/2 size-56 -translate-1/2 rounded-full border border-foreground/10 md:size-80" />
      <div className="absolute top-0 left-1/2 h-16 w-2/3 -translate-x-1/2 border-x border-b border-foreground/10 md:top-1/2 md:left-0 md:h-1/2 md:w-28 md:translate-x-0 md:-translate-y-1/2 md:border-x-0 md:border-y md:border-r" />
      <div className="absolute bottom-0 left-1/2 h-16 w-2/3 -translate-x-1/2 border-x border-t border-foreground/10 md:top-1/2 md:right-0 md:bottom-auto md:left-auto md:h-1/2 md:w-28 md:translate-x-0 md:-translate-y-1/2 md:border-x-0 md:border-y md:border-l" />
    </div>
  );
}

function ResultCard() {
  return (
    <Card className="relative w-full max-w-sm gap-0 bg-background py-0 text-left">
      <div className="flex items-center justify-between gap-3 px-4 pt-4 text-xs text-muted-foreground">
        <span>{example.date}</span>
        <Badge variant="outline">Cerrado</Badge>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-6">
        <TeamScore team="blue" />
        <span className="text-2xl font-bold text-muted-foreground" aria-hidden="true">
          –
        </span>
        <TeamScore team="amber" />
      </div>
      <div className="flex items-center justify-between gap-3 border-t px-4 py-3 text-sm">
        <span>
          <span className="font-semibold tabular-nums">{formatMoney(example.shareMinor)}</span>{" "}
          <span className="text-muted-foreground">c/u</span>
        </span>
        <Badge variant="destructive">Faltan {example.owing.length}</Badge>
      </div>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
        <Link
          href="/"
          className="-mx-2 flex h-11 items-center gap-2.5 rounded-md px-2 outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <LogoMark className="size-7" />
          <span className="text-base font-semibold tracking-tight">Hay Fulbo</span>
        </Link>
        <Link href="/login" className={buttonVariants({ variant: "ghost" })}>
          Ingresar
        </Link>
      </header>

      <main>
        <div className="px-4 pt-6 sm:px-6">
          <div className="relative mx-auto flex max-w-5xl flex-col items-center gap-8 overflow-hidden rounded-xl bg-card px-6 py-12 text-center ring-1 ring-foreground/10 md:py-16">
            <PitchLines />
            <div className="relative flex flex-col items-center gap-3">
              <h1 className="text-5xl font-bold tracking-tight text-balance sm:text-6xl">
                El partido, en orden.
              </h1>
              <p className="text-base text-muted-foreground">
                Equipos, resultado y plata del grupo.
              </p>
            </div>
            <ResultCard />
            <Link
              href="/login"
              className={buttonVariants({ size: "lg", className: "relative w-full sm:w-fit" })}
            >
              Armar mi grupo
              <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className="mx-auto grid w-full max-w-5xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-3 md:gap-6">
          <Section title="Equipos">
            <Card size="sm" className="gap-3 px-3">
              {(["blue", "amber"] as const).map((team) => (
                <div key={team} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <TeamDot team={team} />
                    {teamName[team]}
                  </span>
                  <AvatarGroup className="-space-x-1.5" aria-hidden="true">
                    {example.lineup[team].slice(0, visibleAvatars).map((name) => (
                      <Avatar key={name}>
                        <AvatarFallback className="text-xs">{name[0]}</AvatarFallback>
                      </Avatar>
                    ))}
                    <AvatarGroupCount>
                      +{example.lineup[team].length - visibleAvatars}
                    </AvatarGroupCount>
                  </AvatarGroup>
                  <span className="sr-only">{example.lineup[team].join(", ")}</span>
                </div>
              ))}
            </Card>
          </Section>

          <Section title="Goleadores">
            <Card size="sm" className="gap-0 py-0">
              {example.scorers.map((scorer) => (
                <div
                  key={scorer.name}
                  className="flex min-h-11 items-center gap-2 px-3 not-first:border-t"
                >
                  <TeamDot team={scorer.team} />
                  <span className="min-w-0 flex-1 truncate text-sm">{scorer.name}</span>
                  <span className="text-sm font-semibold tabular-nums">{scorer.goals}</span>
                </div>
              ))}
            </Card>
          </Section>

          <Section title="Aportes">
            <Card size="sm" className="gap-0 py-0">
              {example.owing.map((player) => (
                <div
                  key={player.name}
                  className="flex min-h-11 items-center gap-2 px-3 not-first:border-t"
                >
                  <span className="min-w-0 flex-1 truncate text-sm">{player.name}</span>
                  <span className="text-xs text-destructive tabular-nums">
                    debe {formatMoney(player.owedMinor)}
                  </span>
                </div>
              ))}
            </Card>
          </Section>
        </div>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-sm text-muted-foreground sm:px-6">
          <span>Hay Fulbo</span>
          <span>Hecho para el fulbo de todas las semanas</span>
        </div>
      </footer>
    </div>
  );
}
