"use client";

import { ClerkProvider, useClerk } from "@clerk/react";
import { Button } from "@hay-fulbo/ui/components/button";
import { useState } from "react";

import { safeReturnTo } from "./return-to";

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.96 10.96 0 0 0 12 1 11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}

function GoogleButton({ onError }: { onError: (message: string) => void }) {
  const clerk = useClerk();
  const [redirecting, setRedirecting] = useState(false);

  async function start() {
    const signIn = clerk.client?.signIn;
    if (!clerk.loaded || !signIn) {
      onError("Google todavía está cargando. Probá de nuevo en un segundo.");
      return;
    }
    setRedirecting(true);
    const returnTo = safeReturnTo(new URLSearchParams(window.location.search).get("returnTo"));
    const callback = `/login/google?returnTo=${encodeURIComponent(returnTo)}`;
    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: callback,
        redirectUrlComplete: callback,
      });
    } catch {
      setRedirecting(false);
      onError("No pudimos abrir Google. Probá de nuevo.");
    }
  }

  return (
    <Button type="button" variant="outline" onClick={start} disabled={redirecting}>
      <GoogleIcon />
      {redirecting ? "Abriendo Google…" : "Continuar con Google"}
    </Button>
  );
}

export function GoogleSignIn({
  publishableKey,
  onError,
}: {
  publishableKey: string;
  onError: (message: string) => void;
}) {
  return (
    <ClerkProvider publishableKey={publishableKey} signInUrl="/login" afterSignOutUrl="/login">
      <GoogleButton onError={onError} />
    </ClerkProvider>
  );
}
