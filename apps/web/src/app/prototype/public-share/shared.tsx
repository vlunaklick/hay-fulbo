"use client";

// PROTOTYPE ONLY — shared data hooks and atoms for /prototype/public-share.
// Every variant reads the real public API for one group; nothing here is mocked.

import { Avatar, AvatarFallback } from "@hay-fulbo/ui/components/avatar";
import { Badge } from "@hay-fulbo/ui/components/badge";
import { Skeleton } from "@hay-fulbo/ui/components/skeleton";
import { cn } from "@hay-fulbo/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { GlobeIcon, LockKeyholeIcon } from "lucide-react";
import { createContext, use } from "react";

import { initials } from "@/lib/initials";
import { trpcHttpClient } from "@/utils/trpc";

export type Dashboard = Awaited<ReturnType<typeof trpcHttpClient.public.dashboard.query>>;
export type MatchDetail = Awaited<ReturnType<typeof trpcHttpClient.public.match.query>>;
export type PlayerStats = Awaited<ReturnType<typeof trpcHttpClient.public.player.query>>;
export type RankingRow = Dashboard["ranking"][number];
export type HistoryItem = Dashboard["history"][number];
export type Outcome = "win" | "draw" | "loss";

export type Detail = { kind: "partido" | "jugador"; id: string } | null;

type ProtoContext = {
  slug: string;
  /** `/compartido` (privado) shows money; `/g/[slug]` (público) never does. */
  privateLink: boolean;
  detail: Detail;
  open: (kind: "partido" | "jugador", id: string) => void;
  close: () => void;
  param: (key: string) => string | null;
  setParam: (key: string, value: string | null) => void;
};

export const Proto = createContext<ProtoContext | null>(null);

export function useProto() {
  const value = use(Proto);
  if (!value) throw new Error("useProto outside the prototype harness");
  return value;
}

export function useDashboard() {
  const { slug } = useProto();
  return useQuery({
    queryKey: ["proto-public-dashboard", slug],
    queryFn: () => trpcHttpClient.public.dashboard.query({ slug, filters: {} }),
    retry: false,
  });
}

export function useMatchDetail(matchId: string | null | undefined) {
  const { slug } = useProto();
  return useQuery({
    queryKey: ["proto-public-match", slug, matchId],
    queryFn: () => trpcHttpClient.public.match.query({ slug, matchId: matchId! }),
    enabled: Boolean(matchId),
    retry: false,
  });
}

export function usePlayerStats(playerId: string | null | undefined) {
  const { slug } = useProto();
  return useQuery({
    queryKey: ["proto-public-player", slug, playerId],
    queryFn: () => trpcHttpClient.public.player.query({ slug, playerId: playerId!, filters: {} }),
    enabled: Boolean(playerId),
    retry: false,
  });
}

// ── Formatting ───────────────────────────────────────────────────────────────

const TODAY = new Date();

function parts(value: Date | string, timeZone: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("es-AR", { timeZone, ...options }).format(new Date(value));
}

export const fmt = {
  day: (value: Date | string, tz: string) =>
    parts(value, tz, { weekday: "short", day: "numeric", month: "short" }).replace(",", ""),
  weekday: (value: Date | string, tz: string) => parts(value, tz, { weekday: "long" }),
  weekdayShort: (value: Date | string, tz: string) =>
    parts(value, tz, { weekday: "short" }).replace(".", ""),
  dayNumber: (value: Date | string, tz: string) => parts(value, tz, { day: "numeric" }),
  month: (value: Date | string, tz: string) =>
    parts(value, tz, { month: "short" }).replace(".", ""),
  monthYear: (value: Date | string, tz: string) =>
    parts(value, tz, { month: "long", year: "numeric" }),
  long: (value: Date | string, tz: string) =>
    parts(value, tz, { weekday: "long", day: "numeric", month: "long" }),
  time: (value: Date | string, tz: string) =>
    parts(value, tz, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }),
  money: (minor: string | number | null | undefined) =>
    minor === null || minor === undefined
      ? "—"
      : new Intl.NumberFormat("es-AR", {
          style: "currency",
          currency: "ARS",
          maximumFractionDigits: 0,
        }).format(Number(minor) / 100),
  rate: (value: number) =>
    new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(value),
  signed: (value: number) => (value > 0 ? `+${value}` : String(value)),
  relative(value: Date | string) {
    const days = Math.round(
      (startOfDay(new Date(value)).getTime() - startOfDay(TODAY).getTime()) / 86_400_000,
    );
    if (days === 0) return "hoy";
    if (days === 1) return "mañana";
    if (days > 1) return `en ${days} días`;
    if (days === -1) return "ayer";
    return `hace ${-days} días`;
  },
};

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

