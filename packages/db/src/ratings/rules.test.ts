import { describe, expect, test } from "bun:test";

import {
  completeVoteCount,
  isRatingRevealed,
  ratingAverages,
  ratingQuorumTarget,
  validRatingsFor,
} from "./rules";

const participants = [
  { playerId: "a", linkedUserId: "u1" },
  { playerId: "b", linkedUserId: "u2" },
  { playerId: "c", linkedUserId: null },
  { playerId: "d", linkedUserId: "u3" },
];

describe("ratingQuorumTarget", () => {
  test("computes each quorum level", () => {
    expect(ratingQuorumTarget("all_voted", 10)).toBe(10);
    expect(ratingQuorumTarget("half_plus_one", 10)).toBe(6);
    expect(ratingQuorumTarget("half_plus_one", 5)).toBe(3);
    expect(ratingQuorumTarget("first_vote", 10)).toBe(1);
  });

  test("never reveals without eligible voters", () => {
    expect(ratingQuorumTarget("first_vote", 0)).toBe(Number.POSITIVE_INFINITY);
    expect(isRatingRevealed("first_vote", 0, 0)).toBe(false);
  });
});

describe("isRatingRevealed", () => {
  test("requires every vote by default", () => {
    expect(isRatingRevealed("all_voted", 4, 3)).toBe(false);
    expect(isRatingRevealed("all_voted", 4, 4)).toBe(true);
  });
});

describe("completeVoteCount", () => {
  test("counts only voters who rated every other participant", () => {
    const ratings = [
      { raterPlayerId: "a", ratedPlayerId: "b", score: 7 },
      { raterPlayerId: "a", ratedPlayerId: "c", score: 5 },
      { raterPlayerId: "a", ratedPlayerId: "d", score: 6 },
      { raterPlayerId: "d", ratedPlayerId: "b", score: 8 },
    ];
    expect(completeVoteCount(participants, ratings)).toBe(1);
  });

  test("ignores raters who are no longer participants", () => {
    const ratings = [
      { raterPlayerId: "gone", ratedPlayerId: "b", score: 7 },
      { raterPlayerId: "gone", ratedPlayerId: "a", score: 7 },
      { raterPlayerId: "gone", ratedPlayerId: "c", score: 7 },
      { raterPlayerId: "gone", ratedPlayerId: "d", score: 7 },
    ];
    expect(completeVoteCount(participants, ratings)).toBe(0);
  });
});

describe("validRatingsFor and ratingAverages", () => {
  test("drops orphaned ratings and rounds to two decimals", () => {
    const ratings = [
      { raterPlayerId: "a", ratedPlayerId: "b", score: 8 },
      { raterPlayerId: "a", ratedPlayerId: "b", score: 7 },
      { raterPlayerId: "a", ratedPlayerId: "gone", score: 10 },
      { raterPlayerId: "gone", ratedPlayerId: "b", score: 1 },
    ];
    const averages = ratingAverages(participants, ratings);
    expect(validRatingsFor(participants, ratings)).toHaveLength(2);
    expect(averages.get("b")).toEqual({ average: 7.5, sum: 15, votes: 2 });
    expect(averages.has("gone")).toBe(false);
  });
});
