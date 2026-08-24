"use client";

import { cn } from "@hay-fulbo/ui/lib/utils";
import { motion, useMotionTemplate, useMotionValue } from "motion/react";
import * as React from "react";

export interface MagicCardProps extends React.HTMLAttributes<HTMLDivElement> {
  gradientSize?: number;
  gradientColor?: string;
  gradientFrom?: string;
  gradientTo?: string;
}

export function MagicCard({
  children,
  className,
  gradientSize = 200,
  gradientColor = "oklch(0.86 0.2 126 / 8%)",
  gradientFrom = "oklch(0.86 0.2 126)",
  gradientTo = "oklch(0.72 0.12 190)",
}: MagicCardProps) {
  const mouseX = useMotionValue(-gradientSize);
  const mouseY = useMotionValue(-gradientSize);

  const handleMouseMove = React.useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      mouseX.set(event.clientX - rect.left);
      mouseY.set(event.clientY - rect.top);
    },
    [mouseX, mouseY],
  );

  const handleMouseLeave = React.useCallback(() => {
    mouseX.set(-gradientSize);
    mouseY.set(-gradientSize);
  }, [gradientSize, mouseX, mouseY]);

  const glowBackground = useMotionTemplate`radial-gradient(${gradientSize}px circle at ${mouseX}px ${mouseY}px, ${gradientColor}, transparent 70%)`;
  const borderBackground = useMotionTemplate`radial-gradient(${gradientSize}px circle at ${mouseX}px ${mouseY}px, ${gradientFrom}, ${gradientTo}, transparent 70%)`;

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn("group relative rounded-[inherit]", className)}
    >
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: glowBackground }}
      />
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: borderBackground,
          padding: "1px",
          borderRadius: "inherit",
          WebkitMask: "linear-gradient(black, black) content-box, linear-gradient(black, black)",
          mask: "linear-gradient(black, black) content-box, linear-gradient(black, black)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}
