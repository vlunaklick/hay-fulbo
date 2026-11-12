"use client";

import { Avatar, AvatarFallback } from "@hay-fulbo/ui/components/avatar";
import { cn } from "@hay-fulbo/ui/lib/utils";

import { initials } from "@/lib/initials";

import type { Outcome, ViewHistoryItem, ViewMatch, ViewRankingRow } from "./data";

// ── Dates in the group's time zone ───────────────────────────────────────────

function format(value: Date | string, timeZone: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("es-AR", { timeZone, ...options }).format(new Date(value));
}

export const when = {
  day: (value: Date | string, tz: string) =>
    format(value, tz, { weekday: "short", day: "numeric", month: "short" }).replace(",", ""),
  weekdayShort: (value: Date | string, tz: string) =>
    format(value, tz, { weekday: "short" }).replace(".", ""),
  dayNumber: (value: Date | string, tz: string) => format(value, tz, { day: "numeric" }),
  month: (value: Date | string, tz: string) =>
    format(value, tz, { month: "short" }).replace(".", ""),
  monthYear: (value: Date | string, tz: string) =>
    format(value, tz, { month: "long", year: "numeric" }),
  long: (value: Date | string, tz: string) =>
    format(value, tz, { weekday: "long", day: "numeric", month: "long" }),
  time: (value: Date | string, tz: string) =>
    format(value, tz, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }),
  /** "hoy", "mañana", "en 6 días", counted in calendar days of the group's zone. */
  relative(value: Date | string, tz: string) {
    // en-CA formats as YYYY-MM-DD, which Date.parse reads as a UTC calendar day.
    const day = (date: Date | string) =>
      Date.parse(new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date(date)));
    const days = Math.round((day(value) - day(new Date())) / 86_400_000);
    if (days === 0) return "hoy";
    if (days === 1) return "mañana";
    if (days > 1) return `en ${days} días`;
    if (days === -1) return "ayer";
    return `hace ${-days} días`;
  },
};

export function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

// ── Match derivations ────────────────────────────────────────────────────────

export function winnerSlot(match: { teams: readonly { slot: number; goals: number }[] }) {
  const [left, right] = match.teams;
  if (!left || !right || left.goals === right.goals) return null;
  return left.goals > right.goals ? left.slot : right.slot;
}

export function resultLabel(match: ViewHistoryItem | ViewMatch) {
  if (match.status === "cancelled") return "Cancelado";
  if (match.status === "open") return "Por jugarse";
  const slot = winnerSlot(match);
  if (slot === null) return "Empate";
  return `Ganó ${match.teams.find((team) => team.slot === slot)?.displayName ?? ""}`;
}

export function scorers(match: ViewMatch, teamId: string) {
  return match.appearances
    .filter((appearance) => appearance.teamId === teamId && appearance.goals > 0)
    .sort((a, b) => b.goals - a.goals)
    .map((appearance) =>
      appearance.goals > 1
        ? `${appearance.playerDisplayName} ×${appearance.goals}`
        : appearance.playerDisplayName,
    );
}

export function contributionLine(stats: { goals: number; assists: number }) {
  return [stats.goals ? `${stats.goals} G` : null, stats.assists ? `${stats.assists} A` : null]
    .filter(Boolean)
    .join(" · ");
}

export type RankingMetric = "contributions" | "goals" | "assists";

export function sortRanking(ranking: readonly ViewRankingRow[], metric: RankingMetric) {
  return [...ranking].sort(
    (a, b) =>
      b[metric] - a[metric] ||
      b.contributions - a.contributions ||
      a.displayName.localeCompare(b.displayName, "es"),
  );
}

export function groupByMonth<T extends { scheduledAt: Date | string }>(items: T[], tz: string) {
  const groups: { label: string; items: T[] }[] = [];
  for (const item of items) {
    const label = when.monthYear(item.scheduledAt, tz);
    const last = groups.at(-1);
    if (last?.label === label) last.items.push(item);
    else groups.push({ label, items: [item] });
  }
  return groups;
}

// ── Atoms ────────────────────────────────────────────────────────────────────

export const rowAction =
  "transition-colors duration-150 ease-out hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

export function TeamDot({ slot, className }: { slot: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block size-2 shrink-0 rounded-full",
        slot === 1 ? "bg-team-blue" : "bg-team-amber",
        className,
      )}
    />
  );
}

export function TeamChip({
  slot,
  children,
  className,
}: {
  slot: number;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "w-fit max-w-full truncate rounded-full px-2.5 py-0.5 text-xs font-semibold",
        slot === 1 ? "bg-team-blue text-team-blue-ink" : "bg-team-amber text-team-amber-ink",
        className,
      )}
    >
      {children}
    </span>
  );
}

const outcomeLetter: Record<Outcome, string> = { win: "G", draw: "E", loss: "P" };
const outcomeWord: Record<Outcome, string> = { win: "ganó", draw: "empató", loss: "perdió" };

/** Results as G/E/P squares, oldest → newest. Letter and color, never color alone. */
export function FormGuide({ outcomes, className }: { outcomes: Outcome[]; className?: string }) {
  if (outcomes.length === 0) return null;
  return (
    <ol
      aria-label={
        outcomes.length === 1
          ? `Resultado: ${outcomeWord[outcomes[0]!]}`
          : `Últimos ${outcomes.length}: ${outcomes.map((o) => outcomeWord[o]).join(", ")}`
      }
      className={cn("flex gap-1", className)}
    >
      {outcomes.map((outcome, index) => (
        <li
          aria-hidden="true"
          className={cn(
            "grid size-6 place-items-center rounded-xs text-xs font-semibold",
            outcome === "win" && "bg-success/15 text-success",
            outcome === "draw" && "bg-muted text-muted-foreground",
            outcome === "loss" && "bg-destructive/15 text-destructive",
          )}
          key={index}
        >
          {outcomeLetter[outcome]}
        </li>
      ))}
    </ol>
  );
}

export function PlayerAvatar({ name, className }: { name: string; className?: string }) {
  return (
    <Avatar className={className}>
      <AvatarFallback>{initials(name)}</AvatarFallback>
    </Avatar>
  );
}
