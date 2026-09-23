import { getCurrentUser } from "@/features/auth/application/session";
import { getMeetingProgram } from "@/features/meetings/application/meeting-queries";

function isWeek(value: string | null): value is string {
  return value !== null && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function toIcalDate(date: string, time: string): string {
  const compactDate = date.replaceAll("-", "");
  const compactTime = time.replace(":", "");
  return `${compactDate}T${compactTime}00`;
}

function escapeIcal(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/**
 * Exporta o programa da semana em formato iCal (TheocBase: Export iCal).
 * GET /api/reunioes/ical?kind=midweek|weekend&week=YYYY-MM-DD
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const url = new URL(request.url);
  const kind = url.searchParams.get("kind") === "weekend" ? "weekend" : "midweek";
  const week = url.searchParams.get("week");
  if (!isWeek(week)) return new Response("Parámetro week no válido (YYYY-MM-DD).", { status: 400 });

  const result = await getMeetingProgram(kind, week);
  if (!result) return new Response("Programa no encontrado.", { status: 404 });

  const totalMinutes = result.assignments.reduce((acc, part) => acc + part.durationMinutes, 0);
  const firstTime = result.assignments[0]?.startTime ?? "19:30";
  const lines = result.assignments.map((part) => {
    const who = [part.personName, part.helperPersonName].filter(Boolean).join(" · ");
    const label = part.songNumber
      ? `Cántico ${part.songNumber}${/oraci[óo]n/i.test(part.title) ? " y oración" : ""}`
      : part.title;
    return `${part.startTime} ${label}${who ? ` — ${who}` : ""}`;
  });

  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Meeting//Programa//PT",
    "BEGIN:VEVENT",
    `UID:${result.program.id}@meeting`,
    `DTSTART:${toIcalDate(result.program.date, firstTime)}`,
    `DURATION:PT${totalMinutes}M`,
    `SUMMARY:${escapeIcal(kind === "midweek" ? "Reunión entre semana" : "Reunión de fin de semana")}`,
    `DESCRIPTION:${escapeIcal(lines.join("\n"))}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="reuniao-${kind}-${week}.ics"`,
    },
  });
}
