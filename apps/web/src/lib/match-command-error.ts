type MatchError = {
  message?: string;
  data?: { code?: string; domainCode?: string };
  shape?: { data?: { code?: string; domainCode?: string } };
};

export function isMatchConflict(error: unknown) {
  const cause = error as MatchError | null;
  return cause?.data?.code === "CONFLICT" || cause?.shape?.data?.code === "CONFLICT";
}

export function matchCommandErrorMessage(
  error: unknown,
  action?: { type: string; field?: string; delta?: number },
) {
  const cause = error as MatchError | null;
  if (isMatchConflict(error)) {
    return "Alguien cambió el partido. Revisá los datos actualizados y volvé a guardar si querés conservar tu cambio.";
  }
  // The default tRPC formatter sends the domain code as the message, not the cause.
  const code = cause?.data?.domainCode ?? cause?.shape?.data?.domainCode ?? cause?.message;
  if (code === "match_not_open") return "El partido ya se cerró";
  if (
    code === "forbidden" ||
    code === "membership_required" ||
    cause?.data?.code === "FORBIDDEN" ||
    cause?.shape?.data?.code === "FORBIDDEN"
  ) {
    return action?.type === "adjustStat" && action.field !== "assists"
      ? "Ya no podés cargar goles en este partido"
      : "Ya no podés editar este partido";
  }
  if (
    action?.type === "adjustStat" &&
    action.field !== "assists" &&
    action.delta === -1 &&
    (code === "invalid_input" || code === "not_found" || code === "Stat cannot go below zero")
  ) {
    return "Ese gol ya no está en el marcador";
  }
  return "No pudimos guardar el cambio. Probá de nuevo.";
}
