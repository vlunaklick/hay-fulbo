export type MatchShareDetails = {
  capacity: number;
  court: { address: string; mapsUrl: string; name: string } | null;
  currency: string;
  estimatedPerPlayerMinor: string | null;
  groupName: string;
  invitationUrl: string;
  playing: number;
  scheduledAt: Date | string;
  timeZone: string;
};

export function buildMatchMessage(details: MatchShareDetails) {
  const scheduledAt = new Date(details.scheduledAt);
  const date = new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "long",
    timeZone: details.timeZone,
    weekday: "long",
  }).format(scheduledAt);
  const time = new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: details.timeZone,
  }).format(scheduledAt);
  const remaining = Math.max(details.capacity - details.playing, 0);
  const lines = [
    `⚽ Hay fulbo · ${details.groupName}`,
    `📅 ${capitalize(date.replace(",", ""))} · ${time}`,
    details.court ? `📍 ${details.court.name} · ${details.court.address}` : "📍 Cancha a definir",
    details.estimatedPerPlayerMinor
      ? `💵 Estimado ${formatMinor(details.estimatedPerPlayerMinor, details.currency)} por jugador`
      : null,
    `👥 ${details.playing}/${details.capacity} confirmados${
      remaining > 0 ? ` · faltan ${remaining}` : " · equipo completo"
    }`,
    details.court?.mapsUrl ? `Mapa: ${details.court.mapsUrl}` : null,
    `Confirmá acá: ${details.invitationUrl}`,
  ];
  return lines.filter((line): line is string => line !== null).join("\n");
}

export function buildWhatsAppUrl(message: string) {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export function buildCalendarIcs(input: {
  description: string;
  durationMinutes?: number;
  location?: string;
  start: Date | string;
  title: string;
  uid: string;
}) {
  const start = new Date(input.start);
  const end = new Date(start.getTime() + (input.durationMinutes ?? 90) * 60_000);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Hay Fulbo//Partido//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${escapeIcs(input.uid)}`,
    `DTSTAMP:${toIcsDate(new Date())}`,
    `DTSTART:${toIcsDate(start)}`,
    `DTEND:${toIcsDate(end)}`,
    `SUMMARY:${escapeIcs(input.title)}`,
    `DESCRIPTION:${escapeIcs(input.description)}`,
    input.location ? `LOCATION:${escapeIcs(input.location)}` : null,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter((line): line is string => line !== null)
    .join("\r\n");
}

export function downloadCalendar(filename: string, contents: string) {
  const blob = new Blob([contents], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function buildResultCardSvg(input: {
  dateLabel: string;
  groupName: string;
  left: { goals: number; name: string };
  right: { goals: number; name: string };
}) {
  const groupName = escapeXml(input.groupName);
  const dateLabel = escapeXml(input.dateLabel);
  const leftName = escapeXml(input.left.name);
  const rightName = escapeXml(input.right.name);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080" role="img" aria-labelledby="title description">
  <title id="title">${leftName} ${input.left.goals} a ${input.right.goals} ${rightName}</title>
  <desc id="description">Resultado de ${groupName}, ${dateLabel}</desc>
  <rect width="1080" height="1080" fill="#09090b"/>
  <rect x="48" y="48" width="984" height="984" rx="38" fill="#10281f" stroke="#34d399" stroke-opacity=".42" stroke-width="4"/>
  <path d="M540 224v540M104 494h872" stroke="#f4f4f5" stroke-opacity=".08" stroke-width="3"/>
  <circle cx="540" cy="494" r="126" fill="none" stroke="#f4f4f5" stroke-opacity=".08" stroke-width="3"/>
  <text x="540" y="132" fill="#34d399" font-family="Arial, sans-serif" font-size="28" font-weight="700" letter-spacing="7" text-anchor="middle">HAY FULBO</text>
  <text x="540" y="184" fill="#a1a1aa" font-family="Arial, sans-serif" font-size="27" text-anchor="middle">${groupName} · ${dateLabel}</text>
  <text x="300" y="360" fill="#fafafa" font-family="Arial, sans-serif" font-size="42" font-weight="800" text-anchor="middle">${leftName}</text>
  <text x="780" y="360" fill="#fafafa" font-family="Arial, sans-serif" font-size="42" font-weight="800" text-anchor="middle">${rightName}</text>
  <text x="300" y="668" fill="#fafafa" font-family="Arial, sans-serif" font-size="300" font-weight="900" text-anchor="middle">${input.left.goals}</text>
  <text x="540" y="630" fill="#34d399" font-family="Arial, sans-serif" font-size="88" font-weight="900" text-anchor="middle">—</text>
  <text x="780" y="668" fill="#fafafa" font-family="Arial, sans-serif" font-size="300" font-weight="900" text-anchor="middle">${input.right.goals}</text>
  <text x="540" y="870" fill="#d4d4d8" font-family="Arial, sans-serif" font-size="34" font-weight="700" letter-spacing="5" text-anchor="middle">RESULTADO FINAL</text>
  <text x="540" y="950" fill="#71717a" font-family="Arial, sans-serif" font-size="25" text-anchor="middle">Organizá. Jugá. Que quede la historia.</text>
</svg>`;
}

export function downloadTextFile(filename: string, contents: string, type: string) {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function escapeIcs(value: string) {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("\n", "\\n")
    .replaceAll(",", "\\,")
    .replaceAll(";", "\\;");
}

function toIcsDate(value: Date) {
  return value
    .toISOString()
    .replaceAll("-", "")
    .replaceAll(":", "")
    .replace(/\.\d{3}Z$/, "Z");
}

function formatMinor(value: string, currency: string) {
  return new Intl.NumberFormat("es-AR", {
    currency,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(Number(BigInt(value)) / 100);
}

function capitalize(value: string) {
  return value.charAt(0).toLocaleUpperCase("es") + value.slice(1);
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
