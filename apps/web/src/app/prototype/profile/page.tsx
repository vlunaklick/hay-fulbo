import type { Metadata } from "next";
import { Suspense } from "react";

import ProfilePrototype from "./profile-prototype";

export const metadata: Metadata = {
  title: "Prototipo · Perfil",
  robots: { index: false, follow: false },
};

export default function ProfilePrototypePage() {
  return (
    <Suspense fallback={null}>
      <ProfilePrototype />
    </Suspense>
  );
}
