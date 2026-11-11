import { expect, test } from "bun:test";

import { isMatchConflict, matchCommandErrorMessage } from "./match-command-error";

test("translates serialized domain errors without leaking codes or server messages", () => {
  expect(matchCommandErrorMessage({ message: "match_not_open" })).toBe("El partido ya se cerró");
  expect(
    matchCommandErrorMessage(
      { data: { domainCode: "forbidden" } },
      { type: "adjustStat", field: "goals" },
    ),
  ).toBe("Ya no podés cargar goles en este partido");
  expect(
    matchCommandErrorMessage(
      { shape: { data: { domainCode: "invalid_input" } } },
      { type: "adjustStat", field: "goals", delta: -1 },
    ),
  ).toBe("Ese gol ya no está en el marcador");
  expect(
    matchCommandErrorMessage(
      { message: "Stat cannot go below zero" },
      { type: "adjustStat", field: "ownGoals", delta: -1 },
    ),
  ).toBe("Ese gol ya no está en el marcador");
  expect(matchCommandErrorMessage({ message: "internal database detail" })).toBe(
    "No pudimos guardar el cambio. Probá de nuevo.",
  );
});

test("recognizes conflicts in both client error shapes", () => {
  expect(isMatchConflict({ data: { code: "CONFLICT" } })).toBe(true);
  expect(isMatchConflict({ shape: { data: { code: "CONFLICT" } } })).toBe(true);
  expect(matchCommandErrorMessage({ data: { code: "CONFLICT" } })).toContain(
    "Alguien cambió el partido",
  );
});
