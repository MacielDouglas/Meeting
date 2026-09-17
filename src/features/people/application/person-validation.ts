import { z } from "zod";
import {
  FEMALE_RESTRICTED_KEYS,
  MEETING_PART_KEYS,
  SERVICE_PRIVILEGE_KEYS,
} from "@/features/people/domain/person";
import { plainText } from "@/shared/lib/validation";

const personId = z.string().trim().min(1).max(64);
const booleanField = z.boolean();
const optionalReference = z.string().trim().min(1).max(64).optional().nullable();

export const personFormSchema = z.object({
  firstName: plainText(80),
  lastName: plainText(80),
  sex: z.enum(["male", "female"]),
  familyHead: booleanField,
  familyMemberId: optionalReference,
  userId: optionalReference,
  cleaning: booleanField,
  helper: booleanField,
  startConversations: booleanField,
  returnVisits: booleanField,
  makeDisciples: booleanField,
  explainBeliefs: booleanField,
  betterSpeech: booleanField,
  bibleReading: booleanField,
  baptized: booleanField,
  prayer: booleanField,
  sound: booleanField,
  video: booleanField,
  platform: booleanField,
  microphone: booleanField,
  elder: booleanField,
  ministerialServant: booleanField,
  midweekChairman: booleanField,
  treasuresTalk: booleanField,
  pearlsQuest: booleanField,
  audienceAnalysis: booleanField,
  analysisTalk: booleanField,
  bibleStudy: booleanField,
  studyReader: booleanField,
  publicChairman: booleanField,
  publicTalk: booleanField,
  watchtowerConductor: booleanField,
  watchtowerReader: booleanField,
  usher: booleanField,
});

export const updatePersonSchema = personFormSchema.extend({ id: personId });

export const updateUserRoleSchema = z.object({
  userId: personId,
  role: z.enum(["owner", "admin", "member"]),
});

export type PersonFormValues = z.infer<typeof personFormSchema>;
export type UpdatePersonInput = z.infer<typeof updatePersonSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;

export const DEFAULT_PERSON_FORM: PersonFormValues = {
  firstName: "",
  lastName: "",
  sex: "male",
  familyHead: false,
  familyMemberId: null,
  userId: null,
  cleaning: true,
  helper: true,
  startConversations: true,
  returnVisits: true,
  makeDisciples: true,
  explainBeliefs: true,
  betterSpeech: false,
  bibleReading: false,
  baptized: false,
  prayer: false,
  sound: false,
  video: false,
  platform: false,
  microphone: false,
  elder: false,
  ministerialServant: false,
  midweekChairman: false,
  treasuresTalk: false,
  pearlsQuest: false,
  audienceAnalysis: false,
  analysisTalk: false,
  bibleStudy: false,
  studyReader: false,
  publicChairman: false,
  publicTalk: false,
  watchtowerConductor: false,
  watchtowerReader: false,
  usher: false,
};

export function normalizePersonValues(values: PersonFormValues): PersonFormValues {
  const next = { ...values };
  if (next.sex === "female") {
    for (const key of FEMALE_RESTRICTED_KEYS) {
      next[key] = false;
    }
  }
  if (!next.baptized) {
    for (const key of SERVICE_PRIVILEGE_KEYS) {
      next[key] = false;
    }
  }
  if (!next.elder && !next.ministerialServant) {
    for (const key of MEETING_PART_KEYS) {
      next[key] = false;
    }
  }
  if (next.familyHead) {
    next.familyMemberId = null;
  }
  return next;
}
