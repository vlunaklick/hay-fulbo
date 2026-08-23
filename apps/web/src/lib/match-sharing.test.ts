import { describe, expect, test } from "bun:test";

import {
  buildCalendarIcs,
  buildMatchMessage,
  buildResultCardSvg,
  buildWhatsAppUrl,
} from "./match-sharing";

describe("match sharing", () => {
  test("builds a WhatsApp-ready invitation without an API", () => {
    const message = buildMatchMessage({
      court: {
        address: "Av. Córdoba 1234",
        mapsUrl: "https://maps.example/cancha",
        name: "El Andén",
      },
      currency: "ARS",
      estimatedPerPlayerMinor: "600000",
      groupName: "Los Miércoles",
      invitationUrl: "https://fulbo.example/jugar/token",
      playing: 7,
      scheduledAt: "2026-08-06T00:00:00.000Z",
      timeZone: "America/Argentina/Buenos_Aires",
    });

    expect(message).toContain("Miércoles 5 de agosto · 21:00");
    expect(message).toContain("El Andén · Av. Córdoba 1234");
    expect(message).toContain("Estimado $\u00A06.000");
    expect(message).toContain("7 anotados");
    expect(buildWhatsAppUrl(message)).toStartWith("https://wa.me/?text=");
  });

  test("builds an escaped CRLF calendar event in UTC", () => {
    const ics = buildCalendarIcs({
      description: "Confirmá acá: https://fulbo.example/a,b",
      location: "Cancha 1; Palermo",
      start: "2026-08-06T00:00:00.000Z",
      title: "Hay Fulbo\nLos Miércoles",
      uid: "match-1@hay-fulbo",
    });

    expect(ics).toContain("\r\n");
    expect(ics).toContain("DTSTART:20260806T000000Z");
    expect(ics).toContain("DTEND:20260806T013000Z");
    expect(ics).toContain("SUMMARY:Hay Fulbo\\nLos Miércoles");
    expect(ics).toContain("LOCATION:Cancha 1\\; Palermo");
    expect(ics).toContain("https://fulbo.example/a\\,b");
  });

  test("builds a self-contained and escaped result card", () => {
    const svg = buildResultCardSvg({
      dateLabel: "29 jul 2026",
      groupName: "Los <Miércoles>",
      left: { goals: 6, name: "Verde & Oro" },
      right: { goals: 4, name: "Negro" },
    });

    expect(svg).toStartWith("<svg");
    expect(svg).toContain("Los &lt;Miércoles&gt;");
    expect(svg).toContain("Verde &amp; Oro");
    expect(svg).toContain(">6</text>");
    expect(svg).toContain(">4</text>");
    expect(svg).not.toContain("Los <Miércoles>");
  });
});
