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
  return children;
}
