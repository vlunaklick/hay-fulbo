import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  robots: {
    follow: false,
    index: false,
    noarchive: true,
  },
};

export default function SharedLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">{children}</main>
  );
}
