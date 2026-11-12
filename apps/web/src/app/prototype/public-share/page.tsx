import type { Metadata } from "next";
import { Suspense } from "react";

import { PublicSharePrototype } from "./public-share-prototype";

export const metadata: Metadata = {
  title: "Prototipo · Vista compartida",
  description: "Prototipo descartable de la vista pública y compartida de Hay Fulbo.",
  robots: { index: false, follow: false },
};

export default function PublicSharePrototypePage() {
  return (
    <Suspense>
      <PublicSharePrototype />
    </Suspense>
  );
}
