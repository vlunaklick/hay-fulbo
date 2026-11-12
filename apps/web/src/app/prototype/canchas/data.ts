// Mock courts modeled on a real group: long names, long addresses, archived
// courts, a court never used and a court with an upcoming match.

export type MatchStatus = "open" | "closed" | "cancelled";

export type CourtMatch = {
  id: string;
  at: string;
  status: MatchStatus;
  costMinor: number;
  score: [number, number] | null;
};

export type Court = {
  id: string;
  name: string;
  address: string;
  mapsUrl: string;
  archivedAt: string | null;
  matches: CourtMatch[];
};

export const NOW = new Date("2026-11-12T12:00:00-03:00");

function day(offset: number, hour = 21) {
  const date = new Date(NOW);
  date.setDate(date.getDate() + offset);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

let seq = 0;
function m(
  offset: number,
  costMinor: number,
  status: MatchStatus = "closed",
  score: [number, number] | null = status === "closed" ? [5 + (seq % 4), 3 + (seq % 5)] : null,
): CourtMatch {
  seq += 1;
  return { id: `m${seq}`, at: day(offset), status, costMinor, score };
}

export const COURTS: Court[] = [
  {
    id: "c1",
    name: "Club Atlético Parque Chacabuco — Cancha 3 (techada, sintético nuevo)",
    address: "Av. Asamblea 1250, Parque Chacabuco, CABA",
    mapsUrl: "https://maps.google.com/?q=Av.+Asamblea+1250",
    archivedAt: null,
    matches: [m(-9, 14_400_000), m(-30, 14_400_000), m(-61, 13_200_000)],
  },
  {
    id: "c2",
    name: "La Bombonerita de Caballito",
    address: "Rojas 1450, Caballito, CABA",
    mapsUrl: "https://maps.google.com/?q=Rojas+1450",
    archivedAt: null,
    matches: [
      m(2, 9_600_000, "open"),
      m(-5, 9_600_000),
      m(-12, 9_600_000),
      m(-19, 9_000_000),
      m(-26, 9_000_000),
      m(-33, 9_000_000, "cancelled"),
      m(-40, 9_000_000),
      m(-47, 8_400_000),
      m(-54, 8_400_000),
      m(-61, 8_400_000),
      m(-68, 8_400_000),
    ],
  },
  {
    id: "c3",
    name: "Fútbol 5 El Galpón",
    address:
      "Gral. Venancio Flores 3201 entre Gavilán y Caracas, Flores, Ciudad Autónoma de Buenos Aires",
    mapsUrl: "https://maps.google.com/?q=Venancio+Flores+3201",
    archivedAt: null,
    matches: [m(-120, 6_000_000)],
  },
  {
    id: "c4",
    name: "Sportivo Almagro",
    address: "Bulnes 960, Almagro, CABA",
    mapsUrl: "https://maps.google.com/?q=Bulnes+960",
    archivedAt: null,
    matches: [m(-16, 7_800_000), m(-75, 7_200_000)],
  },
  {
    id: "c5",
    name: "Complejo Pinar de Rocha",
    address: "Av. Gaona 3800, Ramos Mejía, Buenos Aires",
    mapsUrl: "https://maps.google.com/?q=Av.+Gaona+3800",
    archivedAt: null,
    matches: [m(9, 11_000_000, "open")],
  },
  {
    id: "c6",
    name: "Mundo Fútbol Palermo",
    address: "Av. Dorrego 1100, Palermo, CABA",
    mapsUrl: "https://maps.google.com/?q=Dorrego+1100",
    archivedAt: null,
    matches: [],
  },
  {
    id: "c7",
    name: "Cancha del Colegio San José",
    address: "Azcuénaga 158, Balvanera, CABA",
    mapsUrl: "https://maps.google.com/?q=Azcuenaga+158",
    archivedAt: day(-190),
    matches: [m(-200, 5_000_000), m(-214, 5_000_000)],
  },
  {
    id: "c8",
    name: "Los Pibes F5 (cerró)",
    address: "Av. San Martín 4200, Agronomía, CABA",
    mapsUrl: "https://maps.google.com/?q=San+Martin+4200",
    archivedAt: day(-327),
    matches: [m(-340, 4_000_000)],
  },
];

export type CourtSummary = Court & {
  played: number;
  lastPlayed: CourtMatch | null;
  next: CourtMatch | null;
  lastCostMinor: number | null;
};

export function summarize(court: Court): CourtSummary {
  const now = NOW.getTime();
  const sorted = [...court.matches].sort((a, b) => b.at.localeCompare(a.at));
  const closed = sorted.filter((match) => match.status === "closed");
  const upcoming = sorted
    .filter((match) => match.status === "open" && new Date(match.at).getTime() >= now)
    .at(-1);
  return {
    ...court,
    played: closed.length,
    lastPlayed: closed[0] ?? null,
    next: upcoming ?? null,
    lastCostMinor: sorted.find((match) => match.status !== "cancelled")?.costMinor ?? null,
  };
}
