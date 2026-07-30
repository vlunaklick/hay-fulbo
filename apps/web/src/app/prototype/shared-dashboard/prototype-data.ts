export type PeriodFilter = "30d" | "year" | "all";
export type VenueFilter = "all" | "la-jaula" | "el-galpon" | "futbol-campus";
export type HistoryFilter = "all" | "decided" | "draws";

export type PrototypeFilters = {
  period: PeriodFilter;
  venue: VenueFilter;
  history: HistoryFilter;
};

type PlayerPerformance = {
  playerId: string;
  goals: number;
  assists: number;
  outcome: "W" | "D" | "L";
};

export type MatchResult = {
  id: string;
  date: string;
  shortDate: string;
  teamA: string;
  teamB: string;
  scoreA: number;
  scoreB: number;
  venueId: Exclude<VenueFilter, "all" | "futbol-campus">;
  venueName: string;
  performances: PlayerPerformance[];
};

export type PlayerStat = {
  id: string;
  name: string;
  initials: string;
  played: number;
  goals: number;
  assists: number;
  contributions: number;
  average: number;
  wins: number;
  draws: number;
  losses: number;
};

export const venueOptions = [
  { label: "Todas las canchas", value: "all" },
  { label: "La Jaula", value: "la-jaula" },
  { label: "El Galpón", value: "el-galpon" },
  { label: "Fútbol Campus", value: "futbol-campus" },
] satisfies { label: string; value: VenueFilter }[];

export const historyOptions = [
  { label: "Todos los resultados", value: "all" },
  { label: "Partidos definidos", value: "decided" },
  { label: "Empates", value: "draws" },
] satisfies { label: string; value: HistoryFilter }[];

export const upcomingMatch = {
  date: "Viernes 31 de julio",
  time: "22:00",
  venue: "El Galpón",
  address: "Av. Córdoba 5200, CABA",
  mapsUrl: "https://maps.google.com/?q=Av.+Cordoba+5200,+CABA",
  price: 120000,
  expectedPlayers: 10,
  paidPlayers: 7,
  dueAmount: 36000,
  captains: ["Fede", "Nico"],
};

export const debts = [
  { id: "d1", name: "Juli", initials: "JU", amount: 12000, status: "Pendiente" },
  { id: "d2", name: "Nico", initials: "NI", amount: 12000, status: "Pendiente" },
  { id: "d3", name: "Lean", initials: "LE", amount: 12000, status: "Pendiente" },
];

