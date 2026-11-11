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
  if (code === "closure_invalid") return "Todavía falta completar datos para cerrar el partido";
  if (code === "group_archived") return "El grupo está archivado";
  if (code === "player_archived") return "Ese jugador está archivado";
  if (code === "court_archived") return "Esa cancha está archivada";
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
  const transportCode = cause?.data?.code ?? cause?.shape?.data?.code;
  if (
    cause?.data?.domainCode ||
    cause?.shape?.data?.domainCode ||
    [
      "owner_required",
      "concurrent_update",
      "not_found",
      "match_not_closed",
      "match_not_cancelled",
      "invalid_input",
      "invalid_transition",
      "player_account_already_linked",
    ].includes(code ?? "") ||
    (transportCode && !["INTERNAL_SERVER_ERROR", "TIMEOUT"].includes(transportCode))
  ) {
    return "No pudimos guardar el cambio.";
  }
  return "No pudimos guardar el cambio. Probá de nuevo.";
}

export function matchReadErrorMessage(error: unknown) {
  const cause = error as MatchError | null;
  const code = cause?.data?.domainCode ?? cause?.shape?.data?.domainCode ?? cause?.message;
  const transportCode = cause?.data?.code ?? cause?.shape?.data?.code;
  if (code === "not_found" || code === "NOT_FOUND" || transportCode === "NOT_FOUND") {
    return "Este partido no existe o no es de tu grupo";
  }
  if (code === "forbidden" || code === "membership_required" || transportCode === "FORBIDDEN") {
    return "No tenés acceso a este partido";
  }
  return "Revisá tu conexión y volvé a intentar";
}
