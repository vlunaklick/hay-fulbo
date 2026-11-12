"use client";

import { useReducer } from "react";

// Throwaway in-memory match for /prototype/pitch-mode. Same shape as the
// relevant slice of `matches.detail`, seeded with the worst realistic content:
// 7 vs 7, long names, a team name that truncates, goals of every kind.

export type Row = {
  playerId: string;
  playerDisplayName: string;
  goals: number;
  ownGoals: number;
};
export type Team = {
  id: string;
  slot: 1 | 2;
  displayName: string;
  appearances: Row[];
  unattributedGoals: number;
};
export type Field = "goals" | "ownGoals" | "unattributedGoals";
export type Adjust = { field: Field; delta: 1 | -1; playerId?: string; teamId?: string };
export type LastAction = { label: string; undo: Adjust[] };

const row = (playerId: string, playerDisplayName: string, goals = 0): Row => ({
  playerId,
  playerDisplayName,
  goals,
  ownGoals: 0,
});

export const SEED: Team[] = [
  {
    id: "t1",
    slot: 1,
    displayName: "Los de remera",
    unattributedGoals: 0,
    appearances: [
      row("a1", "Nico Fernández", 2),
      row("a2", "Juan Martín Etcheverry Bustamante", 1),
      row("a3", "Tito"),
      row("a4", "Pepe Argüello"),
      row("a5", "Lucho R."),
      row("a6", "Facundo Ezequiel Domínguez"),
      row("a7", "Gonza"),
    ],
  },
  {
    id: "t2",
    slot: 2,
    displayName: "Pecheras naranjas",
    unattributedGoals: 1,
    appearances: [
      row("b1", "Beto"),
      row("b2", "Maxi Sosa"),
      row("b3", "Rodrigo Villafañe", 1),
      row("b4", "Chino"),
      row("b5", "Santiago Rodríguez Larreta"),
      row("b6", "Ema"),
      row("b7", "Pablito Gutiérrez"),
    ],
  },
];

export function scoreOf(teams: Team[], teamId: string) {
  const team = teams.find((t) => t.id === teamId)!;
  const rival = teams.find((t) => t.id !== teamId)!;
  return (
    team.appearances.reduce((sum, r) => sum + r.goals, 0) +
    team.unattributedGoals +
    rival.appearances.reduce((sum, r) => sum + r.ownGoals, 0)
  );
}

/** Which team's score an adjustment moves. */
export function creditedTeam(teams: Team[], action: Adjust) {
  if (action.field === "unattributedGoals") return action.teamId!;
  const owner = teams.find((t) => t.appearances.some((r) => r.playerId === action.playerId))!;
  if (action.field === "goals") return owner.id;
  return teams.find((t) => t.id !== owner.id)!.id;
}

export function describe(teams: Team[], action: Adjust) {
  const name = teams
    .flatMap((t) => t.appearances)
    .find((r) => r.playerId === action.playerId)?.playerDisplayName;
  const team = teams.find((t) => t.id === creditedTeam(teams, action))!.displayName;
  const what =
    action.field === "goals"
      ? `Gol de ${name}`
      : action.field === "ownGoals"
        ? `Autogol de ${name}`
        : `Gol sin autor de ${team}`;
  return action.delta === 1 ? what : `Restado: ${what.charAt(0).toLowerCase()}${what.slice(1)}`;
}

function apply(teams: Team[], a: Adjust): Team[] {
  return teams.map((team) => {
    if (a.field === "unattributedGoals") {
      return team.id === a.teamId
        ? { ...team, unattributedGoals: Math.max(0, team.unattributedGoals + a.delta) }
        : team;
    }
    const field = a.field;
    return {
      ...team,
      appearances: team.appearances.map((r) =>
        r.playerId === a.playerId ? { ...r, [field]: Math.max(0, r[field] + a.delta) } : r,
      ),
    };
  });
}

type State = { teams: Team[]; last: LastAction | null; version: number };
type Msg = { type: "adjust"; actions: Adjust[]; label?: string } | { type: "undo" };

const invert = (a: Adjust): Adjust => ({ ...a, delta: a.delta === 1 ? -1 : 1 });

function reducer(state: State, msg: Msg): State {
  if (msg.type === "undo") {
    if (!state.last) return state;
    return {
      teams: state.last.undo.reduce(apply, state.teams),
      last: null,
      version: state.version + 1,
    };
  }
  const main = msg.actions[msg.actions.length - 1]!;
  return {
    teams: msg.actions.reduce(apply, state.teams),
    version: state.version + 1,
    last: {
      label: msg.label ?? describe(state.teams, main),
      undo: [...msg.actions].reverse().map(invert),
    },
  };
}

const init = (): State => ({ teams: SEED, last: null, version: 1 });

function buzz() {
  if ("vibrate" in navigator) navigator.vibrate(35);
}

export function usePitchMatch() {
  const [state, dispatch] = useReducer(reducer, undefined, init);
  return {
    ...state,
    score: (teamId: string) => scoreOf(state.teams, teamId),
    adjust(action: Adjust) {
      dispatch({ type: "adjust", actions: [action] });
      buzz();
    },
    /** Moves an unattributed goal onto an author (or an own goal) as one undoable change. */
    attribute(from: Adjust, to: Adjust) {
      dispatch({
        type: "adjust",
        actions: [from, to],
        label: `${describe(state.teams, to)} (era sin autor)`,
      });
      buzz();
    },
    undo: () => dispatch({ type: "undo" }),
  };
}

export type PitchMatch = ReturnType<typeof usePitchMatch>;
