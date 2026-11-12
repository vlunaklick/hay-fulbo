"use client";

import { Badge } from "@hay-fulbo/ui/components/badge";
import { Button } from "@hay-fulbo/ui/components/button";
import { Card } from "@hay-fulbo/ui/components/card";
import { cn } from "@hay-fulbo/ui/lib/utils";
import { MinusIcon, PlusIcon } from "lucide-react";
import { useState } from "react";

import { formatMoney } from "@/lib/format";

import { contributions, lineup, match, paidCount } from "./data";

// Small, real-looking pieces of the product, shared by the landing variants.

type Team = "blue" | "amber";
const teamName = { blue: "Azul", amber: "Naranja" } as const;

export function TeamDot({ team }: { team: Team }) {
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

function TeamChip({ team }: { team: Team }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-xs font-semibold",
        team === "blue" ? "bg-team-blue text-team-blue-ink" : "bg-team-amber text-team-amber-ink",
      )}
    >
      {teamName[team]}
    </span>
  );
}

/** A closed match reduced to what matters: who won and who still owes. */
export function ScoreCard() {
  const pending = match.players - paidCount;
  return (
    <Card className="gap-0 py-0">
      <div className="flex items-center justify-between gap-3 px-4 pt-4 text-xs text-muted-foreground">
        <span>{match.date}</span>
        <Badge variant="outline">Cerrado</Badge>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-6">
        {(["blue", "amber"] as const).map((team, i) => (
          <div key={team} className={cn("flex flex-col items-center gap-2", i === 1 && "order-3")}>
            <TeamChip team={team} />
            <span className="text-7xl font-black tabular-nums">{match[team].score}</span>
          </div>
        ))}
        <span className="order-2 text-2xl font-bold text-muted-foreground" aria-hidden="true">
          –
        </span>
      </div>
      <div className="flex items-center justify-between gap-3 border-t px-4 py-3 text-sm">
        <span>
          <span className="font-semibold tabular-nums">{formatMoney(match.shareMinor)}</span>{" "}
          <span className="text-muted-foreground">c/u</span>
        </span>
        <Badge variant="destructive">Faltan {pending}</Badge>
      </div>
    </Card>
  );
}

export function LineupSnippet() {
  return (
    <Card size="sm" className="grid grid-cols-2 gap-x-3 gap-y-0 px-3">
      {(["blue", "amber"] as const).map((team) => (
        <ul key={team} className="flex min-w-0 flex-col">
          <li className="flex items-center gap-2 pb-2 text-xs font-medium text-muted-foreground">
            <TeamDot team={team} />
            {teamName[team]} · {lineup[team].length}
          </li>
          {lineup[team].slice(0, 5).map((name) => (
            <li key={name} className="truncate border-t py-2 text-sm">
              {name}
            </li>
          ))}
        </ul>
      ))}
    </Card>
  );
}

export function LiveScore() {
  const [score, setScore] = useState({ blue: 3, amber: 2 });
  const bump = (team: Team, delta: number) =>
    setScore((s) => ({ ...s, [team]: Math.max(0, s[team] + delta) }));

  return (
    <Card className="gap-3 px-4">
      {(["blue", "amber"] as const).map((team) => (
        <div key={team} className="flex items-center gap-3">
          <TeamDot team={team} />
          <span className="flex-1 text-sm font-semibold">{teamName[team]}</span>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Restar gol a ${teamName[team]}`}
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
            aria-label={`Sumar gol a ${teamName[team]}`}
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
  pendiente: { variant: "destructive", label: "Debe" },
} as const;

export function MoneySnippet() {
  return (
    <Card size="sm" className="gap-0 py-0">
      {contributions.map((c) => (
        <div key={c.name} className="flex min-h-11 items-center gap-3 px-3 py-2 not-first:border-t">
          <span className="min-w-0 flex-1 truncate text-sm">{c.name}</span>
          <Badge variant={stateBadge[c.state].variant}>{stateBadge[c.state].label}</Badge>
        </div>
      ))}
    </Card>
  );
}
