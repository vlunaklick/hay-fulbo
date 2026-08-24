"use client";

import { cn } from "@hay-fulbo/ui/lib/utils";
import { useId } from "react";

export function GridPattern({
  width = 40,
  height = 40,
  x = -1,
  y = -1,
  strokeDasharray = "2 4",
  className,
  ...props
}: {
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  strokeDasharray?: string;
  className?: string;
} & React.SVGProps<SVGSVGElement>) {
  const id = useId();

  return (
    <svg
      aria-hidden="true"
      className={cn("pointer-events-none inset-0 h-full w-full fill-none", className)}
      {...props}
    >
      <defs>
        <pattern id={id} width={width} height={height} patternUnits="userSpaceOnUse" x={x} y={y}>
          <path
            d={`M.5 ${String(height)}V.5H${String(width)}`}
            fill="none"
            strokeDasharray={strokeDasharray}
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" strokeWidth={0} fill={`url(#${id})`} />
    </svg>
  );
}
