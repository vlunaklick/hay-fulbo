export function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(value));
}

export function formatShortDate(value: string | Date) {
  return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" }).format(
    new Date(value),
  );
}

export function formatMoney(value: string | number | bigint | null) {
  if (value === null) return "Sin precio";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number(value) / 100);
}

export function toMinor(value: string) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? String(Math.round(parsed * 100)) : null;
}

/** "hace 5 días", "mañana", "en 2 meses": relative to now, in whole days. */
export function formatRelativeDays(value: string | Date, now: Date = new Date()) {
  const days = Math.round((new Date(value).getTime() - now.getTime()) / 86_400_000);
  const formatter = new Intl.RelativeTimeFormat("es-AR", { numeric: "auto" });
  if (Math.abs(days) < 30) return formatter.format(days, "day");
  if (Math.abs(days) < 365) return formatter.format(Math.round(days / 30), "month");
  return formatter.format(Math.round(days / 365), "year");
}
