import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Hay Fulbo · Grupo público",
};

export default function PublicGroupLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <main className="mx-auto min-h-svh w-full max-w-7xl bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8 lg:py-12">
      {children}
    </main>
  );
}
