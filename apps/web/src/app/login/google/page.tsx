import { redirect } from "next/navigation";

import { clerkPublishableKey } from "../clerk-config";
import GoogleCallback from "./google-callback";

export const dynamic = "force-dynamic";

export default function GoogleCallbackPage() {
  const publishableKey = clerkPublishableKey();
  if (!publishableKey) redirect("/login");
  return <GoogleCallback publishableKey={publishableKey} />;
}
