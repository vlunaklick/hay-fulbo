import type { ReactNode } from "react";

import { LogoMark } from "@/components/logo-mark";

/**
 * Shared frame for the signed-out pages (login, invitations): brand at the top,
 * one narrow column, no card chrome.
 */
export function PublicShell({
  children,
  width = "sm",
}: {
  children: ReactNode;
  width?: "sm" | "lg";
}) {
  return (
    <main className="flex min-h-svh flex-col items-center px-4 py-8 sm:py-12">
      <div
        className={`flex w-full flex-1 flex-col gap-10 sm:justify-center sm:gap-12 ${
          width === "lg" ? "max-w-xl" : "max-w-sm"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <LogoMark className="size-8" />
          <span className="text-base font-semibold tracking-tight">Hay Fulbo</span>
        </div>
        {children}
      </div>
    </main>
  );
}

export function PublicHeading({
  title,
  description,
}: {
  title: ReactNode;
  description?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">{title}</h1>
      {description ? (
        <p className="text-sm leading-relaxed text-muted-foreground text-pretty sm:text-base">
          {description}
        </p>
      ) : null}
    </div>
  );
}
