import Link from "next/link";
import { FaCalendarDay, FaClock } from "react-icons/fa6";
import {
  displayPartTitle,
  formatShortDay,
  groupPartsBySection,
  helperRoleOf,
  type MyWeek,
  type MyWeekMeeting,
} from "@/features/weekly-schedule/domain/my-week";
import { Badge } from "@/shared/components/ui/badge";
import { Card } from "@/shared/components/ui/card";
import { cn } from "@/shared/lib/utils";

interface MyWeekSectionProps {
  myWeek: MyWeek;
}

function PartNames({
  personName,
  helperPersonName,
  partKey,
}: {
  personName: string;
  helperPersonName: string;
  partKey: string;
}) {
  if (!helperPersonName) return <span className="block truncate text-xs">{personName}</span>;
  return (
    <span className="block truncate text-xs">
      {personName} y {helperPersonName} ({helperRoleOf(partKey)})
    </span>
  );
}

function MeetingBlock({ meeting, isMale }: { meeting: MyWeekMeeting; isMale: boolean }) {
  const groups = groupPartsBySection(meeting.parts);
  return (
    <Card className={cn("p-4", meeting.isNext && "ring-2 ring-sky-500")}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-bold">{meeting.title}</h3>
        {meeting.isNext && <Badge>Próxima</Badge>}
      </div>
      <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
        <FaCalendarDay aria-hidden />
        <span>Día: {formatShortDay(meeting.date)}</span>
        <FaClock aria-hidden />
        <span>{meeting.time}</span>
      </p>

      <div className="mt-3 flex flex-col gap-3">
        <section aria-label="Mis partes">
          {groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin asignación</p>
          ) : (
            groups.map((group) => (
              <div key={group.section || "general"}>
                {group.section && (
                  <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground first:mt-0">
                    {group.section}
                  </p>
                )}
                <ul className="flex flex-col">
                  {group.parts.map((part) => (
                    <li
                      key={part.partKey}
                      className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-b-0"
                    >
                      <span className="min-w-0 text-sm font-medium">
                        {displayPartTitle(part)}
                        {part.durationMinutes ? ` (${part.durationMinutes} min)` : ""}
                      </span>
                      <span className="max-w-44 shrink-0 text-right text-muted-foreground">
                        <PartNames
                          personName={part.personName}
                          helperPersonName={part.helperPersonName}
                          partKey={part.partKey}
                        />
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </section>

        <section aria-label="Limpieza">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Limpieza
          </p>
          {meeting.cleaning.length === 0 ? (
            <p className="py-1 text-sm text-muted-foreground">Sin asignación</p>
          ) : (
            <ul className="flex flex-col">
              {meeting.cleaning.map((item) => (
                <li
                  key={`${item.assignmentDate}-${item.sectorName}`}
                  className="flex items-center justify-between gap-3 border-b border-border py-2 text-sm last:border-b-0"
                >
                  <span className="font-medium">{item.sectorName}</span>
                  {item.isFamily && <span className="text-xs text-muted-foreground">familia</span>}
                </li>
              ))}
            </ul>
          )}
        </section>

        {isMale && (
          <section aria-label="En la reunión">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              En la reunión
            </p>
            <p className="py-1 text-sm text-muted-foreground">Sin asignación</p>
          </section>
        )}
      </div>
    </Card>
  );
}

export function MyWeekSection({ myWeek }: MyWeekSectionProps) {
  return (
    <section aria-label="Minha semana" className="flex flex-col gap-3">
      {myWeek.personName ? (
        <p className="text-sm text-muted-foreground">{myWeek.personName}</p>
      ) : (
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">
            Tu usuario aún no está vinculado a una persona.{" "}
            <Link href="/personas" className="text-sky-600 underline">
              Vincular en Personas
            </Link>
          </p>
        </Card>
      )}
      {myWeek.meetings.map((meeting) => (
        <MeetingBlock key={meeting.kind} meeting={meeting} isMale={myWeek.isMale} />
      ))}
    </section>
  );
}
