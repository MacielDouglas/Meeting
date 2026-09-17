import type { PersonRow, PersonSex } from "@/features/people/infrastructure/person-schema";

export type { PersonSex };
export type Person = PersonRow;

export interface PersonSummary {
  id: string;
  firstName: string;
  lastName: string;
  sex: PersonSex;
}

export function getFullName(person: { firstName: string; lastName: string }): string {
  return `${person.firstName} ${person.lastName}`.trim();
}

export const FEMALE_RESTRICTED_KEYS = [
  "betterSpeech",
  "bibleReading",
  "baptized",
  "prayer",
  "sound",
  "video",
  "platform",
  "microphone",
  "elder",
  "ministerialServant",
  "midweekChairman",
  "treasuresTalk",
  "pearlsQuest",
  "audienceAnalysis",
  "analysisTalk",
  "bibleStudy",
  "studyReader",
  "publicChairman",
  "publicTalk",
  "watchtowerConductor",
  "watchtowerReader",
  "usher",
] as const;

export type FemaleRestrictedKey = (typeof FEMALE_RESTRICTED_KEYS)[number];

export const SERVICE_PRIVILEGE_KEYS = [
  "prayer",
  "studyReader",
  "watchtowerReader",
  "usher",
  "ministerialServant",
  "elder",
] as const;

export type ServicePrivilegeKey = (typeof SERVICE_PRIVILEGE_KEYS)[number];

export const MEETING_PART_KEYS = [
  "midweekChairman",
  "treasuresTalk",
  "pearlsQuest",
  "audienceAnalysis",
  "analysisTalk",
  "bibleStudy",
  "publicChairman",
  "publicTalk",
  "watchtowerConductor",
] as const;

export type MeetingPartKey = (typeof MEETING_PART_KEYS)[number];
