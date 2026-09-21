"use client";

import { type FormEvent, useState } from "react";
import { saveMeetingSchedule } from "@/features/settings/application/actions";
import { type MeetingSchedule, WEEK_DAYS } from "@/features/settings/domain/settings";
import { ChipSelect } from "@/features/settings/presentation/ChipSelect";
import { Button } from "@/shared/components/ui/button";
import { Card, CardTitle } from "@/shared/components/ui/card";
import { es } from "@/shared/i18n/es";

const DAY_OPTIONS = WEEK_DAYS.map((day) => ({ value: String(day.value), label: day.label }));

export function MeetingScheduleForm({ initial }: { initial: MeetingSchedule }) {
  const [midweekDay, setMidweekDay] = useState(String(initial.midweekDay));
  const [midweekTime, setMidweekTime] = useState(initial.midweekTime);
  const [weekendDay, setWeekendDay] = useState(String(initial.weekendDay));
  const [weekendTime, setWeekendTime] = useState(initial.weekendTime);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setPending(true);
    try {
      const result = await saveMeetingSchedule({
        midweekDay: Number(midweekDay),
        midweekTime,
        weekendDay: Number(weekendDay),
        weekendTime,
      });
      if (result.ok) {
        setSaved(true);
      } else {
        setError(result.error ?? null);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="flex flex-col gap-2">
      <CardTitle>{es.meetingSchedules}</CardTitle>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className="text-sm text-success">
          {es.schedulesSaved}
        </p>
      )}
      <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-3">
        <h3 className="text-base font-semibold">{es.midweekMeeting}</h3>
        <ChipSelect
          label={es.midweekMeetingDay}
          options={DAY_OPTIONS}
          value={midweekDay}
          onChange={setMidweekDay}
        />
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">{es.startTimeLabel}</span>
          <input
            type="time"
            value={midweekTime}
            required
            onChange={(event) => setMidweekTime(event.target.value)}
            className="h-11 rounded-lg bg-secondary px-3 text-sm outline-none focus:border focus:border-ring"
          />
        </label>

        <h3 className="pt-2 text-base font-semibold">{es.weekendMeeting}</h3>
        <ChipSelect
          label={es.weekendMeetingDay}
          options={DAY_OPTIONS}
          value={weekendDay}
          onChange={setWeekendDay}
        />
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">{es.startTimeLabel}</span>
          <input
            type="time"
            value={weekendTime}
            required
            onChange={(event) => setWeekendTime(event.target.value)}
            className="h-11 rounded-lg bg-secondary px-3 text-sm outline-none focus:border focus:border-ring"
          />
        </label>

        <Button type="submit" size="lg" disabled={pending}>
          {es.saveSchedules}
        </Button>
      </form>
    </Card>
  );
}
