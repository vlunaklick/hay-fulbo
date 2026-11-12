// PROTOTYPE ONLY — in-memory match used by /prototype/match-detail. Deleted after the decision.
import { useReducer } from "react";

export type Phase = "upcoming" | "live" | "closed" | "cancelled";
export type Role = "organizer" | "player";
export type StatField = "goals" | "assists" | "ownGoals";

export type Player = {
  id: string;
  name: string;
  goals: number;
  assists: number;
  ownGoals: number;
  paid: number;
};
export type Team = {
  id: string;
  slot: 1 | 2;
  name: string;
  unattributed: number;
  players: Player[];
};
export type Absence = { id: string; name: string; owes: boolean; paid: number };

export type MatchState = {
  phase: Phase;
  role: Role;
  scheduledAt: string;
  court: { name: string; address: string };
  courtCost: number;
  scorekeeper: string | null;
  teams: [Team, Team];
  absences: Absence[];
  available: { id: string; name: string }[];
  parity: { left: number; draw: number; right: number; confidence: string; sample: number };
  ratings: {
    revealed: boolean;
    votes: number;
    eligible: number;
    mine: Record<string, number>;
    draft: Record<string, number>;
    averages: Record<string, number>;
  };
  viewerId: string;
  members: string[];
};

const p = (id: string, name: string, goals = 0, assists = 0, ownGoals = 0, paid = 0): Player => ({
  id,
  name,
  goals,
  assists,
  ownGoals,
  paid,
});

const COST = 9_800_000; // ARS minor units ($98.000)

function seed(phase: Phase, role: Role): MatchState {
  // Rounded to the hour so the server render and the client render agree.
  const now = Math.floor(Date.now() / 36e5) * 36e5;
  const played = phase === "live" || phase === "closed";
  const share = Math.ceil(COST / (phase === "upcoming" ? 11 : 15) / 100) * 100;
  const paidFor = (i: number) =>
    phase === "closed" ? (i % 5 === 3 ? 0 : share) : i % 3 === 0 ? share : 0;
  const left: Player[] = [
    p("p1", "Juan Manuel Fernández Etcheverry", played ? 2 : 0, played ? 1 : 0, 0, paidFor(0)),
    p("p2", "Tomi", played ? 1 : 0, 0, 0, paidFor(1)),
    p("p3", "Nico Pereyra", 0, played ? 1 : 0, 0, paidFor(2)),
    p("p4", "Facu", 0, 0, 0, paidFor(3)),
    p("p5", "Leandro Gómez", 0, 0, 0, paidFor(4)),
    p("p6", "Santi R.", 0, 0, played ? 1 : 0, paidFor(5)),
    p("p7", "Mati", 0, 0, 0, paidFor(6)),
  ];
  const right: Player[] = [
    p("p8", "Pablo Ibarra", played ? 1 : 0, 0, 0, paidFor(7)),
    p("p9", "Gonza", 0, played ? 1 : 0, 0, paidFor(8)),
    p("p10", "Lucas Benítez", 0, 0, 0, paidFor(9)),
    p("p11", "Rodri", 0, 0, 0, paidFor(10)),
    p("p12", "Fede Ortiz", 0, 0, 0, paidFor(11)),
    p("p13", "Agus", 0, 0, 0, paidFor(12)),
    p("p14", "Valen", 0, 0, 0, paidFor(13)),
  ];
  const upcoming = phase === "upcoming";
  return {
    phase,
    role,
    scheduledAt: new Date(
      upcoming ? now + 2 * 864e5 : phase === "live" ? now - 36e5 : now - 3 * 864e5,
    ).toISOString(),
    court: { name: "Complejo El Potrero — Cancha 3", address: "Av. San Martín 4521, CABA" },
    courtCost: COST,
    scorekeeper: played ? "Tomi" : null,
    teams: [
      {
        id: "t1",
        slot: 1,
        name: "Los Pibes de la Esquina",
        unattributed: 0,
        players: upcoming ? left.slice(0, 6) : left,
      },
      {
        id: "t2",
        slot: 2,
        name: "Pecheras",
        unattributed: 0,
        players: upcoming ? right.slice(0, 5) : right,
      },
    ],
    absences: upcoming ? [] : [{ id: "p15", name: "Martín", owes: true, paid: 0 }],
    available: [
      ...(upcoming
        ? [
            { id: "p7", name: "Mati" },
            { id: "p12", name: "Fede Ortiz" },
            { id: "p13", name: "Agus" },
            { id: "p14", name: "Valen" },
            { id: "p15", name: "Martín" },
          ]
        : []),
      { id: "p16", name: "Chino" },
      { id: "p17", name: "Ezequiel Rodríguez Sanmartino" },
    ],
    parity: { left: 0.44, draw: 0.19, right: 0.37, confidence: "media", sample: 23 },
    ratings: {
      revealed: false,
      votes: 6,
      eligible: 11,
      mine: {},
      draft: {},
      averages: {
        p1: 8.4,
        p2: 7.1,
        p3: 6.8,
        p4: 5.9,
        p5: 6.2,
        p6: 5.4,
        p7: 6.5,
        p8: 7.6,
        p9: 7.0,
        p10: 7.3,
        p11: 6.1,
        p12: 5.8,
        p13: 6.0,
      },
    },
    viewerId: "p14",
    members: ["Valen", "Tomi", "Nico Pereyra", "Juan Manuel Fernández Etcheverry"],
  };
}

