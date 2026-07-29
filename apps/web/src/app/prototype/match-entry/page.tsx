import { Suspense } from "react";

import MatchEntryPrototype from "./match-entry-prototype";

export default function MatchEntryPrototypePage() {
  return (
    <Suspense fallback={null}>
      <MatchEntryPrototype />
    </Suspense>
  );
}
