"use client";

import { AuthenticateWithRedirectCallback, ClerkProvider, useAuth, useClerk } from "@clerk/react";
import { Button } from "@hay-fulbo/ui/components/button";
import Link from "next/link";
import { useRef, useState } from "react";

import { useMountEffect } from "@/hooks/use-mount-effect";

import { safeReturnTo } from "../return-to";

function ExchangeSession({ onError }: { onError: (message: string) => void }) {
  const { getToken } = useAuth();
  const clerk = useClerk();
  // StrictMode replays mount effects in development; the session must be exchanged once.
  const started = useRef(false);

  useMountEffect(() => {
    if (started.current) return;
    started.current = true;
    const returnTo = safeReturnTo(new URLSearchParams(window.location.search).get("returnTo"));
    void (async () => {
      try {
        const token = await getToken();
        const response = await fetch("/api/auth/clerk/exchange", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { message?: string } | null;
          throw new Error(body?.message ?? "No pudimos iniciar sesión con Google.");
        }
        await clerk.signOut({ redirectUrl: returnTo });
      } catch (cause) {
        await clerk.signOut().catch(() => undefined);
        onError(cause instanceof Error ? cause.message : "No pudimos iniciar sesión con Google.");
      }
    })();
  });

  return null;
}

/**
 * Lands here twice: first with Clerk's OAuth callback params (handled by
 * AuthenticateWithRedirectCallback), then signed in to Clerk. At that point the
 * Clerk token is traded for a Hay Fulbo session and the Clerk session is dropped.
 */
function Exchange() {
  const { isLoaded, isSignedIn } = useAuth();
  const [error, setError] = useState<string | null>(null);

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
        <Button render={<Link href="/login" />} nativeButton={false}>
          Volver al login
        </Button>
      </div>
    );
  }

  return (
    <>
      <p role="status" className="text-sm text-muted-foreground">
        Entrando con Google…
      </p>
      {isLoaded && isSignedIn ? <ExchangeSession onError={setError} /> : null}
      {isLoaded && !isSignedIn ? (
        <AuthenticateWithRedirectCallback signInUrl="/login" signUpUrl="/login" />
      ) : null}
    </>
  );
}

export default function GoogleCallback({ publishableKey }: { publishableKey: string }) {
  return (
    <main className="grid min-h-svh place-items-center px-4">
      <ClerkProvider publishableKey={publishableKey} signInUrl="/login" afterSignOutUrl="/login">
        <Exchange />
      </ClerkProvider>
    </main>
  );
}
