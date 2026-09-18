import { z } from "zod";
import { isValidISODate, isValidTime } from "@/features/settings/domain/settings";
import { optionalPlainText, plainText } from "@/shared/lib/validation";

const dayField = z.number().int().min(0).max(6);
const timeField = z
  .string()
  .trim()
  .refine((value) => isValidTime(value), { message: "Hora no válida (HH:MM)" });
const dateField = z
  .string()
  .trim()
  .refine((value) => isValidISODate(value), { message: "Fecha no válida (YYYY-MM-DD)" });

export const meetingScheduleSchema = z.object({
  midweekDay: dayField,
  midweekTime: timeField,
  weekendDay: dayField,
  weekendTime: timeField,
});

export const specialEventTypeSchema = z.enum([
  "regional_assembly",
  "circuit_assembly",
  "representative_assembly",
  "memorial",
  "circuit_visit",
  "special_talk",
  "other",
]);

export const createSpecialEventSchema = z
  .object({
    type: specialEventTypeSchema,
    title: plainText(120),
    startDate: dateField,
    endDate: dateField.optional().nullable(),
    startTime: timeField,
    notes: optionalPlainText(500),
  })
  .refine((values) => !values.endDate || values.endDate >= values.startDate, {
    message: "La fecha de fin debe ser posterior al inicio.",
    path: ["endDate"],
  });

export const scheduleExceptionTypeSchema = z.enum([
  "no_meeting",
  "modified_time",
  "special_meeting",
]);

export const createScheduleExceptionSchema = z.object({
  type: scheduleExceptionTypeSchema,
  date: dateField,
  notes: optionalPlainText(500),
});

const recordId = z.string().trim().min(1).max(64);

export const deleteRecordSchema = z.object({ id: recordId });

export type MeetingScheduleInput = z.infer<typeof meetingScheduleSchema>;
export type CreateSpecialEventInput = z.infer<typeof createSpecialEventSchema>;
export type CreateScheduleExceptionInput = z.infer<typeof createScheduleExceptionSchema>;
