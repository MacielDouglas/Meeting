"use client";

import { useEffect } from "react";
import { writeCachedSchedule } from "@/features/offline/schedule-cache";
import type { WeeklySchedule } from "@/features/weekly-schedule/domain/schedule";

export function ScheduleCacheWriter({ schedule }: { schedule: WeeklySchedule }) {
  useEffect(() => {
    void writeCachedSchedule(schedule);
  }, [schedule]);

  return null;
}
