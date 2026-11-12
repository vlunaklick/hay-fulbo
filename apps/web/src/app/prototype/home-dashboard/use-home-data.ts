"use client";

// PROTOTYPE ONLY — one data hook shared by every variant so they compare on equal data.
// `?escenario=sin-fecha` drops the upcoming match; `?escenario=vacio` also drops history.

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";

import { useAppContext } from "@/components/app-shell";
import { trpc } from "@/utils/trpc";

export type Scenario = "real" | "sin-fecha" | "vacio";

export function useHomeData() {
  const { groupName, role, user } = useAppContext();
  const params = useSearchParams();
  const scenario = (params.get("escenario") as Scenario | null) ?? "real";

  const stats = useQuery(trpc.stats.dashboard.queryOptions({}));
  const directory = useQuery(trpc.matches.directory.queryOptions());
  const realUpcoming = scenario === "real" ? (stats.data?.upcoming ?? null) : null;
  const upcomingDetail = useQuery({
    ...trpc.matches.detail.queryOptions({ matchId: realUpcoming?.matchId ?? "" }),
    enabled: Boolean(realUpcoming),
  });
  const me = directory.data?.players.find((player) => player.linkedUserId === user.id) ?? null;
  const playerStats = useQuery({
    ...trpc.stats.player.queryOptions({ playerId: me?.id ?? "", filters: {} }),
    enabled: Boolean(me) && scenario !== "vacio",
  });

  if (stats.isPending || directory.isPending) return { status: "pending" as const };
  if (stats.isError || directory.isError) {
    return {
      status: "error" as const,
      message: stats.error?.message ?? directory.error?.message ?? "",
    };
  }

  const dashboard = stats.data;
  const upcoming = realUpcoming;
  const finances = upcoming ? dashboard.finances : null;
  const history = scenario === "vacio" ? [] : dashboard.history;
  const ranking = scenario === "vacio" ? [] : dashboard.ranking;
  const myStats = me ? (ranking.find((row) => row.playerId === me.id) ?? null) : null;

  const detail = upcomingDetail.data ?? null;
  const myAppearance = detail
    ? [
        ...detail.teams.flatMap((team) => team.appearances),
        ...detail.absences.filter((absence) => absence.owesContribution),
      ].find((appearance) => appearance.playerId === me?.id)
    : undefined;
  const myTeam = detail?.teams.find((team) =>
    team.appearances.some((appearance) => appearance.playerId === me?.id),
  );

  const myDebt: DebtState = !me
    ? { kind: "unlinked" }
    : !upcoming
      ? { kind: "no-match" }
      : upcoming.courtCostMinor === null
        ? { kind: "no-cost" }
        : upcomingDetail.isPending
          ? { kind: "loading" }
          : upcomingDetail.isError
            ? { kind: "error", retry: () => upcomingDetail.refetch() }
            : !myAppearance
              ? { kind: "not-in" }
              : debtFrom(BigInt(myAppearance.expectedMinor), BigInt(myAppearance.paidMinor));

  const scorers = ranking
    .toSorted(
      (left, right) =>
        right.goals - left.goals ||
        right.contributions - left.contributions ||
        left.displayName.localeCompare(right.displayName, "es"),
    )
    .slice(0, 5);

  return {
    status: "ready" as const,
    scenario,
    groupName,
    role,
    canCreate: role !== "member",
    user,
    me,
    myStats,
    myDebt,
    mySlot: myTeam?.slot ?? null,
    myMatches: scenario === "vacio" ? [] : (playerStats.data?.matches ?? []),
    upcoming,
    upcomingDetail: detail,
    finances,
    history,
    ranking,
    scorers,
    summary: dashboard.summary,
  };
}

export type HomeData = Extract<ReturnType<typeof useHomeData>, { status: "ready" }>;

export type DebtState =
  | { kind: "unlinked" | "no-match" | "no-cost" | "loading" | "not-in" }
  | { kind: "error"; retry: () => void }
  | { kind: "owes"; debt: bigint; expected: bigint; paid: bigint }
  | { kind: "settled"; overpaid: boolean; expected: bigint };

function debtFrom(expected: bigint, paid: bigint): DebtState {
  const debt = expected - paid;
  if (debt > 0n) return { kind: "owes", debt, expected, paid };
  return { kind: "settled", overpaid: debt < 0n, expected };
}

/** "jue 14 nov" + "21:00" split so variants can set the hour as the hero. */
export function splitDate(value: string | Date) {
  const date = new Date(value);
  const day = new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
  const time = new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
  return { day, time };
}

/** "Hoy", "Mañana", "En 3 días", or null when it's further out or past. */
export function relativeDay(value: string | Date, now = new Date()) {
  const start = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const days = Math.round((start(new Date(value)).getTime() - start(now).getTime()) / 86_400_000);
  if (days === 0) return "Hoy";
  if (days === 1) return "Mañana";
  if (days > 1 && days < 7) return `En ${days} días`;
  return null;
}

export function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
