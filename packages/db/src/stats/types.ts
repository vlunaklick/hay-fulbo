export type StatsMatchStatus = "open" | "closed" | "cancelled";
export type StatsResultFilter = "all" | "decided" | "draws";

export type StatsFilters = {
  from?: string;
  to?: string;
  courtId?: string;
  result?: StatsResultFilter;
};

export type StatsRatingQuorum = "all_voted" | "half_plus_one" | "first_vote";

export type StatsFigure = {
  playerId: string;
  displayName: string;
  average: number;
};

export type StatsSource = {
  group: {
    id: string;
    name: string;
    timeZone: string;
    currency: string;
    ratingQuorum?: StatsRatingQuorum;
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
    linkedUserId?: string | null;
  }[];
  matches: readonly StatsSourceMatch[];
  ratings?: readonly {
    matchId: string;
    raterPlayerId: string;
    ratedPlayerId: string;
    score: number;
  }[];
  absences?: readonly { matchId: string; playerId: string }[];
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
  absences: number;
  ratingAverage: number | null;
  ratingMatchCount: number;
};

export type StatsMatchListItem = {
  matchId: string;
  scheduledAt: Date;
  status: StatsMatchStatus;
  court: StatsSource["courts"][number] | null;
  figure?: StatsFigure | null;
  teams: readonly {
    id: string;
    slot: number;
    displayName: string;
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
  societies: StatsSociety[];
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

export type StatsSociety = {
  playerIds: readonly [string, string];
  playerNames: readonly [string, string];
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  winPercentage: number;
  goalDifference: number;
  contributions: number;
};

export type MatchParity = {
  matchId: string;
  confidence: "low" | "medium" | "high";
  sample: {
    averageMatchesPerPlayer: number;
    closedMatches: number;
  };
  teams: readonly [
    {
      id: string;
      displayName: string;
      probability: number;
      rating: number;
    },
    {
      id: string;
      displayName: string;
      probability: number;
      rating: number;
    },
  ];
  drawProbability: number;
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
