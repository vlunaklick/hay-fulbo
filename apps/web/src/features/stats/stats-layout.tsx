import { cn } from "@hay-fulbo/ui/lib/utils";
import { ChevronLeftIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type * as React from "react";

/** One column, like every "Próximo paso" screen. Dense sheets get a wider column. */
export function StatsPage({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div
      className={cn("mx-auto flex w-full min-w-0 flex-col gap-6", wide ? "max-w-3xl" : "max-w-xl")}
    >
      {children}
    </div>
  );
}

export function StatsBack({ children, href }: { children: React.ReactNode; href: Route }) {
  return (
    <Link
      className="-ml-1 inline-flex min-h-9 items-center gap-0.5 rounded-md pr-2 transition-colors duration-100 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      href={href}
    >
      <ChevronLeftIcon aria-hidden="true" className="size-4" />
      {children}
    </Link>
  );
}

/** Page-level "nothing here" line: compact, dashed, never a big empty block. */
export function StatsEmpty({
  description,
  icon,
  title,
}: {
  description?: string;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <section className="flex items-start gap-3 rounded-lg border border-dashed p-4">
      <span aria-hidden="true" className="mt-0.5 shrink-0 text-muted-foreground [&_svg]:size-5">
        {icon}
      </span>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold">{title}</h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
    </section>
  );
}
