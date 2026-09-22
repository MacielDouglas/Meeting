import { FaCalendarDay, FaClock, FaLocationDot } from "react-icons/fa6";
import type { Meeting } from "@/features/weekly-schedule/domain/schedule";
import { Badge } from "@/shared/components/ui/badge";
import { Card } from "@/shared/components/ui/card";
import { es } from "@/shared/i18n/es";

interface MeetingCardProps {
  meeting: Meeting;
  title: string;
  badge: string;
}

export function MeetingCard({ meeting, title, badge }: MeetingCardProps) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold uppercase leading-none tracking-wide">
            {title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{meeting.theme}</p>
        </div>
        <Badge variant="secondary">{badge}</Badge>
      </div>
      <ul className="mt-3 space-y-1.5 text-sm">
        <li className="flex items-center gap-2">
          <FaCalendarDay aria-hidden />{" "}
          <span>
            <span className="sr-only">Fecha: </span>
            {meeting.date}
          </span>
        </li>
        <li className="flex items-center gap-2">
          <FaClock aria-hidden />{" "}
          <span>
            <span className="sr-only">Hora: </span>
            {meeting.time}
          </span>
        </li>
        <li className="flex items-center gap-2">
          <FaLocationDot aria-hidden />{" "}
          <span>
            <span className="sr-only">Lugar: </span>
            {meeting.location}
          </span>
        </li>
      </ul>
      <p className="mt-3 text-sm text-muted-foreground">
        {meeting.parts.length === 0
          ? es.noProgramYet
          : `${meeting.parts.length} partes programadas.`}
      </p>
    </Card>
  );
}
