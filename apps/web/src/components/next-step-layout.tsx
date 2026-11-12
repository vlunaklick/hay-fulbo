"use client";

import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@hay-fulbo/ui/components/sheet";
import { cn } from "@hay-fulbo/ui/lib/utils";
import { XIcon } from "lucide-react";
import * as React from "react";
import { createPortal } from "react-dom";

/**
 * Desktop half of the "Próximo paso" pattern. See docs/prototypes/proximo-paso.md.
 *
 * Mobile: one column; a DrillDetail opens as a bottom Sheet.
 * Desktop (lg+): the mobile screen becomes the left column and the detail that a row
 * opens lives in the right column, inline. Same order of thought, more room.
 */

const DESKTOP_QUERY = "(min-width: 64rem)";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(DESKTOP_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export function useIsDesktop() {
  return React.useSyncExternalStore(
    subscribe,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => false,
  );
}

const DetailSlotContext = React.createContext<HTMLElement | null>(null);

export function NextStepLayout({
  children,
  className,
  emptyDetail,
}: {
  children: React.ReactNode;
  className?: string;
  /** Shown in the right column on desktop when no row is open. */
  emptyDetail?: React.ReactNode;
}) {
  const [slot, setSlot] = React.useState<HTMLElement | null>(null);
  return (
    <DetailSlotContext.Provider value={slot}>
      <div
        className={cn(
          "mx-auto flex w-full max-w-xl flex-col gap-6 lg:grid lg:max-w-none lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start lg:gap-10",
          className,
        )}
      >
        <div className="flex min-w-0 flex-col gap-6 lg:sticky lg:top-20">{children}</div>
        <div className="hidden min-w-0 lg:block">
          <div ref={setSlot} className="empty:hidden" />
          {emptyDetail ? (
            <div className="hidden text-sm text-muted-foreground [div:empty+&]:block">
              {emptyDetail}
            </div>
          ) : null}
        </div>
      </div>
    </DetailSlotContext.Provider>
  );
}

/**
 * What a DrillRow opens. Bottom Sheet on mobile, right column on desktop.
 * On desktop, pages should open the most relevant row by default so the column is never empty.
 */
export function DrillDetail({
  children,
  description,
  onOpenChange,
  open,
  title,
}: {
  children: React.ReactNode;
  description?: React.ReactNode;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: React.ReactNode;
}) {
  const desktop = useIsDesktop();
  const slot = React.useContext(DetailSlotContext);

  if (desktop && slot) {
    if (!open) return null;
    return createPortal(
      <section
        aria-label={typeof title === "string" ? title : undefined}
        className="flex flex-col gap-4"
      >
        <header className="flex items-start justify-between gap-3 border-b pb-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 className="text-lg font-bold">{title}</h2>
            {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
          </div>
          <button
            aria-label="Cerrar"
            className="grid size-11 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted"
            onClick={() => onOpenChange(false)}
            type="button"
          >
            <XIcon aria-hidden className="size-4" />
          </button>
        </header>
        <div>{children}</div>
      </section>,
      slot,
    );
  }

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent className="max-h-[85svh]" side="bottom">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : null}
        </SheetHeader>
        <SheetBody>{children}</SheetBody>
      </SheetContent>
    </Sheet>
  );
}
