"use client";

import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@hay-fulbo/ui/components/sheet";
import { useIsMobile } from "@hay-fulbo/ui/hooks/use-mobile";
import type * as React from "react";

/**
 * What a `DrillRow` opens: a bottom sheet on phones, a side panel on desktop.
 * See docs/prototypes/proximo-paso.md.
 */
export function DrillSheet({
  children,
  description,
  footer,
  onOpenChange,
  open,
  title,
}: {
  children: React.ReactNode;
  description?: React.ReactNode;
  footer?: React.ReactNode;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: React.ReactNode;
}) {
  const mobile = useIsMobile();
  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent className="max-h-[88dvh] sm:max-w-md" side={mobile ? "bottom" : "right"}>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : null}
        </SheetHeader>
        <SheetBody>{children}</SheetBody>
        {footer ? <SheetFooter>{footer}</SheetFooter> : null}
      </SheetContent>
    </Sheet>
  );
}