const matches: MatchResult[] = [
  {
    id: "m5",
    date: "2026-07-25",
    shortDate: "25 JUL",
    teamA: "Rojo",
    teamB: "Negro",
    scoreA: 6,
    scoreB: 4,
    venueId: "la-jaula",
    venueName: "La Jaula",
    performances: [
      { playerId: "fede", goals: 4, assists: 1, outcome: "W" },
      { playerId: "tomi", goals: 2, assists: 2, outcome: "W" },
      { playerId: "valen", goals: 0, assists: 2, outcome: "W" },
      { playerId: "nico", goals: 2, assists: 0, outcome: "L" },
      { playerId: "lean", goals: 1, assists: 1, outcome: "L" },
      { playerId: "juli", goals: 1, assists: 1, outcome: "L" },
    ],
  },
  {
    id: "m4",
    date: "2026-07-18",
    shortDate: "18 JUL",
    teamA: "Flúor",
    teamB: "Azul",
    scoreA: 5,
    scoreB: 5,
    venueId: "la-jaula",
    venueName: "La Jaula",
    performances: [
      { playerId: "fede", goals: 2, assists: 1, outcome: "D" },
      { playerId: "tomi", goals: 1, assists: 2, outcome: "D" },
      { playerId: "valen", goals: 2, assists: 1, outcome: "D" },
      { playerId: "nico", goals: 1, assists: 1, outcome: "D" },
      { playerId: "lean", goals: 0, assists: 1, outcome: "D" },
      { playerId: "juli", goals: 1, assists: 0, outcome: "D" },
    ],
  },
  {
    id: "m3",
    date: "2026-07-11",
    shortDate: "11 JUL",
    teamA: "Blanco",
    teamB: "Azul",
    scoreA: 3,
    scoreB: 7,
    venueId: "el-galpon",
    venueName: "El Galpón",
    performances: [
      { playerId: "fede", goals: 1, assists: 1, outcome: "L" },
      { playerId: "tomi", goals: 1, assists: 0, outcome: "L" },
      { playerId: "valen", goals: 1, assists: 0, outcome: "L" },
      { playerId: "nico", goals: 3, assists: 2, outcome: "W" },
      { playerId: "lean", goals: 2, assists: 1, outcome: "W" },
      { playerId: "juli", goals: 2, assists: 1, outcome: "W" },
    ],
  },
  {
    id: "m2",
    date: "2026-05-10",
    shortDate: "10 MAY",
    teamA: "Naranja",
    teamB: "Negro",
    scoreA: 8,
    scoreB: 6,
    venueId: "la-jaula",
    venueName: "La Jaula",
    performances: [
      { playerId: "fede", goals: 3, assists: 2, outcome: "W" },
      { playerId: "tomi", goals: 3, assists: 3, outcome: "W" },
      { playerId: "valen", goals: 2, assists: 1, outcome: "W" },
      { playerId: "nico", goals: 2, assists: 2, outcome: "L" },
      { playerId: "lean", goals: 3, assists: 0, outcome: "L" },
      { playerId: "juli", goals: 1, assists: 1, outcome: "L" },
    ],
  },
  {
    id: "m1",
    date: "2025-12-20",
    shortDate: "20 DIC",
    teamA: "Verde",
    teamB: "Negro",
    scoreA: 4,
    scoreB: 2,
    venueId: "el-galpon",
    venueName: "El Galpón",
    performances: [
      { playerId: "fede", goals: 2, assists: 1, outcome: "W" },
      { playerId: "tomi", goals: 1, assists: 1, outcome: "W" },
      { playerId: "valen", goals: 1, assists: 2, outcome: "W" },
      { playerId: "nico", goals: 1, assists: 0, outcome: "L" },
      { playerId: "lean", goals: 1, assists: 0, outcome: "L" },
      { playerId: "juli", goals: 0, assists: 1, outcome: "L" },
    ],
  },
];

const playerNames = new Map([
  ["fede", { name: "Fede", initials: "FE" }],
  ["tomi", { name: "Tomi", initials: "TO" }],
  ["valen", { name: "Valen", initials: "VA" }],
  ["nico", { name: "Nico", initials: "NI" }],
  ["lean", { name: "Lean", initials: "LE" }],
  ["juli", { name: "Juli", initials: "JU" }],
]);

export function getPrototypeData(filters: PrototypeFilters) {
  const cutoff =
    filters.period === "30d"
      ? "2026-07-01"
      : filters.period === "year"
        ? "2026-01-01"
        : "0000-01-01";

  const periodMatches = matches.filter(
    (match) => match.date >= cutoff && (filters.venue === "all" || match.venueId === filters.venue),
  );

  const history = periodMatches.filter((match) => {
    if (filters.history === "draws") return match.scoreA === match.scoreB;
    if (filters.history === "decided") return match.scoreA !== match.scoreB;
    return true;
  });

  const totals = new Map<string, PlayerStat>();

  for (const match of periodMatches) {
    for (const performance of match.performances) {
      const identity = playerNames.get(performance.playerId);
      if (!identity) continue;

      const current = totals.get(performance.playerId) ?? {
        id: performance.playerId,
        ...identity,
        played: 0,
        goals: 0,
        assists: 0,
        contributions: 0,
        average: 0,
        wins: 0,
        draws: 0,
        losses: 0,
      };

      current.played += 1;
      current.goals += performance.goals;
      current.assists += performance.assists;
      current.contributions += performance.goals + performance.assists;
      current.wins += performance.outcome === "W" ? 1 : 0;
      current.draws += performance.outcome === "D" ? 1 : 0;
      current.losses += performance.outcome === "L" ? 1 : 0;
      current.average = Number((current.contributions / current.played).toFixed(2));
      totals.set(performance.playerId, current);
    }
  }

  const players = Array.from(totals.values()).sort(
    (left, right) =>
      right.contributions - left.contributions ||
      right.goals - left.goals ||
      left.name.localeCompare(right.name),
  );

  return { players, history, periodMatches };
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(amount);
}
