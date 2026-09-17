import { openDB } from "idb";
import type { WeeklySchedule } from "@/features/weekly-schedule/domain/schedule";

const DB_NAME = "meeting-pwa";
const STORE_NAME = "keyval";
const SCHEDULE_KEY = "weekly-schedule";

async function getStore() {
  const db = await openDB(DB_NAME, 1, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    },
  });
  return db;
}

export async function readCachedSchedule(): Promise<WeeklySchedule | null> {
  try {
    const db = await getStore();
    const value = await db.get(STORE_NAME, SCHEDULE_KEY);
    return (value as WeeklySchedule | undefined) ?? null;
  } catch {
    return null;
  }
}

export async function writeCachedSchedule(schedule: WeeklySchedule): Promise<void> {
  try {
    const db = await getStore();
    await db.put(STORE_NAME, schedule, SCHEDULE_KEY);
  } catch {
    // Cache is best-effort; online render still works.
  }
}
