import type { Metadata } from "next";
import { Suspense } from "react";

import { Harness } from "./harness";

export const metadata: Metadata = {
  title: "Prototipo · Inicio del grupo",
  robots: { index: false, follow: false },
};

export default function HomeDashboardPrototypePage() {
  return (
    <Suspense fallback={null}>
      <Harness />
    </Suspense>
  );
}
