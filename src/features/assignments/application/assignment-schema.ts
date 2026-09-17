import { z } from "zod";
import { containsHtml } from "@/shared/lib/sanitize";

const plainText = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .refine((value) => !containsHtml(value), { message: "HTML no permitido" });

export const createAssignmentSchema = z.object({
  partId: z.string().trim().min(1).max(64),
  assignee: plainText(120),
  assistant: plainText(120).optional().nullable(),
});

export const updateAssignmentStatusSchema = z.object({
  assignmentId: z.string().trim().min(1).max(64),
  status: z.enum(["pending", "confirmed", "done"]),
});

export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
export type UpdateAssignmentStatusInput = z.infer<typeof updateAssignmentStatusSchema>;