type Action =
  | { type: "reset"; phase: Phase; role: Role }
  | { type: "stat"; playerId: string; field: StatField; delta: 1 | -1 }
  | { type: "unattributed"; teamId: string; delta: 1 | -1 }
  | { type: "paid"; playerId: string; amount: number }
  | { type: "add"; teamId: string; playerId: string }
  | { type: "create"; teamId: string; name: string }
  | { type: "remove"; playerId: string }
  | { type: "move"; playerId: string }
  | { type: "absent"; playerId: string; owes: boolean }
  | { type: "unabsent"; playerId: string; teamId: string }
  | { type: "rename"; teamId: string; name: string }
  | { type: "scorekeeper"; name: string | null }
  | { type: "phase"; phase: Phase }
  | { type: "rate"; playerId: string; score: number }
  | { type: "saveRatings" };

function mapPlayers(state: MatchState, fn: (player: Player) => Player): MatchState {
  return {
    ...state,
    teams: state.teams.map((team) => ({ ...team, players: team.players.map(fn) })) as [Team, Team],
  };
}

function reducer(state: MatchState, action: Action): MatchState {
  switch (action.type) {
    case "reset":
      return seed(action.phase, action.role);
    case "stat":
      return mapPlayers(state, (player) =>
        player.id === action.playerId
          ? { ...player, [action.field]: Math.max(0, player[action.field] + action.delta) }
          : player,
      );
    case "unattributed":
      return {
        ...state,
        teams: state.teams.map((team) =>
          team.id === action.teamId
            ? { ...team, unattributed: Math.max(0, team.unattributed + action.delta) }
            : team,
        ) as [Team, Team],
      };
    case "paid": {
      const next = mapPlayers(state, (player) =>
        player.id === action.playerId ? { ...player, paid: action.amount } : player,
      );
      return {
        ...next,
        absences: next.absences.map((row) =>
          row.id === action.playerId ? { ...row, paid: action.amount } : row,
        ),
      };
    }
    case "add": {
      const found = state.available.find((row) => row.id === action.playerId);
      if (!found) return state;
      return {
        ...state,
        available: state.available.filter((row) => row.id !== action.playerId),
        teams: state.teams.map((team) =>
          team.id === action.teamId
            ? { ...team, players: [...team.players, p(found.id, found.name)] }
            : team,
        ) as [Team, Team],
      };
    }
    case "create":
      return {
        ...state,
        teams: state.teams.map((team) =>
          team.id === action.teamId
            ? { ...team, players: [...team.players, p(`new-${Date.now()}`, action.name.trim())] }
            : team,
        ) as [Team, Team],
      };
    case "remove": {
      const player = findPlayer(state, action.playerId);
      if (!player) return state;
      return {
        ...state,
        available: [...state.available, { id: player.id, name: player.name }],
        teams: state.teams.map((team) => ({
          ...team,
          players: team.players.filter((row) => row.id !== action.playerId),
        })) as [Team, Team],
      };
    }
    case "move": {
      const player = findPlayer(state, action.playerId);
      if (!player) return state;
      return {
        ...state,
        teams: state.teams.map((team) =>
          team.players.some((row) => row.id === action.playerId)
            ? { ...team, players: team.players.filter((row) => row.id !== action.playerId) }
            : { ...team, players: [...team.players, player] },
        ) as [Team, Team],
      };
    }
    case "absent": {
      const player = findPlayer(state, action.playerId);
      if (!player) return state;
      return {
        ...state,
        absences: [
          ...state.absences,
          { id: player.id, name: player.name, owes: action.owes, paid: 0 },
        ],
        teams: state.teams.map((team) => ({
          ...team,
          players: team.players.filter((row) => row.id !== action.playerId),
        })) as [Team, Team],
      };
    }
    case "unabsent": {
      const absence = state.absences.find((row) => row.id === action.playerId);
      if (!absence) return state;
      return {
        ...state,
        absences: state.absences.filter((row) => row.id !== action.playerId),
        teams: state.teams.map((team) =>
          team.id === action.teamId
            ? { ...team, players: [...team.players, p(absence.id, absence.name)] }
            : team,
        ) as [Team, Team],
      };
    }
    case "rename":
      return {
        ...state,
        teams: state.teams.map((team) =>
          team.id === action.teamId ? { ...team, name: action.name } : team,
        ) as [Team, Team],
      };
    case "scorekeeper":
      return { ...state, scorekeeper: action.name };
    case "phase":
      return { ...state, phase: action.phase };
    case "rate":
      return {
        ...state,
        ratings: {
          ...state.ratings,
          draft: { ...state.ratings.draft, [action.playerId]: action.score },
        },
      };
    case "saveRatings": {
      const mine = { ...state.ratings.mine, ...state.ratings.draft };
      const votes = state.ratings.votes + (Object.keys(state.ratings.mine).length ? 0 : 1);
      return {
        ...state,
        ratings: {
          ...state.ratings,
          mine,
          draft: {},
          votes,
          revealed: votes >= 7,
        },
      };
    }
  }
}

