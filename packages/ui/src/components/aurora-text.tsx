"use client";

import { cn } from "@hay-fulbo/ui/lib/utils";
import * as React from "react";

export function AuroraText({
  children,
  className,
  colors = ["#B7F34A", "#F2F5EF", "#75D69C"],
}: {
  children: React.ReactNode;
  className?: string;
  colors?: string[];
}) {
  const gradient = React.useMemo(
    () => `linear-gradient(90deg, ${colors.join(", ")}, ${colors[0]})`,
    [colors],
  );

  return (
    <span
      className={cn("animate-aurora inline-block bg-clip-text text-transparent", className)}
      style={{ backgroundImage: gradient }}
    >
      {children}
    </span>
  );
}
