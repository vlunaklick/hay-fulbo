import { cn } from "@hay-fulbo/ui/lib/utils";
import { ChevronRightIcon } from "lucide-react";
import type * as React from "react";

/**
 * "Próximo paso" pattern. See docs/prototypes/proximo-paso.md.
 *
 * A screen answers "¿qué hago ahora?":
 *   StatusHeader → hero number → NextStep (one action) → DrillList (rows that open sheets/pages)
 * and, only when something must be at the thumb, an ActionDock.
 */

export function StatusHeader({
  back,
  meta,
  status,
  title,
}: {
  back?: React.ReactNode;
  meta?: React.ReactNode;
  status?: React.ReactNode;
  title: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-2">
      {back ? <div className="text-sm text-muted-foreground">{back}</div> : null}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h1 className="text-xl font-bold tracking-tight text-balance">{title}</h1>
          {meta ? <p className="text-xs text-muted-foreground">{meta}</p> : null}
        </div>
        {status ? <div className="shrink-0">{status}</div> : null}
      </div>
    </header>
  );
}

/** The one number the screen is about: a score, a total, a count. */
export function HeroNumber({
  caption,
  children,
  className,
}: {
  caption?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-1 py-4 text-center", className)}>
      <div className="text-5xl font-black leading-none tracking-tight tabular-nums">{children}</div>
      {caption ? <p className="text-sm text-muted-foreground">{caption}</p> : null}
    </div>
  );
}

/** The single thing to do now. Holds the view's only primary action. */
export function NextStep({
  action,
  children,
  className,
  kicker,
  title,
}: {
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  kicker?: React.ReactNode;
  title: React.ReactNode;
}) {
  return (
    <section
      aria-label="Próximo paso"
      className={cn("flex flex-col gap-3 rounded-xl border bg-card p-4", className)}
    >
      <div className="flex flex-col gap-0.5">
        {kicker ? <p className="text-xs font-medium text-muted-foreground">{kicker}</p> : null}
        <h2 className="text-lg font-bold text-balance">{title}</h2>
        {children ? <div className="text-sm text-muted-foreground">{children}</div> : null}
      </div>
      {action ? <div className="flex gap-2 *:flex-1">{action}</div> : null}
    </section>
  );
}

/** Quiet list of everything that is not the next step. Each row drills in. */
export function DrillList({
  children,
  className,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title?: React.ReactNode;
}) {
  return (
    <section className={cn("flex flex-col", className)}>
      {title ? <h2 className="mb-1 text-xs font-medium text-muted-foreground">{title}</h2> : null}
      <div className="flex flex-col divide-y">{children}</div>
    </section>
  );
}

type DrillRowProps = {
  label: React.ReactNode;
  value?: React.ReactNode;
  leading?: React.ReactNode;
  /** Hide the chevron for read-only rows. */
  static?: boolean;
  /** The row whose DrillDetail is open (highlighted on desktop). */
  selected?: boolean;
  className?: string;
} & (
  | { render?: never; onClick?: () => void }
  | { render: (props: { className: string; children: React.ReactNode }) => React.ReactNode }
);

/**
 * A 48px row: label left, short value right, chevron. Pass `render` to use a Link,
 * or `onClick` to open a Sheet.
 */
export function DrillRow(props: DrillRowProps) {
  const { label, value, leading, className } = props;
  const isStatic = props.static;
  const selected = props.selected;
  const content = (
    <>
      {leading ? <span className="flex shrink-0 items-center">{leading}</span> : null}
      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{label}</span>
      {value ? (
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{value}</span>
      ) : null}
      {isStatic ? null : (
        <ChevronRightIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      )}
    </>
  );
  const rowClass = cn(
    "flex min-h-12 w-full items-center gap-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
    !isStatic && "cursor-pointer transition-colors duration-100 hover:bg-muted/50",
    selected && "lg:bg-muted lg:-mx-3 lg:w-[calc(100%+1.5rem)] lg:rounded-md lg:px-3",
    className,
  );
  if ("render" in props && props.render) {
    return <>{props.render({ className: rowClass, children: content })}</>;
  }
  if (isStatic || !("onClick" in props) || !props.onClick) {
    return <div className={rowClass}>{content}</div>;
  }
  return (
    <button
      aria-current={selected ? "true" : undefined}
      className={rowClass}
      onClick={props.onClick}
      type="button"
    >
      {content}
    </button>
  );
}

/**
 * Thumb bar fixed above the mobile bottom nav; static on desktop.
 * Only for in-the-moment actions (sumar gol, terminar). Leave it out otherwise.
 */
export function ActionDock({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-[calc(4rem+1px+max(0.5rem,env(safe-area-inset-bottom)))] z-20 flex gap-2 border-t bg-background px-4 py-3 *:flex-1 md:static md:border-0 md:bg-transparent md:p-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