export function findPlayer(state: MatchState, playerId: string) {
  return state.teams.flatMap((team) => team.players).find((row) => row.id === playerId);
}

export function useMatch(phase: Phase, role: Role) {
  const [state, dispatch] = useReducer(reducer, undefined, () => seed(phase, role));
  return { state, dispatch };
}

export type Dispatch = ReturnType<typeof useMatch>["dispatch"];

// ── Derived values ─────────────────────────────────────────────────────────────

export function teamScore(state: MatchState, team: Team) {
  const rival = state.teams.find((row) => row.id !== team.id);
  return (
    team.unattributed +
    team.players.reduce((sum, row) => sum + row.goals, 0) +
    (rival?.players.reduce((sum, row) => sum + row.ownGoals, 0) ?? 0)
  );
}

export function payers(state: MatchState) {
  return [
    ...state.teams.flatMap((team) => team.players.map((row) => ({ ...row, absent: false }))),
    ...state.absences
      .filter((row) => row.owes)
      .map((row) => ({ id: row.id, name: row.name, paid: row.paid, absent: true })),
  ];
}

export function expectedShare(state: MatchState) {
  const count = payers(state).length;
  return count === 0 ? 0 : Math.ceil(state.courtCost / count / 100) * 100;
}

export type PayStatus = "pending" | "partial" | "paid" | "overpaid";

export function payStatus(paid: number, expected: number): PayStatus {
  if (paid === 0) return "pending";
  if (paid < expected) return "partial";
  if (paid === expected) return "paid";
  return "overpaid";
}

export const payLabel: Record<
  PayStatus,
  { label: string; variant: "destructive" | "outline" | "success" | "secondary" }
> = {
  pending: { label: "Debe", variant: "destructive" },
  partial: { label: "Parcial", variant: "outline" },
  paid: { label: "Pagó", variant: "success" },
  overpaid: { label: "Excedido", variant: "secondary" },
};

export function cashSummary(state: MatchState) {
  const rows = payers(state);
  const expected = expectedShare(state);
  const settled = rows.filter((row) => row.paid >= expected).length;
  const collected = rows.reduce((sum, row) => sum + row.paid, 0);
  return { rows, expected, settled, total: rows.length, collected, cost: state.courtCost };
}

export const issueText = {
  match_not_started: "La hora del partido todavía no pasó.",
  team_without_players: "Cada equipo necesita al menos un jugador.",
  assists_exceed_attributed_goals: "Hay más asistencias que goles atribuidos.",
} as const;

export function closureIssues(state: MatchState) {
  const issues: (keyof typeof issueText)[] = [];
  if (new Date(state.scheduledAt).getTime() > Date.now()) issues.push("match_not_started");
  if (state.teams.some((team) => team.players.length === 0)) issues.push("team_without_players");
  if (
    state.teams.some(
      (team) =>
        team.players.reduce((sum, row) => sum + row.assists, 0) >
        team.unattributed + team.players.reduce((sum, row) => sum + row.goals, 0),
    )
  ) {
    issues.push("assists_exceed_attributed_goals");
  }
  return issues;
}

export function figure(state: MatchState) {
  if (!state.ratings.revealed) return null;
  const entries = Object.entries(state.ratings.averages).sort((a, b) => b[1] - a[1]);
  const top = entries[0];
  if (!top) return null;
  const player = findPlayer(state, top[0]);
  return player ? { player, average: top[1] } : null;
}

export function capabilities(state: MatchState) {
  const open = state.phase === "upcoming" || state.phase === "live";
  const manager = state.role === "organizer";
  return {
    open,
    manager,
    editable: open && manager,
    canScore: open && (manager || state.scorekeeper === "Valen"),
  };
}

export function kickoffLabel(state: MatchState) {
  const diff = new Date(state.scheduledAt).getTime() - Date.now();
  if (diff <= 0) return null;
  const hours = Math.round(diff / 36e5);
  if (hours < 24) return `Arranca en ${hours} h`;
  const days = Math.round(hours / 24);
  return days === 1 ? "Arranca mañana" : `Arranca en ${days} días`;
}

export const phaseLabel: Record<Phase, string> = {
  upcoming: "Por jugar",
  live: "En juego",
  closed: "Cerrado",
  cancelled: "Cancelado",
};
