import type { Metadata } from "next";

import GrupoPrototype from "./grupo-prototype";

export const metadata: Metadata = {
  title: "Prototipo · Grupo",
  description: "Prototipo descartable de /dashboard/grupo.",
  robots: { index: false, follow: false },
};

export default async function GrupoPrototypePage({
  searchParams,
}: {
  searchParams: Promise<{ v?: string }>;
}) {
  const { v } = await searchParams;
  return <GrupoPrototype initial={(Number.parseInt(v ?? "1", 10) || 1) - 1} />;
}
