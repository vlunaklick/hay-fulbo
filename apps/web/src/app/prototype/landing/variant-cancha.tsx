"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from "@hay-fulbo/ui/components/avatar";
import { Badge } from "@hay-fulbo/ui/components/badge";
import { Card } from "@hay-fulbo/ui/components/card";

import { formatMoney } from "@/lib/format";

import { Brand, PrimaryCta, SignInLink } from "./cta";
import { contributions, lineup, match, paidCount, scorers } from "./data";
import { Footer, MatchCard, TeamDot, initials } from "./snippets";

// Cancha — depth from the setting. The result sits on the center spot of a
// pitch drawn in chalk; below, the three things the card summarizes.

function PitchLines() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-3 select-none border border-foreground/10 sm:inset-6"
    >
      {/* Halfway line: horizontal on a phone (vertical pitch), vertical on desktop. */}
      <div className="absolute inset-x-0 top-1/2 h-px bg-foreground/10 md:inset-x-auto md:inset-y-0 md:top-0 md:left-1/2 md:h-auto md:w-px" />
      <div className="absolute top-1/2 left-1/2 size-56 -translate-1/2 rounded-full border border-foreground/10 md:size-80" />
      {/* Penalty areas. */}
      <div className="absolute top-0 left-1/2 h-16 w-2/3 -translate-x-1/2 border-x border-b border-foreground/10 md:top-1/2 md:left-0 md:h-1/2 md:w-28 md:-translate-x-0 md:-translate-y-1/2 md:border-x-0 md:border-y md:border-r" />
      <div className="absolute bottom-0 left-1/2 h-16 w-2/3 -translate-x-1/2 border-x border-t border-foreground/10 md:top-1/2 md:right-0 md:bottom-auto md:left-auto md:h-1/2 md:w-28 md:translate-x-0 md:-translate-y-1/2 md:border-x-0 md:border-y md:border-l" />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function CanchaVariant() {
  const pending = contributions.filter((c) => c.state !== "pagado");
  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
        <Brand />
        <SignInLink />
      </header>

      <section className="px-4 pt-6 sm:px-6">
        <div className="relative mx-auto flex max-w-5xl flex-col items-center gap-8 overflow-hidden rounded-xl bg-card px-6 py-12 text-center ring-1 ring-foreground/10 md:py-16">
          <PitchLines />
          <div className="relative flex flex-col items-center gap-3">
            <h1 className="text-5xl font-bold tracking-tight text-balance sm:text-6xl">
              El partido, en orden.
            </h1>
            <p className="text-base text-muted-foreground">Equipos, resultado y plata del grupo.</p>
          </div>
          <MatchCard
            className="relative w-full max-w-sm bg-background text-left shadow-xl"
            status="Cerrado"
            blue={match.blue.score}
            amber={match.amber.score}
            footer={
              <>
                <span>
                  <span className="font-semibold tabular-nums">
                    {formatMoney(match.shareMinor)}
                  </span>{" "}
                  <span className="text-muted-foreground">c/u</span>
                </span>
                <Badge variant="destructive">Faltan {match.players - paidCount}</Badge>
              </>
            }
          />
          <PrimaryCta className="relative w-full sm:w-fit" />
        </div>
      </section>

      <main className="mx-auto grid w-full max-w-5xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-3 md:gap-6">
        <Section title="Equipos">
          <Card size="sm" className="gap-3 px-3">
            {(["blue", "amber"] as const).map((team) => (
              <div key={team} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <TeamDot team={team} />
                  {team === "blue" ? "Azul" : "Naranja"}
                </span>
                <AvatarGroup className="-space-x-1.5">
                  {lineup[team].slice(0, 4).map((name) => (
                    <Avatar key={name}>
                      <AvatarFallback className="text-xs">
                        {initials(name).slice(0, 1)}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  <AvatarGroupCount>+{lineup[team].length - 4}</AvatarGroupCount>
                </AvatarGroup>
              </div>
            ))}
          </Card>
        </Section>

        <Section title="Goleadores">
          <Card size="sm" className="gap-0 py-0">
            {scorers.slice(0, 3).map((s) => (
              <div
                key={s.name}
                className="flex min-h-11 items-center gap-2 px-3 not-first:border-t"
              >
                <TeamDot team={s.team} />
                <span className="min-w-0 flex-1 truncate text-sm">{s.name}</span>
                <span className="text-sm font-semibold tabular-nums">{s.goals}</span>
              </div>
            ))}
          </Card>
        </Section>

        <Section title="Aportes">
          <Card size="sm" className="gap-0 py-0">
            {pending.map((c) => (
              <div
                key={c.name}
                className="flex min-h-11 items-center gap-2 px-3 not-first:border-t"
              >
                <span className="min-w-0 flex-1 truncate text-sm">{c.name}</span>
                <span className="text-xs text-destructive tabular-nums">
                  debe {formatMoney(match.shareMinor - c.paidMinor)}
                </span>
              </div>
            ))}
          </Card>
        </Section>
      </main>

      <Footer />
    </div>
  );
}
