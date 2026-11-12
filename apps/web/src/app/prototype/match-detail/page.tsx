import type { Metadata } from "next";

import type { Phase, Role } from "./data";
import MatchDetailPrototype from "./match-detail-prototype";

export const metadata: Metadata = {
  title: "Prototipo · Detalle de partido",
  robots: { index: false, follow: false },
};

const phases: Phase[] = ["upcoming", "live", "closed", "cancelled"];

export default async function MatchDetailPrototypePage({
  searchParams,
}: {
  searchParams: Promise<{ v?: string; estado?: string; rol?: string; chrome?: string }>;
}) {
  const params = await searchParams;
  const v = Number.parseInt(params.v ?? "1", 10);
  const phase = phases.includes(params.estado as Phase) ? (params.estado as Phase) : "live";
  const role: Role = params.rol === "player" ? "player" : "organizer";
  return (
    <MatchDetailPrototype
      initialVariant={v >= 1 && v <= 3 ? v - 1 : 0}
      initialPhase={phase}
      initialRole={role}
      chrome={params.chrome !== "0"}
    />
  );
}
