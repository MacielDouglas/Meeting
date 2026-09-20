"use server";

import { and, asc, eq, ilike, or } from "drizzle-orm";
import { requireAuthenticatedUser } from "@/features/auth/application/session";
import { persons } from "@/features/people/infrastructure/person-schema";
import { getDb } from "@/shared/lib/db";

export interface MeetingPerson {
  id: string;
  firstName: string;
  lastName: string;
  sex: "male" | "female";
  helper: boolean;
}

const CAPABILITY_COLUMNS = {
  midweekChairman: persons.midweekChairman,
  treasuresTalk: persons.treasuresTalk,
  pearlsQuest: persons.pearlsQuest,
  bibleReading: persons.bibleReading,
  helper: persons.helper,
  analysisTalk: persons.analysisTalk,
  bibleStudy: persons.bibleStudy,
  studyReader: persons.studyReader,
  publicChairman: persons.publicChairman,
  publicTalk: persons.publicTalk,
  watchtowerConductor: persons.watchtowerConductor,
  watchtowerReader: persons.watchtowerReader,
} as const;

export async function listMeetingPersons(
  capabilityField?: string | null,
  options?: { search?: string; limit?: number; helperOnly?: boolean },
): Promise<MeetingPerson[]> {
  await requireAuthenticatedUser();
  const db = getDb();
  const conditions = [];
  const field =
    capabilityField && capabilityField in CAPABILITY_COLUMNS
      ? CAPABILITY_COLUMNS[capabilityField as keyof typeof CAPABILITY_COLUMNS]
      : null;
  if (field) conditions.push(eq(field, true));
  if (options?.helperOnly) conditions.push(eq(persons.helper, true));
  const search = options?.search?.trim();
  if (search) {
    const pattern = `%${search.replace(/[%_//]/g, "")}%`;
    const searchCondition = or(ilike(persons.firstName, pattern), ilike(persons.lastName, pattern));
    if (searchCondition) conditions.push(searchCondition);
  }
  const limit = Math.min(Math.max(options?.limit ?? 60, 1), 200);
  const rows = await db
    .select({
      id: persons.id,
      firstName: persons.firstName,
      lastName: persons.lastName,
      sex: persons.sex,
      helper: persons.helper,
    })
    .from(persons)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(persons.firstName), asc(persons.lastName))
    .limit(limit);
  return rows.map((row) => ({
    ...row,
    sex: row.sex as "male" | "female",
    helper: row.helper ?? false,
  }));
}
