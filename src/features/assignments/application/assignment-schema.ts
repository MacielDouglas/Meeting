import { z } from "zod";
import { optionalPlainText, plainText } from "@/shared/lib/validation";

export const createAssignmentSchema = z.object({
  partId: z.string().trim().min(1).max(64),
  assignee: plainText(120),
  assistant: optionalPlainText(120),
});

export const updateAssignmentStatusSchema = z.object({
  assignmentId: z.string().trim().min(1).max(64),
  status: z.enum(["pending", "confirmed", "done"]),
});

export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
export type UpdateAssignmentStatusInput = z.infer<typeof updateAssignmentStatusSchema>;
