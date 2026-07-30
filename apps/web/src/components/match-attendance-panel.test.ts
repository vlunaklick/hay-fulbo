import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "bun:test";

import { MatchAttendancePanel } from "./match-attendance-panel";

function renderPanel(status: "open" | "closed" | "cancelled") {
  const client = new QueryClient();
  return renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client },
      createElement(MatchAttendancePanel, {
        canEdit: status === "open",
        court: null,
        currency: "ARS",
        detail: {
          capacity: 10,
          courtCostMinor: "100000",
          id: "match-1",
          lockVersion: 0,
          rsvps: [],
          scheduledAt: new Date("2026-07-30T22:00:00.000Z"),
          status,
        },
        groupName: "Fulbito de los jueves",
        onCapacityChange: () => undefined,
        pending: false,
        timeZone: "America/Argentina/Buenos_Aires",
      }),
    ),
  );
}

test("match attendance visibility", () => {
  expect(renderPanel("open")).toContain("Convocatoria");
  expect(renderPanel("closed")).not.toContain("Convocatoria");
  expect(renderPanel("cancelled")).not.toContain("Convocatoria");
});
