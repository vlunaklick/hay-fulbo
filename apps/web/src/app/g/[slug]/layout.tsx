import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Suspense } from "react";

import { PublicGroupView } from "@/features/shared-view/shared-group-view";

export const metadata: Metadata = {
  title: "Hay Fulbo · Grupo público",
};

// The view lives here, not in the pages, so match and player routes open as a
// sheet over the same screen and keep the tab underneath.
export default async function PublicGroupLayout({
  children,
  params,
}: Readonly<{ children: ReactNode; params: Promise<{ slug: string }> }>) {
  const { slug } = await params;
  return (
    <Suspense>
      <PublicGroupView slug={slug} />
      {children}
    </Suspense>
  );
}
