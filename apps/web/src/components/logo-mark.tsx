import type { ComponentPropsWithoutRef } from "react";

type LogoMarkProps = ComponentPropsWithoutRef<"svg"> & {
  label?: string;
};

export function LogoMark({ label, ...props }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      {...props}
    >
      <rect x="2" y="2" width="28" height="28" rx="8" fill="var(--primary)" />
      <path d="M16 2v28" stroke="var(--primary-foreground)" strokeWidth="2.4" />
      <circle cx="16" cy="16" r="5.5" stroke="var(--primary-foreground)" strokeWidth="2.4" />
    </svg>
  );
}
