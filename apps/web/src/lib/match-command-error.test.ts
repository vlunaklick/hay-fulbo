import { expect, test } from "bun:test";

import {
  isMatchConflict,
  matchCommandErrorMessage,
  matchReadErrorMessage,
} from "./match-command-error";

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

test.each([
  ["closure_invalid", "Todavía falta completar datos para cerrar el partido"],
  ["group_archived", "El grupo está archivado"],
  ["player_archived", "Ese jugador está archivado"],
  ["court_archived", "Esa cancha está archivada"],
])("translates %s without suggesting a retry", (code, message) => {
  expect(matchCommandErrorMessage({ message: code })).toBe(message);
  expect(matchCommandErrorMessage({ data: { domainCode: code } })).toBe(message);
});

test("only suggests retrying network or unknown failures", () => {
  for (const error of [
    { message: "invalid_input" },
    { data: { code: "BAD_REQUEST" } },
    { shape: { data: { domainCode: "owner_required" } } },
  ]) {
    expect(matchCommandErrorMessage(error)).toBe("No pudimos guardar el cambio.");
  }
  expect(matchCommandErrorMessage(new TypeError("Failed to fetch"))).toBe(
    "No pudimos guardar el cambio. Probá de nuevo.",
  );
});

test("uses read copy for match query errors", () => {
  for (const error of [
    { message: "not_found" },
    { message: "NOT_FOUND" },
    { data: { code: "NOT_FOUND" } },
    { shape: { data: { domainCode: "not_found" } } },
  ]) {
    expect(matchReadErrorMessage(error)).toBe("Este partido no existe o no es de tu grupo");
  }
  for (const error of [
    { message: "forbidden" },
    { data: { code: "FORBIDDEN" } },
    { shape: { data: { code: "FORBIDDEN" } } },
  ]) {
    expect(matchReadErrorMessage(error)).toBe("No tenés acceso a este partido");
  }
  expect(matchReadErrorMessage(new Error("Failed to fetch"))).toBe(
    "Revisá tu conexión y volvé a intentar",
  );
});
