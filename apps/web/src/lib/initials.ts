export function initials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toLocaleUpperCase("es-AR");
  return `${parts[0]![0]}${parts.at(-1)![0]}`.toLocaleUpperCase("es-AR");
}
