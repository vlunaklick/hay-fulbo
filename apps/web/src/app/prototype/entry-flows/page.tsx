import type { Metadata } from "next";

import EntryFlowsPrototype from "./entry-flows-prototype";

export const metadata: Metadata = {
  title: "Prototipo · Flujos de entrada",
  robots: { index: false, follow: false },
};

export default async function EntryFlowsPrototypePage({
  searchParams,
}: {
  searchParams: Promise<{ v?: string; screen?: string; state?: string; chrome?: string }>;
}) {
  const params = await searchParams;
  return <EntryFlowsPrototype {...params} />;
}
