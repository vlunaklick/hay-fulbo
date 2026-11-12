import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Suspense } from "react";

import { SharedLinkView } from "@/features/shared-view/shared-group-view";

export const metadata: Metadata = {
  robots: {
    follow: false,
    index: false,
    noarchive: true,
  },
};

// The view lives here, not in the pages, so match and player routes open as a
// sheet over the same screen and keep the tab underneath.
export default function SharedLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <Suspense>
      <SharedLinkView />
      {children}
    </Suspense>
  );
}
