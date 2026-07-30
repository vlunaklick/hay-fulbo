import type { Metadata } from "next";

import SharedDashboardPrototype from "./shared-dashboard-prototype";

export const metadata: Metadata = {
  title: "Prototipo · Dashboard compartido",
  description: "Prototipo descartable de la vista pública de Hay Fulbo.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function SharedDashboardPrototypePage({
  searchParams,
}: {
  searchParams: Promise<{ variant?: string }>;
}) {
  const { variant } = await searchParams;

  return <SharedDashboardPrototype initialVariant={variant} />;
}
