import { Suspense } from "react";

import { GroupMembersPage } from "@/components/group-members-page";

export default function GroupSettingsPage() {
  // The open topic lives in ?tema=, read on the client with useSearchParams.
  return (
    <Suspense fallback={null}>
      <GroupMembersPage />
    </Suspense>
  );
}
