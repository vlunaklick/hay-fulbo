export function stripQuotes(name: string) {
  return name.replace(/[“”"]/g, "");
}

/** "Juan Ignacio Fernández Etcheverry" → "Juan E.", so short values stay short. */
export function shortName(name: string) {
  const parts = stripQuotes(name).split(/\s+/).filter(Boolean);
  if (parts.length < 2) return name;
  return `${parts[0]} ${parts.at(-1)![0]}.`;
}

export function formatRate(value: number) {
  return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(value);
}

export function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

export function signed(value: number) {
  return `${value > 0 ? "+" : ""}${value}`;
}

/** "sáb 12 nov" */
export function formatShortDay(value: Date | string, timeZone: string) {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
  })
    .format(new Date(value))
    .replace(/,/g, "");
}

export function formatLongDay(value: Date | string, timeZone: string) {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "full", timeZone }).format(new Date(value));
}

export function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}
