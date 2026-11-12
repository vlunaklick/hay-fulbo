"use client";

import { Avatar, AvatarFallback } from "@hay-fulbo/ui/components/avatar";
import { Button } from "@hay-fulbo/ui/components/button";
import { Card, CardContent } from "@hay-fulbo/ui/components/card";
import type { ReactNode } from "react";

import { LogoMark } from "@/components/logo-mark";
import { authClient } from "@/lib/auth-client";

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark className="size-8" />
      <span className="text-base font-semibold tracking-tight">Hay Fulbo</span>
    </div>
  );
}

/**
 * Shared frame for the signed-out pages (login, invitations): brand at the top,
 * one narrow column, no card chrome.
 */
export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-svh flex-col items-center px-4 py-8 sm:py-12">
      <div className="flex w-full max-w-sm flex-1 flex-col gap-10 sm:justify-center sm:gap-12">
        <Brand />
        {children}
      </div>
    </main>
  );
}

/**
 * Entry pages reached from a shared link: what you are joining leads, the action
 * sits in a bar pinned to the thumb on mobile. On desktop the context sits left
 * and the action right.
 */
export function PublicSplit({
  context,
  action,
  bar,
}: {
  context: ReactNode;
  action?: ReactNode;
  bar?: ReactNode;
}) {
  return (
    <main className={`min-h-svh px-4 pt-6 sm:pt-10 lg:px-8 lg:pb-16 ${bar ? "pb-48" : "pb-12"}`}>
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 lg:max-w-5xl lg:gap-12">
        <Brand />
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start lg:gap-12">
          <div className="flex flex-col gap-4">{context}</div>
          {action || bar ? (
            <div className="flex flex-col gap-6 lg:sticky lg:top-10">
              {action}
              {bar ? (
                <div className="fixed inset-x-0 bottom-0 z-10 border-t bg-background px-4 pt-3 pb-[max(env(safe-area-inset-bottom),1rem)] lg:static lg:border-0 lg:bg-transparent lg:p-0">
                  <div className="mx-auto flex max-w-md flex-col gap-2 lg:max-w-none">{bar}</div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
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

function groupInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

/** The group someone is about to join, shown as a pass. */
export function GroupPass({
  groupName,
  kicker,
  children,
}: {
  groupName: string;
  kicker: ReactNode;
  children?: ReactNode;
}) {
  return (
    <>
      <p className="text-sm font-medium text-muted-foreground">{kicker}</p>
      <Card className="rounded-xl">
        <CardContent className="flex flex-col gap-5">
          <div className="flex items-center gap-4">
            <Avatar className="size-14">
              <AvatarFallback className="bg-secondary text-base font-bold text-foreground">
                {groupInitials(groupName)}
              </AvatarFallback>
            </Avatar>
            <h1 className="min-w-0 text-2xl font-bold tracking-tight text-balance">{groupName}</h1>
          </div>
          {children}
        </CardContent>
      </Card>
    </>
  );
}

/** "As you@x.com · Switch": signs out and comes back to the same link through login. */
export function AccountSwitch({ email, returnTo }: { email: string; returnTo: string }) {
  return (
    <div className="flex min-w-0 items-center justify-center gap-1 text-xs text-muted-foreground lg:justify-start">
      <span className="min-w-0 truncate">Como {email}</span>
      <Button
        type="button"
        variant="link"
        size="xs"
        className="shrink-0 px-2"
        onClick={() =>
          authClient.signOut({
            fetchOptions: {
              onSuccess: () => {
                window.location.assign(`/login?returnTo=${encodeURIComponent(returnTo)}`);
              },
            },
          })
        }
      >
        Cambiar de cuenta
      </Button>
    </div>
  );
}
