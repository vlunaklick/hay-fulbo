import type { Metadata } from "next";

import LandingPrototype from "./landing-prototype";

export const metadata: Metadata = {
  title: "Prototipo · Landing",
  robots: { index: false, follow: false },
};

export default async function LandingPrototypePage({
  searchParams,
}: {
  searchParams: Promise<{ v?: string }>;
}) {
  const { v } = await searchParams;
  const index = Number.parseInt(v ?? "1", 10) - 1;
  return <LandingPrototype initial={index >= 0 && index < 3 ? index : 0} />;
}
