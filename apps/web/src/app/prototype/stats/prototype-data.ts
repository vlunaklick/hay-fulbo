// PROTOTYPE ONLY — deterministic StatsSource fed through the real derivation code.
import { deriveStatsDashboard } from "@hay-fulbo/db/stats/derive";
import type { StatsDashboard, StatsFilters, StatsSource } from "@hay-fulbo/db/stats/types";

export const PROTO_NOW = new Date("2026-11-12T15:00:00-03:00");

const PLAYERS: Array<[string, number, number, boolean?, boolean?]> = [
  // name, attack skill, creativity, archived, linked user (votes)
  ["Lucho Benítez", 0.9, 0.5, false, true],
  ["Juan Ignacio Fernández Etcheverry", 0.55, 0.85, false, true],
  ["Tomi Ríos", 0.7, 0.4],
  ["Facu Sosa", 0.35, 0.7],
  ["Nico Paredes", 0.6, 0.6],
  ["Mati Ledesma", 0.25, 0.3],
  ["Santi Gómez", 0.8, 0.3],
  ["El Ruso", 0.45, 0.55],
  ["Pato Aguirre", 0.3, 0.45],
  ["Gonza Villalba", 0.5, 0.35],
  ["Fede Quiroga", 0.4, 0.65],
  ["Agus Romero", 0.2, 0.25],
  ["Maxi Correa", 0.65, 0.2],
  ["Rodri Molina", 0.3, 0.5],
  ["Cristian “Chino” Domínguez", 0.55, 0.45],
  ["Leo Navarro", 0.15, 0.2],
  ["Dami Ojeda", 0.45, 0.3, true],
  ["Pablo Herrera", 0.35, 0.35],
];

const COURTS = [
  { id: "c1", name: "El Galpón", address: "Av. Directorio 4120, CABA", mapsUrl: "#" },
  {
    id: "c2",
    name: "Complejo Deportivo Los Alamos de Villa Urquiza",
    address: "Bauness 2650, CABA",
    mapsUrl: "#",
  },
  { id: "c3", name: "Club Pinocho", address: "Moldes 1060, CABA", mapsUrl: "#" },
];

function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildSource(): StatsSource {
  const random = rng(20260412);
  const players = PLAYERS.map(([name, , , archived, linked], index) => ({
    id: `p${index + 1}`,
    displayName: name,
    normalizedName: name.toLowerCase(),
    archived: Boolean(archived),
    linkedUserId: linked ? `u${index + 1}` : null,
  }));

  const matches: StatsSource["matches"][number][] = [];
  const ratings: NonNullable<StatsSource["ratings"]>[number][] = [];
  const absences: NonNullable<StatsSource["absences"]>[number][] = [];
  const start = new Date("2026-04-02T21:00:00-03:00");

  for (let week = 0; week < 32; week += 1) {
    if (week === 7 || week === 19) continue; // no match those weeks
    const scheduledAt = new Date(start.getTime() + week * 7 * 86_400_000);
    const id = `m${week + 1}`;
    const courtId = week % 5 === 3 ? "c2" : week % 7 === 5 ? "c3" : "c1";
    const cancelled = week === 11 || week === 24;

    // Pick 12 of the available players (archived one stops after week 14).
    const pool = players
      .map((player, index) => ({ player, index, roll: random() + (index < 10 ? 0.35 : 0) }))
      .filter(({ player }) => !(player.archived && week > 14))
      .sort((left, right) => right.roll - left.roll);
    const chosen = pool.slice(0, 12);
    const benchRoll = pool[12];
    if (benchRoll && random() > 0.6) absences.push({ matchId: id, playerId: benchRoll.player.id });

    const teams = [0, 1].map((slot) => ({
      id: `${id}-t${slot}`,
      slot,
      displayName: slot === 0 ? "Azul" : "Naranja",
      unattributedGoals: random() > 0.85 ? 1 : 0,
      appearances: chosen
        .filter((_, index) => index % 2 === slot)
        .map(({ player, index }, order) => {
          const [, attack, creativity] = PLAYERS[index]!;
          let goals = 0;
          let assists = 0;
          for (let trial = 0; trial < 4; trial += 1) if (random() < attack * 0.42) goals += 1;
          for (let trial = 0; trial < 3; trial += 1) if (random() < creativity * 0.4) assists += 1;
          return {
            playerId: player.id,
            joinedOrder: order,
            goals: cancelled ? 0 : goals,
            assists: cancelled ? 0 : assists,
            ownGoals: !cancelled && random() > 0.97 ? 1 : 0,
            expectedMinor: 450000n,
            paidMinor: 450000n,
          };
        }),
    }));

    matches.push({
      id,
      courtId,
      scheduledAt,
      status: cancelled ? "cancelled" : "closed",
      courtCostMinor: 5400000n,
      teams,
    });

    if (week >= 22 && !cancelled) {
      const participants = teams.flatMap((team) => team.appearances.map((item) => item.playerId));
      for (const voter of players.filter((player) => player.linkedUserId)) {
        if (!participants.includes(voter.id)) continue;
        for (const rated of participants) {
          if (rated === voter.id) continue;
          ratings.push({
            matchId: id,
            raterPlayerId: voter.id,
            ratedPlayerId: rated,
            score: 4 + Math.floor(random() * 6),
          });
        }
      }
    }
  }

  matches.push({
    id: "m-next",
    courtId: "c1",
    scheduledAt: new Date("2026-11-19T21:00:00-03:00"),
    status: "open",
    courtCostMinor: 5400000n,
    teams: [],
  });

  return {
    group: {
      id: "g1",
      name: "Los Jueves del Galpón",
      timeZone: "America/Argentina/Buenos_Aires",
      currency: "ARS",
      ratingQuorum: "first_vote",
    },
    courts: COURTS,
    players,
    matches,
    ratings,
    absences,
  };
}

const SOURCE = buildSource();

export type ProtoFilters = { period: string; court: string; result: string };
export const DEFAULT_FILTERS: ProtoFilters = { period: "all", court: "all", result: "all" };

export function protoDashboard(filters: ProtoFilters): StatsDashboard {
  const api: StatsFilters = {
    courtId: filters.court === "all" ? undefined : filters.court,
    result: filters.result === "draws" || filters.result === "decided" ? filters.result : "all",
  };
  if (filters.period === "30d") {
    api.from = "2026-10-14";
    api.to = "2026-11-12";
  } else if (filters.period === "year") {
    api.from = "2026-01-01";
    api.to = "2026-11-12";
  }
  return deriveStatsDashboard(SOURCE, api, PROTO_NOW);
}

export const EMPTY_DASHBOARD: StatsDashboard = deriveStatsDashboard(
  { ...SOURCE, matches: [], ratings: [], absences: [] },
  {},
  PROTO_NOW,
);
