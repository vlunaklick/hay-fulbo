import { Badge } from "@hay-fulbo/ui/components/badge";
import { cn } from "@hay-fulbo/ui/lib/utils";

export function AttendanceMeter({
  capacity,
  maybe,
  playing,
  remaining,
  waitlisted,
  compact = false,
}: {
  capacity: number;
  maybe: number;
  playing: number;
  remaining: number;
  waitlisted: number;
  compact?: boolean;
}) {
  const percentage = Math.min((playing / capacity) * 100, 100);
  return (
    <div className={cn("flex flex-col", compact ? "gap-2" : "gap-3")}>
      <div className="flex items-end justify-between gap-4">
        <div>
          <strong className={cn("tabular-nums tracking-tight", compact ? "text-2xl" : "text-4xl")}>
            {playing}/{capacity}
          </strong>
          <p className="text-xs text-muted-foreground">confirmados con lugar</p>
        </div>
        <Badge variant={remaining === 0 ? "secondary" : "outline"}>
          {remaining === 0 ? "Completo" : `Faltan ${remaining}`}
        </Badge>
      </div>
      <div
        aria-label={`${playing} de ${capacity} lugares confirmados`}
        aria-valuemax={capacity}
        aria-valuemin={0}
        aria-valuenow={playing}
        className="h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none"
          style={{ width: `${percentage}%` }}
        />
      </div>
      {maybe > 0 || waitlisted > 0 ? (
        <p className="text-xs text-muted-foreground">
          {maybe > 0 ? `${maybe} en duda` : null}
          {maybe > 0 && waitlisted > 0 ? " · " : null}
          {waitlisted > 0 ? `${waitlisted} en espera` : null}
        </p>
      ) : null}
    </div>
  );
}
