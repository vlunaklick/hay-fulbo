import { Suspense } from "react";

import { PlayersPage } from "@/features/players/players-page";

export default function DashboardPlayersPage() {
  return (
    <Suspense fallback={null}>
      <PlayersPage />
    </Suspense>
  );
}