// ── Derivations ──────────────────────────────────────────────────────────────

export function winnerSlot(match: { teams: readonly { slot: number; goals: number }[] }) {
  const [left, right] = match.teams;
  if (!left || !right || left.goals === right.goals) return null;
  return left.goals > right.goals ? left.slot : right.slot;
}

export function resultLabel(match: HistoryItem | MatchDetail) {
  if (match.status === "cancelled") return "Cancelado";
  if (match.status === "open") return "Por jugarse";
  const slot = winnerSlot(match);
  if (slot === null) return "Empate";
  return `Ganó ${match.teams.find((team) => team.slot === slot)?.displayName ?? ""}`;
}

export function scorers(detail: MatchDetail, teamId: string) {
  return detail.appearances
    .filter((appearance) => appearance.teamId === teamId && appearance.goals > 0)
    .sort((a, b) => b.goals - a.goals)
    .map((appearance) =>
      appearance.goals > 1
        ? `${appearance.playerDisplayName} ×${appearance.goals}`
        : appearance.playerDisplayName,
    );
}

export function groupByMonth<T extends { scheduledAt: Date | string }>(items: T[], tz: string) {
  const groups: { label: string; items: T[] }[] = [];
  for (const item of items) {
    const label = fmt.monthYear(item.scheduledAt, tz);
    const last = groups.at(-1);
    if (last?.label === label) last.items.push(item);
    else groups.push({ label, items: [item] });
  }
  return groups;
}

// ── Atoms ────────────────────────────────────────────────────────────────────

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

export function AccessBadge() {
  const { privateLink } = useProto();
  return privateLink ? (
    <Badge variant="outline">
      <LockKeyholeIcon data-icon="inline-start" aria-hidden="true" />
      Enlace privado · solo lectura
    </Badge>
  ) : (
    <Badge variant="outline">
      <GlobeIcon data-icon="inline-start" aria-hidden="true" />
      Grupo público · solo lectura
    </Badge>
  );
}

const outcomeLetter: Record<Outcome, string> = { win: "G", draw: "E", loss: "P" };
const outcomeWord: Record<Outcome, string> = { win: "Ganó", draw: "Empató", loss: "Perdió" };

/** Last results as G/E/P squares, oldest → newest. Letter + color, never color alone. */
export function FormGuide({ outcomes, className }: { outcomes: Outcome[]; className?: string }) {
  if (outcomes.length === 0) return null;
  return (
    <ol
      aria-label={`Últimos ${outcomes.length}: ${outcomes.map((o) => outcomeWord[o]).join(", ")}`}
      className={cn("flex gap-1", className)}
    >
      {outcomes.map((outcome, index) => (
        <li
          aria-hidden="true"
          className={cn(
            "grid size-6 place-items-center rounded-xs text-xs font-semibold tabular-nums",
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

export function LoadingRows({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div aria-busy="true" aria-label="Cargando" className={cn("flex flex-col gap-2", className)}>
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton className="h-11 w-full" key={index} />
      ))}
    </div>
  );
}

export const rowLink =
  "transition-colors duration-150 ease-out hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50";
