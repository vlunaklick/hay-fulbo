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
      <circle cx="16" cy="16" r="14" fill="var(--primary)" />
      <circle cx="16" cy="16" r="13.25" stroke="var(--primary-foreground)" strokeWidth="1.5" />
      <path
        d="m16 8.5 7.13 5.18-2.72 8.39h-8.82l-2.72-8.39L16 8.5Z"
        fill="var(--primary-foreground)"
      />
      <path
        d="M16 8.5V2.75M23.13 13.68l5.47-1.77M20.41 22.07l3.38 4.66M11.59 22.07l-3.38 4.66M8.87 13.68 3.4 11.91"
        stroke="var(--primary-foreground)"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
