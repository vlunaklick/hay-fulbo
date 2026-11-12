"use client";

import { Button } from "@hay-fulbo/ui/components/button";
import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import type { ComponentProps } from "react";

import { LogoMark } from "@/components/logo-mark";
import { authClient } from "@/lib/auth-client";

// The CTA knows who's looking: a signed-in user goes straight to the app.
export function PrimaryCta({
  size = "lg",
  className,
}: {
  size?: "default" | "lg";
  className?: string;
}) {
  const { data } = authClient.useSession();
  const signedIn = Boolean(data?.user);
  return (
    <Button
      size={size}
      className={className}
      render={<Link href={signedIn ? "/dashboard" : "/login"} />}
      nativeButton={false}
    >
      {signedIn ? "Ir a mis grupos" : "Armar mi grupo"}
      <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
    </Button>
  );
}

export function SignInLink(props: Omit<ComponentProps<typeof Button>, "render">) {
  const { data } = authClient.useSession();
  if (data?.user) return null;
  return (
    <Button variant="ghost" render={<Link href="/login" />} nativeButton={false} {...props}>
      Ingresar
    </Button>
  );
}

export function Brand() {
  return (
    <Link
      href="/"
      className="-mx-2 flex h-11 items-center gap-2.5 rounded-md px-2 outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <LogoMark className="size-7" />
      <span className="text-base font-semibold tracking-tight">Hay Fulbo</span>
    </Link>
  );
}
