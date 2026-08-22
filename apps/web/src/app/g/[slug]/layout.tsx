import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Hay Fulbo · Grupo público",
};

export default function PublicGroupLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <div className="min-h-svh bg-background text-foreground">{children}</div>;
}
