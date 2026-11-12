import { Suspense } from "react";

import PitchModePrototype from "./pitch-mode-prototype";

export default function PitchModePrototypePage() {
  return (
    <Suspense fallback={null}>
      <PitchModePrototype />
    </Suspense>
  );
}
