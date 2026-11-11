import { clerkPublishableKey } from "./clerk-config";
import LoginScreen from "./login-screen";

// The Clerk key is runtime configuration, so the page cannot be prerendered at build time.
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return <LoginScreen clerkPublishableKey={clerkPublishableKey()} />;
}
