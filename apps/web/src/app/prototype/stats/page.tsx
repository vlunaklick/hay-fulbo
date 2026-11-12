import type { Metadata } from "next";

import StatsPrototype from "./stats-prototype";

export const metadata: Metadata = {
  title: "Prototipo · Estadísticas",
  robots: { index: false, follow: false },
};

export default async function StatsPrototypePage({
  searchParams,
}: {
  searchParams: Promise<{ v?: string; screen?: string; data?: string }>;
}) {
  const { v, screen, data } = await searchParams;
  return (
    <StatsPrototype
      initialVariant={Math.max(0, (Number.parseInt(v ?? "1", 10) || 1) - 1)}
      initialScreen={screen === "sociedades" ? "sociedades" : "estadisticas"}
      empty={data === "empty"}
    />
  );
}
