export type StatsMatchStatus = "open" | "closed" | "cancelled";
export type StatsResultFilter = "all" | "decided" | "draws";

export type StatsFilters = {
  from?: string;
  to?: string;
  courtId?: string;
  result?: StatsResultFilter;
};

export type StatsSource = {
  group: {
    id: string;
    name: string;
    timeZone: string;
    currency: string;
  };
  courts: readonly {
    id: string;
    name: string;
    address: string;
    mapsUrl: string;
  }[];
  players: readonly {
    id: string;
    displayName: string;
    normalizedName: string;
    archived: boolean;
  }[];
  matches: readonly StatsSourceMatch[];
};

export type StatsSourceMatch = {
  id: string;
  courtId: string | null;
  scheduledAt: Date;
  status: StatsMatchStatus;
  courtCostMinor: bigint | null;
  teams: readonly StatsSourceTeam[];
};

export type StatsSourceTeam = {
  id: string;
  slot: number;
  displayName: string;
  color: string | null;
  captainName: string | null;
  unattributedGoals: number;
  appearances: readonly {
    playerId: string;
    joinedOrder: number;
    goals: number;
    assists: number;
    ownGoals: number;
    expectedMinor: bigint;
    paidMinor: bigint;
  }[];
};

export type StatsAggregate = {
  playerId: string;
  displayName: string;
  normalizedName: string;
  archived: boolean;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  winPercentage: number;
  goals: number;
  assists: number;
  contributions: number;
  goalsPerMatch: number;
  assistsPerMatch: number;
  contributionsPerMatch: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  ownGoals: number;
};

export type StatsMatchListItem = {
  matchId: string;
  scheduledAt: Date;
  status: StatsMatchStatus;
  court: StatsSource["courts"][number] | null;
  teams: readonly {
    id: string;
    slot: number;
    displayName: string;
    color: string | null;
    captainName: string | null;
    goals: number;
  }[];
};

export type StatsDashboard = {
  group: StatsSource["group"];
  courts: StatsSource["courts"];
  filters: StatsFilters;
  summary: {
    matchesPlayed: number;
    totalGoals: number;
    goalsPerMatch: number;
  };
  ranking: StatsAggregate[];
  history: StatsMatchListItem[];
  upcoming: (StatsMatchListItem & { courtCostMinor: string | null }) | null;
  finances: {
    matchId: string;
    courtCostMinor: string | null;
    expectedMinor: string;
    paidMinor: string;
    debtMinor: string;
    participantCount: number;
    paidCount: number;
    debtors: {
      playerId: string;
      displayName: string;
      expectedMinor: string;
      paidMinor: string;
      debtMinor: string;
    }[];
  } | null;
};

export type PlayerStats = {
  group: StatsSource["group"];
  player: StatsSource["players"][number];
  aggregate: StatsAggregate | null;
  matches: (StatsMatchListItem & {
    teamId: string;
    outcome: "win" | "draw" | "loss";
    goals: number;
    assists: number;
    contributions: number;
    ownGoals: number;
  })[];
};

export type StatsMatchDetail = StatsMatchListItem & {
  group: StatsSource["group"];
  courtCostMinor: string | null;
  appearances: {
    playerId: string;
    playerDisplayName: string;
    teamId: string;
    joinedOrder: number;
    goals: number;
    assists: number;
    ownGoals: number;
    expectedMinor: string;
    paidMinor: string;
    debtMinor: string;
  }[];
};
