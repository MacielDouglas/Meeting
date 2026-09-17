import { FaCalendarDay, FaClock, FaLocationDot } from "react-icons/fa6";
import type { Meeting } from "@/features/weekly-schedule/domain/schedule";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/shared/components/ui/card";

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
          <CardTitle>{title}</CardTitle>
          <CardDescription>{meeting.theme}</CardDescription>
        </div>
        <Badge variant="secondary">{badge}</Badge>
      </div>
      <ul className="mt-3 space-y-1.5 text-sm">
        <li className="flex items-center gap-2">
          <FaCalendarDay aria-hidden /> <span>{meeting.date}</span>
        </li>
        <li className="flex items-center gap-2">
          <FaClock aria-hidden /> <span>{meeting.time}</span>
        </li>
        <li className="flex items-center gap-2">
          <FaLocationDot aria-hidden /> <span>{meeting.location}</span>
        </li>
      </ul>
      <p className="mt-3 text-sm text-muted-foreground">
        {meeting.parts.length === 0
          ? "Programa disponible próximamente."
          : `${meeting.parts.length} partes programadas.`}
      </p>
    </Card>
  );
}
